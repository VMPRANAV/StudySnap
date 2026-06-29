const FlashcardSet = require('../models/flashcardSet.model');
const { AiFastApiError, indexPdf, generateFlashcards } = require('../services/aiFastApi.client');
const { syncGenerationDoc, syncGenerationCollection } = require('../services/generationProgress.service');

function mapAiError(err) {
  if (err instanceof AiFastApiError) {
    if (err.code === 'CONFIG') return { status: 500, message: err.message, code: err.code, details: err.details };
    if (err.code === 'TIMEOUT') return { status: 504, message: err.message, code: err.code, details: err.details };
    if (err.code === 'UNREACHABLE') return { status: 503, message: err.message, code: err.code, details: err.details };
    if (err.code === 'AI_SERVICE_RATE_LIMIT') return { status: 429, message: err.message, code: err.code, details: err.details, upstreamStatus: err.status };
    return { status: 502, message: err.message, code: err.code, details: err.details, upstreamStatus: err.status };
  }
  return { status: 503, message: 'AI service unreachable' };
}

exports.processPdfForFlashcards = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User authentication required.' });
    }

    // Extract text from PDF instead of creating vector store
    const userId = req.user.id;
    const fileId = req.file.originalname; // Use filename as a simple ID
    const { chunkCount } = await indexPdf({
      userId,
      fileId,
      filename: req.file.originalname,
      pdfBuffer: req.file.buffer,
    });

    res.status(200).json({ fileId, chunkCount, message: "PDF indexed successfully" });
  } catch (error) {
    console.error('Error processing PDF for flashcards:', error);
    const mapped = mapAiError(error);
    res.status(mapped.status).json({
      message: mapped.message,
      code: mapped.code,
      upstreamStatus: mapped.upstreamStatus,
      details: mapped.details,
    });
  }
};

exports.generateFlashcards = async (req, res) => {
  try {
    const { fileId, prompt } = req.body;

    const taskInfo = await generateFlashcards({
      userId: req.user.id,
      fileId,
      prompt,
    });

    const newSet = new FlashcardSet({ 
      userId: req.user.id,
      sourceFileId: fileId,
      topic: prompt, 
      flashcards: [],
      taskId: taskInfo.taskId,
      progress: 5,
      progressMessage: taskInfo.message || 'Preparing flashcard generation',
    });

    await newSet.save({ validateBeforeSave: false });
    res.status(201).json(newSet);
  } catch (error) {
    console.error('Error generating flashcards:', error);
    const mapped = mapAiError(error);
    res.status(mapped.status).json({
      message: mapped.message,
      error: error.message,
      code: mapped.code,
      upstreamStatus: mapped.upstreamStatus,
      details: mapped.details,
    });
  }
};

exports.getFlashcardSets = async (req, res) => {
  try {
    // Validate user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User authentication required.' });
    }

    // Get only flashcard sets belonging to the authenticated user
    const sets = await FlashcardSet.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('userId', 'username email');

    await syncGenerationCollection(sets, { documentField: 'flashcards' });
    res.status(200).json(sets);
  } catch (error) {
    console.error('Error fetching flashcard sets:', error);
    res.status(500).json({ message: 'Failed to fetch flashcard sets.' });
  }
};

exports.getFlashcardSetById = async (req, res) => {
  try {
    const set = await FlashcardSet.findOne({ _id: req.params.id, userId: req.user.id });
    if (!set) {
      return res.status(404).json({ message: 'Flashcard set not found.' });
    }

    await syncGenerationDoc(set, { documentField: 'flashcards' });
    res.status(200).json(set);
  } catch (error) {
    console.error('Error fetching flashcard set:', error);
    res.status(500).json({ message: 'Failed to fetch flashcard set.' });
  }
};
