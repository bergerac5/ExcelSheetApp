const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

function isRowBolded(workbook, worksheet, rowIndex) {
    if (!worksheet['!ref']) return false;
    
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: col });
      const cell = worksheet[cellAddress];
      
      if (cell && cell.s && workbook.Styles && workbook.Styles.CellXf) {
        const style = workbook.Styles.CellXf[cell.s];
        if (style?.font?.bold) return true;
      }
    }
    return false;
  }

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
    
          const ext = path.extname(filename).toLowerCase();
          let content = [];
    
          if (ext === '.xlsx' || ext === '.xls') {
            const workbook = XLSX.readFile(filePath);
            
            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
              return res.json({ 
                success: true, 
                filename, 
                content: [], 
                type: ext,
                message: "No sheets found in the Excel file"
              });
            }
    
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            if (!worksheet || !worksheet['!ref']) {
              return res.json({ 
                success: true, 
                filename, 
                content: [], 
                type: ext,
                message: "Worksheet is empty"
              });
            }
    
            const rows = XLSX.utils.sheet_to_json(worksheet, {
              header: 1,
              blankrows: true,
              defval: null,
            });
    
            // Filter out completely empty rows
            const filteredRows = rows.filter(row => 
              !row.every(cell => cell === null || cell === '')
            );
    
            if (filteredRows.length === 0) {
              return res.json({ 
                success: true, 
                filename, 
                content: [], 
                type: ext,
                message: "No data found in the sheet"
              });
            }
    
            // Process tables only if data exists
            const tables = [];
            let currentTable = null;
            let state = "SEEK_TITLE";
    
            for (let i = 0; i < filteredRows.length; i++) {
              const row = filteredRows[i];
              const isRowEmpty = row.every(cell => cell === null || cell === '');
    
              if (isRowEmpty && !currentTable) continue;
    
              switch (state) {
                case "SEEK_TITLE":
                  if (!isRowEmpty && isRowBolded(workbook, worksheet, i)) {
                    currentTable = {
                      title: row[0] || 'Untitled',
                      headers: [],
                      data: []
                    };
                    state = "SEEK_HEADERS";
                  }
                  break;
    
                case "SEEK_HEADERS":
                  if (!isRowEmpty) {
                    currentTable.headers = row.map(h => h || '');
                    state = "COLLECT_DATA";
                  }
                  break;
    
                case "COLLECT_DATA":
                  if (isRowEmpty) {
                    tables.push(currentTable);
                    currentTable = null;
                    state = "SEEK_TITLE";
                  } else {
                    currentTable.data.push(row);
                  }
                  break;
              }
            }
    
            if (currentTable) tables.push(currentTable);
            content = tables.length > 0 ? tables : filteredRows;
          }
    
          res.json({ 
            success: true, 
            filename, 
            content, 
            type: ext,
            message: content.length === 0 ? "No tables detected" : ""
          });
        } catch (error) {
          res.status(500).json({ 
            success: false, 
            message: error.message,
            details: "Error processing Excel file" 
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