import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { supabase } from '../config/supabase';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const model = 'gemini-3.6-flash'; // Suggested by API

// 1. Pista para Quizzes (Hint)
router.post('/hint', async (req: Request, res: Response) => {
    try {
        const { question, options } = req.body;
        
        if (!question) {
            return res.status(400).json({ error: 'Question is required' });
        }

        const prompt = `
Eres un tutor experto. Un estudiante está atascado en la siguiente pregunta de opción múltiple:
Pregunta: "${question}"
${options ? `Opciones: ${JSON.stringify(options)}` : ''}

Tu objetivo es darle una pista guiada para que piense por sí mismo. 
NO le des la respuesta directa ni le digas qué opción elegir. Solo hazle una pregunta reflexiva o dale un pequeño dato clave que lo ayude a deducir la respuesta.
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });

        res.json({ hint: response.text });
    } catch (error: any) {
        console.error('Error generating hint:', error);
        res.status(500).json({ error: 'Error generating hint' });
    }
});

// 2. Explicación Post-respuesta
router.post('/explain', async (req: Request, res: Response) => {
    try {
        const { question, studentAnswer, correctAnswer } = req.body;

        if (!question || !studentAnswer || !correctAnswer) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        const prompt = `
Eres un profesor constructivo. Un estudiante respondió incorrectamente a una pregunta.
Pregunta: "${question}"
Respuesta del estudiante (Incorrecta): "${studentAnswer}"
Respuesta correcta: "${correctAnswer}"

Explica amablemente por qué la respuesta del estudiante es incorrecta y cuál es la lógica detrás de la respuesta correcta. Sé claro, conciso y motivador.
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });

        res.json({ explanation: response.text });
    } catch (error: any) {
        console.error('Error generating explanation:', error);
        res.status(500).json({ error: 'Error generating explanation' });
    }
});

// 3. Generación de Quizzes
router.post('/generate-quiz', async (req: Request, res: Response) => {
    try {
        const { topic, contextText, count = 3 } = req.body;

        if (!topic && !contextText) {
            return res.status(400).json({ error: 'Topic or contextText is required' });
        }

        const prompt = `
Genera un cuestionario de opción múltiple con ${count} preguntas basado en el siguiente tema o contexto.
Tema: ${topic || 'N/A'}
Contexto adicional: ${contextText || 'N/A'}

El cuestionario debe estar en formato JSON estricto, con la siguiente estructura:
[
  {
    "question": "Pregunta 1",
    "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
    "correctAnswer": "Opción A"
  }
]
Devuelve ÚNICAMENTE el JSON válido, sin markdown ni explicaciones adicionales.
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        const quizData = JSON.parse(response.text || '[]');
        res.json({ questions: quizData });
    } catch (error: any) {
        console.error('Error generating quiz:', error);
        res.status(500).json({ error: 'Error generating quiz' });
    }
});

// 4. Chatbot Tutor (RAG)
router.post('/chat', async (req: Request, res: Response) => {
    try {
        const { message, moduleId, studentId, history } = req.body;

        if (!message || !moduleId || !studentId) {
            return res.status(400).json({ error: 'message, moduleId, and studentId are required' });
        }

        // 4.1 Generar embedding para la búsqueda
        const embeddingResp = await ai.models.embedContent({
            model: 'gemini-embedding-001',
            contents: message,
        });

        const embedding = embeddingResp.embeddings?.[0]?.values;

        if (!embedding) {
            throw new Error('Failed to generate embedding');
        }

        // 4.2 Buscar contexto en Supabase usando pgvector RPC
        const { data: matchedContent, error: matchError } = await supabase.rpc('match_module_content', {
            query_embedding: embedding,
            match_threshold: 0.6,
            match_count: 3,
            filter_module_id: moduleId
        });

        let contextText = '';
        if (!matchError && matchedContent && matchedContent.length > 0) {
            contextText = matchedContent.map((m: any) => m.content_text).join('\n\n');
        }

        // 4.3 Obtener nivel del estudiante
        const { data: levelData } = await supabase
            .from('student_module_levels')
            .select('level_category, ai_notes')
            .eq('student_id', studentId)
            .eq('module_id', moduleId)
            .single();

        const studentLevel = levelData?.level_category || 'Principiante';

        // 4.4 Construir el prompt RAG
        const systemInstruction = `
Eres un tutor de IA dedicado a ayudar al estudiante a comprender el módulo actual.
Tu objetivo es responder a las dudas basándote PRINCIPALMENTE en el material de referencia proporcionado.
Nivel evaluado del estudiante: ${studentLevel}
Adapta tu lenguaje y nivel de profundidad al nivel del estudiante.
Si la información no está en el material de referencia, usa tu conocimiento general, pero aclara que no es parte del contenido del curso.
Material de referencia relevante recuperado:
${contextText || '(No se encontró material de referencia exacto, usa tu conocimiento para guiarlo en base al tema del módulo)'}
        `;

        // Create messages array
        let messages: any[] = [];
        if (history && Array.isArray(history)) {
            messages = history.map((h: any) => ({
                role: h.role, // 'user' or 'model'
                parts: [{ text: h.text }]
            }));
        }
        
        messages.push({
            role: 'user',
            parts: [{ text: message }]
        });

        const response = await ai.models.generateContent({
            model: model,
            contents: messages,
            config: {
                systemInstruction: systemInstruction,
            }
        });

        res.json({ reply: response.text });
    } catch (error: any) {
        console.error('Error in RAG chat:', error);
        res.status(500).json({ error: 'Error processing chat' });
    }
});

export default router;
