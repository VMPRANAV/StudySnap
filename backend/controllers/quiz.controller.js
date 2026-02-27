const AiService = require('../services/ai.service');
const Quiz = require('../models/quiz.model');
const QuizService = require('../services/quiz.service');
const Chunk = require('../models/chunk.model');
// Using a simple in-memory cache for extracted text (similar to flashcard controller)


exports.processPdfForQuiz = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    // Extract text from PDF instead of creating vector store
    const userId = req.user.id;
    const fileId = req.file.originalname;

    await Chunk.deleteMany({ fileId, userId }); // Keep DB clean
    const chunkCount = await AiService.extractAndStorePdf(req.file.path, userId, fileId);

    res.status(200).json({ fileId ,chunkCount});
  } catch (error) {
    console.error('Error processing PDF for quiz:', error);
    res.status(500).json({ message: 'Failed to process PDF.' });
  }
};

exports.generateQuiz = async (req, res) => {
  try {
    console.log('Generate quiz request:', { 
      body: req.body,
      fileId: req.body.fileId, 
      promptLength: req.body.prompt?.length,
      userId: req.user?.id 
    });

    const { fileId, prompt } = req.body;
const quizData = await AiService.generateQuiz(fileId, prompt);

    const newQuiz = new Quiz({ 
      userId: req.user.id,
      sourceFileId: fileId,
      topic: prompt, 
      questions: quizData
    });

    await newQuiz.save();
    res.status(201).json(newQuiz);
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate quiz.' });
  }
    
};

exports.getQuizzes = async (req, res) => {
  try {
    // Validate user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User authentication required.' });
    }
    

    // Get only quizzes belonging to the authenticated user
    const quizzes = await Quiz.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('userId', 'username email');

    res.status(200).json(quizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ message: 'Failed to fetch quizzes.' });
  }
};

exports.submitQuizAttempt = async (req, res) => {
  try {
    console.log('Submit quiz attempt called with:', {
      quizId: req.params.quizId,
      userId: req.user?.id,
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

    // Validate user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User authentication required.' });
    }

    // Call the service to do the heavy lifting
    const result = await QuizService.calculateAndSaveScore(quizId, req.user.id, answers);

    console.log('Quiz attempt result:', result);

    res.status(201).json(result);

  } catch (error) {
    console.error("Error submitting quiz attempt:", error);
    res.status(500).json({ 
      message: error.message || "Failed to submit quiz.",
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};