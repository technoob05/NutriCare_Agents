import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { searchImages } from 'duck-duck-scrape'; // <-- Add image search import
import * as cheerio from 'cheerio'; // <-- Add cheerio import
import { StructuredOutputParser, BytesOutputParser } from "@langchain/core/output_parsers"; // Added BytesOutputParser for streaming
import { searchDuckDuckGo } from '@/services/duckduckgo'; // Import DDG search
import { performRAG, Citation, RAGResult } from '@/ai/rag'; // Import RAG
import logger from '@/lib/logger'; // Ensure logger is imported
import { searchPexelsImages } from '@/services/pexels';

// --- Define Agent Names (Constants) ---
const AGENT_NAMES = {
  NUTRITION_ANALYSIS: 'Nutrition Analysis',
  HEALTHY_SWAP: 'Healthy Swap Advisor',
  MEAL_SCORING: 'Meal Health Scoring',
  GOAL_ALIGNMENT: 'Goal Alignment',
  MENU_GENERATOR: 'Menu Generator',
  SYNTHESIZER: 'Synthesizer', // Added Synthesizer Agent
  REASONING_PLANNER: 'Reasoning & Planning', // Reasoning agent for step-by-step explainable AI
} as const;

type AgentName = typeof AGENT_NAMES[keyof typeof AGENT_NAMES];

// --- Define Request Schema --- (Using Zod for validation)
// Extended HealthInfoSchema based on HealthInformationForm.tsx
const HealthInfoSchema = z.object({
    name: z.string().optional(), // Added
    age: z.number().min(1).max(120).optional().nullable(),
    gender: z.enum(['Male', 'Female', 'Other', 'Prefer not to say']).optional(), // Updated enum
    height: z.number().positive().optional().nullable(),
    weight: z.number().positive().optional().nullable(),
    activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'extra_active']).optional(), // Updated enum
    allergies: z.string().optional(),
    dietaryRestrictions: z.string().optional(), // Added
    preferences: z.string().optional(), // Added
    medicalConditions: z.string().optional(), // Added
    goals: z.string().optional(),
});

const chatMobiRequestSchema = z.object({
  input: z.string().min(1, { message: 'Input message is required.' }),
  activeAgents: z.array(z.nativeEnum(AGENT_NAMES)).min(1, { message: 'At least one agent must be active.' }),
  healthInfo: HealthInfoSchema.optional(), // Use the extended schema
  menuTimeframe: z.enum(['daily', 'weekly']).optional(), // Re-added menuTimeframe
  userRecommendations: z.array(z.any()).optional(), // Added userRecommendations
  enableWebSearch: z.boolean().optional().default(false), // Flag to enable web search/RAG
  displayImages: z.enum(['menu', 'inline', 'none']).optional().default('inline').describe("How images should be displayed ('menu' for prominent display under items, 'inline' for within text, 'none' to disable)"), // <-- Add image display preference
});

// --- Define Citation Schema ---
const CitationSchema = z.object({
  source: z.string(),
  url: z.string().url(),
  title: z.string(),
});

// --- Define Output Schemas for Agents ---
const NutritionAnalysisSchema = z.object({
  calories: z.string().optional().describe("Lượng calo ước tính (ví dụ: 'Khoảng 550 kcal')"),
  protein: z.string().optional().describe("Lượng protein ước tính (ví dụ: '25g')"),
  fat: z.string().optional().describe("Lượng chất béo ước tính (ví dụ: '30g')"),
  carbs: z.string().optional().describe("Lượng carbohydrate ước tính (ví dụ: '40g')"),
  servingSize: z.string().optional().describe("Khẩu phần ăn (ví dụ: '1 đĩa')"),
  explanation: z.string().describe("Giải thích ngắn gọn về cách ước tính dinh dưỡng.")
});

const HealthySwapSchema = z.object({
  suggestion: z.string().describe("Gợi ý thay thế thực phẩm lành mạnh hơn."),
  reason: z.string().describe("Lý do tại sao gợi ý này tốt hơn.")
});

const MealScoringSchema = z.object({
  score: z.number().min(1).max(10).describe("Điểm số sức khỏe của bữa ăn (thang điểm 1-10)."),
  scale: z.string().describe("Mô tả thang điểm (ví dụ: '1-10 (Cao hơn là tốt hơn)')"),
  explanation: z.string().describe("Giải thích ngắn gọn về điểm số được đưa ra.")
});

const GoalAlignmentSchema = z.object({
  alignment: z.string().describe("Mức độ phù hợp với mục tiêu (ví dụ: 'Phù hợp', 'Một phần phù hợp', 'Không phù hợp')"),
  goalChecked: z.string().describe("Mục tiêu đã được kiểm tra (ví dụ: 'giảm cân', 'tăng cơ', 'sức khỏe tổng quát')"),
  explanation: z.string().describe("Giải thích tại sao bữa ăn phù hợp hoặc không phù hợp với mục tiêu.")
});

// --- Define Menu Schemas (Matching Frontend) ---
const MenuItemSchema = z.object({
  name: z.string(),
  ingredients: z.array(z.string()),
  preparation: z.string(),
  calories: z.number().optional(),
  protein: z.number().optional(),
  fat: z.number().optional(),
  carbs: z.number().optional(),
  healthBenefits: z.array(z.string()).optional(),
  estimatedCost: z.string().optional(),
  reasoning: z.string().optional().describe("Detailed reason why this item was chosen, potentially citing sources."), // Added reasoning
  imageUrl: z.string().url().optional().describe("URL of a representative image for the menu item"), // <-- Add imageUrl
});

const DailyMenuSchema = z.object({
  breakfast: z.array(MenuItemSchema),
  lunch: z.array(MenuItemSchema),
  dinner: z.array(MenuItemSchema),
  snacks: z.array(MenuItemSchema).optional(),
});

const WeeklyMenuSchema = z.object({
  Monday: DailyMenuSchema.optional(),
  Tuesday: DailyMenuSchema.optional(),
  Wednesday: DailyMenuSchema.optional(),
  Thursday: DailyMenuSchema.optional(),
  Friday: DailyMenuSchema.optional(),
  Saturday: DailyMenuSchema.optional(),
  Sunday: DailyMenuSchema.optional(),
});

// --- Define Agent Interaction Step Schema (Matches Frontend) ---
const AgentInteractionStepSchema = z.object({
  id: z.string().or(z.number()).describe("Unique ID for the step (e.g., 'step-1', 1)"),
  agentName: z.string().describe("Name of the agent performing the action (e.g., 'Menu Generator', 'Data Retriever')"),
  action: z.string().describe("Description of the action performed (e.g., 'Analyzing request', 'Generating breakfast options', 'Finalizing menu')"),
  details: z.string().optional().describe("Optional brief details about the action or data used"),
  status: z.enum(['processing', 'success', 'error', 'complete']).describe("Status of the step ('complete' or 'success' preferred for finished steps)"),
});

// --- Define Menu Generator Output Schema ---
const MenuGeneratorSchema = z.object({
  menuType: z.enum(['daily', 'weekly']).describe("Loại thực đơn (hàng ngày hoặc hàng tuần)"),
  menuData: z.union([DailyMenuSchema, WeeklyMenuSchema]).describe("Dữ liệu thực đơn chi tiết"),
  agentFeedbacks: z.array(z.object({
    agentName: z.string(),
    feedback: z.string(),
    score: z.number().optional(),
    recommendations: z.array(z.string()).optional(),
  })).optional().describe("Optional feedback from analysis agents run on the generated menu"),
  interactionSteps: z.array(AgentInteractionStepSchema).optional().describe("Steps taken by the agent(s) to generate the menu"),
  citations: z.array(CitationSchema).optional().describe("List of sources used for RAG during menu generation"), // Added citations
});

// --- Define Synthesizer Output Schema ---
// --- Define Image Association Schema (for Synthesizer) ---
const ImageAssociationSchema = z.object({
    name: z.string().describe("Name of the food item identified in the text"),
    url: z.string().url().describe("URL of the fetched image"),
});

const SynthesizerOutputSchema = z.object({
  content: z.string().describe("The final synthesized response text."),
  citations: z.array(CitationSchema).optional().describe("List of sources used for RAG during synthesis"),
  images: z.array(ImageAssociationSchema).optional().describe("List of identified food items and their fetched image URLs"), // <-- Add images field
});


// --- Initialize LLM ---
const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    apiKey: process.env.GOOGLE_GENAI_API_KEY,
    temperature: 0.6, // Slightly increased for more creative menu generation
    maxOutputTokens: 8192, // Max attempt for detailed weekly menus
});

// --- Agent Functions using LangChain ---

async function nutritionAnalysisAgent(input: string): Promise<object> {
  console.log(`[Agent: ${AGENT_NAMES.NUTRITION_ANALYSIS}] Processing: "${input}"`);
  const parser = StructuredOutputParser.fromZodSchema(NutritionAnalysisSchema);
  const prompt = new PromptTemplate({
    template: `Phân tích dinh dưỡng ước tính cho món ăn: "{mealName}".
    Cung cấp calo, protein, fat, carbs, khẩu phần ăn. Giải thích ngắn gọn cách ước tính.
    {formatInstructions}
    Món ăn: {mealName}`,
    inputVariables: ["mealName"],
    partialVariables: { formatInstructions: parser.getFormatInstructions() },
  });
  const chain = prompt.pipe(model).pipe(parser);
  try {
    const result = await chain.invoke({ mealName: input });
    return { agent: AGENT_NAMES.NUTRITION_ANALYSIS, status: 'success', result };
  } catch (error: any) {
    console.error(`[Agent: ${AGENT_NAMES.NUTRITION_ANALYSIS}] Error:`, error);
    return { agent: AGENT_NAMES.NUTRITION_ANALYSIS, status: 'error', error: `Lỗi phân tích dinh dưỡng: ${error.message}` };
  }
}

async function healthySwapAdvisorAgent(input: string): Promise<object> {
    console.log(`[Agent: ${AGENT_NAMES.HEALTHY_SWAP}] Processing: "${input}"`);
    const parser = StructuredOutputParser.fromZodSchema(HealthySwapSchema);
    const prompt = new PromptTemplate({
        template: `Đề xuất một thay thế lành mạnh hơn (thành phần hoặc cách chế biến) cho món ăn: "{mealName}". Nêu lý do.
        {formatInstructions}
        Món ăn: {mealName}`,
        inputVariables: ["mealName"],
        partialVariables: { formatInstructions: parser.getFormatInstructions() },
    });
    const chain = prompt.pipe(model).pipe(parser);
    try {
        const result = await chain.invoke({ mealName: input });
        return { agent: AGENT_NAMES.HEALTHY_SWAP, status: 'success', result };
    } catch (error: any) {
        console.error(`[Agent: ${AGENT_NAMES.HEALTHY_SWAP}] Error:`, error);
        return { agent: AGENT_NAMES.HEALTHY_SWAP, status: 'error', error: `Lỗi gợi ý thay thế: ${error.message}` };
    }
}

async function mealHealthScoringAgent(input: string): Promise<object> {
    console.log(`[Agent: ${AGENT_NAMES.MEAL_SCORING}] Processing: "${input}"`);
    const parser = StructuredOutputParser.fromZodSchema(MealScoringSchema);
    const prompt = new PromptTemplate({
        template: `Đánh giá độ lành mạnh của món ăn "{mealName}" (thang 1-10, 10=lành mạnh nhất). Cung cấp điểm, mô tả thang điểm, giải thích.
        {formatInstructions}
        Món ăn: {mealName}`,
        inputVariables: ["mealName"],
        partialVariables: { formatInstructions: parser.getFormatInstructions() },
    });
    const chain = prompt.pipe(model).pipe(parser);
    try {
        const result = await chain.invoke({ mealName: input });
        if (typeof result.score !== 'number') {
            throw new Error('LLM did not return a valid number for the score.');
        }
        return { agent: AGENT_NAMES.MEAL_SCORING, status: 'success', result };
    } catch (error: any) {
        console.error(`[Agent: ${AGENT_NAMES.MEAL_SCORING}] Error:`, error);
        return { agent: AGENT_NAMES.MEAL_SCORING, status: 'error', error: `Lỗi chấm điểm sức khỏe: ${error.message}` };
    }
}

async function goalAlignmentAgent(input: string, context?: any): Promise<object> {
    const userContext = context || {};
    const healthInfo = userContext || {}; // Goal alignment might just need goals from healthInfo
    const goal = healthInfo.goals || 'sức khỏe tổng quát'; // Default goal if not provided in healthInfo
    console.log(`[Agent: ${AGENT_NAMES.GOAL_ALIGNMENT}] Processing: "${input}" with goal: "${goal}"`);

    const parser = StructuredOutputParser.fromZodSchema(GoalAlignmentSchema);
    const prompt = new PromptTemplate({
        template: `Đánh giá món ăn "{mealName}" phù hợp với mục tiêu "{userGoal}" như thế nào? Cho biết mức độ phù hợp, mục tiêu đã kiểm tra, giải thích.
        {formatInstructions}
        Món ăn: {mealName}
        Mục tiêu: {userGoal}`,
        inputVariables: ["mealName", "userGoal"],
        partialVariables: { formatInstructions: parser.getFormatInstructions() },
    });
    const chain = prompt.pipe(model).pipe(parser);
    try {
        const result = await chain.invoke({ mealName: input, userGoal: goal });
        return { agent: AGENT_NAMES.GOAL_ALIGNMENT, status: 'success', result: { ...result, goalChecked: goal } };
    } catch (error: any) {
        console.error(`[Agent: ${AGENT_NAMES.GOAL_ALIGNMENT}] Error:`, error);
        return { agent: AGENT_NAMES.GOAL_ALIGNMENT, status: 'error', error: `Lỗi đánh giá mục tiêu: ${error.message}` };
  }
}

// --- Reasoning & Planning Agent (Streaming Text) ---
async function reasoningPlannerAgent(input: string, context?: any, ragResult?: RAGResult): Promise<ReadableStream<Uint8Array>> {
    const agentName = AGENT_NAMES.REASONING_PLANNER;
    const userContext = context || {};
    const healthInfo = userContext.healthInfo || {};
    const enableWebSearch = !!ragResult; // Check if RAG was performed

    logger.info(`[Agent: ${agentName}] Starting reasoning stream for input: "${input}", WebSearch: ${enableWebSearch}`);

    // Initialize a separate LLM instance for streaming text
    const streamingLlm = new ChatGoogleGenerativeAI({
        model: "gemini-2.0-flash", // Or another suitable model
        apiKey: process.env.GOOGLE_GENAI_API_KEY,
        temperature: 0.5, // Adjust temperature for reasoning
        streaming: true,
        maxOutputTokens: 2048, // Limit reasoning output length if needed
    });

    // Consolidate health info for the prompt
    const healthContextString = Object.entries(healthInfo)
        .map(([key, value]) => value ? `- ${key}: ${value}` : null)
        .filter(Boolean)
        .join('\n') || "Không có thông tin sức khỏe chi tiết.";

    const ragContext = ragResult?.context || "Không có thông tin bổ sung từ web.";
    const ragCitations = ragResult?.citations || [];
    const ragContextString = enableWebSearch
        ? `**Thông tin tham khảo từ web:**\n${ragContext}\n**Nguồn:**\n${ragCitations.map(c => `- ${c.title}: ${c.url}`).join('\n')}`
        : "Không sử dụng tìm kiếm web.";

    // Prompt specifically for generating a step-by-step reasoning process
    const reasoningPrompt = PromptTemplate.fromTemplate(
        `**Persona:** Bạn là một AI phân tích và lập kế hoạch (Reasoning & Planning Agent). Nhiệm vụ của bạn là giải thích **từng bước** quá trình suy nghĩ để trả lời yêu cầu của người dùng, dựa trên thông tin được cung cấp. Hãy trình bày rõ ràng, mạch lạc, và dễ theo dõi.

        **Yêu cầu người dùng:** "{userInput}"

        **Thông tin người dùng (nếu có):**
        {healthContext}

        **Thông tin từ tìm kiếm web (nếu có):**
        {ragContextString}

        **Nhiệm vụ:**
        Hãy suy nghĩ từng bước (think step-by-step) để phân tích yêu cầu và lập kế hoạch trả lời. Mô tả rõ ràng từng bước suy luận của bạn. Ví dụ:
        1.  **Phân tích yêu cầu:** Xác định mục tiêu chính của người dùng là gì (ví dụ: muốn biết thông tin dinh dưỡng, cần thực đơn, so sánh món ăn,...).
        2.  **Xác định thông tin cần thiết:** Liệt kê các thông tin cần có để trả lời (ví dụ: thông tin dinh dưỡng món ăn, sở thích người dùng, mục tiêu sức khỏe, thông tin từ web,...).
        3.  **Kế hoạch thực hiện:** Nêu các bước sẽ thực hiện để tạo ra câu trả lời (ví dụ: "Đầu tiên, tôi sẽ phân tích dinh dưỡng món A.", "Tiếp theo, tôi sẽ so sánh với mục tiêu giảm cân.", "Sau đó, tôi sẽ tham khảo thông tin từ web về lợi ích của thành phần X.", "Cuối cùng, tôi sẽ tổng hợp lại thành một câu trả lời hoàn chỉnh.").
        4.  **(Tùy chọn) Thực hiện bước đầu tiên:** Có thể bắt đầu thực hiện bước đầu tiên của kế hoạch nếu phù hợp.

        **Quan trọng:**
        - **Tập trung vào quá trình suy nghĩ**, không cần đưa ra câu trả lời cuối cùng ở đây.
        - Sử dụng ngôn ngữ tự nhiên, rõ ràng. Đánh số các bước.
        - Nếu có tìm kiếm web, hãy đề cập đến việc sử dụng thông tin đó trong kế hoạch.

        **Quá trình suy nghĩ từng bước:**
        `
    );

    // Chain for streaming text output
    const reasoningChain = reasoningPrompt.pipe(streamingLlm).pipe(new BytesOutputParser());

    try {
        logger.info(`[Agent: ${agentName}] Invoking streaming chain...`);
        const stream = await reasoningChain.stream({
            userInput: input,
            healthContext: healthContextString,
            ragContextString: ragContextString,
        });
        logger.info(`[Agent: ${agentName}] Stream obtained.`);
        return stream;
    } catch (error: any) {
        logger.error(`[Agent: ${agentName}] Error creating stream:`, error);
        // Return an empty stream or an error stream if preferred
        const errorStream = new ReadableStream({
            start(controller) {
                const message = `Error in Reasoning Agent: ${error.message}`;
                controller.enqueue(new TextEncoder().encode(message));
                controller.close();
            }
        });
        return errorStream;
    }
}


// --- Synthesizer Agent --- (Updated to handle RAG & Inline Images)
async function synthesizerAgent(userInput: string, analysisResults: any[], context?: any, ragResult?: RAGResult): Promise<object> { // Added context
  const agentName = AGENT_NAMES.SYNTHESIZER;
  const userContext = context || {}; // Ensure context is an object
  const displayImages = userContext.displayImages === 'inline'; // Check if inline display is requested

  logger.info(`[Agent: ${agentName}] Synthesizing results for input: "${userInput}", Display Images: ${displayImages}`);

  // Filter out unsuccessful results and format the successful ones for the prompt
  const successfulAnalysisResults = analysisResults
    .filter(r => r.status === 'fulfilled' && r.value?.status === 'success' && r.value?.result)
    .map(r => ({ agent: r.value.agent, result: r.value.result }));

  const analysisContext = successfulAnalysisResults.length > 0
    ? JSON.stringify(successfulAnalysisResults, null, 2)
    : "Không có dữ liệu phân tích nội bộ.";

  const ragContext = ragResult?.context || "Không có thông tin bổ sung từ web.";
  const ragCitations = ragResult?.citations || [];

  // Use a parser for structured output (content + citations)
  const parser = StructuredOutputParser.fromZodSchema(SynthesizerOutputSchema);

  const prompt = new PromptTemplate({
    template: `**Persona:** Bạn là một trợ lý dinh dưỡng AI tên là NutriCare Assistant, rất thân thiện, hiểu biết và luôn sẵn lòng giúp đỡ. Mục tiêu của bạn là cung cấp thông tin dinh dưỡng hữu ích và lời khuyên thực tế một cách dễ hiểu, **có trích dẫn nguồn đáng tin cậy khi sử dụng thông tin từ web**.

    **User Query:** "{userInput}"

    **Internal Analysis Data (từ các agent chuyên môn):**
    \`\`\`json
    {analysisContext}
    \`\`\`

    **Retrieved Web Context (từ WHO, FSA, EU, etc.):**
    \`\`\`text
    {ragContext}
    \`\`\`

    **Task:** Dựa vào Internal Analysis Data và Retrieved Web Context, hãy soạn một câu trả lời **duy nhất** cho User Query.
    - **Phong cách:** Trò chuyện tự nhiên, ấm áp, và tích cực. Sử dụng ngôn ngữ đơn giản.
    - **Nội dung:** Trả lời trực tiếp câu hỏi của người dùng. Tích hợp các điểm chính từ dữ liệu phân tích và **thông tin từ web context** một cách liền mạch.
    - **Trích dẫn:** Nếu bạn sử dụng thông tin từ \`ragContext\`, hãy **trích dẫn nguồn** bằng cách tham chiếu đến các URL được cung cấp trong \`ragContext\` hoặc sử dụng các nguồn được liệt kê trong \`ragCitations\` (nếu có). **Chỉ trả về các trích dẫn thực sự được sử dụng trong câu trả lời của bạn** trong trường \`citations\` của JSON output. Định dạng trích dẫn trong văn bản có thể là [Nguồn] hoặc (Nguồn: URL).
    - **Quan trọng:** Không đề cập đến "các agent khác" hoặc "dữ liệu phân tích". Chỉ trình bày câu trả lời cuối cùng như thể đó là kiến thức của chính bạn, được hỗ trợ bởi các nguồn đáng tin cậy khi cần.
    - **Trường hợp không có dữ liệu:** Nếu cả hai nguồn dữ liệu đều trống hoặc không liên quan, hãy trả lời một cách lịch sự rằng bạn chưa có đủ thông tin.
    - **Định dạng đầu ra JSON:** Phải tuân theo định dạng được yêu cầu. Trả về danh sách các trích dẫn đã sử dụng trong trường \`citations\`.

    {formatInstructions}
    `,
    inputVariables: ["userInput", "analysisContext", "ragContext"],
    partialVariables: { formatInstructions: parser.getFormatInstructions() },
  });

  const chain = prompt.pipe(model).pipe(parser);

  try {
    const result = await chain.invoke({
      userInput: userInput,
      analysisContext: analysisContext,
      ragContext: ragContext,
    });

    let fetchedImages: z.infer<typeof ImageAssociationSchema>[] = [];

    // --- Image Fetching Step (Post-LLM for Inline) ---
    if (displayImages && result.content) {
        logger.info(`[Agent: ${agentName}] Attempting to identify and fetch images for inline display...`);
        // Basic Regex attempt to find potential Vietnamese food names (Needs refinement!)
        // Looks for capitalized words possibly followed by another capitalized word, common in dish names.
        const potentialFoodNames = result.content.match(/[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+(?:\s[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+)*/g) || [];

        // Filter and limit the number of searches to avoid excessive calls
        const uniqueNames = [...new Set(potentialFoodNames)].slice(0, 5); // Limit to 5 potential names
        logger.info(`[Agent: ${agentName}] Potential food names identified: ${uniqueNames.join(', ')}`);

        const imageFetchPromises = uniqueNames.map(name =>
            getImageUrlForMobi(name).then(url => {
                if (url) {
                    return { name: name, url: url };
                }
                return null;
            })
        );

        const settledImages = await Promise.allSettled(imageFetchPromises);
        fetchedImages = settledImages
            .filter(p => p.status === 'fulfilled' && p.value)
            .map(p => (p as PromiseFulfilledResult<{ name: string; url: string; }>).value);

        logger.info(`[Agent: ${agentName}] Fetched ${fetchedImages.length} images for inline display.`);
    }
    // --- End Image Fetching Step ---

    // Return the structured result including citations and images
    return {
        agent: agentName,
        status: 'success',
        content: result.content, // Content from parser
        citations: result.citations || ragCitations, // Citations from parser, fallback to all RAG citations if parser fails to extract used ones
        images: fetchedImages.length > 0 ? fetchedImages : undefined, // Add fetched images to the response
    };
  } catch (error: any) {
    logger.error(`[Agent: ${agentName}] Error:`, error);
    // Attempt to return a basic response even if parsing fails
    const errorMessage = `Lỗi tổng hợp câu trả lời: ${error.message}`;
    try {
        // Fallback: Try invoking without the parser to get raw text
        const fallbackChain = prompt.pipe(model);
        const rawResult = await fallbackChain.invoke({
            userInput: userInput,
            analysisContext: analysisContext,
            ragContext: ragContext,
        });
        const fallbackContent = rawResult?.content as string || "Xin lỗi, đã có lỗi xảy ra khi xử lý yêu cầu của bạn.";
        // No image fetching in fallback
        return { agent: agentName, status: 'success', content: fallbackContent.trim(), citations: ragCitations, images: undefined };
    } catch (fallbackError: any) {
        logger.error(`[Agent: ${agentName}] Fallback Error:`, fallbackError);
        return { agent: agentName, status: 'error', error: errorMessage };
    }
  }
}


// --- Helper Function to Get Image URL (Adapted from suggest-recipes) ---
async function getImageUrlForMobi(itemName: string, sourceUrl?: string): Promise<string | undefined> {
    const simplifiedName = itemName.split('(')[0].trim();
    logger.info(`[getImageUrlForMobi] Attempting to find image URL for: "${simplifiedName}" (Original: "${itemName}")`);

    // 1. Try extracting from sourceUrl if provided (less likely in chat-mobi context)
    if (sourceUrl) {
        try {
            logger.info(`[getImageUrlForMobi] Fetching source URL for image extraction: ${sourceUrl}`);
            const response = await fetch(sourceUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (response.ok) {
                const html = await response.text();
                const $ = cheerio.load(html);
                const ogImage = $('meta[property="og:image"]').attr('content');
                if (ogImage) {
                    logger.info(`[getImageUrlForMobi] Found og:image: ${ogImage}`);
                    return ogImage;
                }
                const firstImg = $('img').first().attr('src');
                if (firstImg && firstImg.startsWith('http')) {
                    logger.info(`[getImageUrlForMobi] Found first image tag src: ${firstImg}`);
                    return firstImg;
                }
            } else {
                logger.warn(`[getImageUrlForMobi] Failed to fetch source URL ${sourceUrl}, status: ${response.status}`);
            }
        } catch (fetchError: any) {
            logger.error(`[getImageUrlForMobi] Error fetching/parsing source URL ${sourceUrl}:`, { message: fetchError.message });
        }
    }

    // 2. Fallback to duck-duck-scrape image search with better query
    const searchQuery = `${simplifiedName} món ăn`;
    logger.info(`[getImageUrlForMobi] Performing fallback image search for: ${searchQuery}`);
    try {
        const imageResults = await searchImages(searchQuery);
        if (imageResults && imageResults.results.length > 0) {
            const firstValidImage = imageResults.results.find((img: { image?: string }) => img.image && img.image.startsWith('http'));
            if (firstValidImage?.image) {
                logger.info(`[getImageUrlForMobi] Found image via search: ${firstValidImage.image}`);
                return firstValidImage.image;
            }
        }
        logger.warn(`[getImageUrlForMobi] No valid image results from fallback search for: ${searchQuery}`);
    } catch (searchError: any) {
        logger.error(`[getImageUrlForMobi] Error during fallback image search for ${searchQuery}:`, { message: searchError.message });
    }

    // 3. Fallback to Pexels with food-related query
    const pexelsQuery = `${simplifiedName} food`;
    logger.info(`[getImageUrlForMobi] Fallback to Pexels search for: ${pexelsQuery}`);
    try {
        const pexelsImages = await searchPexelsImages(pexelsQuery);
        if (pexelsImages && pexelsImages.length > 0) {
            logger.info(`[getImageUrlForMobi] Found image via Pexels: ${pexelsImages[0]}`);
            return pexelsImages[0];
        }
        logger.warn(`[getImageUrlForMobi] No valid image results from Pexels for: ${pexelsQuery}`);
    } catch (pexelsError: any) {
        logger.error(`[getImageUrlForMobi] Error during Pexels image search for ${pexelsQuery}:`, { message: pexelsError.message });
    }

    return undefined; // No image found
}


// --- Corrected Menu Generator Agent --- (Updated for RAG & Images)
async function menuGeneratorAgent(input: string, context?: any, ragResult?: RAGResult): Promise<object> {
  const userContext = context || {}; // Ensure context is an object
  const healthInfo = userContext.healthInfo || {};
  const displayImages = userContext.displayImages === 'menu'; // Check if prominent display is requested
  const userRecommendations = userContext.userRecommendations || []; // Extract recommendations
  const menuType = userContext.menuTimeframe || 'daily'; // Get timeframe from context

  logger.info(`[Agent: ${AGENT_NAMES.MENU_GENERATOR}] Processing input: "${input}", Timeframe: ${menuType}, Display Images: ${displayImages}`);

  // Update parser to expect imageUrl
  const parser = StructuredOutputParser.fromZodSchema(MenuGeneratorSchema);

  const ragContext = ragResult?.context || "Không có thông tin bổ sung từ web.";
  const ragCitations = ragResult?.citations || [];

  // Consolidate health info
  const healthContextString = Object.entries(healthInfo)
    .map(([key, value]) => value ? `- ${key}: ${value}` : null)
    .filter(Boolean)
    .join('\n') || "Không có thông tin sức khỏe chi tiết.";

  // Format Recommendations
  let recommendationsContextString = "Không có gợi ý món ăn nào được cung cấp.";
  if (userRecommendations && userRecommendations.length > 0) {
      recommendationsContextString = `**Danh sách món ăn được gợi ý (ưu tiên sử dụng):**\n${userRecommendations.map((rec: any) => `- ${rec.name} (Nguyên liệu: ${rec.ingredients || 'không rõ'})`).join('\n')}`;
  }

  const prompt = new PromptTemplate({
      template: `Bạn là một chuyên gia dinh dưỡng AI. Nhiệm vụ của bạn là tạo thực đơn chi tiết, giải thích lý do chọn món và ghi lại quá trình, **có sử dụng thông tin từ web nếu cần**.
      **Yêu cầu người dùng:** "{userInput}"
      **Thông tin người dùng:**
      {healthContext}
      **Loại thực đơn yêu cầu:** {menuType}
      {recommendationsContext}

      **Retrieved Web Context (từ WHO, FSA, EU, etc.):**
      \`\`\`text
      {ragContext}
      \`\`\`

      **Nhiệm vụ:**
      1.  **Tạo Thực Đơn:** Dựa vào yêu cầu, thông tin người dùng, danh sách gợi ý, và **thông tin từ web context**, tạo một thực đơn chi tiết ({menuType}). Bao gồm tên món, nguyên liệu, **hướng dẫn chế biến CHI TIẾT TỪNG BƯỚC** (trong trường \`preparation\`), và thông tin dinh dưỡng ước tính. **Ưu tiên sử dụng các món ăn trong danh sách gợi ý**. Nếu không có món gợi ý phù hợp, hãy tự tạo món ăn phù hợp, có thể dựa trên web context. Đảm bảo phần \`preparation\` là một chuỗi mô tả rõ ràng các bước nấu ăn.
      2.  **Giải Thích Lựa Chọn (Reasoning):** Với **mỗi món ăn** trong thực đơn, cung cấp một lời giải thích ngắn gọn (\`reasoning\`) tại sao nó được chọn, liên kết với mục tiêu/sở thích của người dùng hoặc thông tin từ web context. **Nếu sử dụng thông tin từ web, hãy đề cập đến nguồn (ví dụ: "Theo WHO...", "Dựa trên hướng dẫn FSA...")**.
      3.  **Ghi Lại Quá Trình:** Mô tả các bước bạn đã thực hiện trong \`interactionSteps\` (tuân thủ AgentInteractionStepSchema). Bao gồm các bước như 'Phân tích yêu cầu', 'Tham khảo web context', 'Lập kế hoạch bữa sáng', 'Thêm lý do chọn món', v.v.
      4.  **Trích Dẫn:** Thu thập tất cả các nguồn (\`citations\`) đã được tham khảo từ \`ragContext\` và được đề cập trong phần \`reasoning\` của các món ăn. Chỉ bao gồm các nguồn thực sự được sử dụng.

      **Định dạng đầu ra JSON:** Phải tuân thủ MenuGeneratorSchema. Bao gồm \`menuType\`, \`menuData\` (với \`reasoning\` cho mỗi món), \`interactionSteps\`, và \`citations\`.
      {formatInstructions}
      `,
      inputVariables: ["userInput", "healthContext", "menuType", "recommendationsContext", "ragContext"],
      partialVariables: { formatInstructions: parser.getFormatInstructions() },
  });

  const chain = prompt.pipe(model).pipe(parser); // Use parser directly

  try {
      logger.info("[Agent: Menu Generator] Invoking LLM chain with RAG context...");
      const result = await chain.invoke({
          userInput: input,
          healthContext: healthContextString,
          menuType: menuType,
          recommendationsContext: recommendationsContextString,
          ragContext: ragContext,
      });
      logger.info("[Agent: Menu Generator] Parsed LLM Output."); // Reduced logging verbosity

      // --- Image Fetching Step (Post-LLM) ---
      let menuDataWithImages = result.menuData;
      // Chỉ fetch ảnh nếu displayImages === true (tức là 'menu')
      if (displayImages && result.menuData) {
          logger.info("[Agent: Menu Generator] Fetching images for menu items...");
          const imageFetchPromises: Promise<{ item: any; imageUrl?: string; error?: string }> [] = [];

          // Use z.infer<typeof MenuItemSchema>[] for the type
          const processMenuLevel = (level: z.infer<typeof MenuItemSchema>[]) => {
              if (!level) return;
              level.forEach(item => {
                  if (item.name) {
                      imageFetchPromises.push(
                          getImageUrlForMobi(item.name)
                            .then(imageUrl => {
                                if (imageUrl) {
                                    return { item, imageUrl };
                                } else {
                                    logger.warn(`[MenuGenerator] No image found for: ${item.name}`);
                                    return { item, error: 'No image found' };
                                }
                            })
                            .catch(err => {
                                logger.error(`[MenuGenerator] Error fetching image for ${item.name}: ${err.message}`);
                                return { item, error: err.message };
                            })
                      );
                  }
              });
          };

          if (result.menuType === 'daily') {
              const dailyMenu = result.menuData as z.infer<typeof DailyMenuSchema>;
              processMenuLevel(dailyMenu.breakfast);
              processMenuLevel(dailyMenu.lunch);
              processMenuLevel(dailyMenu.dinner);
              processMenuLevel(dailyMenu.snacks || []);
          } else if (result.menuType === 'weekly') {
              const weeklyMenu = result.menuData as z.infer<typeof WeeklyMenuSchema>;
              Object.values(weeklyMenu).forEach(daily => {
                  if (daily) {
                      processMenuLevel(daily.breakfast);
                      processMenuLevel(daily.lunch);
                      processMenuLevel(daily.dinner);
                      processMenuLevel(daily.snacks || []);
                  }
              });
          }

          // Sử dụng Promise.allSettled để không bị fail toàn bộ nếu 1 ảnh lỗi
          const settledResults = await Promise.allSettled(imageFetchPromises);
          settledResults.forEach(res => {
              if (res.status === 'fulfilled' && res.value.imageUrl) {
                  res.value.item.imageUrl = res.value.imageUrl;
              } else if (res.status === 'fulfilled' && res.value.error) {
                  logger.warn(`[MenuGenerator] No image for item: ${res.value.item.name} - Reason: ${res.value.error}`);
              } else if (res.status === 'rejected') {
                  logger.error(`[MenuGenerator] Image fetch promise rejected: ${res.reason}`);
              }
          });
          menuDataWithImages = result.menuData; // Update with potentially added image URLs
          logger.info("[Agent: Menu Generator] Finished fetching images.");
      }
      // --- End Image Fetching Step ---

      return {
          agent: AGENT_NAMES.MENU_GENERATOR,
          status: 'success',
          menuType: result.menuType,
          menuData: menuDataWithImages, // Return data with images
          agentFeedbacks: result.agentFeedbacks,
          interactionSteps: result.interactionSteps,
          citations: result.citations || ragCitations, // Use parsed citations, fallback to all RAG citations
      };
  } catch (error: any) {
      logger.error(`[Agent: ${AGENT_NAMES.MENU_GENERATOR}] Error:`, error);
      const errorMessage = error.message.includes("parse")
          ? `Lỗi phân tích cấu trúc JSON từ LLM khi tạo thực đơn. Chi tiết: ${error.message}`
          : `Lỗi khi tạo thực đơn: ${error.message}`;
       // Fallback attempt (similar to synthesizer)
       try {
           const fallbackChain = prompt.pipe(model);
           const rawResult = await fallbackChain.invoke({
               userInput: input,
               healthContext: healthContextString,
               menuType: menuType,
               recommendationsContext: recommendationsContextString,
               ragContext: ragContext,
           });
           // Cannot easily return menu structure here, return error with raw content if needed
           logger.error(`[Agent: ${AGENT_NAMES.MENU_GENERATOR}] Fallback raw output:`, rawResult?.content);
           return { agent: AGENT_NAMES.MENU_GENERATOR, status: 'error', error: errorMessage + " (Fallback content logged)" };
       } catch (fallbackError: any) {
           logger.error(`[Agent: ${AGENT_NAMES.MENU_GENERATOR}] Fallback Error:`, fallbackError);
           return { agent: AGENT_NAMES.MENU_GENERATOR, status: 'error', error: errorMessage };
       }
  }
}


// Mapping agent names to functions (adjusting signatures slightly for RAG context)
// We'll handle the optional RAG context passing in the main POST handler
// Update the function signature type to accommodate the maximum number of arguments (4 for synthesizer)
const agentFunctions: Record<AgentName, (input: string, arg2?: any, arg3?: any, arg4?: any) => Promise<object | ReadableStream<Uint8Array>>> = {
  [AGENT_NAMES.NUTRITION_ANALYSIS]: nutritionAnalysisAgent, // Doesn't need RAG
  [AGENT_NAMES.HEALTHY_SWAP]: healthySwapAdvisorAgent,     // Doesn't need RAG (usually)
  [AGENT_NAMES.MEAL_SCORING]: mealHealthScoringAgent,       // Doesn't need RAG (usually)
  [AGENT_NAMES.GOAL_ALIGNMENT]: goalAlignmentAgent,         // Could potentially use RAG, but keep simple for now
  [AGENT_NAMES.MENU_GENERATOR]: menuGeneratorAgent,         // Needs RAG
  [AGENT_NAMES.SYNTHESIZER]: synthesizerAgent,             // Needs RAG & Context
  // Add the Reasoning Planner agent function (note: it returns a stream, handled differently in POST)
  [AGENT_NAMES.REASONING_PLANNER]: reasoningPlannerAgent, // Correct type is Promise<ReadableStream<Uint8Array>>
};

// --- API Route Handler --- (Updated for RAG and Streaming Reasoning)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate Request Body
    const validationResult = chatMobiRequestSchema.safeParse(body);
    if (!validationResult.success) {
      logger.error('Invalid request body:', validationResult.error.errors);
      return NextResponse.json(
        { error: 'Invalid request format.', details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Extract data
    const { input, activeAgents, healthInfo, menuTimeframe, userRecommendations, enableWebSearch, displayImages } = validationResult.data;
    logger.info(`Received request for agents: ${activeAgents.join(', ')} with input: "${input}" (WebSearch: ${enableWebSearch}, DisplayImages: ${displayImages})`);

    // 2. Perform Web Search & RAG (if enabled)
    let ragResult: RAGResult | undefined = undefined;
    if (enableWebSearch) {
      logger.info(`Web search enabled. Searching DuckDuckGo for: "${input}"`);
      const searchResults = await searchDuckDuckGo(input, 5); // Get top 5 results
      if (searchResults.length > 0) {
        logger.info(`Performing RAG with ${searchResults.length} search results.`);
        ragResult = await performRAG(input, searchResults, 3); // Process top 3 relevant results
      } else {
        logger.info('No search results found, skipping RAG.');
      }
    }

    // 3. Prepare Context for Agents
    const agentContext: Record<string, any> = { healthInfo, menuTimeframe, userRecommendations, displayImages }; // <-- Pass displayImages preference

    // 4. Conditional Agent Execution (Handle Reasoning Stream Separately)
    if (activeAgents.includes(AGENT_NAMES.REASONING_PLANNER)) {
        // --- Reasoning Stream Flow ---
        // If Reasoning Planner is active, ONLY run it and stream the text back.
        logger.info("Executing Reasoning & Planning Stream Flow...");
        const reasoningAgentFunction = agentFunctions[AGENT_NAMES.REASONING_PLANNER];
        try {
            // Pass input, context, and optional ragResult
            // Note: reasoningPlannerAgent returns a Promise<ReadableStream>, not Promise<object>
            const stream = await reasoningAgentFunction(input, agentContext, ragResult) as ReadableStream<Uint8Array>;

            // Return the streaming response immediately
            const headers = new Headers();
            headers.set('Content-Type', 'text/plain; charset=utf-8');
            // Optionally add other headers if needed, e.g., citations used for reasoning
            if (ragResult?.citations) {
                 headers.set('X-Reasoning-Citations-Json', JSON.stringify(ragResult.citations));
            }

            return new NextResponse(stream, { headers });

        } catch (error: any) {
             logger.error(`[Agent: ${AGENT_NAMES.REASONING_PLANNER}] Failed to get stream:`, error);
             return NextResponse.json(
                 { error: `Failed to start reasoning stream: ${error.message}` },
                 { status: 500 }
             );
        }
    } else {
        // --- Standard Agent Execution Flow (JSON Response) ---
        let finalResult: any;

        // Filter out the reasoning planner if it somehow got included here
        const agentsToRun = activeAgents.filter(a => a !== AGENT_NAMES.REASONING_PLANNER);

        if (agentsToRun.length === 0) {
             // Handle case where only reasoning planner was selected but failed somehow before this point
             logger.warn("No agents to run in standard flow after filtering Reasoning Planner.");
             return NextResponse.json({ error: "No agents available to process the request." }, { status: 400 });
        }

        if (agentsToRun.length === 1 && agentsToRun[0] === AGENT_NAMES.MENU_GENERATOR) {
            // --- Menu Generation Flow ---
            logger.info("Executing Menu Generator Flow...");
            const menuAgentFunction = agentFunctions[AGENT_NAMES.MENU_GENERATOR];
            // Pass input, context, and optional ragResult
            finalResult = await menuAgentFunction(input, agentContext, ragResult) as object; // Cast back to object
        } else {
            // --- General Chat Flow (Analysis + Synthesis) ---
            logger.info("Executing General Chat Flow (Analysis + Synthesis)...");
            const analysisAgentsToRun = agentsToRun.filter(
                name => name !== AGENT_NAMES.MENU_GENERATOR && name !== AGENT_NAMES.SYNTHESIZER
            );

            let analysisResultsSettled: PromiseSettledResult<any>[] = [];
            if (analysisAgentsToRun.length > 0) {
                const analysisPromises = analysisAgentsToRun.map(agentName => {
                    const agentFunction = agentFunctions[agentName];
                    if (!agentFunction) {
                        logger.warn(`Agent function not found for: ${agentName}`);
                        return Promise.resolve({ agent: agentName, status: 'error', error: 'Agent implementation missing.' });
                    }
                    // Pass context only if needed (Goal Alignment)
                    const contextForAgent = agentName === AGENT_NAMES.GOAL_ALIGNMENT ? healthInfo : undefined;
                    // Note: Analysis agents currently don't receive RAG context, but could be adapted if needed
                    return agentFunction(input, contextForAgent) as Promise<object>; // Cast back to object
                });
                analysisResultsSettled = await Promise.allSettled(analysisPromises);
                logger.info("Analysis Agent Results:", JSON.stringify(analysisResultsSettled, null, 2));
            } else {
                logger.info("No analysis agents specified for general chat flow.");
            }

            // Execute Synthesizer Agent (always runs in this flow, even if no analysis agents)
            const synthesizerFunction = agentFunctions[AGENT_NAMES.SYNTHESIZER];
            // Pass input, analysis results, context, and optional ragResult
            finalResult = await synthesizerFunction(input, analysisResultsSettled, agentContext, ragResult) as object; // Cast back to object
        }

        // 5. Return JSON Response for standard flow
        return NextResponse.json(finalResult, { status: 200 });
    }

  } catch (error: any) {
    logger.error('Error processing API request:', error);
    return NextResponse.json(
      { error: 'Internal server error processing request.', details: error.message },
      { status: 500 }
    );
  }
}
