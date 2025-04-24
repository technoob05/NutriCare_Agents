import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const MODEL_NAME = "gemini-2.0-flash"; // Or specify another suitable model like "gemini-1.5-flash"
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("[Voice Chat API] Missing GEMINI_API_KEY environment variable.");
    // Optionally, throw an error during build/startup if the key is essential
}

// --- Gemini API Interaction (Text) ---
async function getGeminiTextResponse(inputText: string): Promise<string> {
    console.log(`[Voice Chat API - Text Mode] Received text for Gemini: "${inputText}"`);

    if (!API_KEY) {
        return "Lỗi: API Key cho Gemini chưa được cấu hình.";
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        const generationConfig = {
            temperature: 0.8, // Adjust creativity (0-1)
            topK: 1,
            topP: 1,
            maxOutputTokens: 256, // Limit response length
        };

        // Basic safety settings - adjust as needed
        const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ];

        // For simple Q&A, generateContent is suitable
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: inputText }] }],
            generationConfig,
            safetySettings,
        });

        // Check for response existence first
        if (!result.response) {
             console.warn(`[Voice Chat API - Text Mode] Gemini response was empty or undefined.`);
             return `Rất tiếc, tôi không thể tạo phản hồi cho yêu cầu này. (Lý do: Phản hồi trống hoặc không hợp lệ)`;
        }

        // Now we know result.response exists, check for blocking feedback
        const promptFeedback = result.response.promptFeedback;
        if (promptFeedback?.blockReason) {
            const blockReason = promptFeedback.blockReason;
            console.warn(`[Voice Chat API - Text Mode] Gemini response blocked. Reason: ${blockReason}`);
            return `Rất tiếc, tôi không thể trả lời câu hỏi này. (Lý do: ${blockReason})`;
        }

        // If response exists and wasn't blocked, try to get the text
        try {
            const responseText = result.response.text();
            console.log(`[Voice Chat API - Text Mode] Gemini Response: "${responseText.substring(0, 100)}..."`);
            return responseText;
        } catch (textError: any) {
             console.error("[Voice Chat API - Text Mode] Error extracting text from Gemini response:", textError);
             return `Đã xảy ra lỗi khi xử lý phản hồi từ AI (Text Mode).`;
        }

    } catch (error: any) {
        console.error("[Voice Chat API - Text Mode] Error calling Gemini API:", error);
        return `Đã xảy ra lỗi khi kết nối với AI (Text Mode): ${error.message || 'Lỗi không xác định'}`;
    }
}

// --- Gemini API Interaction (Audio) ---
async function getGeminiAudioResponse(audioData: string, mimeType: string, prompt: string): Promise<string> {
    console.log(`[Voice Chat API - Audio Mode] Received audio (${mimeType}, ${Math.round(audioData.length * 3/4 / 1024)} KB) with prompt: "${prompt}"`);

     if (!API_KEY) {
        return "Lỗi: API Key cho Gemini chưa được cấu hình.";
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        // Use a model that supports audio input, like gemini-1.5-flash or gemini-pro (check compatibility)
        // Let's stick with gemini-pro for now, assuming it supports audio inline data
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        const generationConfig = {
            temperature: 0.7, // Slightly lower temp might be better for analysis
            topK: 1,
            topP: 1,
            maxOutputTokens: 512, // Allow longer responses for descriptions/transcripts
        };

        // Basic safety settings - adjust as needed
        const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ];

        // Construct the request with inline audio data and the text prompt
        const contents = [
            { // Audio part first
                inlineData: {
                    mimeType: mimeType,
                    data: audioData,
                },
            },
            { // Text prompt part second
                text: prompt
            }
        ];

        const result = await model.generateContent({
            contents: [{ role: "user", parts: contents }], // Pass parts array
            generationConfig,
            safetySettings,
        });

         // Check for response existence first
        if (!result.response) {
             console.warn(`[Voice Chat API - Audio Mode] Gemini response was empty or undefined.`);
             return `Rất tiếc, tôi không thể tạo phản hồi cho âm thanh này. (Lý do: Phản hồi trống hoặc không hợp lệ)`;
        }

        // Now we know result.response exists, check for blocking feedback
        const promptFeedback = result.response.promptFeedback;
        if (promptFeedback?.blockReason) {
            const blockReason = promptFeedback.blockReason;
            console.warn(`[Voice Chat API - Audio Mode] Gemini response blocked. Reason: ${blockReason}`);
            return `Rất tiếc, tôi không thể xử lý âm thanh này. (Lý do: ${blockReason})`;
        }

        // If response exists and wasn't blocked, try to get the text
        try {
            const responseText = result.response.text();
            console.log(`[Voice Chat API - Audio Mode] Gemini Response: "${responseText.substring(0, 100)}..."`);
            return responseText;
        } catch (textError: any) {
             console.error("[Voice Chat API - Audio Mode] Error extracting text from Gemini response:", textError);
             return `Đã xảy ra lỗi khi xử lý phản hồi từ AI (Audio Mode).`;
        }

    } catch (error: any) {
        console.error("[Voice Chat API - Audio Mode] Error calling Gemini API:", error);
        return `Đã xảy ra lỗi khi kết nối với AI (Audio Mode): ${error.message || 'Lỗi không xác định'}`;
    }
}


export async function POST(request: Request) {
    let requestBody: any;
    try {
        requestBody = await request.json();
    } catch (error) {
        console.error("[Voice Chat API] Failed to parse request body:", error);
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const mode = requestBody.mode;

    try {
        let botResponse: string;

        if (mode === 'stt') {
            const text = requestBody.text;
            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                return NextResponse.json({ error: 'Missing or invalid "text" for STT mode' }, { status: 400 });
            }
            botResponse = await getGeminiTextResponse(text); // Call text function
        } else if (mode === 'audio_understanding') {
            const audioData = requestBody.audioData; // base64 string
            const mimeType = requestBody.mimeType;
            const prompt = requestBody.prompt || "Describe this audio clip."; // Default prompt

            if (!audioData || typeof audioData !== 'string' || audioData.trim().length === 0) {
                return NextResponse.json({ error: 'Missing or invalid "audioData" for audio mode' }, { status: 400 });
            }
             if (!mimeType || typeof mimeType !== 'string') {
                return NextResponse.json({ error: 'Missing or invalid "mimeType" for audio mode' }, { status: 400 });
            }
            botResponse = await getGeminiAudioResponse(audioData, mimeType, prompt); // Call audio function
        } else {
            return NextResponse.json({ error: 'Invalid or missing "mode" in request body' }, { status: 400 });
        }

        console.log(`[Voice Chat API] Sending final response: "${botResponse.substring(0,100)}..."`);
        return NextResponse.json({ response: botResponse });

    } catch (error: any) {
        console.error('[Voice Chat API] Unexpected error in POST handler:', error);
        return NextResponse.json({ error: `Failed to get bot response: ${error.message || 'Unknown error'}` }, { status: 500 });
    }
} // <-- Added missing closing brace for the main try...catch in POST
