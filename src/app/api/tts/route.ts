import { NextResponse } from 'next/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { Writable } from 'stream';
import logger from '@/lib/logger'; // Import the logger

// Initialize the Text-to-Speech client
// Ensure your Google Cloud credentials are set up in the environment
// (e.g., GOOGLE_APPLICATION_CREDENTIALS environment variable)
let client: TextToSpeechClient | null = null;
let initializationError: Error | null = null;

try {
    // Check if the environment variable is set
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        logger.warn("[TTS API Startup] GOOGLE_APPLICATION_CREDENTIALS environment variable is not set. Google Cloud TTS will likely fail.");
    } else {
         logger.info({ path: process.env.GOOGLE_APPLICATION_CREDENTIALS }, "[TTS API Startup] GOOGLE_APPLICATION_CREDENTIALS is set.");
    }
    client = new TextToSpeechClient();
    // Attempt a simple API call during initialization to verify credentials (optional, adds latency)
    // await client.listVoices({languageCode: 'en-US'}); // Example verification call
    logger.info("[TTS API Startup] Google Cloud Text-to-Speech client initialized successfully.");
} catch (error: any) {
    initializationError = error;
    // Log the full error object
    logger.error({ err: error }, "[TTS API Startup] Failed to initialize Google Cloud Text-to-Speech client");
    client = null; // Ensure client is null on error
}

export async function POST(request: Request) {
    const requestId = `TTS-Req-${Date.now()}`; // Unique ID for this request
    const reqLogger = logger.child({ requestId }); // Create a child logger for this request

    // Check for initialization error on each request
    if (!client || initializationError) {
        const logPayload = { clientInitialized: !!client, initErrorMsg: initializationError?.message };
        reqLogger.error(logPayload, `[TTS API Request] Cannot process request due to initialization issues.`);
        const errorMsg = initializationError
            ? `TTS service failed to initialize: ${initializationError.message}`
            : 'TTS service not configured correctly (client is null). Check GOOGLE_APPLICATION_CREDENTIALS.';
        return NextResponse.json({ error: errorMsg }, { status: 503 }); // 503 Service Unavailable
    }

    let text: string;
    try {
        const body = await request.json();
        text = body.text;
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return NextResponse.json({ error: 'Missing or invalid "text" in request body' }, { status: 400 });
        }
    } catch (error) {
        reqLogger.error({ err: error }, "Failed to parse request body");
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    reqLogger.info({ textSnippet: text.substring(0, 50) }, `Received TTS request.`);

    const ttsRequest = {
        input: { text: text },
        // Select the language code (vi-VN) and the SSML voice gender (NEUTRAL)
        // You can explore specific voice names for potentially better quality:
        // https://cloud.google.com/text-to-speech/docs/voices
        voice: { languageCode: 'vi-VN', name: 'vi-VN-Wavenet-D' }, // Example Wavenet voice
        // Select the type of audio file you want returned
        audioConfig: { audioEncoding: 'MP3' as const }, // Use 'as const' for type safety
    };

    // No need for separate callId, use reqLogger context
    const googleCallStartTime = Date.now();
    try {
        reqLogger.info("Sending request to Google Cloud TTS API...");
        const [response] = await client.synthesizeSpeech(ttsRequest);
        const googleCallDuration = Date.now() - googleCallStartTime;
        reqLogger.info({ durationMs: googleCallDuration }, "Received response from Google Cloud TTS API.");

        if (!response.audioContent) {
            reqLogger.error("Google Cloud TTS API returned no audio content.");
            return NextResponse.json({ error: 'Failed to synthesize speech: No audio content received' }, { status: 500 });
        }

        // The audioContent is typically a Buffer or Uint8Array
        const audioBuffer = response.audioContent instanceof Buffer
            ? response.audioContent
            : Buffer.from(response.audioContent);

        reqLogger.info({ audioBytes: audioBuffer.length }, `Successfully synthesized audio.`);

        // Return the audio content as MP3
        return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioBuffer.length.toString(),
            },
        });

    } catch (error: any) {
        const googleCallDuration = Date.now() - googleCallStartTime;
        // Log the full error object along with duration
        reqLogger.error({ err: error, durationMs: googleCallDuration }, `ERROR synthesizing speech`);

        const errorMessage = error.message || 'An unknown error occurred during speech synthesis.';
        // Include error code if available
        const responseMessage = error.code
            ? `Failed to synthesize speech: ${errorMessage} (Code: ${error.code})`
            : `Failed to synthesize speech: ${errorMessage}`;
        return NextResponse.json({ error: responseMessage }, { status: 500 });
    }
}
