const mongoose = require('mongoose');

// This schema defines the structure for storing a user's answer to a single question.
const answerSchema = new mongoose.Schema({
  questionIndex: {
    type: Number,
    required: true,
  },
  selectedAnswerIndex: {
    type: Number,
    required: true,
  }
}, { _id: false });

// This is the main schema for a single attempt at a quiz.
const quizAttemptSchema = new mongoose.Schema({
  // A reference to the specific quiz that was taken.
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz', // This links it to the Quiz model
    required: [true, 'A quiz ID is required for an attempt.'],
  },
  // A reference to the user who took the quiz.
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'A user ID is required.'],
  },
  // An array containing all the answers submitted by the user.
  answers: [answerSchema],
  // The final calculated score for this attempt.
  score: {
    type: Number,
    required: true,
    min: 0,
  },
  // The total number of questions in the quiz at the time of the attempt.
  totalQuestions: {
    type: Number,
    required: true,
    min: 0,
  },
}, {
  // Automatically add 'createdAt' and 'updatedAt' fields. 'createdAt' will mark when the attempt was completed.
  timestamps: true,
});

const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);

module.exports = QuizAttempt;
