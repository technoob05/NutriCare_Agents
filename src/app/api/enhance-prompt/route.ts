import { GoogleGenAI } from "@google/genai";
import { NextResponse } from 'next/server';

// Initialize GoogleGenAI client
// Ensure GEMINI_API_KEY is set in your environment variables
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Define expected request body structures
interface ImageEnhanceRequest {
    type: 'image';
    prompt: string;
}

interface MenuFeedbackEnhanceRequest {
    type: 'menu_feedback';
    originalPreferences: string; // Or a more structured type if available
    generatedMenu: string; // Or a structured menu object
    userFeedback: string;
}

interface MenuPreferencesEnhanceRequest {
    type: 'menu_preferences';
    preferences: string; // User's initial preferences
}

type EnhanceRequest = ImageEnhanceRequest | MenuFeedbackEnhanceRequest | MenuPreferencesEnhanceRequest;

export async function POST(request: Request) {
    let body: EnhanceRequest | null = null; // Declare body outside try block

    try {
        // 1. Parse Request Body
        body = await request.json(); // Assign inside try block

        // Add null check for body
        if (!body) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }
        const { type } = body; // Now safe to access type

        // 2. Validate Input & API Key
        if (!process.env.GEMINI_API_KEY) {
            console.error('GEMINI_API_KEY is not set in environment variables.');
            return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
        }

        let enhancementInstruction: string;
        let logPrompt: string;

        // 3. Construct Enhancement Prompt based on type
        if (type === 'image') {
            const { prompt } = body as ImageEnhanceRequest;
            if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
                return NextResponse.json({ error: 'Prompt is required for image enhancement' }, { status: 400 });
            }
            logPrompt = prompt;
            enhancementInstruction = `Rewrite the following user prompt to be more descriptive and effective for editing an image, particularly for food images. Focus on visual details, actions, composition, lighting, and clear instructions. Make the output suitable for an image generation model. Do not add any conversational text, just output the enhanced prompt.

Original prompt: "${prompt}"

Enhanced prompt:`;

        } else if (type === 'menu_feedback') {
            const { originalPreferences, generatedMenu, userFeedback } = body as MenuFeedbackEnhanceRequest;
            if (!originalPreferences || !generatedMenu || !userFeedback) {
                return NextResponse.json({ error: 'originalPreferences, generatedMenu, and userFeedback are required for menu feedback enhancement' }, { status: 400 });
            }
            logPrompt = `Prefs: ${originalPreferences}, Menu: ${generatedMenu}, Feedback: ${userFeedback}`;
            enhancementInstruction = `Given the user's original preferences, the generated menu, and their feedback, create a concise and effective prompt suitable for an AI to regenerate or modify the menu accordingly. The prompt should clearly incorporate the feedback to address the user's concerns or requests. Do not add any conversational text, just output the enhanced prompt.

Original Preferences:
"${originalPreferences}"

Generated Menu:
"${generatedMenu}"

User Feedback:
"${userFeedback}"

Enhanced prompt for menu regeneration/modification:`;

        } else if (type === 'menu_preferences') {
            const { preferences } = body as MenuPreferencesEnhanceRequest;
            if (!preferences || typeof preferences !== 'string' || preferences.trim() === '') {
                return NextResponse.json({ error: 'Preferences are required for menu preferences enhancement' }, { status: 400 });
            }
            logPrompt = `Preferences: ${preferences}`;
            enhancementInstruction = `Rewrite the following user preferences for a meal menu to be more detailed, specific, and actionable for an AI generating the menu. Focus on clarifying dietary restrictions, cuisine types, desired meal complexity, specific ingredients to include or exclude, and overall tone or style of the menu (e.g., healthy, indulgent, family-style). Do not add any conversational text, just output the enhanced prompt.

Original Preferences:
"${preferences}"

Enhanced prompt for menu generation:`;

        } else {
            // Ensure exhaustive check or handle unknown type
            const exhaustiveCheck: never = type;
            console.error(`Unhandled enhancement type: ${exhaustiveCheck}`);
            return NextResponse.json({ error: 'Invalid or unhandled enhancement type specified' }, { status: 400 });
        }

        // 4. Call Gemini API to Generate Enhanced Prompt
        console.log(`Attempting to enhance prompt (type: ${type}): "${logPrompt}"`);
        const result = await genAI.models.generateContent({
            model: "gemini-2.0-flash", // Specify the text model here
            contents: enhancementInstruction, // Pass the instruction as contents
        });

        // 5. Process and Validate Response
        if (!result || !result.candidates || result.candidates.length === 0 || !result.candidates[0].content || !result.candidates[0].content.parts || !result.candidates[0].content.parts[0].text) {
             console.error('Failed to get a valid text response from Gemini model:', result);
             throw new Error('Failed to enhance prompt. Model returned invalid structure or no text.');
        }

        // Extract the text from the first part
        const enhancedPrompt = result.candidates[0].content.parts[0].text.trim();
        console.log(`Successfully enhanced prompt (type: ${type}): "${enhancedPrompt}"`);

        // 6. Return Enhanced Prompt
        return NextResponse.json({ enhancedPrompt: enhancedPrompt });

    } catch (error: any) {
        console.error(`Error enhancing prompt (type: ${body?.type || 'unknown'}):`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during prompt enhancement';
        // Determine appropriate status code if possible, otherwise default to 500
        const status = errorMessage.includes('API key not valid') ? 401 : 500;
        return NextResponse.json({ error: `Failed to enhance prompt: ${errorMessage}` }, { status });
    }
}
