
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let genAI = null;
let model = null;

if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: "You are a helpful AI assistant for an Ambulatory Surgery Center (ASC) called 'ASC Manager'. Your role is to assist administrators, surgeons, and nurses with questions related to outpatient surgery, ASC operations, CPT codes, patient management, and general medical inquiries relevant to a surgery center. Do not answer questions that are completely unrelated to medical or ASC operations. Be professional, concise, and helpful."
    });
}

export const sendMessageToGemini = async (message, history = []) => {
    if (!model) {
        if (!API_KEY) {
            return "Error: Gemini API Key is missing. Please add VITE_GEMINI_API_KEY to your .env file.";
        }
        return "Error: AI Model not initialized.";
    }

    try {
        const chat = model.startChat({
            history: history.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }],
            })),
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Sorry, I encountered an error processing your request. Please try again later.";
    }
};
