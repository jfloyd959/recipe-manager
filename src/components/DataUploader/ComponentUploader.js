import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import './Uploader.css';

const ComponentUploader = ({ onUpload, status }) => {
    const onDrop = useCallback((acceptedFiles) => {
        const file = acceptedFiles[0];
        if (file && (file.type === 'text/markdown' || file.name.endsWith('.md'))) {
            onUpload(file);
        }
    }, [onUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/markdown': ['.md'],
            'text/plain': ['.md']
        },
        multiple: false
    });

    const getStatusMessage = () => {
        switch (status) {
            case 'uploading':
                return 'Processing markdown file...';
            case 'success':
                return '✓ Components imported successfully!';
            case 'error':
                return '✗ Error importing components';
            default:
                return 'Drop markdown file here or click to browse';
        }
    };

    return (
        <div
            {...getRootProps()}
            className={`uploader ${isDragActive ? 'active' : ''} ${status || ''}`}
        >
            <input {...getInputProps()} />
            <div className="upload-content">
                <div className="upload-icon">📝</div>
                <p>{getStatusMessage()}</p>
                <small>Accepts .md files</small>
            </div>
        </div>
    );
};

export default ComponentUploader; 