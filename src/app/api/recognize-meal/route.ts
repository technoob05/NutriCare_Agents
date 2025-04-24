import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

// Ensure you have your GEMINI_API_KEY in your .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType } = body; // Expecting base64 image data and mime type

    if (!imageBase64 || !mimeType) {
      return NextResponse.json(
        { error: "Missing imageBase64 or mimeType in request body" },
        { status: 400 }
      );
    }

    // Using gemini-1.5-flash as it's generally faster and sufficient for this.
    // Consider gemini-1.5-pro if more detailed analysis is consistently needed.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Updated prompt to request detailed description and JSON output
    const prompt = `Analyze the image provided. Identify the main dish.
Provide a concise but detailed description, mentioning key visible ingredients and potential cooking style (e.g., grilled, fried, soup).
Also provide the most likely name of the dish.
Respond ONLY with a valid JSON object containing two keys: "mealName" (string) and "detailedDescription" (string). Example: {"mealName": "Pho Bo", "detailedDescription": "Vietnamese beef noodle soup with rice noodles, thinly sliced beef, herbs like cilantro and mint, and possibly bean sprouts in a clear broth."}`;

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType,
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;
    const rawText = response.text().trim();

    // Attempt to parse the JSON response from Gemini
    let mealName = "Unknown";
    let detailedDescription = "Could not generate description.";
    try {
        // Clean potential markdown code fences
        const jsonString = rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        const parsedJson = JSON.parse(jsonString);
        if (parsedJson.mealName && typeof parsedJson.mealName === 'string') {
            mealName = parsedJson.mealName;
        }
        if (parsedJson.detailedDescription && typeof parsedJson.detailedDescription === 'string') {
            detailedDescription = parsedJson.detailedDescription;
        }
    } catch (parseError) {
        console.error("Failed to parse JSON response from Gemini:", parseError);
        console.error("Raw Gemini response:", rawText);
        // Fallback: Use the raw text as the meal name if JSON parsing fails
        mealName = rawText.substring(0, 100); // Limit length as a fallback
        detailedDescription = "Failed to parse detailed description from AI response.";
    }


    return NextResponse.json({ mealName, detailedDescription });

  } catch (error) {
    console.error("Error recognizing meal:", error);
    // Check if the error is from the Gemini API and has specific details
    if (error instanceof Error && 'response' in error) {
        // Attempt to parse more specific error details if available
        // This structure might vary depending on the actual error object from the SDK
        const geminiError = error as any;
        const errorMessage = geminiError.response?.error?.message || geminiError.message || "Internal Server Error";
        const statusCode = geminiError.response?.error?.code || 500;
        return NextResponse.json({ error: `Gemini API Error: ${errorMessage}` }, { status: statusCode });
    }
    // Generic error fallback
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
