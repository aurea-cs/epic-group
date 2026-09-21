const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load .env manually
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8').split('\n');
  for (let line of envConfig) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("No Gemini API Key found in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
// Using a reliable model for translation
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const esPath = path.resolve(__dirname, '../src/locales/es.json');
const enPath = path.resolve(__dirname, '../src/locales/en.json');

const es = JSON.parse(fs.readFileSync(esPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Helper to find missing keys
function getMissingTexts(source, target, currentPath = '') {
  let missing = {};
  for (const key in source) {
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      const nestedMissing = getMissingTexts(source[key], target[key], currentPath ? `${currentPath}.${key}` : key);
      if (Object.keys(nestedMissing).length > 0) {
        missing[key] = nestedMissing;
      }
    } else {
      if (!target[key]) {
        missing[key] = source[key];
      }
    }
  }
  return missing;
}

// Function to translate missing object
async function translateObject(obj) {
  const prompt = `
Translate the following JSON object values from Spanish to English.
Keep the exact same JSON structure and keys, ONLY translate the string values.
Respond ONLY with the raw valid JSON, without any markdown formatting like \`\`\`json. Do not include any other text.

JSON to translate:
${JSON.stringify(obj, null, 2)}
`;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    // Clean up potential markdown formatting from the response
    text = text.replace(/^```(json)?\s*/i, '').replace(/```$/i, '').trim();
    return JSON.parse(text);
  } catch (e) {
    console.error("Translation error:", e);
    return null;
  }
}

// Merge translated object into target
function mergeDeep(target, source) {
  for (const key in source) {
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!target[key]) Object.assign(target, { [key]: {} });
      mergeDeep(target[key], source[key]);
    } else {
      Object.assign(target, { [key]: source[key] });
    }
  }
  return target;
}

async function run() {
  console.log("Detecting missing translations...");
  const missing = getMissingTexts(es, en);
  
  if (Object.keys(missing).length === 0) {
    console.log("No missing translations found!");
    return;
  }
  
  console.log("Missing texts to translate:", JSON.stringify(missing, null, 2));
  console.log("Translating with Gemini...");
  
  const translated = await translateObject(missing);
  if (translated) {
    mergeDeep(en, translated);
    fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n');
    console.log("Translations saved successfully to en.json!");
  } else {
    console.log("Failed to get valid JSON from Gemini.");
  }
}

run();
