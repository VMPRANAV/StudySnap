const express = require('express');
const router = express.Router();
const qaController = require('../controllers/qa.controller');
const { protect } = require('../middleware/auth.middleware'); // Assuming you have auth middleware
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });


router.post('/upload', protect, upload.single('file'), qaController.processPdfForQa);

router.post('/generate', protect, qaController.generateQaSet);

router.get('/', protect, qaController.getQaSets);


router.get('/:id/pdf', protect, qaController.generateQaPdf);

module.exports = router;
