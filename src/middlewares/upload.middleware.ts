/**
 * Upload Middleware
 * Handle file uploads using Multer
 */

import multer from 'multer';
import { AppError } from './error.middleware';
import { ErrorCodes } from '../utils/response.util';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Only JPG, JPEG, and PNG files are allowed'));
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB max file size
    },
});

export default upload;
