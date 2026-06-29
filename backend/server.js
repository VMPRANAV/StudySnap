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
app.use((req, res) => {
  // Adjust the path to your built frontend index.html
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// --- Keep-alive pinger to prevent Render free-tier cold starts ---
// Render spins down idle services after ~15 minutes. When both backend and
// FastAPI wake up simultaneously, all queued requests hit Groq at once → 429s.
// Pinging every 14 minutes keeps both services warm and eliminates the problem.
const KEEP_ALIVE_INTERVAL_MS = 14 * 60 * 1000; // 14 minutes

function startKeepAlivePinger() {
  if (process.env.NODE_ENV !== 'production') return;
  const fastApiUrl = process.env.FASTAPI_AI_URL;
  if (!fastApiUrl) return;

  const pingUrl = new URL('/health', fastApiUrl).toString();
  setInterval(async () => {
    try {
      const res = await fetch(pingUrl, { signal: AbortSignal.timeout(10_000) });
      console.log(`[KeepAlive] FastAPI ping → ${res.status}`);
    } catch (err) {
      console.warn(`[KeepAlive] FastAPI ping failed: ${err.message}`);
    }
  }, KEEP_ALIVE_INTERVAL_MS);

  console.log(`[KeepAlive] Pinging FastAPI every ${KEEP_ALIVE_INTERVAL_MS / 60000} min to prevent cold starts`);
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
