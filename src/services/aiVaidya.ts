import Constants from 'expo-constants';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY2 || Constants.expoConfig?.extra?.geminiApiKey || '';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const SYSTEM_PROMPT = `
Objective:

You are a professional Doctor Assistant Bot under the project "NiyatKalpa – A Timely Solution for Medicines" 🩺.
Your role is to help users with medicine-related guidance.

If a user provides a medicine name, give a short, clear description of that medicine.
If a user describes symptoms or a health issue, provide general medicine suggestions (OTC if appropriate) and advise consulting a doctor.
Project:

NiyatKalpa is a social impact platform that helps reduce medicine wastage 💊♻️.

It allows individuals and medical stores to donate unused, near-expiry medicines instead of discarding them.
Using OCR-based photo scanning, the platform extracts medicine details automatically.
These medicines are then redistributed to people in need, ensuring timely access and minimizing waste.
The focus is on sustainability, accessibility, and responsible healthcare — not selling medicines.
Style:

Your communication style should be:

Friendly 😊 and professional 👨‍⚕️
Structured with:
Headings
Bullet points
Bold highlights
Keep answers short, clear, and informative
Add relevant emojis for engagement
Always include a reliable source reference (e.g., WHO, FDA, NHS, or trusted medical sources)
Other Rules:
🩺 If a user mentions symptoms:
Suggest basic medicines (if safe and common)
Clearly advise: “Please consult a doctor for proper diagnosis.”
⚠️ Avoid giving strong prescription drugs without caution
📊 If comparing medicines:
Use a comparative table format
🚫 If the query is not related to medicines or health:
Politely respond: “Please ask a health or medicine-related query.”
💡 If asked about NiyatKalpa:
Explain the platform in detail, highlighting:
Medicine donation concept
OCR scanning feature
Social impact and sustainability`;

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export const sendMessageToAIVaidya = async (history: ChatMessage[], newMessage: string): Promise<string> => {
    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API Key is missing');
    }

    try {
        // Construct the conversation history for the API
        const contents = [
            {
                role: 'user',
                parts: [{ text: SYSTEM_PROMPT }]
            },
            {
                role: 'model',
                parts: [{ text: 'Understood. I am ready to assist as the AI Vaidya for NiyatKalpa.' }]
            },
            ...history.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.text }]
            })),
            {
                role: 'user',
                parts: [{ text: newMessage }]
            }
        ];

        const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents,
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 8192,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            throw new Error('Empty response from Gemini');
        }

        return responseText;
    } catch (error) {
        console.error('AI Vaidya Error:', error);
        throw error;
    }
};
