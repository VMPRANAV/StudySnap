require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const flashcardRoutes = require('./routes/flashcard.routes');
const quizRoutes = require('./routes/quiz.routes');
const authRoutes=require('./routes/auth.routes');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5001;
app.use(cors(
  {
    origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://study-snap-one.vercel.app',
    'https://*.vercel.app'              
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
  }
));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/auth',authRoutes);
app.get('/', (req, res) => {
  res.status(200).send('Personalized AI Educator Backend is running successfully!');
});
app.use((req, res) => {
  // Adjust the path to your built frontend index.html
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB.');
    // The server will only start listening for requests after the database connection is established.
    app.listen(PORT, () => {
      console.log(`Server is live and listening on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    // If the database connection fails, log the error and exit the process.
    console.error('Fatal Error: Could not connect to MongoDB.', err);
    process.exit(1);
  });