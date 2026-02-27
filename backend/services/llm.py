import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

# Load the environment variable explicitly
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    # Fallback to check if it's under GOOGLE_API_KEY just in case
    api_key = os.getenv("GOOGLE_API_KEY")

client = genai.Client(api_key=api_key)

from .newsmatics import search_news

async def prepare_debate_strategy(opponents: str, context: str, topics: str):
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
    
    # 4. Generate response (non-streaming)
    response = client.models.generate_content(
        model='gemini-1.5-flash',
        contents=prompt
    )
    
    return response.text
