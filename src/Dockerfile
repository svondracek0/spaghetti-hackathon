FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1

# Copy dependency manifests first for layer caching
COPY pyproject.toml uv.lock* ./

# Install dependencies (without the project itself)
RUN uv sync --frozen --no-install-project

# Copy the full source tree
COPY src/ src/

# Install the project package (makes spaghetti_hackathon importable)
RUN uv sync --frozen

# Expose the port
EXPOSE 8000

# Run the application
CMD ["uv", "run", "uvicorn", "spaghetti_hackathon.main:app", "--host", "0.0.0.0", "--port", "8000"]
