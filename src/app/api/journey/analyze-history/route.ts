import { NextResponse } from 'next/server';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"; // Assuming this is the correct import
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { PromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";

// Ensure your Google API Key is set in environment variables
if (!process.env.GOOGLE_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  console.error("Google API Key not found in environment variables for analyze-history API.");
  // In a real app, you might want to return an error response here
}

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash", // Or a suitable model for analysis
  maxOutputTokens: 1024, // Adjust based on expected output size
  apiKey: process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

// Define the output schema for the AI analysis
const parser = new JsonOutputParser();
const formatInstructions = parser.getFormatInstructions();

const analysisPrompt = new PromptTemplate({
  template: `
    You are a nutrition AI assistant. Analyze the following user's nutrition-related chat history.
    Identify key themes, frequently mentioned foods, health goals discussed, and any noticeable patterns or trends.
    Provide a concise summary and extract specific data points that could be useful for tracking or visualization.

    Chat History:
    {historyText}

    {format_instructions}

    Provide the analysis in JSON format with the following structure:
    {{
      "summary": "string", // A brief summary of the key findings
      "frequentFoods": ["string"], // List of frequently mentioned food items
      "healthGoals": ["string"], // List of health goals discussed
      "trends": ["string"], // Any observed patterns or trends (e.g., mentions of specific meal times, types of diets)
      "keywords": ["string"] // Other relevant keywords
    }}
    Ensure the output is valid JSON.
    `,
  inputVariables: ["historyText"],
  partialVariables: { format_instructions: formatInstructions },
});

export async function POST(request: Request) {
  try {
    const { combinedHistoryText } = await request.json();

    if (!combinedHistoryText || typeof combinedHistoryText !== 'string') {
      return NextResponse.json({ error: "Invalid input: 'combinedHistoryText' is required and must be a string." }, { status: 400 });
    }

    const chain = analysisPrompt.pipe(model).pipe(parser);

    const analysisResult = await chain.invoke({ historyText: combinedHistoryText });

    // The parser should return a JSON object directly
    return NextResponse.json(analysisResult);

  } catch (error: any) {
    console.error("Error analyzing chat history:", error);
    return NextResponse.json({ error: "Failed to analyze chat history.", details: error.message }, { status: 500 });
  }
}

// Optional: Add configuration for edge runtime if preferred
// export const runtime = 'edge';
