// src/app/api/chat/followup/route.ts
import { NextResponse } from 'next/server';
import { handleMenuFollowup, HandleMenuFollowupInput } from '@/ai/flows/handle-menu-followup'; // Import the flow

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // TODO: Add input validation here using Zod or similar if desired
    const input: HandleMenuFollowupInput = body;

    if (!input || !input.userMessage || !input.currentMenu || !input.chatHistory) {
        return NextResponse.json({ error: 'Missing required input fields' }, { status: 400 });
    }

    console.log("API Route: /api/chat/followup received input:", JSON.stringify(input, null, 2));

    const output = await handleMenuFollowup(input);

    console.log("API Route: /api/chat/followup sending output:", JSON.stringify(output, null, 2));

    return NextResponse.json(output);

  } catch (error: any) {
    console.error("Error in /api/chat/followup:", error);
    // Provide a generic error message to the client
    return NextResponse.json(
        { error: `Internal Server Error: ${error.message || 'Unknown error'}` },
        { status: 500 }
    );
  }
}
