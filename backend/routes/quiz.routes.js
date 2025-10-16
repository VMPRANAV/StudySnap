const express = require('express');
const multer = require('multer');
const quizController = require('../controllers/quiz.controller');
const { protect } = require('../middleware/auth.middleware');
const router = express.Router();

const upload = multer({ dest: 'uploads/' });

// Route to upload a PDF and process it into a vector store for quizzes
router.post('/upload', protect,upload.single('file'), quizController.processPdfForQuiz);

// Route to generate a quiz from a previously uploaded PDF
router.post('/generate', protect,quizController.generateQuiz);

// Route to get all saved quizzes
router.get('/', protect,quizController.getQuizzes);

// (Future route) Route to handle a user submitting their answers for a quiz
router.post('/:quizId/submit',protect, quizController.submitQuizAttempt);

module.exports = router;
