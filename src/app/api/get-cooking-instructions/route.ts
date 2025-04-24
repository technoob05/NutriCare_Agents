import { NextRequest, NextResponse } from "next/server";
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { LLMChain } from "langchain/chains";
import { BytesOutputParser } from "@langchain/core/output_parsers"; // For streaming
import * as cheerio from 'cheerio';

// Initialize LangChain components
const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.3,
    streaming: true,
});

// Updated prompt template for more detailed instructions
const recipePromptTemplate = PromptTemplate.fromTemplate(
    `Bạn là một Bếp trưởng AI chuyên nghiệp và tận tâm! Nhiệm vụ của bạn là phân tích kỹ lưỡng văn bản công thức nấu ăn được cung cấp và soạn thảo lại thành các bước hướng dẫn chi tiết, rõ ràng, dễ hiểu nhất có thể, được đánh số thứ tự bằng tiếng Việt cho món ăn "{mealName}".
{description_context}
Hãy tập trung vào việc mô tả cặn kẽ từng bước thực hiện. Nếu văn bản gốc có đề cập, hãy bao gồm cả:
- **Nguyên liệu chính** được sử dụng trong từng bước cụ thể (ví dụ: "Phi thơm tỏi băm với 2 muỗng canh dầu ăn").
- **Mẹo nhỏ hoặc kỹ thuật** quan trọng (ví dụ: "Xào thịt bò trên lửa lớn để thịt không bị dai").
- **Ước lượng thời gian** cho các bước quan trọng nếu có (ví dụ: "Hầm xương trong khoảng 1 tiếng").
- **Dấu hiệu nhận biết** khi hoàn thành một bước (ví dụ: "Xào đến khi rau củ chín tới, có màu xanh đẹp mắt").

Tuy nhiên, hãy bỏ qua phần giới thiệu chung lê thê, danh sách nguyên liệu liệt kê riêng biệt ở đầu bài, thông tin dinh dưỡng không liên quan trực tiếp đến cách làm, hoặc quảng cáo. Giọng văn cần chuyên nghiệp nhưng vẫn thân thiện, dễ tiếp cận.

Nếu văn bản không chứa đủ thông tin để tạo các bước nấu ăn chi tiết, hãy trả lời: "Xin lỗi, thông tin từ nguồn tham khảo chưa đủ chi tiết để tạo hướng dẫn nấu ăn đầy đủ cho món này."

Văn bản công thức được tìm thấy:
---
{extracted_text}
---

Hướng dẫn nấu ăn chi tiết (tiếng Việt, đánh số thứ tự, mô tả cặn kẽ từng bước, bao gồm nguyên liệu/mẹo/thời gian nếu có):`
);

// Chain for streaming text output - prompt is now part of the chain definition
const recipeFormattingChain = recipePromptTemplate.pipe(llm).pipe(new BytesOutputParser());

// Initialize DuckDuckGo Search tool with more results
const searchTool = new DuckDuckGoSearch({ maxResults: 5 });

// Helper function to fetch and extract text content (keep as before)
async function fetchAndExtractText(url: string): Promise<string> {
    try {
        console.log(`Fetching content from: ${url}`);
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        }
        const html = await response.text();
        const $ = cheerio.load(html);
        $('script, style, nav, footer, header, aside').remove();
        let text = $('article').text() || $('main').text() || $('.recipe-content').text() || $('.instructions').text();
        if (!text) {
            text = $('body').text();
        }
        text = text.replace(/\s\s+/g, ' ').replace(/(\r\n|\n|\r)/gm, " ").trim();
        console.log(`Extracted text length: ${text.length}`);
        const MAX_LENGTH = 15000;
        return text.length > MAX_LENGTH ? text.substring(0, MAX_LENGTH) + "..." : text;
    } catch (error) {
        console.error(`Error fetching or parsing ${url}:`, error);
        throw new Error(`Could not fetch or parse content from the provided link.`);
    }
}

// Helper function to call the TTS API (keep as before)
async function generateTTSAudio(text: string, origin: string): Promise<string | null> {
    try {
        const ttsResponse = await fetch(`${origin}/api/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });
        if (!ttsResponse.ok) {
            console.error("TTS API call failed:", ttsResponse.statusText);
            return null;
        }
        const ttsData = await ttsResponse.json();
        return ttsData.audioBase64;
    } catch (error) {
        console.error("Error calling TTS API:", error);
        return null;
    }
}

export async function POST(req: NextRequest) {
    const origin = req.nextUrl.origin;

    try {
        const body = await req.json();
        // Expect mealName and optional detailedDescription
        const { mealName, detailedDescription } = body;

        if (!mealName) {
            return NextResponse.json({ error: "Missing mealName" }, { status: 400 });
        }

        // 1. Construct Search Query (use description if available)
        let searchQuery = `công thức nấu ăn ${mealName} chi tiết`;
        if (detailedDescription) {
            // Add keywords from description to refine search
            searchQuery = `công thức nấu ăn ${mealName} ${detailedDescription.split(' ').slice(0, 5).join(' ')} chi tiết`; // Use first few words
            console.log(`Using detailed description for search: "${detailedDescription}"`);
        }
        console.log(`Searching for recipe with query: ${searchQuery}`);
        const searchResultString = await searchTool.invoke(searchQuery);
        console.log(`Search results string: ${searchResultString}`);

        let firstRecipeUrl = ''; // URL used for fetching content
        const allRecipeUrls: string[] = []; // Array to store all found URLs
        let foundLink = false;

        try {
            // DuckDuckGoSearch returns a stringified JSON array
            const searchResults = JSON.parse(searchResultString);
            if (searchResults && Array.isArray(searchResults) && searchResults.length > 0) {
                // Collect all valid links
                for (const result of searchResults) {
                    if (result.link && typeof result.link === 'string') {
                        allRecipeUrls.push(result.link);
                        if (!foundLink) {
                            // Use the first valid link for fetching content
                            firstRecipeUrl = result.link;
                            foundLink = true;
                            console.log(`Using first recipe link: ${firstRecipeUrl}`);
                        }
                    }
                }
            }
             if (!foundLink) {
                 // Try regex fallback on the raw string if parsing worked but no links found
                 const urlMatches = searchResultString.match(/https?:\/\/[^\s"]+/g);
                 if (urlMatches && urlMatches.length > 0) {
                     allRecipeUrls.push(...urlMatches);
                     firstRecipeUrl = urlMatches[0];
                     foundLink = true;
                     console.warn(`Parsed JSON had no links, falling back to regex matches: ${firstRecipeUrl}`);
                 } else {
                     throw new Error("No relevant search results with links found.");
                 }
            }
        } catch (parseError) {
            console.error("Error parsing search results:", parseError, "Raw:", searchResultString);
            // Fallback: Try to extract URLs using regex if parsing fails
             const urlMatches = searchResultString.match(/https?:\/\/[^\s"]+/g); // Find all matches
             if (urlMatches && urlMatches.length > 0) {
                 allRecipeUrls.push(...urlMatches); // Add all found URLs
                 firstRecipeUrl = urlMatches[0]; // Use the first one
                 foundLink = true;
                 console.warn(`Parsed JSON failed, falling back to regex matches: ${firstRecipeUrl}`);
             } else {
                 throw new Error("Could not parse or find any link in search results.");
             }
        }

        if (!foundLink || !firstRecipeUrl) {
             throw new Error("Failed to determine a recipe URL to fetch.");
        }


        // 2. Fetch and Extract Text (using the first valid URL found)
        const extractedText = await fetchAndExtractText(firstRecipeUrl);
        if (!extractedText || extractedText.length < 50) { // Check for minimal content length
             throw new Error("Could not extract sufficient content from the recipe page: " + firstRecipeUrl);
        }

        // 3. Stream Formatted Instructions using LLM
        console.log("Streaming recipe steps using LLM...");
        // Prepare context for the prompt template
        const descriptionContext = detailedDescription
            ? `Mô tả chi tiết món ăn từ hình ảnh (dùng làm ngữ cảnh): "${detailedDescription}"`
            : "Không có mô tả chi tiết từ hình ảnh.";

        const stream = await recipeFormattingChain.stream({
             mealName: mealName, // Pass meal name to prompt
             description_context: descriptionContext, // Pass description context
             extracted_text: extractedText
        });

        // We need the full text *after* streaming to generate TTS.
        // Let's collect the streamed text.
        let fullFormattedText = "";
        const textDecoder = new TextDecoder();
        const reader = stream.getReader();
        const streamController = new TransformStream();
        const writer = streamController.writable.getWriter();

        // Read from the original stream and pipe to the new stream, collecting text along the way
        const processStream = async () => {
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunkText = textDecoder.decode(value, { stream: true });
                    fullFormattedText += chunkText;
                    await writer.write(value); // Pass chunk to the response stream
                }
            } catch (streamError) {
                 console.error("Error reading LLM stream:", streamError);
                 writer.abort(streamError); // Abort the response stream on error
                 throw streamError; // Re-throw to be caught by the main try/catch
            } finally {
                 writer.close(); // Close the writer when done
            }
        };

        // Start processing the stream but don't await it here, let it run in the background
        // while we return the response stream immediately.
        const streamProcessingPromise = processStream();


        // Return the streaming response immediately
        const headers = new Headers();
        headers.set('Content-Type', 'text/plain; charset=utf-8');
        headers.set('X-Source-Url', encodeURIComponent(firstRecipeUrl)); // Send the primary source URL
        // Send all found URLs as a JSON string in a separate header
        headers.set('X-Source-Urls-Json', JSON.stringify(allRecipeUrls));

        return new NextResponse(streamController.readable, { headers });

        // Note: TTS generation is now removed from the streaming response path.
        // The client will need to:
        // 1. Read the text stream.
        // 2. Once the stream is complete, take the full text.
        // 3. Make a *new* request to `/api/tts` with the full text.
        // 4. Play the audio received from the TTS request.

    } catch (error) {
        console.error("Error in get-cooking-instructions:", error);
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        // Return error as JSON, not stream
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
