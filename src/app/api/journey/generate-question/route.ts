import { NextResponse } from 'next/server';
// Assuming Langchain with Gemini integration is set up
// Adjust the import path based on your Langchain setup (e.g., could be from @langchain/google-genai or a custom instance)
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"; // Example import
import { HumanMessage } from "@langchain/core/messages";

// Ensure your Google API Key is set in environment variables
// (e.g., GOOGLE_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY depending on Langchain setup)
if (!process.env.GOOGLE_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  console.warn("Google API Key not found in environment variables for generate-question API.");
  // Potentially throw an error or return a default question if the key is missing
}

// Initialize the Langchain Chat Model (adjust model name if needed)
// Use the correct API key environment variable name based on your setup
const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash", // Use 'model' instead of 'modelName'
  maxOutputTokens: 100,
  apiKey: process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export async function GET() {
  try {
    const prompt = `
      Generate a single, concise, open-ended question related to nutrition, health, eating habits, or well-being suitable for a daily check-in within a nutrition app.
      The question should encourage reflection. Keep it under 20 words.
      Examples:
      - What was your most mindful meal today?
      - How did your energy levels feel throughout the day?
      - What's one small healthy choice you made today?
      - Did you try any new foods or recipes recently?
      - How hydrated did you feel today?

      Generate a new question now. Output only the question text, without any introductory phrases like "Here's a question:".
    `;

    const messages = [new HumanMessage(prompt)];

    // Invoke the model
    const response = await model.invoke(messages);

    // Extract the question text from the response
    const question = response.content.toString().trim();

    if (!question) {
      throw new Error("AI failed to generate a question.");
    }

    return NextResponse.json({ question });

  } catch (error: any) {
    console.error("Error generating daily question:", error);
    // Return a default question in case of error
    const defaultQuestion = "How are you feeling today?";
    return NextResponse.json({ question: defaultQuestion }, { status: 500 });
  }
}

// Optional: Add configuration for edge runtime if preferred, though standard Node runtime is fine
// export const runtime = 'edge';
