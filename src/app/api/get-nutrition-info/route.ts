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
    temperature: 0.2,
    streaming: true, // Enable streaming
});

// Updated prompt to accept context and provide better instructions
const nutritionPromptTemplate = PromptTemplate.fromTemplate(
    `Xin chào! Mình là trợ lý dinh dưỡng AI đây! Nhiệm vụ của mình là đọc văn bản được cung cấp và tóm tắt các thông tin dinh dưỡng chính cho món ăn "{mealName}".
{description_context}
Mình sẽ tập trung vào calo, protein, chất béo (fat), và carbs. Nếu có thông tin về khẩu phần ăn (serving size), mình sẽ ghi chú luôn.
Hãy trình bày thật rõ ràng, ngắn gọn bằng tiếng Việt, sử dụng định dạng danh sách hoặc gạch đầu dòng nếu phù hợp.
Nếu không tìm thấy thông tin dinh dưỡng cụ thể nào trong văn bản, hãy trả lời: "Hmm, mình chưa tìm thấy thông tin dinh dưỡng chi tiết cho món này trong văn bản được cung cấp.".

Văn bản được tìm thấy:
---
{extracted_text}
---

Tóm tắt dinh dưỡng (tiếng Việt, giọng văn thân thiện, tập trung vào calo, protein, fat, carbs):`
);

// Chain for streaming text output
const nutritionExtractionChain = nutritionPromptTemplate.pipe(llm).pipe(new BytesOutputParser());

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
        let text = $('article').text() || $('main').text() || $('.nutrition-facts').text() || $('.nutritional-info').text();
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

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        // Expect mealName and optional detailedDescription
        const { mealName, detailedDescription } = body;

        if (!mealName) {
            return NextResponse.json({ error: "Missing mealName" }, { status: 400 });
        }

        // 1. Construct Search Query (use description if available)
        let searchQuery = `thông tin dinh dưỡng ${mealName} calories protein fat carbs`;
         if (detailedDescription) {
            // Add keywords from description to refine search
            searchQuery = `thông tin dinh dưỡng ${mealName} ${detailedDescription.split(' ').slice(0, 5).join(' ')} calories protein fat carbs`; // Use first few words
            console.log(`Using detailed description for nutrition search: "${detailedDescription}"`);
        }
        console.log(`Searching for nutrition info with query: ${searchQuery}`);
        const searchResultString = await searchTool.invoke(searchQuery);
        console.log(`Nutrition search results string: ${searchResultString}`);

        let firstNutritionUrl = ''; // URL used for fetching content
        const allNutritionUrls: string[] = []; // Array to store all found URLs
        let foundLink = false;

        try {
            // DuckDuckGoSearch returns a stringified JSON array
            const searchResults = JSON.parse(searchResultString);
             if (searchResults && Array.isArray(searchResults) && searchResults.length > 0) {
                // Collect all valid links
                for (const result of searchResults) {
                    if (result.link && typeof result.link === 'string') {
                        allNutritionUrls.push(result.link);
                        if (!foundLink) {
                            // Use the first valid link for fetching content
                            firstNutritionUrl = result.link;
                            foundLink = true;
                            console.log(`Using first nutrition link: ${firstNutritionUrl}`);
                        }
                    }
                }
            }
             if (!foundLink) {
                 // Try regex fallback on the raw string if parsing worked but no links found
                 const urlMatches = searchResultString.match(/https?:\/\/[^\s"]+/g);
                 if (urlMatches && urlMatches.length > 0) {
                     allNutritionUrls.push(...urlMatches);
                     firstNutritionUrl = urlMatches[0];
                     foundLink = true;
                     console.warn(`Parsed JSON had no links, falling back to regex matches for nutrition: ${firstNutritionUrl}`);
                 } else {
                     throw new Error("No relevant search results with links found for nutrition.");
                 }
            }
        } catch (parseError) {
             console.error("Error parsing nutrition search results:", parseError, "Raw:", searchResultString);
             // Fallback: Try to extract URLs using regex if parsing fails
             const urlMatches = searchResultString.match(/https?:\/\/[^\s"]+/g); // Find all matches
             if (urlMatches && urlMatches.length > 0) {
                 allNutritionUrls.push(...urlMatches); // Add all found URLs
                 firstNutritionUrl = urlMatches[0]; // Use the first one
                 foundLink = true;
                 console.warn(`Parsed JSON failed, falling back to regex matches for nutrition: ${firstNutritionUrl}`);
             } else {
                 throw new Error("Could not parse or find any link in nutrition search results.");
             }
        }

         if (!foundLink || !firstNutritionUrl) {
             throw new Error("Failed to determine a nutrition URL to fetch.");
        }

        // 2. Fetch and Extract Text (using the first valid URL found)
        const extractedText = await fetchAndExtractText(firstNutritionUrl);
         if (!extractedText || extractedText.length < 30) { // Check for minimal content length
             throw new Error("Could not extract sufficient content from the nutrition page: " + firstNutritionUrl);
        }

        // 3. Stream Extracted Nutrition Info using LLM
        console.log("Streaming nutrition info using LLM...");
         // Prepare context for the prompt template
        const descriptionContext = detailedDescription
            ? `Mô tả chi tiết món ăn từ hình ảnh (dùng làm ngữ cảnh): "${detailedDescription}"`
            : "Không có mô tả chi tiết từ hình ảnh.";

        const stream = await nutritionExtractionChain.stream({
            mealName: mealName, // Pass meal name to prompt
            description_context: descriptionContext, // Pass description context
            extracted_text: extractedText
        });

        // Return the streaming response
        const headers = new Headers();
        headers.set('Content-Type', 'text/plain; charset=utf-8');
        headers.set('X-Source-Url', encodeURIComponent(firstNutritionUrl)); // Send the primary source URL
        // Send all found URLs as a JSON string in a separate header
        headers.set('X-Source-Urls-Json', JSON.stringify(allNutritionUrls));

        return new NextResponse(stream, { headers });

    } catch (error) {
        console.error("Error getting nutrition info:", error);
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        // Return error as JSON, not stream
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
