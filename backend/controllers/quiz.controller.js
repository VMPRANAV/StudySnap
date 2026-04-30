const Quiz = require('../models/quiz.model');
const QuizService = require('../services/quiz.service');
const { AiFastApiError, indexPdf, generateQuiz } = require('../services/aiFastApi.client');

function mapAiError(err) {
  if (err instanceof AiFastApiError) {
    if (err.code === 'CONFIG') return { status: 500, message: err.message };
    if (err.code === 'TIMEOUT') return { status: 504, message: err.message };
    return { status: 502, message: err.message };
  }
  return { status: 503, message: 'AI service unreachable' };
}

exports.processPdfForQuiz = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    // Extract text from PDF instead of creating vector store
    const userId = req.user.id;
    const fileId = req.file.originalname;

    const { chunkCount } = await indexPdf({
      userId,
      fileId,
      filename: req.file.originalname,
      pdfBuffer: req.file.buffer,
    });

    res.status(200).json({ fileId ,chunkCount});
  } catch (error) {
    console.error('Error processing PDF for quiz:', error);
    const mapped = mapAiError(error);
    res.status(mapped.status).json({ message: mapped.message });
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
    const quizData = await generateQuiz({
      userId: req.user.id,
      fileId,
      prompt,
    });

    const newQuiz = new Quiz({ 
      userId: req.user.id,
      sourceFileId: fileId,
      topic: prompt, 
      questions: quizData
    });

    await newQuiz.save();
    res.status(201).json(newQuiz);
  } catch (error) {
    console.error('Error generating quiz:', error);
    const mapped = mapAiError(error);
    res.status(mapped.status).json({ message: mapped.message, error: error.message });
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
