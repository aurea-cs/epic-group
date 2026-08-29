import multer from 'multer';

// General upload: 60 MB limit, up to 10 files
export const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 60 * 1024 * 1024,
        files: 10,
    },
});

// Assignment upload: 100 MB limit, up to 5 files
export const assignmentUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024,
        files: 5,
    },
});
