const express = require('express');
const multer = require('multer');
const flashcardController = require('../controllers/flashcard.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Use multer for handling multipart/form-data, primarily for file uploads
const upload = multer({ dest: 'uploads/' });

// Route to upload a PDF and process it into a vector store for flashcards
router.post('/upload',protect, upload.single('file'), flashcardController.processPdfForFlashcards);

// Route to generate flashcards from a previously uploaded PDF
router.post('/generate',protect, flashcardController.generateFlashcards);

// Route to get all saved flashcard sets
router.get('/',protect, flashcardController.getFlashcardSets);

module.exports = router;
