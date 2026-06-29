// backend/models/qaSet.model.js
const mongoose = require('mongoose');

const qaPairSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Each item must have a question.'],
    trim: true,
  },
  answer: {
    type: String,
    required: [true, 'Each item must have an answer.'],
    trim: true,
  },
  marks: {
    type: Number,
    required: [true, 'Marks are required for each question.'],
    min: 1,
  }
}, { _id: false });

const qaSetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'A user ID is required.'],
  },
  sourceFileId: {
    type: String,
    required: true,
  },
  topic: {
    type: String,
    required: [true, 'A topic is required for each Q&A set.'],
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
  errorDetails: {
    type: String,
    trim: true
  },
  // ---------------------------
  questions: [qaPairSchema],
}, { 
  timestamps: true 
});

const QaSet = mongoose.model('QaSet', qaSetSchema);
module.exports = QaSet;
