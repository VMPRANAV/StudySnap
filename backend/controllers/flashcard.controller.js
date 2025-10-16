const AiService = require('../services/ai.service');
const FlashcardSet = require('../models/flashcardSet.model');

// Using a simple in-memory cache for extracted text
const textCache = new Map();

exports.processPdfForFlashcards = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

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
    const documentText = textCache.get(fileId);

    if (!documentText) return res.status(404).json({ message: 'File not processed.' });

    // Pass documentText and prompt as expected by the service
    const flashcards = await AiService.generateFlashcards(documentText, prompt);
    const newSet = new FlashcardSet({ topic: prompt, flashcards });
    await newSet.save();

    res.status(201).json(newSet);
  } catch (error) {
    console.error('Error generating flashcards:', error);
    res.status(500).json({ message: 'Failed to generate flashcards.' });
  }
};

exports.getFlashcardSets = async (req, res) => {
  try {
    const sets = await FlashcardSet.find().sort({ createdAt: -1 });
    res.status(200).json(sets);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch flashcard sets.' });
  }
};
