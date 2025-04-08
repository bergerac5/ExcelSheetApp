const express = require('express');
const router = express.Router();
const excelController = require('../controllers/excelController');
const multer = require('multer');

// Configure file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Routes
router.post('/upload', upload.single('file'), excelController.uploadFile);
router.get('/files', excelController.listFiles);
router.get('/download/:filename', excelController.downloadFile);
router.get('/view/:filename', excelController.viewFile);
router.get('/read/:filename', excelController.readFileContent);
router.delete('/delete/:filename', excelController.deleteFile);

module.exports = router;