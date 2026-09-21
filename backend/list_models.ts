import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  try {
    const response = await ai.models.list();
    console.log("Models listed:");
    for await (const m of response) {
        console.log(m.name);
    }
  } catch (e) {
    console.error(e);
  }
}
run();
