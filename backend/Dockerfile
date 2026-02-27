FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1

# Copy pyproject.toml and uv.lock (if it exists) from the root
COPY pyproject.toml uv.lock* ./

# Install dependencies
RUN uv sync --frozen --no-install-project

# Copy the entire project to ensure src/ and backend/ are available
COPY . .

# Expose the port
EXPOSE 8000

# Run the application
# We run uvicorn as a module from the backend package
CMD ["uv", "run", "uvicorn", "spaghetti_hackathon.main:app", "--host", "0.0.0.0", "--port", "8000"]
