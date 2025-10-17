const AiService = require('../services/ai.service');
const FlashcardSet = require('../models/flashcardSet.model');

// Using a simple in-memory cache for extracted text
const textCache = new Map();

exports.processPdfForFlashcards = async (req, res) => {
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
    console.error('Error processing PDF for flashcards:', error);
    res.status(500).json({ message: 'Failed to process PDF.' });
  }
};

exports.generateFlashcards = async (req, res) => {
  try {
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
      return res.status(404).json({ 
        message: 'File not processed or expired. Please upload the PDF again.' 
      });
    }

    // Pass documentText and prompt as expected by the service
    const flashcards = await AiService.generateFlashcards(documentText, prompt);

    // Validate flashcards data
    if (!flashcards || !Array.isArray(flashcards) || flashcards.length === 0) {
      throw new Error('AI service returned invalid or empty flashcards data');
    }

    // Create flashcard set with authenticated user's ID
    const newSet = new FlashcardSet({ 
      userId: req.user.id,
      sourceFileId: fileId,
      topic: prompt, 
      flashcards 
    });

    await newSet.save();

    res.status(201).json(newSet);
  } catch (error) {
    console.error('Error generating flashcards:', error);
    res.status(500).json({ 
      message: 'Failed to generate flashcards.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    res.status(200).json(sets);
  } catch (error) {
    console.error('Error fetching flashcard sets:', error);
    res.status(500).json({ message: 'Failed to fetch flashcard sets.' });
  }
};
