// backend/models/quiz.model.js
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: [true, 'Each question must have text.'],
    trim: true,
  },
  options: {
    type: [String],
    required: [true, 'Each question must have options.'],
    validate: [
      (arr) => arr && arr.length > 1,
      'A question must have at least two options.'
    ]
  },
  correctAnswerIndex: {
    type: Number,
    required: [true, 'A correct answer index is required.'],
    min: [0, 'Answer index cannot be negative.']
  }
}, { _id: false });

const quizSchema = new mongoose.Schema({
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
    required: [true, 'A topic is required for each quiz.'],
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
  questions: [questionSchema], // Stored as empty array [] during 'pending' state
}, { 
  timestamps: true 
});

const Quiz = mongoose.model('Quiz', quizSchema);
module.exports = Quiz;
