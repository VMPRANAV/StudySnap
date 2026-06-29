# StudySnap 🎓

### AI-Powered Exam Prep Assistant

**StudySnap** is an intelligent study aid that leverages Artificial Intelligence to transform study materials into interactive learning tools. It focuses on optimizing revision through active recall and gamification.

---
<p align="center">
  <a href="https://www.youtube.com/watch?v=jc-SEWqL3JQ">
    <img src="https://img.youtube.com/vi/jc-SEWqL3JQ/0.jpg" alt="StudySnap Technical Demo">
  </a>
</p>

## 📖 Overview

StudySnap simplifies exam preparation by converting static notes into dynamic study aids. By utilizing advanced AI techniques, it helps students retain information better through personalized quizzes and interactive content.

---

## ✨ Key Features

- **Context-Aware Q&A**  
  Generates question-and-answer sets from uploaded notes or specific topics using **RAG (Retrieval-Augmented Generation)** for high accuracy and relevance.

- **Auto-Generated Quizzes**  
  Creates quizzes tailored to specific exam mark allocations (e.g., automatically generating questions worth 2 marks, 5 marks, etc.).

- **Flashcards**  
  Automatically builds flashcards to facilitate active recall learning.

- **Dynamic Difficulty**  
  Adapts the difficulty of questions based on user-selected weightage to match individual study needs.

- **Gamification**  
  Tracks progress and study streaks to keep users motivated and consistent.

---

## 🛠️ Tech Stack

| Component        | Technology |
|------------------|------------|
| **Frontend**     | React (Vite) |
| **Backend**      | Node.js + Express |
| **Database**     | MongoDB |
| **AI Model**     | LLaMA 3.3 (Single-agent NLP workflow RAG LANGCHAIN|
| **Authentication** | JWT (JSON Web Tokens) |
| **Deployment**   | Vercel (Frontend), Render (Backend) |

---

## 📂 Project Structure

The repository is organized into three main directories:

```text
├── frontend/   # React application source code
├── backend/    # Node.js/Express public API (JWT + persistence)
└── ai-fastapi/  # FastAPI internal AI service (PDF+RAG+generation)

## AI Keepalive Cron

To keep the `ai-fastapi` service warm in production, configure a cron or uptime service to call:

`GET /api/auth/ai-warmup/cron`

Required header:

`x-cron-secret: <CRON_SECRET>`

Example target:

`https://your-backend-service.onrender.com/api/auth/ai-warmup/cron`

Recommended schedule:

- Every 10 minutes

Required backend env var:

- `CRON_SECRET`

### Render Blueprint

This repo includes a `render.yaml` with two Render cron jobs:

- `studysnap-ai-direct-warm`
- `studysnap-ai-backend-warm`

Set these cron-job env vars in Render when importing the blueprint:

- `AI_HEALTH_URL=https://<your-ai-fastapi-service>.onrender.com/health`
- `BACKEND_WARMUP_URL=https://<your-backend-service>.onrender.com/api/auth/ai-warmup/cron`
- `CRON_SECRET=<same backend CRON_SECRET>`

Recommended schedules:

- Direct AI warmup: every 10 minutes
- Backend warmup: every 10 minutes, offset by 5 minutes
