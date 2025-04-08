const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const excelController = {
    // Store uploaded file and return file info
    uploadFile: async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: "No file uploaded" });
            }

            // Return file information
            res.json({
                success: true,
                filename: req.file.filename,
                originalname: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype,
                path: req.file.path
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    // Get list of uploaded files
    listFiles: async (req, res) => {
        try {
            const uploadDir = './uploads';

            // Read directory contents
            fs.readdir(uploadDir, (err, files) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: "Unable to scan files"
                    });
                }

                // Get file details
                const fileList = files.map(file => {
                    const filePath = path.join(uploadDir, file);
                    const stats = fs.statSync(filePath);

                    return {
                        filename: file,
                        path: filePath,
                        size: stats.size,
                        createdAt: stats.birthtime,
                        modifiedAt: stats.mtime
                    };
                });

                res.json({
                    success: true,
                    files: fileList
                });
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    // Download a specific file
    downloadFile: async (req, res) => {
        try {
            const { filename } = req.params;
            const filePath = path.join('./uploads', filename);

            if (!fs.existsSync(filePath)) {
                return res.status(404).json({
                    success: false,
                    message: "File not found"
                });
            }

            res.download(filePath);
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },
    
    viewFile: async (req, res) => {
        try {
            const { filename } = req.params;
            const filePath = path.join('./uploads', filename);

            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ success: false, message: "File not found" });
            }

            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            res.json({
                success: true,
                data: jsonData,
                filename: filename
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    readFileContent: async (req, res) => {
        try {
          const { filename } = req.params;
          const filePath = path.join('./uploads', filename);
          
          if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: "File not found" });
          }
      
          // Read file based on extension
          const ext = path.extname(filename).toLowerCase();
          let content;
      
          if (ext === '.csv') {
            content = await new Promise((resolve, reject) => {
              const results = [];
              fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', () => resolve(results))
                .on('error', reject);
            });
          } else if (ext === '.xlsx' || ext === '.xls') {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            content = XLSX.utils.sheet_to_json(worksheet);
          } else {
            content = fs.readFileSync(filePath, 'utf-8');
          }
      
          res.json({
            success: true,
            filename,
            content,
            type: ext
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            message: error.message
          });
        }
    },

    // Delete a file from uploads directory
    deleteFile: async (req, res) => {
        try {
            const { filename } = req.params;
            const filePath = path.join('./uploads', filename);

            if (!fs.existsSync(filePath)) {
                return res.status(404).json({
                    success: false,
                    message: "File not found"
                });
            }

            fs.unlink(filePath, (err) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: err.message
                    });
                }

                res.json({
                    success: true,
                    message: "File deleted successfully",
                    filename: filename
                });
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
};

module.exports = excelController;