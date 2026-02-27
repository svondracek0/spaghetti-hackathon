import os
import json
from google import genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
if not api_key:
    print("⚠️ WARNING: No GEMINI_API_KEY found.")

client = genai.Client(api_key=api_key)

SYSTEM_PROMPT = """\
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
    debate_context: str,
    articles: list[dict],
) -> dict:
    """
    Use the LLM to generate strategy content for a single topic.
    Returns dict with keys: sneaky_questions, arguments, why_bad_for_opponent.
    """
    # Format articles for the prompt
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
OPPONENTS: {', '.join(opponent_names)}

STRATEGY TOPIC: {topic_title}
DESCRIPTION: {topic_description}
YOUR STANCE: {topic_stance}
{articles_text}

Generate strategic questions, arguments, and analysis for this topic.
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                {"role": "user", "parts": [{"text": SYSTEM_PROMPT + "\n\n" + user_prompt}]},
            ],
        )

        # Extract JSON from the response
        text = response.text.strip()
        # Handle markdown code blocks
        if text.startswith("```"):
            text = text.split("\n", 1)[1]  # Remove first line with ```json
            text = text.rsplit("```", 1)[0]  # Remove closing ```
            text = text.strip()

        result = json.loads(text)
        return {
            "sneaky_questions": result.get("sneaky_questions", []),
            "arguments": result.get("arguments", []),
            "why_bad_for_opponent": result.get("why_bad_for_opponent", ""),
        }

    except json.JSONDecodeError as e:
        print(f"❌ LLM returned invalid JSON for topic '{topic_title}': {e}")
        print(f"   Raw response: {response.text[:200] if response else 'None'}")
        return {"sneaky_questions": [], "arguments": [], "why_bad_for_opponent": ""}
    except Exception as e:
        print(f"❌ LLM error for topic '{topic_title}': {e}")
        return {"sneaky_questions": [], "arguments": [], "why_bad_for_opponent": ""}
