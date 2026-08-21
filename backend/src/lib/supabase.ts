import { createClient } from '@supabase/supabase-js';
import multer from 'multer';

// Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ''; // Use Service Key for Backend
export const supabase = createClient(supabaseUrl, supabaseKey);

// Multer configuration for general file uploads (PDFs, images, etc.)
export const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 60 * 1024 * 1024, // 60MB limit
        files: 10 // Maximum 10 files per upload
    },
});

// Multer configuration for assignment attachments (larger limit)
export const assignmentUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
        files: 5
    }
});
