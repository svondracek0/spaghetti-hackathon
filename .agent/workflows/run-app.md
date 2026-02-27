---
description: how to run the Debate Strategist application
---

To run the Debate Strategist application, you need to start both the FastAPI backend and the Vite frontend. Follow these steps:

### 1. Configure the Environment
Ensure you have a `.env` file in the root directory with your Google Gemini API key:
```env
GEMINI_API_KEY=your_actual_api_key_here
```

### 2. Start the Backend
Open a new terminal in the project root and run:
// turbo
```bash
./.venv/bin/python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend will be available at `http://localhost:8000`.

### 3. Start the Frontend
Open another terminal in the `frontend` directory and run:
// turbo
```bash
npm run dev -- --port 5173 --host
```
The frontend will be available at `http://localhost:5173`.

### 4. Use the Application
1. Navigate to `http://localhost:5173` in your browser.
2. Fill in the debate opponents, context, and topics.
3. Click **"Prepare Debate Strategy"** and watch the AI research stream in!
