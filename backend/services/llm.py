import os
import asyncio
from google import genai
from dotenv import load_dotenv

# 1. SETUP: Ensure .env is loaded from the current directory
load_dotenv()

# Load the environment variable explicitly
api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("⚠️ WARNING: No API Key found. Ensure GEMINI_API_KEY is in your .env file.")

# Initialize the client without restricting the version to 'v1'
client = genai.Client(api_key=api_key)

# 2. IMPORT HANDLING: 
# When running standalone, we use a try/except to handle the local module
try:
    from .newsmatics import search_news
except ImportError:
    from newsmatics import search_news
    # Mock function for testing if newsmatics.py isn't in the same folder
    async def search_news(opponents, context, topics):
        print(f"--- Mocking news search for: {opponents} ---")
        return [
            {
                "title": "Recent Climate Policy Debate",
                "content": "Recent discussions highlight the divide on carbon tax implementation.",
                "url": "https://example.com/news/1"
            }
        ]

async def prepare_debate_strategy(opponents: str, context: str, topics: str):
    print(f"🚀 Starting strategy generation for debate against: {opponents}...")
    
    # 1. Fetch relevant news
    news_articles = await search_news(opponents, context, topics)
    
    # 2. Format news for the prompt
    news_context = ""
    if news_articles:
        news_context = "\nRELEVANT NEWS ARTICLES:\n"
        for i, article in enumerate(news_articles, 1):
            news_context += f"{i}. {article['title']}\n"
            news_context += f"   Content: {article['content']}\n"
            news_context += f"   Source: {article['url']}\n\n"
    else:
        news_context = "\nNo specific news articles found for this query.\n"

    # 3. Construct the prompt
    prompt = f"""
    You are an expert Debate Strategist. Your goal is to prepare a user for a debate.
    
    DEBATE DETAILS:
    - Opponents: {opponents}
    - Context: {context}
    - Relevant Topics for Research: {topics}
    
    {news_context}
    
    INSTRUCTIONS:
    Please provide a comprehensive debate preparation strategy including:
    1. Opponent Analysis: Likely arguments and weaknesses, informed by the news if relevant.
    2. Contextual Strategy: How to leverage the setting/rules.
    3. Key Talking Points: Filtered by the specified topics and backed by news evidence where possible.
    4. Potential Rebuttals: How to counter the research-based opposition.
    
    Write in a professional, strategic, and encouraging tone. Use the provided news articles to ground your strategy in current events.
    """
    
    # 4. Generate response using the correct model string
    try:
        # Check available models (optional debug line)
        # models = [m.name for m in client.models.list()]
        # print(f"Available models: {models}")

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        return response.text
    except Exception as e:
        print(f"❌ LLM Strategy Generation Error: {e}")
        return None

# 3. EXECUTION BLOCK
if __name__ == "__main__":
    # Test Parameters
    OPPONENT = "Donald Trump"
    CONTEXT = "US Presidential Election"
    TOPICS = "Climate Change and Green Energy"

    # Run the async function and print results
    result = asyncio.run(prepare_debate_strategy(OPPONENT, CONTEXT, TOPICS))
    
    if result:
        print("\n" + "="*50)
        print("DEBATE STRATEGY GENERATED:")
        print("="*50 + "\n")
        print(result)
    else:
        print("Failed to generate strategy.")