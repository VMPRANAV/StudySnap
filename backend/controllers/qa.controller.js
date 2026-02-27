const AiService = require('../services/ai.service');
const QaSet = require('../models/qaSet.model');
const PDFDocument = require('pdfkit');
const Chunk = require('../models/chunk.model');
// Using a simple in-memory cache for extracted text, same as other controllers


exports.processPdfForQa = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
const userId = req.user.id;
    const fileId = req.file.originalname;
   await Chunk.deleteMany({ fileId, userId });

const chunkCount = await AiService.extractAndStorePdf(req.file.path, userId, fileId);
res.status(200).json({ fileId, chunkCount, message: "Ready for Q&A generation" });
 
  } catch (error) {
    console.error('Error processing PDF for Q&A:', error);
    res.status(500).json({ message: 'Failed to process PDF.' });
  }
};

exports.generateQaSet = async (req, res) => {
  try {
    const { fileId, prompt, marksDistribution } = req.body;

    if (!fileId || !prompt || !marksDistribution) {
      return res.status(400).json({ message: 'fileId, prompt, and marksDistribution are required.' });
    }
    
    // Basic validation for marksDistribution
    if (typeof marksDistribution !== 'object' || Object.keys(marksDistribution).length === 0) {
        return res.status(400).json({ message: 'marksDistribution must be a non-empty object.' });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User authentication required.' });
    }


    // Generate Q&A data using the AI service
    const qaData = await AiService.generateQaSet(fileId, prompt, marksDistribution);
    
    if (!qaData || !Array.isArray(qaData) || qaData.length === 0) {
      throw new Error('AI service returned invalid or empty Q&A data');
    }

    // Create a new Q&A Set document
    const newQaSet = new QaSet({ 
      userId: req.user.id,
      sourceFileId: fileId,
      topic: prompt, 
      questions: qaData
    });

    await newQaSet.save();
    console.log('Q&A Set saved successfully:', newQaSet._id);

    res.status(201).json(newQaSet);
  } catch (error) {
    console.error('Error generating Q&A set:', {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: 'Failed to generate Q&A set.' });
  }
};

exports.getQaSets = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User authentication required.' });
    }

    const sets = await QaSet.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(sets);
  } catch (error) {
    console.error('Error fetching Q&A sets:', error);
    res.status(500).json({ message: 'Failed to fetch Q&A sets.' });
  }
};


exports.generateQaPdf = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User authentication required.' });
    }

    const qaSet = await QaSet.findOne({ _id: id, userId: req.user.id });

    if (!qaSet) {
      return res.status(404).json({ message: 'Q&A Set not found or you do not have permission to access it.' });
    }

    const doc = new PDFDocument({ margin: 50 });

    // Set headers for PDF download
    const filename = `${qaSet.topic.replace(/\s+/g, '_')}_QA.pdf`;
    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'application/pdf');

    // Pipe PDF document to response
    doc.pipe(res);

    // Add content
    doc.fontSize(20).font('Helvetica-Bold').text(qaSet.topic, { align: 'center' });
    doc.moveDown(2);

    qaSet.questions.forEach((qa, index) => {
      doc.fontSize(14).font('Helvetica-Bold').text(`Q${index + 1}: ${qa.question} [${qa.marks} Marks]`);
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').text(`Answer: ${qa.answer}`, {
          align: 'justify'
      });
      doc.moveDown(1.5);
    });

    // Finalize the PDF and end the stream
    doc.end();

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: 'Failed to generate PDF.' });
  }
};
