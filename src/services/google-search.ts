import {
  GoogleGenerativeAI,
  Content,
  Part,
  GenerateContentResponse,
  GenerateContentResult,
  GenerateContentRequest,
  Tool, // Keep Tool import
  FunctionCall, // Import FunctionCall type if checking parts
} from "@google/generative-ai";
import { logger } from 'genkit/logging';

// --- Define Grounding Metadata Structures (with exports) ---

// Structure for individual grounding sources
export interface GroundingChunkWeb { // Added export
  uri: string;
  title: string;
}

// Structure for individual grounding chunk
export interface GroundingChunk { // Added export
  web: GroundingChunkWeb;
  // Potentially other fields if observed in API responses
}

// Structure for the Google Search Suggestion chip
export interface SearchEntryPoint { // Added export
  renderedContent: string;
}

// Updated interface to include all relevant grounding metadata fields
export interface GroundingMetadata { // Already exported
  searchEntryPoint?: SearchEntryPoint;
  groundingChunks?: GroundingChunk[]; // Uses exported GroundingChunk
  webSearchQueries?: string[];
  // groundingSupports?: any; // You might add this if you need segment-level attribution
}

/**
 * Represents the result of a grounded search, including content and metadata.
 */
export interface GroundedSearchResult { // Already exported
  content: string;
  metadata?: GroundingMetadata; // Uses exported GroundingMetadata
}

// --- API Key Handling ---
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  logger.error("GEMINI_API_KEY environment variable not set during initial load.");
}

// --- GenAI Instance ---
let genAI: GoogleGenerativeAI | null = null;
if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
} else {
  logger.warn("GoogleGenerativeAI instance not created due to missing API key.");
}

/**
 * Asynchronously retrieves grounded search results using a Gemini 2.0 model
 * with Google Search configured as a tool.
 *
 * @param query The search query.
 * @returns A promise resolving to a GroundedSearchResult object.
 * @throws {Error} If the API key is missing or the search fails (excluding rate limits).
 */
export async function googleSearch(query: string): Promise<GroundedSearchResult> {
  logger.info(`[googleSearch] Performing grounded search with Gemini 2.0 tool for query: "${query}"`);

  if (!genAI) {
    logger.error("[googleSearch] Cannot perform search: GoogleGenerativeAI instance not initialized.");
    throw new Error("Google Search failed: AI instance not initialized.");
  }

  try {
    // Use a Gemini 2.0 model like 'gemini-pro' or 'gemini-1.5-pro-latest'
    // Note: 'gemini-2.0-flash' might not be a valid model name yet. Use a known working one.
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash", // Using gemini-pro as a likely candidate for 2.0 tools
      // model: "gemini-1.5-pro-latest", // Alternative if gemini-pro doesn't work
    });

    const contents: Content[] = [{ role: "user", parts: [{ text: query }] }];

    // Define Google Search as a tool for Gemini 2.0 models
    // Use type assertion to bypass strict type checking if needed
    const tools: Tool[] = [{
        googleSearch: {}
    } as Tool]; // Asserting as Tool

    const request: GenerateContentRequest = {
      contents: contents,
      tools: tools,
    };

    const result: GenerateContentResult = await model.generateContent(request);
    const response: GenerateContentResponse = result.response;

    // Check for candidates
    if (!response || !response.candidates || response.candidates.length === 0) {
      logger.warn(`[googleSearch] No candidates returned for query: "${query}"`);
      return { content: "", metadata: undefined };
    }

    const candidate = response.candidates[0];

    // Optional: Check for function call part
    const hasFunctionCall = candidate.content?.parts?.some(part => 'functionCall' in part);
    if (hasFunctionCall) {
        logger.warn(`[googleSearch] Candidate content includes a function call part. Grounding metadata might be absent.`);
    }

    // Extract grounding metadata
    const metadata = candidate.groundingMetadata as GroundingMetadata | undefined;

    // Extract text content
    const content = candidate.content?.parts
        ?.filter(part => 'text' in part) // Only text parts
        .map((part: Part) => part.text ?? '')
        .join('') || '';

    // Logging based on findings
    if (!metadata && !hasFunctionCall) {
        logger.warn(`[googleSearch] No grounding metadata found in the candidate.`);
    }
     if (metadata && content.length === 0 && !hasFunctionCall) {
         logger.warn(`[googleSearch] Found grounding metadata but no text content.`);
     }

    logger.info(`[googleSearch] Search successful (using 2.0 tool). Content length: ${content.length}, Metadata found: ${!!metadata}`);
    if (metadata?.searchEntryPoint?.renderedContent) {
        logger.debug(`[googleSearch] Found searchEntryPoint.`);
    }
     if (metadata?.groundingChunks) {
        logger.debug(`[googleSearch] Found ${metadata.groundingChunks.length} grounding chunks.`);
    }
     if (metadata?.webSearchQueries) {
        logger.debug(`[googleSearch] Found ${metadata.webSearchQueries.length} web search queries: ${metadata.webSearchQueries.join(', ')}`);
    }

    // Return result
    return {
      content: content,
      metadata: metadata,
    };

  } catch (error: any) {
    // Error Handling
    logger.error(`[googleSearch] Error during search (using 2.0 tool) for query "${query}": ${error.message}`, error);
    const errorMessage = error.toString().toLowerCase();
    const statusCode = error.status || error.code;

    if (statusCode === 429 || errorMessage.includes('429') || errorMessage.includes('resource_exhausted') || errorMessage.includes('quota')) {
        logger.warn(`[googleSearch] Search potentially skipped/failed due to rate limiting/quota for query "${query}". Returning empty result.`);
        return { content: "", metadata: undefined }; // Return empty for rate limits
    } else if (errorMessage.includes('tool') && (errorMessage.includes('not supported') || errorMessage.includes('invalid'))) {
             logger.error(`[googleSearch] The selected model might not support the 'googleSearch' tool or the configuration is invalid. Error: ${error.message}`);
             throw new Error(`Google Search tool configuration failed for the selected model: ${error.message}`);
    } else {
        // Re-throw other critical errors
        throw new Error(`Google Search failed: ${error.message || 'Unknown error'}`);
    }
  }
}