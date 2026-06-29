require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const flashcardRoutes = require('./routes/flashcard.routes');
const quizRoutes = require('./routes/quiz.routes');
const authRoutes=require('./routes/auth.routes');
const dashboardRoutes= require('./routes/dashboard.routes')
const qaRoutes= require('./routes/qa.routes')
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5001;

if (process.env.NODE_ENV === 'production' && typeof process.env.FASTAPI_AI_URL === 'string') {
  const aiUrl = process.env.FASTAPI_AI_URL;
  if (aiUrl.includes('localhost') || aiUrl.includes('127.0.0.1')) {
    console.warn(
      '[WARN] FASTAPI_AI_URL points to localhost in production. ' +
        'On Render this usually means your FastAPI service is a separate deployment; set FASTAPI_AI_URL to its public/internal URL.'
    );
  }
}
app.use(cors(
  // {
  //   origin: [
  //   'http://localhost:5173',
  //   'http://localhost:3000',
  //   'https://study-snap-one.vercel.app',
  //   'https://*.vercel.app'              
  // ],
  // methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  // allowedHeaders: ['Content-Type', 'Authorization'],
  // credentials: true
  // }
));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/auth',authRoutes);
app.use('/api/dashboard',dashboardRoutes);
app.use('/api/qa',qaRoutes);
app.get('/', (req, res) => {
  res.status(200).send('Personalized AI Educator Backend is running successfully!');
});

// Lightweight health endpoint used by the keep-alive pinger (and external monitors).
app.get('/health', (req, res) => {
  res.status(200).json({ ok: true });
});

app.use((req, res) => {
  // Adjust the path to your built frontend index.html
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// --- Keep-alive pinger to prevent Render free-tier cold starts ---
// Render spins down idle services after ~15 minutes. When both backend and
// FastAPI wake up simultaneously, all queued requests hit Groq at once → 429s.
// Pinging every 14 minutes keeps BOTH services warm and eliminates the problem.
//
// Required env vars (production only):
//   FASTAPI_AI_URL  – your FastAPI Render URL  (e.g. https://studysnap-ai.onrender.com)
//   BACKEND_URL     – this backend's Render URL (e.g. https://studysnap-api.onrender.com)
const KEEP_ALIVE_INTERVAL_MS = 14 * 60 * 1000; // 14 minutes

async function pingUrl(label, url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    console.log(`[KeepAlive] ${label} ping → ${res.status}`);
  } catch (err) {
    console.warn(`[KeepAlive] ${label} ping failed: ${err.message}`);
  }
}

function startKeepAlivePinger() {
  if (process.env.NODE_ENV !== 'production') return;

  const targets = [];

  if (process.env.FASTAPI_AI_URL) {
    targets.push({ label: 'FastAPI', url: new URL('/health', process.env.FASTAPI_AI_URL).toString() });
  }

  if (process.env.BACKEND_URL) {
    targets.push({ label: 'Backend (self)', url: new URL('/health', process.env.BACKEND_URL).toString() });
  }

  if (targets.length === 0) {
    console.warn('[KeepAlive] No FASTAPI_AI_URL or BACKEND_URL set — keep-alive disabled.');
    return;
  }

  setInterval(() => {
    targets.forEach(({ label, url }) => pingUrl(label, url));
  }, KEEP_ALIVE_INTERVAL_MS);

  const names = targets.map(t => t.label).join(' + ');
  console.log(`[KeepAlive] Pinging [${names}] every ${KEEP_ALIVE_INTERVAL_MS / 60000} min to prevent cold starts`);
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB.');
    // The server will only start listening for requests after the database connection is established.
    app.listen(PORT, () => {
      console.log(`Server is live and listening on http://localhost:${PORT}`);
      startKeepAlivePinger();
    });
  })
  .catch(err => {
    // If the database connection fails, log the error and exit the process.
    console.error('Fatal Error: Could not connect to MongoDB.', err);
    process.exit(1);
  });
