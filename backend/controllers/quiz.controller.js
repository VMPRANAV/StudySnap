const AiService = require('../services/ai.service');
const Quiz = require('../models/quiz.model');

const QuizService = require('../services/quiz.service'); // Add this missing import

// Using a simple in-memory cache for extracted text (similar to flashcard controller)
const textCache = new Map();

exports.processPdfForQuiz = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

    // Extract text from PDF instead of creating vector store
    const documentText = await AiService.extractTextFromPdf(req.file.path);
    const fileId = req.file.originalname; // Use filename as a simple ID
    textCache.set(fileId, documentText);

    res.status(200).json({ fileId });
  } catch (error) {
    console.error('Error processing PDF for quiz:', error);
    res.status(500).json({ message: 'Failed to process PDF.' });
  }
};

exports.generateQuiz = async (req, res) => {
  try {
    const { fileId, prompt } = req.body;
    const documentText = textCache.get(fileId);

    if (!documentText) return res.status(404).json({ message: 'File not processed.' });

    // Pass documentText and prompt as expected by the service
    const quizData = await AiService.generateQuiz(documentText, prompt);
    const newQuiz = new Quiz({ topic: prompt, questions: quizData });
    await newQuiz.save();

    res.status(201).json(newQuiz);
  } catch (error) {
    console.error('Error generating quiz:', error);
    res.status(500).json({ message: 'Failed to generate quiz.' });
  }
};

exports.getQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find().sort({ createdAt: -1 });
    res.status(200).json(quizzes);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch quizzes.' });
  }
};
exports.submitQuizAttempt = async (req, res) => {
  try {
    console.log('Submit quiz attempt called with:', {
      quizId: req.params.quizId,
      userId: req.user?.id, // From JWT token
      body: req.body
    });

    const { quizId } = req.params;
    const { answers } = req.body;

    // Validate input
    if (!quizId) {
      return res.status(400).json({ message: 'Quiz ID is required.' });
    }

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Answers array is required.' });
    }

    // Get userId from authenticated user (from JWT middleware)
    const userId = req.user?.id || null;

    // Call the service to do the heavy lifting
    const result = await QuizService.calculateAndSaveScore(quizId, userId, answers);

    console.log('Quiz attempt result:', result);

    // Send the result back to the client
    res.status(201).json(result);

  } catch (error) {
    console.error("Error submitting quiz attempt:", error);
    res.status(500).json({ 
      message: error.message || "Failed to submit quiz.",
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};