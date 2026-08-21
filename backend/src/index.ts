import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import usersRouter from './routes/users';
import studentsRouter from './routes/students';
import commentsRouter from './routes/comments';
import professorsRouter from './routes/professors';
import centersRouter from './routes/centers';
import gradesRouter from './routes/grades';
import subjectsRouter from './routes/subjects';
import moduleItemsRouter from './routes/module_items';
import modulesRouter from './routes/modules';
import assignmentsRouter from './routes/assignments';
import adminRouter from './routes/admin';
import uploadRouter from './routes/upload';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());


// Admin - Centers CRUD + professor assignments + hierarchy
app.use('/api/admin/centers', centersRouter);

// Admin - Grades + Enrollments + Grade Content
app.use('/api/admin', gradesRouter);

// Admin - Subjects CRUD + professor assignments + student listing + module-item visibility
app.use('/api/admin/subjects', subjectsRouter);
app.use('/api/subjects', subjectsRouter);
app.use('/api', moduleItemsRouter);

// Admin - Modules + Items + VR Codes
app.use('/api/admin', modulesRouter);
app.use('/api', modulesRouter);

// Admin - User management (students, professors, tutors, user CRUD)
app.use('/api/admin', adminRouter);

// Users (center lookup, activity, profile-details, student listing)
app.use('/api/users', usersRouter);

// Professors (courses, grades-summary, centers) + Tutors
app.use('/api/professors', professorsRouter);
app.use('/api/tutors', professorsRouter);

// Students (courses, progress, read-items, comments, listing)
app.use('/api/students', studentsRouter);

// Comments (update, delete)
app.use('/api/comments', commentsRouter);

// Assignments + Submissions + Calendar Events + Calendar/Schedule views
app.use('/api', assignmentsRouter);

// Uploads
app.use('/api/upload', uploadRouter);

// Running
app.get('/', (req, res) => {
    res.send('Backend API Running 🚀');
});

// Health
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
