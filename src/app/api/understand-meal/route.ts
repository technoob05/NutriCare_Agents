import { NextResponse } from 'next/server';
import { WikipediaQueryRun } from "@langchain/community/tools/wikipedia_query_run";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from 'zod';

// Define Zod schema for the summary part
const SummarySchema = z.object({
    introduction: z.string().optional().describe("Giới thiệu văn hóa & lịch sử của món ăn."),
    cooking: z.string().optional().describe("Cách nấu chi tiết món ăn."),
    nutrition: z.string().optional().describe("Thông tin dinh dưỡng & lợi ích sức khỏe."),
    origin: z.string().optional().describe("Nguồn gốc vùng miền của món ăn."),
    funFact: z.string().optional().describe("Một trivia nhỏ, thú vị về món ăn."),
});

// Define Zod schema for the quiz part (Multiple Choice Questions)
const QuizQuestionSchema = z.object({
    question: z.string().describe("Câu hỏi trắc nghiệm về món ăn."),
    options: z.array(z.string()).length(4).describe("Bốn lựa chọn trả lời (bao gồm 1 đáp án đúng)."),
    answer: z.string().describe("Đáp án đúng (phải là một trong các options).")
});

const QuizSchema = z.object({
    quiz: z.array(QuizQuestionSchema).min(3).max(5).describe("Một mảng gồm 3-5 câu hỏi trắc nghiệm.")
});

// Combine schemas for the final output
const CombinedOutputSchema = z.object({
    summary: SummarySchema.describe("Phần tóm tắt thông tin món ăn."),
    game: QuizSchema.describe("Phần trò chơi trắc nghiệm.")
});

// Initialize the Langchain Google Generative AI model
const model = new ChatGoogleGenerativeAI({
    model: "gemini-1.5-flash", // Changed modelName to model based on TS error
    apiKey: process.env.GOOGLE_GENAI_API_KEY,
    temperature: 0.6, // Slightly higher temp for more engaging text and varied questions
    maxOutputTokens: 2048,
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { mealName } = body;

        if (!mealName || typeof mealName !== 'string') {
            return NextResponse.json({ error: 'Invalid meal name provided.' }, { status: 400 });
        }

        console.log(`[understand-meal LC] Received request for: ${mealName}`);

        // 1. Fetch data from Wikipedia
        const wikipediaTool = new WikipediaQueryRun({
            topKResults: 1, // Get the most relevant page
            maxDocContentLength: 4000 // Limit content length
        });
        let wikipediaContent: string;
        try {
            console.log(`[understand-meal LC] Querying Wikipedia for: ${mealName}`);
            wikipediaContent = await wikipediaTool.call(mealName);
            console.log(`[understand-meal LC] Received Wikipedia content (length: ${wikipediaContent.length})`);
            if (!wikipediaContent || wikipediaContent.length < 100) {
                 console.warn(`[understand-meal LC] Insufficient content from Wikipedia for: ${mealName}`);
                 wikipediaContent = `Không tìm thấy đủ thông tin chi tiết trên Wikipedia cho món "${mealName}".`; // Provide fallback for LLM
            }
        } catch (wikiError: any) {
            console.error(`[understand-meal LC] Wikipedia tool error for "${mealName}":`, wikiError);
            wikipediaContent = `Lỗi khi truy cập Wikipedia để tìm thông tin về "${mealName}".`; // Provide fallback for LLM
        }

        // 2. Process data with Langchain (Gemini) and generate structured output + quiz
        console.log(`[understand-meal LC] Processing content with Langchain Gemini for: ${mealName}`);

        // Create a parser based on the combined Zod schema
        const parser = StructuredOutputParser.fromZodSchema(CombinedOutputSchema);

        const formatInstructions = parser.getFormatInstructions();

        const promptTemplate = new PromptTemplate({
            template: `Dựa vào thông tin sau đây về món ăn "{mealName}", hãy thực hiện 2 việc:
            1. Tạo ra một bản tóm tắt sinh động, hấp dẫn bằng tiếng Việt bao gồm các mục: giới thiệu văn hóa/lịch sử, cách nấu (nếu có), dinh dưỡng/lợi ích (nếu có), nguồn gốc (nếu có), và một fun fact.
            2. Tạo ra một bộ 3-5 câu hỏi trắc nghiệm (MCQ) thú vị về món ăn này, mỗi câu có 4 lựa chọn và chỉ 1 đáp án đúng.

            Thông tin từ Wikipedia:
            ---
            {wikipediaContent}
            ---

            Hãy cấu trúc toàn bộ câu trả lời của bạn theo định dạng JSON mong muốn sau đây.

            {formatInstructions}

            Ví dụ về giọng văn mong muốn cho phần introduction: "Phở là một món ăn tinh túy của Việt Nam, nổi tiếng với nước dùng đậm đà, bánh phở mềm mại và hương thơm quyến rũ của các loại thảo mộc..."
            Ví dụ về câu hỏi trắc nghiệm: "Nguyên liệu nào tạo nên vị chua đặc trưng của Tom Yum?" với các lựa chọn và đáp án đúng.

            Chỉ trả về đối tượng JSON hợp lệ theo định dạng đã hướng dẫn, không có bất kỳ văn bản nào khác trước hoặc sau nó.`,
            inputVariables: ["mealName", "wikipediaContent"],
            partialVariables: { formatInstructions },
        });

        const chain = promptTemplate.pipe(model).pipe(parser);

        try {
            console.log(`[understand-meal LC] Invoking Langchain chain for: ${mealName}`);
            const result = await chain.invoke({
                mealName: mealName,
                wikipediaContent: wikipediaContent,
            });

            console.log(`[understand-meal LC] Successfully processed data for: ${mealName}`);
            // The result from the chain with StructuredOutputParser is already the parsed object
            return NextResponse.json(result);

        } catch (llmError: any) {
             console.error(`[understand-meal LC] Langchain chain/model error for "${mealName}":`, llmError);
             // Provide a more generic error if the LLM fails
             return NextResponse.json({ error: `Lỗi khi tạo thông tin và trò chơi cho món ăn: ${llmError.message}` }, { status: 500 });
        }

    } catch (error: any) {
        console.error('[understand-meal LC] General error:', error);
        return NextResponse.json({ error: `An unexpected error occurred: ${error.message}` }, { status: 500 });
    }
}
