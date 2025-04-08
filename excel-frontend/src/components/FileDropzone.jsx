// src/components/FileDropzone.jsx
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import '../css/Dropzone.css';

const FileDropzone = ({ onFileAccepted }) => {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      onFileAccepted(acceptedFiles[0]);
    }
  }, [onFileAccepted]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    },
    maxFiles: 1
  });

  return (
    <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop the Excel file here...</p>
      ) : (
        <p>Drag & drop an Excel file here, or click to select</p>
      )}
      
    </div>
  );
};

export default FileDropzone;