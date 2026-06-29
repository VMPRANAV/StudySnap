// backend/models/flashcardSet.model.js
const mongoose = require('mongoose');

const flashcardSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Each flashcard must have a question.'],
    trim: true,
  },
  answer: {
    type: String,
    required: [true, 'Each flashcard must have an answer.'],
    trim: true,
  }
}, { _id: false });

const flashcardSetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'A user ID is required.'],
  },
  sourceFileId: {
    type: String,
  },
  topic: {
    type: String,
    required: [true, 'A topic is required for each flashcard set.'],
    trim: true,
  },
  // --- UPDATED FOR POLLING ---
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
    required: true
  },
  taskId: {
    type: String,
    trim: true
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  progressMessage: {
    type: String,
    trim: true,
  },
  errorDetails: {
    type: String,
    trim: true
  },
  // ---------------------------
  flashcards: [flashcardSchema],
}, { 
  timestamps: true 
});

const FlashcardSet = mongoose.model('FlashcardSet', flashcardSetSchema);
module.exports = FlashcardSet;
