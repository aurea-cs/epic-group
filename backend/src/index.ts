// Backend Index
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import {
    usersRouter,
    studentsRouter,
    tutorsRouter,
    professorsRouter,
    centersRouter,
    gradesRouter,
    subjectsRouter,
    modulesRouter,
    itemsRouter,
    assignmentsRouter,
    submissionsRouter,
    calendarRouter,
    commentsRouter,
    uploadRouter,
} from './routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// ── Core Middleware ────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Route Modules ──────────────────────────────────────────────────────────────
app.use(usersRouter);
app.use(studentsRouter);
app.use(tutorsRouter);
app.use(professorsRouter);
app.use(centersRouter);
app.use(gradesRouter);
app.use(subjectsRouter);
app.use(modulesRouter);
app.use(itemsRouter);
app.use(assignmentsRouter);
app.use(submissionsRouter);
app.use(calendarRouter);
app.use(commentsRouter);
app.use(uploadRouter);

// ── Utility Routes ─────────────────────────────────────────────────────────────

// Basic Route
app.get('/', (req, res) => {
    res.send('Backend API Running 🚀');
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Global Error Handler ───────────────────────────────────────────────────────
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Global Error Handler:', err);
    res.status(500).json({
        error: err.message || 'Internal Server Error',
        stack: err.stack,
        details: JSON.stringify(err)
    });
});

// ── Start Server ───────────────────────────────────────────────────────────────
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
