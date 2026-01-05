# StudySnap 🎓

### AI-Powered Exam Prep Assistant

**StudySnap** is an intelligent study aid that leverages Artificial Intelligence to transform study materials into interactive learning tools. It focuses on optimizing revision through active recall and gamification.

---

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
| **AI Model**     | LLaMA 3.3 (Single-agent NLP workflow) CREW AI LANGCHAIN|
| **Authentication** | JWT (JSON Web Tokens) |
| **Deployment**   | Vercel (Frontend), Render (Backend) |

---

## 📂 Project Structure

The repository is organized into two main directories:

```text
├── frontend/   # React application source code
└── backend/    # Node.js/Express server and AI logic
                # (ai.service.js handles AI generation logic)
