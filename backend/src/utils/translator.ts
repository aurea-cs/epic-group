import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function translateToEnglish(text: string): Promise<string | null> {
    if (!text || text.trim() === '') return null;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: `Translate the following Spanish text to English. Respond ONLY with the translated text, without quotes, explanations, or formatting.\n\nText: ${text}`
        });
        
        return response.text?.trim() || null;
    } catch (error) {
        console.error('Error translating to English:', error);
        return null; // Fail gracefully so we don't block content creation
    }
}
