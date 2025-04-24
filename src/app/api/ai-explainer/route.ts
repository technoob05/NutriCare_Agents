import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { ReadableStream } from 'stream/web'; // Use web streams

// Ensure the API key is loaded from environment variables
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest", // Using a recommended model
       safetySettings: [ // Add safety settings
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ],
      generationConfig: {
        responseMimeType: "application/json", // Request JSON output for easier parsing
      },
    });

    // Instructions for the AI model
    const instructions = `
      Explain the concept: "${prompt}".
      Use simple, clear language suitable for a general audience.
      Generate helpful, minimalist inline illustrations for key points using simple line art (black ink on white background) relevant to the concept. Return these images as base64 encoded strings within the JSON structure.
      Ensure the explanation is unbiased and factually accurate.
      Avoid overly complex jargon. Keep sentences relatively short.
      Structure the response as a JSON array of objects, where each object represents a "slide" and contains 'text' and optional 'imageBase64' and 'mimeType' fields.
      Example slide object: { "text": "This is the first point.", "imageBase64": "...", "mimeType": "image/png" }
      Generate text and a corresponding image for each distinct point or step. If no image is relevant for a point, omit the image fields for that slide.
      No commentary, just provide the JSON array.
      Keep going until the explanation is complete.
    `;

    // Use generateContentStream for streaming
    const result = await model.generateContentStream(instructions);

    // Create a TransformStream to process the chunks and format them as Server-Sent Events (SSE)
    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        try {
          // Assuming the model outputs JSON chunks directly based on responseMimeType
          // Need to handle potential partial JSON chunks if the stream doesn't guarantee full JSON objects per chunk
          // For simplicity here, we assume each chunk.text() is a parsable part of the stream
          // A more robust solution might involve buffering and parsing complete JSON objects
          const text = chunk.text();
          // Send each chunk's text as data in SSE format
          controller.enqueue(`data: ${JSON.stringify({ text })}\n\n`);
        } catch (error) {
           console.error("Error processing stream chunk:", error);
           // Send an error event if processing fails
           controller.enqueue(`event: error\ndata: ${JSON.stringify({ message: "Error processing stream chunk." })}\n\n`);
        }
      },
      flush(controller) {
         // Signal the end of the stream (optional)
         controller.enqueue(`event: end\ndata: ${JSON.stringify({ message: "Stream ended." })}\n\n`);
      }
    });

    // Pipe the result stream through the transform stream
    const sseStream = result.stream.pipeThrough(transformStream);


    // Return the stream as the response
    return new Response(sseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error: any) {
    console.error("Error in AI Explainer API:", error);
    // Check for specific API errors if possible
    const errorMessage = error.response?.data?.error?.message || error.message || "An internal server error occurred.";
    const statusCode = error.response?.status || 500;
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}

// Add OPTIONS method for CORS preflight requests if needed (especially if calling from a different origin)
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*', // Adjust as needed for security
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
