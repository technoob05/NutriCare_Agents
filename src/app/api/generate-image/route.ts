import { GoogleGenAI } from "@google/genai"; // Không cần Type enum ở đây
import { NextResponse } from 'next/server';
import { Content, Part } from "@google/genai"; // Import các type cần thiết

// Khởi tạo GoogleGenAI client
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// --- Cấu hình Retry ---
const MAX_RETRIES = 3; // Số lần thử lại tối đa
const INITIAL_DELAY_MS = 1000; // Thời gian chờ ban đầu (1 giây)
const BACKOFF_FACTOR = 2; // Hệ số nhân thời gian chờ
// ---------------------

// Hàm tiện ích tạo độ trễ
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: Request) {
    let attempt = 0; // Biến đếm số lần thử

    // --- Validation Input (Thực hiện 1 lần bên ngoài vòng lặp retry) ---
    let dishName: string;
    let imageData: string | undefined;
    let editPrompt: string | undefined;
    try {
        const body = await request.json();
        dishName = body.dishName;
        imageData = body.imageData; // base64 image data for editing
        editPrompt = body.editPrompt; // text prompt for editing

        if (!dishName && !imageData) {
            return NextResponse.json({ error: 'Dish name or image data is required' }, { status: 400 });
        }

        if (!process.env.GEMINI_API_KEY) {
            console.error('GEMINI_API_KEY is not set in environment variables.');
            return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
        }
    } catch (parseError) {
        console.error("Error parsing request body:", parseError);
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    // --------------------------------------------------------------------

    let prompt: string;
    let contents: any; // Define contents variable

    if (imageData && editPrompt) {
        // Image editing mode
        prompt = editPrompt;
        contents = [
            { text: prompt },
            {
                inlineData: {
                    mimeType: "image/png", // Assuming image is PNG for now
                    data: imageData,
                },
            },
        ];
        console.log(`Attempting to edit image with prompt: ${editPrompt} (Attempt ${attempt + 1})`);
    } else {
        // Initial image generation mode
        prompt = `Generate a realistic, high-quality, and appetizing photo of the dish: ${dishName}. The image should focus on showcasing the dish in a delicious and visually appealing manner, with attention to detail in lighting, composition, and presentation. The dish should be the main subject of the image, and the background should be clean and non-distracting.`;
        contents = prompt;
        console.log(`Attempting to generate image for: ${dishName} (Attempt ${attempt + 1})`);
    }

    const config = {
        responseModalities: ["TEXT", "IMAGE"],
    };

    // --- Vòng lặp Retry ---
    while (attempt <= MAX_RETRIES) {
        try {
            // Gọi API tạo ảnh
            const result = await genAI.models.generateContent({
                model: "gemini-2.0-flash-exp-image-generation",
                contents: contents,
                config: config,
            });

            // --- Xử lý kết quả thành công ---
            if (!result || !result.candidates || result.candidates.length === 0 || !result.candidates[0].content || !result.candidates[0].content.parts) {
                console.error(`Invalid response structure from Gemini API on attempt ${attempt + 1}:`, result);
                // Coi đây là lỗi không thể thử lại, ném ra ngoài
                throw new Error('Invalid API response structure');
            }

            const candidate = result.candidates[0];
            const content: Content | undefined = candidate.content;

            if (!content || !content.parts) {
                console.error(`No content parts found in the response candidate on attempt ${attempt + 1}:`, candidate);
                throw new Error('Failed to process API response content');
            }

            const imagePart = content.parts.find((part: Part) => part.inlineData);

            if (imagePart && imagePart.inlineData) {
                console.log(`Successfully generated image for: ${dishName} after ${attempt + 1} attempt(s).`);
                return NextResponse.json({ imageData: imagePart.inlineData.data }); // Success: return image and exit loop
            }

            // --- Handle Case: API Success but No Image Data ---
            // This might happen if the model returns only text or fails mid-generation
            console.warn(`No inline image data found in Gemini response on attempt ${attempt + 1}. Checking for retry.`);
            const textParts = content.parts.filter((part: Part) => part.text).map((part: Part) => part.text);
            if (textParts.length > 0) {
                console.log("Text parts received instead of image:", textParts.join('\n'));
            }

            // Treat this as a retryable condition if attempts remain
            if (attempt < MAX_RETRIES) {
                attempt++;
                const delayTime = INITIAL_DELAY_MS * (BACKOFF_FACTOR ** (attempt - 1)) + Math.random() * 500;
                console.log(`No image data, but retries remain. Retrying attempt ${attempt + 1}/${MAX_RETRIES + 1} after ${delayTime.toFixed(0)}ms...`);
                await delay(delayTime);
                continue; // Continue to the next iteration of the while loop
            } else {
                // No retries left, throw final error
                console.error(`Failed to extract image data after ${attempt + 1} attempts.`);
                throw new Error('Failed to extract image data from API response after multiple retries.');
            }
            // ----------------------------------------------------

        } catch (error: any) {
            // --- Handle Direct API Errors (e.g., 503, network issues) ---
            console.error(`API Error on attempt ${attempt + 1} for "${dishName || 'edit'}":`, error.message);

            // --- Kiểm tra lỗi có thể thử lại (503 hoặc thông báo tương tự) ---
            const isRetryableError = error.message?.includes('503') ||
                                     error.message?.toLowerCase().includes('service unavailable') ||
                                     error.message?.toLowerCase().includes('model is overloaded');

            if (isRetryableError && attempt < MAX_RETRIES) {
                attempt++;
                // Tính toán thời gian chờ tăng dần + jitter (ngẫu nhiên nhỏ)
                const delayTime = INITIAL_DELAY_MS * (BACKOFF_FACTOR ** (attempt - 1)) + Math.random() * 500;
                console.log(`Retryable error detected. Retrying attempt ${attempt + 1}/${MAX_RETRIES + 1} after ${delayTime.toFixed(0)}ms...`);
                await delay(delayTime);
                // Vòng lặp sẽ tiếp tục với lần thử tiếp theo
                continue;
            } else {
                // Nếu không phải lỗi retryable hoặc đã hết số lần thử
            console.error(`Failed to generate image for "${dishName || 'edit'}" after ${attempt + 1} attempt(s). Error: ${error.message}`);
            // Throw the error to be caught by Next.js default handler (or a higher-level try/catch)
            throw error; // This will lead to a 500 response if not caught elsewhere
            }
            // -------------------------------------------------------------
        }
    } // Kết thúc vòng lặp while

    // This part should ideally not be reached if errors are thrown correctly within the loop.
    // If it is reached, it means the loop exited without success or throwing an error.
    console.error(`Exited retry loop unexpectedly for "${dishName || 'edit'}". This indicates a potential logic flaw.`);
    return NextResponse.json({ error: 'An unexpected server error occurred after exhausting retries.' }, { status: 500 });

} // Kết thúc hàm POST (không cần catch ở đây vì lỗi đã throw ra)

// Lưu ý: Next.js sẽ tự động bắt các lỗi chưa được xử lý và trả về 500.
// Nếu muốn tùy chỉnh response lỗi cuối cùng, bạn có thể bọc toàn bộ logic trong một try...catch lớn hơn.
/*
export async function POST(request: Request) {
    try {
        // ... toàn bộ logic retry ở trên ...
    } catch (finalError: any) {
        console.error('Final error after handling retries:', finalError);
        const errorMessage = finalError instanceof Error ? finalError.message : 'Unknown error occurred during image generation';
        // Kiểm tra xem có phải lỗi 503 không để trả về status phù hợp
        const status = errorMessage.includes('503') ? 503 : 500;
        return NextResponse.json({ error: `Failed to generate image: ${errorMessage}` }, { status });
    }
}
*/
