
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from '../lib/supabase';

let genAI = null;
let model = null;
let currentKey = null;

const initializeGemini = async () => {
    try {
        // 1. Try database settings FIRST (User Request)
        let apiKey = null;
        const settings = await db.getSettings();
        if (settings && settings.gemini_api_key) {
            apiKey = settings.gemini_api_key;
        }

        // 2. Fallback to environment variable if DB key is missing
        if (!apiKey) {
            apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        }

        if (!apiKey) {
            console.error("Gemini API Key missing from both .env and database settings.");
            return null;
        }

        // If key hasn't changed and model exists, return existing model
        if (model && currentKey === apiKey) {
            return model;
        }

        // Initialize new model
        genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: "You are a helpful AI assistant for an Ambulatory Surgery Center (ASC) called 'ASC Manager'. Your role is to assist administrators, surgeons, and nurses with questions related to outpatient surgery, ASC operations, CPT codes, patient management, and general medical inquiries relevant to a surgery center. Do not answer questions that are completely unrelated to medical or ASC operations. Be professional, concise, and helpful."
        });
        currentKey = apiKey;

        return model;
    } catch (error) {
        console.error("Error initializing Gemini:", error);
        return null;
    }
};

export const sendMessageToGemini = async (message, history = [], contextData = null) => {
    const activeModel = await initializeGemini();

    if (!activeModel) {
        return "Error: Gemini API Key is missing. Please add it to Settings -> AI Configuration.";
    }

    try {
        const chat = activeModel.startChat({
            history: history.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }],
            })),
        });

        let finalMessage = message;
        if (contextData) {
            finalMessage = `[System Data Context]:\n${contextData}\n\n[User Question]:\n${message}`;
        }

        const result = await chat.sendMessage(finalMessage);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini API Error:", error);
        if (error.status === 429 || error.message?.includes("429")) {
            return "Quota exceeded for the Gemini API (Free Tier). The daily limit for this model has been reached. Please try again tomorrow or upgrade your API plan.";
        }
        return "Sorry, I encountered an error processing your request. Please try again later.";
    }
};
