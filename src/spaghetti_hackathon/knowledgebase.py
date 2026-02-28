"""
Per-opponent LightRAG knowledgebase manager.

Each opponent gets a separate LightRAG instance stored in data/kb/{opponent_id}/.
Uses the e-infra OpenAI-compatible API for LLM (gpt-oss-120b) and embeddings (qwen3-embedding-4b).
"""

import os
import shutil
import logging
from pathlib import Path

import numpy as np
from openai import AsyncOpenAI
from lightrag import LightRAG, QueryParam
from lightrag.llm.openai import openai_complete_if_cache
from lightrag.utils import EmbeddingFunc

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

EINFRA_API_KEY = os.getenv("EINFRA_API_KEY", "")
EINFRA_BASE_URL = "https://llm.ai.e-infra.cz/v1/"
LLM_MODEL = "qwen3-coder-next"
EMBEDDING_MODEL = "qwen3-embedding-4b"
EMBEDDING_DIM = 2560

# LightRAG's internal client reads these env vars even when api_key is passed
# as a parameter, so we set them here to avoid KeyError: 'OPENAI_API_KEY'
if EINFRA_API_KEY:
    os.environ["OPENAI_API_KEY"] = EINFRA_API_KEY
    os.environ["OPENAI_API_BASE"] = EINFRA_BASE_URL

# Base directory for all knowledgebases
KB_BASE_DIR = Path(os.getenv("KB_DATA_DIR", "data/kb"))

# Shared async OpenAI client for embeddings
_embed_client: AsyncOpenAI | None = None


def _get_embed_client() -> AsyncOpenAI:
    global _embed_client
    if _embed_client is None:
        _embed_client = AsyncOpenAI(api_key=EINFRA_API_KEY, base_url=EINFRA_BASE_URL)
    return _embed_client


async def _llm_func(prompt, system_prompt=None, history_messages=[], keyword_extraction=False, **kwargs) -> str:
    """LLM function using e-infra OpenAI-compatible API."""
    import time
    start_time = time.time()
    
    prompt_len = len(prompt) if prompt else 0
    sys_prompt_len = len(system_prompt) if system_prompt else 0
    logger.info(f"📤 Preparing LLM request | Prompt length: {prompt_len} chars | System prompt length: {sys_prompt_len} chars")

    try:
        response = await openai_complete_if_cache(
            LLM_MODEL,
            prompt,
            system_prompt=system_prompt,
            history_messages=history_messages,
            api_key=EINFRA_API_KEY,
            base_url=EINFRA_BASE_URL,
            **kwargs,
        )
        elapsed = time.time() - start_time
        response_len = len(response) if response else 0
        logger.info(f"📥 Received LLM response | Took: {elapsed:.2f}s | Response length: {response_len} chars")
        return response
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"❌ LLM request failed after {elapsed:.2f}s | Error: {e}")
        raise


async def _embed_texts(texts: list[str], **kwargs) -> np.ndarray:
    """
    Custom embedding function calling the OpenAI API directly.
    Bypasses LightRAG's openai_embed which has dimension check issues.
    """
    client = _get_embed_client()
    response = await client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=texts,
    )
    embeddings = [item.embedding for item in response.data]
    return np.array(embeddings)


def _make_embedding_func() -> EmbeddingFunc:
    """Create embedding function for e-infra API."""
    return EmbeddingFunc(
        embedding_dim=EMBEDDING_DIM,
        max_token_size=8192,
        func=_embed_texts,
    )


class KnowledgeBaseManager:
    """Manages per-opponent LightRAG instances."""

    def __init__(self):
        self._instances: dict[str, LightRAG] = {}

    def _working_dir(self, opponent_id: str) -> str:
        """Get the working directory for an opponent's KB."""
        path = KB_BASE_DIR / opponent_id
        path.mkdir(parents=True, exist_ok=True)
        return str(path)

    async def get_or_create(self, opponent_id: str) -> LightRAG:
        """Get or create a LightRAG instance for an opponent."""
        if opponent_id in self._instances:
            return self._instances[opponent_id]

        working_dir = self._working_dir(opponent_id)
        logger.info(f"🧠 Creating LightRAG instance for opponent {opponent_id} at {working_dir}")

        rag = LightRAG(
            working_dir=working_dir,
            llm_model_func=_llm_func,
            embedding_func=_make_embedding_func(),
            # E-infra's gpt-oss-120b is extremely slow/queued under load, 
            # so we limit concurrency and vastly increase the timeout to prevent 360s timeout errors.
            llm_model_max_async=2,
            default_llm_timeout=1200,
        )

        await rag.initialize_storages()
        self._instances[opponent_id] = rag
        return rag

    def get_processed_count(self, opponent_id: str) -> int:
        """Read the doc_status KV store directly to count processed documents without async loading."""
        status_file = os.path.join(KB_BASE_DIR, opponent_id, "kv_store_doc_status.json")
        if os.path.exists(status_file):
            import json
            try:
                with open(status_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return sum(1 for v in data.values() if isinstance(v, dict) and v.get("status", "").lower() == "processed")
            except Exception as e:
                logger.error(f"Error reading doc_status for {opponent_id}: {e}")
        return 0

    async def ingest_articles(self, opponent_id: str, articles: list[dict]) -> int:
        """
        Ingest a batch of articles into an opponent's KB.
        Each article should have: article_id, title, content, url, publisher.
        Returns the number of articles ingested.
        """
        if not articles:
            return 0

        rag = await self.get_or_create(opponent_id)

        # Format articles into separate text docs for LightRAG
        docs = []
        ids = []
        file_paths = []
        for article in articles:
            # We don't need to put URL and ID in the text if we pass them as metadata,
            # but it helps the LLM with context.
            doc = (
                f"Title: {article.get('title', 'Untitled')}\n"
                f"Publisher: {article.get('publisher', 'Unknown')}\n"
                f"URL: {article.get('url', '')}\n"
                f"Date: {article.get('published_datetime', 'Unknown')}\n\n"
                f"{article.get('content', '')}"
            )
            docs.append(doc)
            
            # Use article_id as the document ID for exact deduplication
            ids.append(article.get('article_id') or "unknown_id")
            
            # Use URL as the file_path, which LightRAG uses for dataset citations
            file_paths.append(article.get('url') or "unknown_url")

        # Pass as list of separate docs — enables dedup and parallel processing
        try:
            await rag.ainsert(docs, ids=ids, file_paths=file_paths)
            logger.info(f"📥 Ingested {len(articles)} articles into KB for opponent {opponent_id}")
            return len(articles)
        except Exception as e:
            logger.error(f"❌ Failed to ingest articles for opponent {opponent_id}: {e}")
            raise

    async def query(self, opponent_id: str, query_text: str, mode: str = "mix") -> str:
        """
        Query an opponent's knowledgebase.
        Modes: naive, local, global, hybrid
        """
        rag = await self.get_or_create(opponent_id)

        valid_modes = {"naive", "local", "global", "hybrid", "mix"}
        if mode not in valid_modes:
            mode = "hybrid"

        try:
            result = await rag.aquery(
                query_text,
                param=QueryParam(mode=mode),
            )
            return result if isinstance(result, str) else str(result)
        except Exception as e:
            logger.error(f"❌ KB query failed for opponent {opponent_id}: {e}")
            raise

    async def delete(self, opponent_id: str):
        """Delete an opponent's KB entirely (removes working dir)."""
        if opponent_id in self._instances:
            try:
                await self._instances[opponent_id].finalize_storages()
            except Exception:
                pass
            del self._instances[opponent_id]

        working_dir = KB_BASE_DIR / opponent_id
        if working_dir.exists():
            shutil.rmtree(working_dir)
            logger.info(f"🗑️ Deleted KB for opponent {opponent_id}")

    async def close_all(self):
        """Finalize all LightRAG instances (call on shutdown)."""
        for opponent_id, rag in self._instances.items():
            try:
                await rag.finalize_storages()
            except Exception as e:
                logger.warning(f"⚠️ Error finalizing KB for {opponent_id}: {e}")
        self._instances.clear()

    def get_graph(self, opponent_id: str, limit: int = 150) -> dict | None:
        """Parse the GraphML file and return top nodes and links formatted for react-force-graph."""
        graph_file = KB_BASE_DIR / opponent_id / "graph_chunk_entity_relation.graphml"
        if not graph_file.exists():
            return None
        
        try:
            import networkx as nx
            G = nx.read_graphml(graph_file)
            
            # Sort nodes by degree to limit the graph size to the most important entities
            degrees = dict(G.degree())
            sorted_nodes = sorted(degrees.keys(), key=lambda n: degrees[n], reverse=True)
            top_nodes = set(sorted_nodes[:limit])
            
            subgraph = G.subgraph(top_nodes)
            
            nodes = []
            for n, data in subgraph.nodes(data=True):
                # Ensure the node ID is a string (NetworkX sometimes uses numeric IDs depending on GraphML)
                n_str = str(n)
                nodes.append({
                    "id": n_str,
                    "name": n_str.strip('"'), # LightRAG sometimes quotes names
                    "type": data.get("entity_type", "Entity").strip('"'),
                    "val": degrees[n]  # Node size based on full graph degree
                })
                
            links = []
            for u, v, data in subgraph.edges(data=True):
                links.append({
                    "source": str(u),
                    "target": str(v),
                    "label": data.get("keywords", "Related").strip('"')
                })
                
            return {"nodes": nodes, "links": links}
        except Exception as e:
            logger.error(f"❌ Error reading graph for {opponent_id}: {e}")
            return None


# Singleton instance
kb_manager = KnowledgeBaseManager()
