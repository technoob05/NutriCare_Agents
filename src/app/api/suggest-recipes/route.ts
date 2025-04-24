import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import logger from '@/lib/logger';
import { search, searchImages } from 'duck-duck-scrape'; // Corrected: searchImages
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { WikipediaQueryRun } from "@langchain/community/tools/wikipedia_query_run";
import { google } from 'googleapis'; // Import googleapis
import * as cheerio from 'cheerio'; // Import cheerio

// Define the new structure for recipe suggestions
interface RecipeSuggestion {
    name: string;           // Recipe name (e.g., "Cơm Gà Hội An")
    description: string;    // Short AI-generated description (1-2 sentences)
    tags: {
        region?: string;    // e.g., "Miền Trung"
        difficulty?: string;// e.g., "Dễ"
        time?: string;      // e.g., "45 phút"
        type?: string;      // e.g., "Món chính", "Món chiên"
    };
    imageUrl?: string;      // URL for a representative image
    citation: {
        sourceName: string; // Source display name (e.g., "Helen's Recipes", "Wikipedia", "Local Data")
        sourceUrl?: string; // Direct link to the recipe/source
        isVideo?: boolean;  // True if the source is a video (e.g., YouTube)
    };
}

// --- Gemini Enrichment Function (Will be updated later) ---
// Placeholder for the updated function structure
async function enrichSuggestionWithAI(
    recipeName: string,
    sourceType: 'csv' | 'web' | 'youtube' | 'wikipedia' | 'ai',
    userIngredients: string[],
    recipeIngredients?: string[], // Only for CSV
    sourceUrl?: string, // For context
    genAI?: GoogleGenerativeAI // Pass instance if available
): Promise<{ description: string; tags: RecipeSuggestion['tags'] }> {
     // Ensure API key is available
    if (!process.env.GEMINI_API_KEY || !genAI) {
        logger.warn('GEMINI_API_KEY not found or genAI instance missing, skipping AI enrichment.');
        return { description: "AI enrichment disabled.", tags: {} };
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Use a capable model

    const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    // --- Build the prompt ---
    let promptContext = `Recipe Name: ${recipeName}\nUser has these ingredients: ${userIngredients.join(', ')}\nSource Type: ${sourceType}`;
    if (sourceType === 'csv' && recipeIngredients) {
        const missing = recipeIngredients.filter(recipeIng =>
            !userIngredients.some(userIng => recipeIng.includes(userIng) || userIng.includes(recipeIng))
        );
        promptContext += `\nRecipe requires (approximately): ${recipeIngredients.join(', ')}`;
        promptContext += `\nUser might be missing: ${missing.join(', ') || 'None'}`;
    }
    if (sourceUrl) {
        promptContext += `\nSource URL: ${sourceUrl}`; // Give AI context if available
    }

    const prompt = `You are an expert Vietnamese cooking assistant. Based on the following information:
${promptContext}

Please provide:
1.  **description**: A short, engaging, and encouraging description for this recipe suggestion (1-2 sentences in Vietnamese). Tailor it slightly based on the source type (e.g., encourage checking the link for web/video, mention ingredient match for CSV).
2.  **tags**: Infer the following tags as best as possible (if unsure, leave the value as null or omit the key):
    *   **region**: Vietnamese region (e.g., "Miền Bắc", "Miền Trung", "Miền Nam", "Unknown").
    *   **difficulty**: Estimated difficulty (e.g., "Dễ", "Trung bình", "Khó").
    *   **time**: Estimated cooking time (e.g., "15 phút", "30-45 phút", "Trên 1 tiếng").
    *   **type**: Type of dish (e.g., "Món chính", "Món ăn vặt", "Món chay", "Món chiên", "Món nước", "Món gỏi", "Món kho", "Món canh", "Món xào", "Unknown").

Format the output as a JSON object with keys "description" and "tags". The "tags" value should be another JSON object containing the inferred tags. Example:
{
  "description": "Phở Gà thơm ngon, rất hợp với nguyên liệu bạn có! Xem link để biết chi tiết cách nấu nhé.",
  "tags": {
    "region": "Miền Bắc",
    "difficulty": "Trung bình",
    "time": "Trên 1 tiếng",
    "type": "Món nước"
  }
}`;

    try {
        logger.info(`Generating AI description and tags for: ${recipeName}`);
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            safetySettings,
            generationConfig: { responseMimeType: "application/json" }, // Request JSON output
        });
        const response = result.response;
        const jsonText = response.text();
        const parsedJson = JSON.parse(jsonText);

        // Validate structure slightly
        const description = parsedJson.description || "AI description unavailable.";
        const tags = parsedJson.tags || {};

        logger.info(`AI enrichment successful for ${recipeName}`);
        return { description, tags };

    } catch (aiError: any) {
        logger.error(`Error generating AI enrichment for ${recipeName}:`, { message: aiError.message });
        let errorDesc = "Could not generate AI tips for this recipe.";
        if (aiError.response?.promptFeedback?.blockReason) {
             errorDesc = `AI could not provide tips due to safety settings (${aiError.response.promptFeedback.blockReason}).`;
        }
        return { description: errorDesc, tags: {} };
    }
}


// Helper function to clean and extract ingredients
function extractIngredients(text: string): string[] {
    if (!text) return [];
    // Improved cleaning: handle units better, remove punctuation more broadly
    const cleanedText = text.toLowerCase()
        .replace(/(\d+(\.\d+)?)\s*(g|kg|ml|l|m|quả|trái|củ|cọng|lá|chén|cây|muỗng|thìa|tsp|tbsp|pcs?)\b/g, '') // Remove quantities and units
        .replace(/[()\[\]{}":;]/g, '') // Remove more punctuation
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    const ingredients = cleanedText.split(/[,]| - | \/ /) // Split by comma, dash, slash
        .map(ing => ing.trim())
        .filter(ing => ing.length > 2 && !/^\d+$/.test(ing)); // Filter short/numeric-only strings
    return [...new Set(ingredients)]; // Return unique ingredients
}

// Helper to parse a CSV line
function parseCsvLine(line: string): string[] {
    // Basic CSV parsing, handles simple quotes but not escaped quotes within quotes
    const result: string[] = [];
    let currentField = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(currentField.trim().replace(/^"|"$/g, '')); // Trim and remove surrounding quotes
            currentField = '';
        } else {
            currentField += char;
        }
    }
    result.push(currentField.trim().replace(/^"|"$/g, '')); // Add the last field
    return result;
}

// --- Helper Function to Get Image URL ---
async function getImageUrl(recipeName: string, sourceUrl?: string): Promise<string | undefined> {
    logger.info(`Attempting to find image URL for: ${recipeName}`);

    // 1. Try extracting from sourceUrl if provided (web results)
    if (sourceUrl) {
        try {
            logger.info(`Fetching source URL for image extraction: ${sourceUrl}`);
            const response = await fetch(sourceUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }); // Add User-Agent
            if (response.ok) {
                const html = await response.text();
                const $ = cheerio.load(html);
                const ogImage = $('meta[property="og:image"]').attr('content');
                if (ogImage) {
                    logger.info(`Found og:image: ${ogImage}`);
                    return ogImage;
                }
                 const firstImg = $('img').first().attr('src'); // Basic fallback
                 if (firstImg && firstImg.startsWith('http')) {
                     logger.info(`Found first image tag src: ${firstImg}`);
                     return firstImg;
                 }
            } else {
                 logger.warn(`Failed to fetch source URL ${sourceUrl}, status: ${response.status}`);
            }
        } catch (fetchError: any) {
            logger.error(`Error fetching or parsing source URL ${sourceUrl}:`, { message: fetchError.message });
        }
    }

    // 2. Fallback to image search if no direct image found or no sourceUrl
    logger.info(`Performing fallback image search for: ${recipeName}`);
    try {
        // Use the corrected searchImages function name
        const imageResults = await searchImages(`${recipeName} món ăn Việt Nam`, { iterations: 1 });
        if (imageResults && imageResults.results.length > 0) {
            // Add type annotation for img parameter
            const firstValidImage = imageResults.results.find((img: { image?: string }) => img.image && img.image.startsWith('http'));
            if (firstValidImage?.image) { // Check if firstValidImage and its image property exist
                 logger.info(`Found image via search: ${firstValidImage.image}`);
                 return firstValidImage.image;
            }
        }
         logger.warn(`No valid image results from fallback search for: ${recipeName}`);
    } catch (searchError: any) {
        logger.error(`Error during fallback image search for ${recipeName}:`, { message: searchError.message });
    }

    return undefined; // No image found
}


// --- Helper Function for YouTube Search ---
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY; // Get from environment
const youtube = google.youtube('v3');

async function searchYouTubeVideos(query: string, maxResults = 3): Promise<RecipeSuggestion[]> {
    if (!YOUTUBE_API_KEY) {
        logger.warn('YOUTUBE_API_KEY not set. Skipping YouTube search.');
        return [];
    }
    logger.info(`Searching YouTube for: "${query}"`);
    try {
        const response = await youtube.search.list({
            key: YOUTUBE_API_KEY,
            part: ['snippet'],
            q: `${query} cách làm OR hướng dẫn OR recipe`, // Refine query for recipes
            type: ['video'],
            videoEmbeddable: 'true',
            maxResults: maxResults,
        });

        const results = response.data.items || [];
        logger.info(`Found ${results.length} YouTube results.`);

        // Ensure imageUrl is string | undefined, converting null to undefined
        return results.map(item => ({
            name: item.snippet?.title || 'YouTube Video',
            description: item.snippet?.description?.substring(0, 100) + '...' || '',
            tags: {},
            imageUrl: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.default?.url ?? undefined, // Handle null/undefined
            citation: {
                sourceName: `YouTube: ${item.snippet?.channelTitle || 'Unknown Channel'}`,
                sourceUrl: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
                isVideo: true,
            },
        }));
    } catch (error: any) {
        logger.error('Error searching YouTube:', { message: error.message, details: error.response?.data?.error });
        return [];
    }
}


export async function POST(req: NextRequest) {
    let fileStream: fs.ReadStream | undefined;
    let rl: readline.Interface | undefined;
    // Initialize Gemini client once
    const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : undefined;

    try {
        const body = await req.json();
        const userIngredients: string[] = (body.ingredients || []).map((ing: string) => ing.toLowerCase().trim()).filter(Boolean);
        const enableWebSearch: boolean = body.enableWebSearch || false;

        if (!userIngredients || userIngredients.length === 0) {
            return NextResponse.json({ error: 'Ingredients list is required' }, { status: 400 });
        }

        logger.info(`Received ingredients: ${userIngredients.join(', ')}. Web search enabled: ${enableWebSearch}`);

        const filePath = path.join(process.cwd(), 'public', 'data', 'vn_food_translated.csv');
        // Use a temporary structure to hold intermediate data before final formatting
        const intermediateSuggestions: Array<{
            name: string;
            sourceType: 'csv' | 'web' | 'youtube' | 'wikipedia';
            recipeIngredients?: string[]; // Only for CSV
            matchedIngredients?: string[]; // Only for CSV
            matchRatio?: number; // Only for CSV
            url?: string; // For web/wiki
            snippet?: string; // For web
        }> = [];
        const minMatchRatio = 0.5; // Slightly lower threshold

        // --- CSV Processing ---
        try {
            logger.info(`Attempting to read CSV: ${filePath}`);
            if (!fs.existsSync(filePath)) {
                throw new Error(`CSV file not found at ${filePath}`);
            }
            fileStream = fs.createReadStream(filePath);
            rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

            let header: string[] = [];
            let nameIndex = -1, ingredientsIndex = -1;
            let isFirstLine = true;

            for await (const line of rl) {
                try {
                    if (isFirstLine) {
                        header = parseCsvLine(line);
                        nameIndex = header.findIndex(h => h.toLowerCase() === 'tiêu đề');
                        ingredientsIndex = header.findIndex(h => h.toLowerCase() === 'translated_ingredients');
                        if (nameIndex === -1 || ingredientsIndex === -1) throw new Error('Required columns not found');
                        isFirstLine = false;
                        continue;
                    }
                    const columns = parseCsvLine(line);
                    if (columns.length <= Math.max(nameIndex, ingredientsIndex)) continue;

                    const recipeName = columns[nameIndex];
                    const recipeIngredientsText = columns[ingredientsIndex];
                    if (!recipeName || !recipeIngredientsText) continue;

                    const recipeIngredients = extractIngredients(recipeIngredientsText);
                    if (recipeIngredients.length === 0) continue;

                    const matchedIngredients = recipeIngredients.filter(ing =>
                        userIngredients.some(userIng => ing.includes(userIng) || userIng.includes(ing))
                    );
                    const matchRatio = recipeIngredients.length > 0 ? (matchedIngredients.length / recipeIngredients.length) : 0;

                    if (matchRatio >= minMatchRatio) {
                        intermediateSuggestions.push({
                            name: recipeName,
                            sourceType: 'csv',
                            recipeIngredients,
                            matchedIngredients,
                            matchRatio,
                        });
                    }
                } catch (lineError: any) {
                    logger.error(`Error processing CSV line: "${line}". Error: ${lineError.message}`);
                }
            }
            logger.info(`Finished CSV processing. Found ${intermediateSuggestions.length} potential matches.`);
        } catch (csvError: any) {
            logger.error('Error during CSV processing:', { message: csvError.message, stack: csvError.stack });
            // Don't fail the whole request, just log and continue
        } finally {
            rl?.close();
            fileStream?.close();
        }

        // --- Web Search (if needed and enabled) ---
        if (intermediateSuggestions.length === 0 && enableWebSearch) {
            logger.info(`No local recipes found. Performing web search for: ${userIngredients.join(', ')}`);
            try {
                const query = `Vietnamese recipes with ${userIngredients.join(' ')}`;
                const searchResults = await search(query, {}); // Keep using DDG search

                if (searchResults && searchResults.results) {
                    logger.info(`Found ${searchResults.results.length} web results.`);
                    const topWebResults = searchResults.results.slice(0, 5); // Limit web results
                    topWebResults.forEach(result => {
                        if (result.url && result.title) { // Ensure basic info exists
                            intermediateSuggestions.push({
                                name: result.title,
                                sourceType: 'web',
                                url: result.url,
                                snippet: result.description,
                            });
                        }
                    });
                    logger.info(`Added ${topWebResults.length} web suggestions.`);
                } else {
                    logger.warn('Web search returned no results or unexpected format.');
                }
            } catch (searchError: any) {
                logger.error('Error during DuckDuckGo search:', { message: searchError.message });
            }
        }

        // --- YouTube Search (Always run if API key exists) ---
        const youtubeSuggestions = await searchYouTubeVideos(userIngredients.join(' '), 3); // Search based on ingredients
        // Add YouTube results directly to the final list later after enrichment

        // --- Sort Intermediate Suggestions (CSV first, then web) ---
        intermediateSuggestions.sort((a, b) => {
            if (a.sourceType === 'csv' && b.sourceType !== 'csv') return -1;
            if (a.sourceType !== 'csv' && b.sourceType === 'csv') return 1;
            if (a.sourceType === 'csv' && b.sourceType === 'csv') return (b.matchRatio ?? 0) - (a.matchRatio ?? 0);
            return 0; // Keep web results order for now
        });

        // --- Enrichment and Final Formatting ---
        const finalSuggestions: RecipeSuggestion[] = [];
        const MAX_RESULTS = 10; // Limit total results shown

        logger.info(`Starting enrichment for ${intermediateSuggestions.length} CSV/Web suggestions and ${youtubeSuggestions.length} YouTube suggestions.`);

        // Process CSV/Web suggestions
        for (const tempSugg of intermediateSuggestions.slice(0, MAX_RESULTS)) {
             if (finalSuggestions.length >= MAX_RESULTS) break;

             const imageUrl = await getImageUrl(tempSugg.name, tempSugg.url);
             const aiEnrichment = await enrichSuggestionWithAI(
                 tempSugg.name,
                 tempSugg.sourceType,
                 userIngredients,
                 tempSugg.recipeIngredients,
                 tempSugg.url,
                 genAI
             );

             let citationSourceName = 'Web Search';
             if (tempSugg.sourceType === 'csv') {
                 citationSourceName = 'Local Recipe Data';
             } else if (tempSugg.url) {
                 try {
                     citationSourceName = new URL(tempSugg.url).hostname.replace(/^www\./, ''); // Get domain name
                 } catch { /* ignore invalid URL */ }
             }

             finalSuggestions.push({
                 name: tempSugg.name,
                 description: aiEnrichment.description,
                 tags: aiEnrichment.tags,
                 imageUrl: imageUrl,
                 citation: {
                     sourceName: citationSourceName,
                     sourceUrl: tempSugg.url,
                     isVideo: false,
                 },
             });
        }

         // Process YouTube suggestions (enrich and add)
         for (const ytSugg of youtubeSuggestions) {
             if (finalSuggestions.length >= MAX_RESULTS) break;

             // YouTube suggestions already have imageUrl and basic citation
             // We just need AI enrichment for description and tags
             const aiEnrichment = await enrichSuggestionWithAI(
                 ytSugg.name,
                 'youtube',
                 userIngredients,
                 undefined, // No recipe ingredients for YouTube
                 ytSugg.citation.sourceUrl,
                 genAI
             );

             // Update the YouTube suggestion with AI data
             ytSugg.description = aiEnrichment.description;
             ytSugg.tags = aiEnrichment.tags;

             finalSuggestions.push(ytSugg);
         }


        // --- Wikipedia Enrichment (as a potential *additional* source) ---
        if (finalSuggestions.length < MAX_RESULTS && finalSuggestions.length > 0) {
            logger.info(`Attempting Wikipedia enrichment for top result: ${finalSuggestions[0].name}`);
            try {
                const wikipediaTool = new WikipediaQueryRun({ topKResults: 1, maxDocContentLength: 1500 });
                const wikiQuery = `${finalSuggestions[0].name} (món ăn)`;
                const wikiContent = await wikipediaTool.call(wikiQuery);

                if (wikiContent && wikiContent.length > 50 && !wikiContent.includes("may refer to")) {
                    logger.info(`Found Wikipedia page for ${finalSuggestions[0].name}`);
                    // Check if we already have a suggestion with this name from Wikipedia
                    const wikiUrl = `https://vi.wikipedia.org/wiki/${encodeURIComponent(finalSuggestions[0].name.replace(/ /g, '_'))}`; // Approximate URL
                    const existingWiki = finalSuggestions.find(s => s.citation.sourceUrl?.includes('wikipedia.org'));

                    if (!existingWiki && finalSuggestions.length < MAX_RESULTS) {
                         const imageUrl = await getImageUrl(finalSuggestions[0].name, wikiUrl); // Try getting image from wiki page
                         const aiEnrichment = await enrichSuggestionWithAI(
                             finalSuggestions[0].name, // Use the same name
                             'wikipedia',
                             userIngredients,
                             undefined,
                             wikiUrl,
                             genAI
                         );
                         finalSuggestions.push({
                             name: finalSuggestions[0].name, // Keep original name for consistency
                             description: aiEnrichment.description, // AI description based on Wiki context
                             tags: aiEnrichment.tags, // AI tags based on Wiki context
                             imageUrl: imageUrl,
                             citation: {
                                 sourceName: 'Wikipedia',
                                 sourceUrl: wikiUrl, // Add the likely wiki URL
                                 isVideo: false,
                             },
                         });
                         logger.info(`Added suggestion from Wikipedia source for: ${finalSuggestions[0].name}`);
                    }
                } else {
                     logger.warn(`No suitable Wikipedia content found for: ${wikiQuery}`);
                }
            } catch (wikiError: any) {
                logger.error(`Error fetching or processing Wikipedia for ${finalSuggestions[0]?.name}:`, { message: wikiError.message });
            }
        }

         // --- Creative AI Suggestion (if still no results) ---
         if (finalSuggestions.length === 0 && genAI) {
             logger.info('No standard recipes found. Generating creative AI suggestion...');
             try {
                 // Define safetySettings within this scope
                 const safetySettings = [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                 ];
                 // Define model within this scope
                 const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

                 const creativePrompt = `You are a creative Vietnamese cooking assistant. The user has these ingredients: ${userIngredients.join(', ')}. They couldn't find a standard recipe. Suggest ONE creative, simple dish idea they could make using primarily these ingredients. Provide:
1.  **name**: A catchy name for the dish (Vietnamese or Viet-English).
2.  **description**: A short (1-2 sentence) description of the idea.
3.  **tags**: Infer basic tags (difficulty: "Dễ", type: "Sáng tạo").

Format the output as a JSON object like:
{
  "name": "Cơm Chiên Trứng Kiểu Mới",
  "description": "Thử làm cơm chiên với trứng và các nguyên liệu bạn có, thêm chút gia vị là có món mới!",
  "tags": { "difficulty": "Dễ", "type": "Sáng tạo" }
}`;
                 const result = await model.generateContent({
                     contents: [{ role: "user", parts: [{ text: creativePrompt }] }],
                     safetySettings,
                     generationConfig: { responseMimeType: "application/json" },
                 });
                 const creativeJson = JSON.parse(result.response.text());
                 if (creativeJson.name && creativeJson.description) {
                     finalSuggestions.push({
                         name: creativeJson.name,
                         description: creativeJson.description,
                         tags: creativeJson.tags || { difficulty: "Dễ", type: "Sáng tạo" },
                         imageUrl: await getImageUrl(creativeJson.name), // Try finding an image for the creative name
                         citation: {
                             sourceName: 'AI Creative Suggestion',
                             isVideo: false,
                         },
                     });
                     logger.info(`Added AI creative suggestion: ${creativeJson.name}`);
                 }
             } catch (creativeError: any) {
                 logger.error('Error generating creative AI suggestion:', { message: creativeError.message });
             }
         }


        // Final sort (optional, could sort by source type or keep current mix)
        // finalSuggestions.sort(...)

        logger.info(`Returning ${finalSuggestions.length} final suggestions.`);
        return NextResponse.json({ suggestions: finalSuggestions.slice(0, MAX_RESULTS) }); // Ensure max results limit

    } catch (error: any) {
        logger.error('Critical error in /api/suggest-recipes:', {
            message: error.message, stack: error.stack, name: error.name,
            code: error.code, errno: error.errno, syscall: error.syscall, path: error.path
        });
        // Ensure streams are closed in case of outer error
        rl?.close();
        fileStream?.close();
        return NextResponse.json({ error: 'Failed to suggest recipes', details: error.message }, { status: 500 });
    } finally {
         // Ensure readline interface is closed if it exists
         if (rl) {
             rl.close();
             // logger.info("Closed readline interface in finally block."); // Optional: reduce logging noise
         }
         // fileStream closes automatically when readline closes its input
    }
}
