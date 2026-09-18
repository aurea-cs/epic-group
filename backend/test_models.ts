import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  const models = ['embedding-001', 'gemini-embedding-2', 'gemini-embedding-001', 'text-embedding-004'];
  for (const m of models) {
    try {
      await ai.models.embedContent({
          model: m,
          contents: "hola",
      });
      console.log(`Success ${m}!`);
    } catch (e: any) {
      console.error(`${m} failed:`, e.message);
    }
  }
}
run();
