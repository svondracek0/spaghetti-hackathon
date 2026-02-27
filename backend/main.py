from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from .services.llm import prepare_debate_strategy

app = FastAPI(title="Debate Strategist API")

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development, allow all. Restrict in production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DebateRequest(BaseModel):
    opponents: str
    context: str
    topics: str

@app.post("/prepare")
async def prepare_debate(request: DebateRequest):
    strategy = await prepare_debate_strategy(
        request.opponents, 
        request.context, 
        request.topics
    )
    return {"strategy": strategy}

@app.get("/health")
async def health_check():
    return {"status": "ok"}
