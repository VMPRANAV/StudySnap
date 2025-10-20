const mongoose = require('mongoose');

// Defines the structure for a single question-answer pair within a set.
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

// This is the main schema for a complete Question & Answer set.
const qaSetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'A user ID is required.'],
  },
  sourceFileId: {
    type: String, // Can be the original filename or a unique ID
    required: true,
  },
  topic: {
    type: String,
    required: [true, 'A topic is required for each Q&A set.'],
    trim: true,
  },
  // An array containing all the individual Q&A pairs.
  questions: [qaPairSchema],
}, {
  // Automatically add 'createdAt' and 'updatedAt' fields.
  timestamps: true,
});

const QaSet = mongoose.model('QaSet', qaSetSchema);

module.exports = QaSet;
