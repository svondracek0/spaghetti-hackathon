import os
import json
import logging
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
if not api_key:
    logger.warning("No GEMINI_API_KEY found.")

client = genai.Client(api_key=api_key)
MODEL = "gemini-2.5-flash"


def _parse_json_response(text: str) -> dict | list:
    """Parse JSON from LLM response, handling markdown code blocks."""
    if not text:
        return {}
        
    text = text.strip()
    if "```json" in text:
        text = text.split("```json")[-1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[-1].split("```")[0].strip()
        
    # Extract just the object or array portion if extra text exists
    start = text.find("{")
    start_arr = text.find("[")
    
    if start_arr != -1 and (start == -1 or start_arr < start):
        text = text[start_arr:text.rfind("]")+1]
    elif start != -1:
        text = text[start:text.rfind("}")+1]

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON normally: {e}. Attempting control character cleanup...")
        # Sometimes Gemini hallucinates unescaped control chars, newlines, or tabs inside strings
        import re
        text = re.sub(r'[\x00-\x1F]+', ' ', text)
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Re-raise the original error if cleanup fails
            raise


# ---------------------------------------------------------------------------
# Step 1: Opponent Enrichment (with web search)
# ---------------------------------------------------------------------------

async def enrich_opponent(name: str) -> dict:
    """
    Use Gemini + web search to enrich an opponent profile from just a name.
    Returns dict with: description, organization, known_positions, debate_style.
    """
    logger.info(f"🔍 Enriching opponent: {name}")

    prompt = f"""\
Research the public figure or person named "{name}" and provide factual information.

Respond ONLY with valid JSON in this exact format:
{{
  "description": "A short 1-2 sentence summary of who this person is",
  "organization": "Their primary organization or affiliation",
  "known_positions": "Their known public positions or stances on key issues",
  "debate_style": "Their typical debate or communication style if known"
}}

If you cannot find information about this person, return reasonable defaults with null for unknown fields.
"""

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=[{"role": "user", "parts": [{"text": prompt}]}],
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())],
            ),
        )
        result = _parse_json_response(response.text)
        logger.info(f"✅ Opponent enriched: {name} — {result.get('organization', 'Unknown')}")
        return {
            "description": result.get("description"),
            "organization": result.get("organization"),
            "known_positions": result.get("known_positions"),
            "debate_style": result.get("debate_style"),
        }
    except Exception as e:
        logger.error(f"⚠️ Opponent enrichment failed for {name}: {e}")
        return {"description": None, "organization": None, "known_positions": None, "debate_style": None}


# ---------------------------------------------------------------------------
# Step 3b: Discovery Query Generation
# ---------------------------------------------------------------------------

async def generate_discovery_queries(
    main_topic: str,
    user_position: str,
    opponent_names: list[str],
    debate_context: str,
) -> list[str]:
    """
    Use LLM to generate 3-6 search queries for discovering new subtopics.
    """
    logger.info("🤖 Generating discovery queries...")

    prompt = f"""\
You are a debate researcher helping someone prepare for a debate.

DEBATE TOPIC: {main_topic}
USER'S POSITION: {user_position}
OPPONENTS: {', '.join(opponent_names)}
CONTEXT: {debate_context}

Generate 3-6 targeted news search queries that would help discover weak points,
controversies, or useful angles for this debate. Think like an investigative researcher.
Focus on queries that could uncover information damaging to the opponents or
supporting the user's position.

Respond ONLY with a JSON array of query strings:
["query 1", "query 2", ...]
"""

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=[{"role": "user", "parts": [{"text": prompt}]}],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        queries = _parse_json_response(response.text)
        logger.info(f"✅ Generated {len(queries)} discovery queries")
        return queries if isinstance(queries, list) else []
    except Exception as e:
        logger.error(f"⚠️ Discovery query generation failed: {e}")
        return []


# ---------------------------------------------------------------------------
# Step 4: Article Clustering
# ---------------------------------------------------------------------------

async def cluster_articles(
    articles: list[dict],
    predefined_topic_names: list[str],
) -> dict[str, list[str]]:
    """
    Use LLM to cluster articles into coherent subtopics.
    Returns dict mapping topic names to lists of article IDs.
    """
    if not articles:
        return {}

    logger.info(f"🗂️ Clustering {len(articles)} articles into subtopics...")

    articles_text = "\n".join(
        f"- ID: {a['article_id']} | Title: {a['title']} | Snippet: {a['content'][:200]}"
        for a in articles
    )

    predefined_ctx = ""
    if predefined_topic_names:
        predefined_ctx = f"""
IMPORTANT: The user already has these predefined topics: {', '.join(predefined_topic_names)}
Do NOT create clusters that overlap with these existing topics. Only create NEW, distinct topics.
"""

    prompt = f"""\
You are organizing news articles into debate subtopics.

{predefined_ctx}
ARTICLES:
{articles_text}

Group these articles into 2-5 coherent debate subtopics. Each topic should represent
a distinct angle or issue that could be used in a debate.

Respond ONLY with valid JSON as a dict mapping topic names to lists of article IDs:
{{
  "Topic Name": ["article-id-1", "article-id-2"],
  "Another Topic": ["article-id-3"]
}}
"""

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=[{"role": "user", "parts": [{"text": prompt}]}],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        clusters = _parse_json_response(response.text)
        if isinstance(clusters, dict):
            logger.info(f"✅ Discovered {len(clusters)} new subtopics")
            return clusters
        return {}
    except Exception as e:
        logger.error(f"⚠️ Article clustering failed: {e}")
        return {}


# ---------------------------------------------------------------------------
# Step 5: Strategy Generation per Topic
# ---------------------------------------------------------------------------

STRATEGY_SYSTEM_PROMPT = """\
You are an expert Debate Strategist helping a user prepare for a debate.
You will be given information about a specific strategy topic, the opponent(s),
the debate context, and relevant news articles.

Your task is to generate:
1. sneaky_questions: 3-5 pointed, strategic questions the user can ask the opponent
   to put them on the spot. These should be informed by the news articles.
2. arguments: 3-5 strong arguments the user can make on this topic, backed by evidence
   from the articles.
3. why_bad_for_opponent: A brief paragraph explaining why this topic is disadvantageous
   for the opponent, based on the evidence.

Respond ONLY with valid JSON in this exact format:
{
  "sneaky_questions": ["question1", "question2", ...],
  "arguments": ["argument1", "argument2", ...],
  "why_bad_for_opponent": "explanation..."
}
"""


async def generate_topic_strategy(
    topic_title: str,
    topic_description: str,
    topic_stance: str,
    opponent_names: list[str],
    opponent_profiles: list[dict],
    debate_context: str,
    articles: list[dict],
) -> dict:
    """
    Use the LLM to generate strategy content for a single topic.
    Returns dict with keys: sneaky_questions, arguments, why_bad_for_opponent.
    """
    logger.info(f"⚔️ Generating strategy for topic: {topic_title} ({len(articles)} articles)")

    # Format opponent profiles
    opponents_text = ""
    for op in opponent_profiles:
        desc = op.get("description") or ""
        org = op.get("organization") or ""
        positions = op.get("known_positions") or ""
        style = op.get("debate_style") or ""
        opponents_text += f"\n- {op['name']}"
        if desc:
            opponents_text += f": {desc}"
        if org:
            opponents_text += f" (Org: {org})"
        if positions:
            opponents_text += f"\n  Known positions: {positions}"
        if style:
            opponents_text += f"\n  Debate style: {style}"

    # Format articles
    articles_text = ""
    if articles:
        articles_text = "\n\nRELEVANT NEWS ARTICLES:\n"
        for i, art in enumerate(articles, 1):
            articles_text += f"\n{i}. {art['title']}\n"
            articles_text += f"   Content: {art['content']}\n"
            if art.get("url"):
                articles_text += f"   Source: {art['url']}\n"
    else:
        articles_text = "\n\nNo news articles were found for this topic.\n"

    user_prompt = f"""\
DEBATE CONTEXT: {debate_context}

OPPONENTS:{opponents_text}

STRATEGY TOPIC: {topic_title}
DESCRIPTION: {topic_description}
YOUR STANCE: {topic_stance}
{articles_text}

Generate strategic questions, arguments, and analysis for this topic.
"""

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=[
                {"role": "user", "parts": [{"text": STRATEGY_SYSTEM_PROMPT + "\n\n" + user_prompt}]},
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        result = _parse_json_response(response.text)
        logger.info(f"✅ Strategy complete for topic: {topic_title}")
        return {
            "sneaky_questions": result.get("sneaky_questions", []),
            "arguments": result.get("arguments", []),
            "why_bad_for_opponent": result.get("why_bad_for_opponent", ""),
        }
    except json.JSONDecodeError as e:
        logger.error(f"⚠️ LLM returned invalid JSON for topic '{topic_title}': {e}")
        return {"sneaky_questions": [], "arguments": [], "why_bad_for_opponent": ""}
    except Exception as e:
        logger.error(f"⚠️ Strategy generation failed for topic '{topic_title}': {e}")
        return {"sneaky_questions": [], "arguments": [], "why_bad_for_opponent": ""}


# ---------------------------------------------------------------------------
# Step 6: Overall Win Strategy Synthesis
# ---------------------------------------------------------------------------

async def generate_win_strategy(
    main_topic: str,
    user_position: str,
    debate_context: str,
    opponent_profiles: list[dict],
    strategy_topics: list[dict],
) -> dict:
    """
    Synthesize all subtopic strategies into an overall win strategy.
    Returns dict with: win_strategy, key_arguments.
    """
    logger.info(f"🎯 Synthesizing overall win strategy from {len(strategy_topics)} topics...")

    # Format topics summary
    topics_text = ""
    for st in strategy_topics:
        topics_text += f"\n### {st.get('title', 'Untitled')}\n"
        if st.get("arguments"):
            topics_text += "Arguments:\n"
            for arg in st["arguments"]:
                topics_text += f"  - {arg}\n"
        if st.get("why_bad_for_opponent"):
            topics_text += f"Why bad for opponent: {st['why_bad_for_opponent']}\n"

    # Format opponents
    opponents_text = ", ".join(
        f"{op['name']} ({op.get('organization', 'Unknown')})" for op in opponent_profiles
    )

    prompt = f"""\
You are an expert Debate Strategist. Based on all the research and analysis below,
create an overall winning strategy.

DEBATE TOPIC: {main_topic}
USER'S POSITION: {user_position}
DEBATE CONTEXT: {debate_context}
OPPONENTS: {opponents_text}

SUBTOPIC STRATEGIES:
{topics_text}

Generate:
1. win_strategy: A 2-3 paragraph strategic game plan for winning this debate.
   Include how to open, key themes to hammer, and how to close.
2. key_arguments: The 3-5 strongest top-level arguments that tie everything together.

Respond ONLY with valid JSON:
{{
  "win_strategy": "...",
  "key_arguments": ["arg1", "arg2", ...]
}}
"""

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=[{"role": "user", "parts": [{"text": prompt}]}],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        result = _parse_json_response(response.text)
        logger.info("✅ Win strategy generated")
        return {
            "win_strategy": result.get("win_strategy", ""),
            "key_arguments": result.get("key_arguments", []),
        }
    except Exception as e:
        logger.error(f"⚠️ Win strategy generation failed: {e}")
        return {"win_strategy": "", "key_arguments": []}
