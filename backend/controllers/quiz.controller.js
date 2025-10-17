const AiService = require('../services/ai.service');
const Quiz = require('../models/quiz.model');
const QuizService = require('../services/quiz.service');

// Using a simple in-memory cache for extracted text (similar to flashcard controller)
const textCache = new Map();

exports.processPdfForQuiz = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

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
    console.log('Generate quiz request:', { 
      body: req.body,
      fileId: req.body.fileId, 
      promptLength: req.body.prompt?.length,
      userId: req.user?.id 
    });

    const { fileId, prompt } = req.body;

    // Validate required fields
    if (!fileId) {
      return res.status(400).json({ message: 'fileId is required.' });
    }

    if (!prompt) {
      return res.status(400).json({ message: 'prompt is required.' });
    }

    // Validate user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User authentication required.' });
    }

    const documentText = textCache.get(fileId);

    if (!documentText) {
      console.error('Document text not found in cache for fileId:', fileId);
      console.log('Available cache keys:', Array.from(textCache.keys()));
      return res.status(404).json({ 
        message: 'File not processed or expired. Please upload the PDF again.',
        availableFiles: Array.from(textCache.keys()) // For debugging
      });
    }

    console.log('Document text length:', documentText.length);
    console.log('Calling AiService.generateQuiz...');

    // Generate quiz data
    const quizData = await AiService.generateQuiz(documentText, prompt);
    
    console.log('Quiz data generated:', {
      questionsCount: quizData?.length,
      firstQuestion: quizData?.[0]
    });

    // Validate quiz data
    if (!quizData || !Array.isArray(quizData) || quizData.length === 0) {
      throw new Error('AI service returned invalid or empty quiz data');
    }

    // Create quiz with authenticated user's ID
    const newQuiz = new Quiz({ 
      userId: req.user.id,
      sourceFileId: fileId,
      topic: prompt, 
      questions: quizData
    });

    await newQuiz.save();

    console.log('Quiz saved successfully:', newQuiz._id);

    res.status(201).json(newQuiz);
  } catch (error) {
    console.error('Error generating quiz:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      message: 'Failed to generate quiz.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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