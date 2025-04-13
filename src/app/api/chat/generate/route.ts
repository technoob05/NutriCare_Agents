// src/app/api/chat/generate/route.ts
import { NextResponse } from 'next/server';
import { generateMenuFromPreferences, GenerateMenuFromPreferencesInput } from '@/ai/flows/generate-menu-from-preferences'; // Import the flow

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // TODO: Add input validation here using Zod or similar if desired
    const input: GenerateMenuFromPreferencesInput = body;

    if (!input || !input.preferences || !input.menuType) {
        return NextResponse.json({ error: 'Missing required input fields (preferences, menuType)' }, { status: 400 });
    }

    console.log("API Route: /api/chat/generate received input:", JSON.stringify(input, null, 2));

    // Note: The trace data is generated within the flow itself
    const output = await generateMenuFromPreferences(input);

    console.log("API Route: /api/chat/generate sending output:", JSON.stringify(output, null, 2));

    return NextResponse.json(output);

  } catch (error: any) {
    console.error("Error in /api/chat/generate:", error);
    // Provide a generic error message to the client
    return NextResponse.json(
        { error: `Internal Server Error: ${error.message || 'Unknown error'}` },
        { status: 500 }
    );
  }
}
