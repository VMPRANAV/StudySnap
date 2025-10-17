const mongoose = require('mongoose');

// This defines the structure for a single flashcard within a set.
// It's a sub-document schema and will be used as an array inside the main schema.
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
}, { _id: false }); // _id is not needed for sub-documents in this case

// This is the main schema for a complete set of flashcards.
const flashcardSetSchema = new mongoose.Schema({
  // For linking to a user account in the future.
 userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'A user ID is required.'],
  },
  // For linking to the specific uploaded file in the future.
  sourceFileId: {
    type: String, // Can be changed to ObjectId if you create a File model
    // required: true,
  },
  // The user's prompt or topic for the flashcard set.
  topic: {
    type: String,
    required: [true, 'A topic is required for each flashcard set.'],
    trim: true,
  },
  // An array containing all the individual flashcards for this set.
  flashcards: [flashcardSchema],
}, {
  // Automatically add 'createdAt' and 'updatedAt' fields.
  timestamps: true,
});

// Create the Mongoose model from the schema.
const FlashcardSet = mongoose.model('FlashcardSet', flashcardSetSchema);

module.exports = FlashcardSet;
