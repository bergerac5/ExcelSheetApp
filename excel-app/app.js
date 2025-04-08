const express = require('express');
const multer = require('multer');
const excelRoutes = require('./routes/excelRoutes');
const cors = require('cors'); // Add this
const fs = require('fs'); // Add this
const path = require('path'); // Add this

const app = express();
const port = 3000;

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Middleware
app.use(cors()); // Enable CORS
app.use(express.json()); // Fixed - added parentheses
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/excel', excelRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something broke!' });
});

app.listen(port, () => {
  console.log(`Excel app running on http://localhost:${port}`);
});