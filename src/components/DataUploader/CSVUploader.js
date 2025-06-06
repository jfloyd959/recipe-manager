import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import './Uploader.css';

const CSVUploader = ({ onUpload, status }) => {
    const onDrop = useCallback((acceptedFiles) => {
        const file = acceptedFiles[0];
        if (file && file.type === 'text/csv') {
            onUpload(file);
        }
    }, [onUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv']
        },
        multiple: false
    });

    const getStatusMessage = () => {
        switch (status) {
            case 'uploading':
                return 'Processing CSV file...';
            case 'success':
                return '✓ CSV imported successfully!';
            case 'error':
                return '✗ Error importing CSV file';
            default:
                return 'Drop CSV file here or click to browse';
        }
    };

    return (
        <div
            {...getRootProps()}
            className={`uploader ${isDragActive ? 'active' : ''} ${status || ''}`}
        >
            <input {...getInputProps()} />
            <div className="upload-content">
                <div className="upload-icon">📊</div>
                <p>{getStatusMessage()}</p>
                <small>Accepts .csv files</small>
            </div>
        </div>
    );
};

export default CSVUploader; 