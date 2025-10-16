const mongoose = require('mongoose');

// This defines the structure for a single question within a quiz.
// It is a sub-document schema.
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
      (arr) => arr && arr.length > 1, // Ensure there's at least 2 options
      'A question must have at least two options.'
    ]
  },
  correctAnswerIndex: {
    type: Number,
    required: [true, 'A correct answer index is required.'],
    min: [0, 'Answer index cannot be negative.']
  }
}, { _id: false });

// This is the main schema for a complete quiz.
const quizSchema = new mongoose.Schema({
  // For linking to a user account in the future.
  userId: {
    type: String, // Changed from mongoose.Schema.Types.ObjectId
    ref: 'User',
  },
  // For linking to the PDF the quiz was generated from.
  sourceFileId: {
    type: String,
  },
  // The user's prompt or topic for the quiz.
  topic: {
    type: String,
    required: [true, 'A topic is required for each quiz.'],
    trim: true,
  },
  // An array containing all the individual questions for this quiz.
  questions: [questionSchema],
}, {
  // Automatically add 'createdAt' and 'updatedAt' fields.
  timestamps: true,
});

const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;
