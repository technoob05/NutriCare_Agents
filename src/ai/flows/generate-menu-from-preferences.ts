'use server';
/**
 * @fileOverview Generates daily/weekly Vietnamese menus, capturing detailed trace information including reasoning for all steps,
 * focusing on transparency, explainability, and professional output quality (Responsible AI).
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
// Import the updated function and types from google-search.ts using alias
import { googleSearch, GroundedSearchResult, GroundingMetadata } from '@/services/google-search';
import { logger } from 'genkit/logging';

// --- Input Schema (Giữ nguyên) ---
const GenerateMenuFromPreferencesInputSchema = z.object({
    preferences: z.string().describe('User preferences (e.g., "thích ăn cay", "ăn chay", "nhiều rau", "ít dầu mỡ", "ngân sách 100k/ngày", "dị ứng hải sản").'),
    menuType: z.enum(['daily', 'weekly']).describe('Menu type (daily or weekly).'),
});
export type GenerateMenuFromPreferencesInput = z.infer<typeof GenerateMenuFromPreferencesInputSchema>;

// --- Shared Schemas (Giữ nguyên) ---
const MenuItemSchema = z.object({
    name: z.string().describe('Tên món ăn (Vietnamese dish name).'),
    ingredients: z.array(z.string()).describe('Danh sách nguyên liệu cần thiết.'),
    preparation: z.string().describe('Hướng dẫn chế biến tóm tắt.'),
    estimatedCost: z.string().optional().describe('Chi phí ước tính (ví dụ: "khoảng 30k", "dưới 50k").'),
}).describe("Thông tin chi tiết cho một món ăn.");

const DailyMenuSchema = z.object({
    breakfast: z.array(MenuItemSchema).optional().describe('Thực đơn bữa sáng.'),
    lunch: z.array(MenuItemSchema).optional().describe('Thực đơn bữa trưa.'),
    dinner: z.array(MenuItemSchema).optional().describe('Thực đơn bữa tối.'),
    snacks: z.array(MenuItemSchema).optional().describe('Thực đơn bữa phụ (nếu có).')
}).describe('Thực đơn chi tiết cho một ngày.');
export type DailyMenuData = z.infer<typeof DailyMenuSchema>;

const WeeklyMenuSchema = z.object({
    Monday: DailyMenuSchema.optional().describe("Thực đơn Thứ Hai"),
    Tuesday: DailyMenuSchema.optional().describe("Thực đơn Thứ Ba"),
    Wednesday: DailyMenuSchema.optional().describe("Thực đơn Thứ Tư"),
    Thursday: DailyMenuSchema.optional().describe("Thực đơn Thứ Năm"),
    Friday: DailyMenuSchema.optional().describe("Thực đơn Thứ Sáu"),
    Saturday: DailyMenuSchema.optional().describe("Thực đơn Thứ Bảy"),
    Sunday: DailyMenuSchema.optional().describe("Thực đơn Chủ Nhật"),
}).describe("Thực đơn chi tiết cho cả tuần, sắp xếp theo ngày.");
export type WeeklyMenuData = z.infer<typeof WeeklyMenuSchema>;

const AnyMenuSchema = z.union([DailyMenuSchema, WeeklyMenuSchema]).describe("Có thể là thực đơn hàng ngày hoặc hàng tuần.");
export type AnyMenuData = z.infer<typeof AnyMenuSchema>;


// --- Trace Schema (Đảm bảo outputData có thể chứa reasoning) ---
const StepTraceSchema = z.object({
    stepName: z.string().describe("Tên của bước xử lý hoặc agent."),
    status: z.enum(['success', 'error', 'skipped']).describe("Trạng thái hoàn thành của bước."),
    inputData: z.any().optional().describe("Dữ liệu đầu vào cho bước này (đã được rút gọn nếu cần)."),
    // OutputData giờ là một object có thể chứa reasoning và các trường khác
    outputData: z.object({
        reasoning: z.string().optional().describe("Giải thích cho quyết định/hành động của bước này."),
        // Cho phép các trường khác tùy ý
    }).catchall(z.any()).optional().describe("Dữ liệu đầu ra, bao gồm cả reasoning (nếu có)."),
    errorDetails: z.string().optional().describe("Chi tiết lỗi nếu bước này gặp sự cố (thường là message từ exception)."),
    durationMs: z.number().optional().describe("Thời gian thực hiện bước (ms)."),
});
export type StepTrace = z.infer<typeof StepTraceSchema>;

// --- Define Citation Schema for Zod (Moved Before Use) ---
const CitationSchema = z.object({
    title: z.string().optional().describe("Tiêu đề của nguồn trích dẫn."),
    uri: z.string().url().describe("URL của nguồn trích dẫn."),
}).describe("Thông tin trích dẫn từ kết quả tìm kiếm.");

// --- Output Schema (Now uses the defined CitationSchema) ---
const GenerateMenuFromPreferencesOutputSchema = z.object({
    menu: AnyMenuSchema.optional().describe("Thực đơn được tạo ra (daily hoặc weekly). Có thể là undefined nếu bước tạo nội dung lỗi."),
    feedbackRequest: z.string().optional().describe("Câu hỏi gợi ý người dùng phản hồi (có giá trị fallback nếu LLM lỗi)."),
    trace: z.array(StepTraceSchema).describe("Trace chi tiết các bước xử lý, bao gồm cả quá trình suy luận (reasoning) cho từng bước trong outputData."), // Nhấn mạnh reasoning ở mọi bước
    menuType: z.enum(['daily', 'weekly']).describe("Loại thực đơn đã được tạo."),
    // Add optional citations field to the output
    citations: z.array(CitationSchema).optional().describe("Danh sách các nguồn trích dẫn được sử dụng từ Google Search (nếu có)."),
});
export type GenerateMenuFromPreferencesOutput = z.infer<typeof GenerateMenuFromPreferencesOutputSchema>;

// --- Helper safeStringify (Giữ nguyên) ---
function safeStringify(data: any, maxLength: number = 1500): string | undefined { // Tăng default max length nhẹ
    if (data === undefined || data === null) return undefined;
    try {
        let str: string;
        if (typeof data === 'string') str = data;
        else if (typeof data === 'object') {
            const jsonStr = JSON.stringify(data, null, 2);
            if (jsonStr.length <= maxLength) return jsonStr;
            str = JSON.stringify(data); // Fallback to compact if too long
        } else str = String(data);
        return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        logger.warn(`Error in safeStringify: ${errorMessage}. Data type: ${typeof data}`, data);
        return `[Error stringifying data: ${errorMessage}]`;
    }
}


// --- "Planning Agent" Prompt (TỐI ƯU REASONING CHI TIẾT HƠN NỮA) ---
const PlanningOutputSchema = z.object({
    plan: z.string().describe("Kế hoạch ngắn gọn (2-3 câu) tóm tắt cấu trúc thực đơn."),
    reasoning: z.string().describe("Giải thích **cực kỳ chi tiết, step-by-step** về LÝ DO xây dựng kế hoạch. Phải tham chiếu cụ thể đến sở thích người dùng, kết quả tìm kiếm, và giải thích cách cân bằng các yếu tố (dinh dưỡng, chi phí, sở thích, sự đa dạng, tính khả thi). Phải giải thích cả những lựa chọn thay thế (nếu có) và tại sao chúng không được chọn. Cần có đánh giá sơ bộ về cân bằng dinh dưỡng và tính phù hợp tổng thể.") // Yêu cầu cao hơn
});

const planMenuStructurePrompt = ai.definePrompt(
    {
        name: 'planMenuStructurePrompt',
        input: {
            // Updated schema to accept search content and citations
            schema: z.object({
                preferences: z.string(),
                menuType: z.enum(['daily', 'weekly']),
                searchContent: z.string().optional().describe("Nội dung tóm tắt từ kết quả tìm kiếm Google."),
                citations: z.array(CitationSchema).optional().describe("Danh sách các nguồn trích dẫn từ Google Search."),
            }),
        },
        output: { schema: PlanningOutputSchema },
        // === PROMPT TĂNG CƯỜNG TỐI ĐA REASONING ===
        // Updated prompt to use searchContent and citations
        prompt: `Là một Chuyên gia Dinh dưỡng và Lập Kế hoạch Thực đơn **chuyên nghiệp, tỉ mỉ, và có trách nhiệm cao**, hãy tạo ra một kế hoạch thực đơn Việt Nam và giải thích **chi tiết từng bước suy luận (step-by-step reasoning)** của bạn.

**Thông tin đầu vào:**
*   Sở thích & Yêu cầu người dùng: "{{{preferences}}}" (Phân tích kỹ lưỡng mọi chi tiết, bao gồm cả điều không thích, dị ứng, ngân sách, mục tiêu sức khỏe nếu có).
*   Loại thực đơn: "{{{menuType}}}"
*   Thông tin bổ sung từ Google Search (nếu có):
    *   Nội dung tóm tắt: {{#if searchContent}} {{{searchContent}}} {{else}} Không có. {{/if}}
    *   Nguồn tham khảo (Citations): {{#if citations}} {{#each citations}} - Tiêu đề: {{{title}}} (URL: {{{uri}}}) {{/each}} {{else}} Không có. {{/if}}

**Nhiệm vụ:**
1.  **Phân tích sâu:** Đọc và hiểu rõ **tất cả** yêu cầu, sở thích, hạn chế của người dùng. **Tích hợp thông tin** từ nội dung tìm kiếm và các nguồn tham khảo (citations) nếu chúng liên quan và hữu ích.
2.  **Suy luận (Reasoning - Quan trọng nhất, yêu cầu chất lượng chuyên nghiệp):**
    *   Trình bày **chi tiết, logic, step-by-step** quá trình tư duy để xây dựng cấu trúc thực đơn. Sử dụng định dạng rõ ràng (gạch đầu dòng hoặc đoạn văn).
    *   Với **mỗi quyết định quan trọng** (chọn nhóm món ăn, phân bổ bữa, chọn món cụ thể, cân nhắc dinh dưỡng/chi phí), giải thích **TẠI SAO** bạn đưa ra lựa chọn đó một cách thuyết phục.
    *   **BẮT BUỘC LIÊN KẾT RÕ RÀNG:**
        *   **Trích dẫn chính xác yêu cầu nào** của người dùng (sở thích, hạn chế, mục tiêu, ngân sách...) dẫn đến quyết định (Ví dụ: "Vì người dùng muốn 'tăng cơ' và 'ít tinh bột', bữa tối sẽ tập trung vào protein nạc như ức gà và nhiều rau xanh, hạn chế cơm trắng.").
        *   **Chỉ rõ nội dung tìm kiếm hoặc nguồn tham khảo (citation) nào** (nếu dùng) đã cung cấp thông tin hữu ích (Ví dụ: "Dựa trên nội dung tìm kiếm về 'cách chế biến cá hồi ít dầu mỡ' và nguồn tham khảo từ '{{{citations.[0].title}}}' ({{{citations.[0].uri}}}), món cá hồi áp chảo được đề xuất cho bữa tối."). **Phải trích dẫn cụ thể URL khi sử dụng thông tin từ citation.**
        *   Giải thích cách bạn **cân bằng chuyên nghiệp** các yếu tố: sở thích (thích/không thích), dị ứng, yêu cầu dinh dưỡng (macro/micronutrients), ngân sách, sự đa dạng (tránh lặp lại món quá nhiều), tính khả thi (nguyên liệu dễ kiếm, thời gian chế biến hợp lý), yếu tố mùa vụ, **thông tin từ tìm kiếm**.
        *   **Phân tích lựa chọn thay thế:** Nếu có nhiều món ăn/cách tiếp cận phù hợp (từ kiến thức nền hoặc từ tìm kiếm), hãy nêu ngắn gọn các lựa chọn đó và giải thích **tại sao phương án được chọn là tối ưu hơn** trong bối cảnh này.
        *   **Đánh giá dinh dưỡng & phù hợp:** Đưa ra nhận xét chuyên môn ngắn gọn về tính cân bằng dinh dưỡng tổng thể của kế hoạch và mức độ đáp ứng mục tiêu của người dùng.
    *   Reasoning phải thể hiện **tư duy phản biện, logic chặt chẽ, và kiến thức chuyên môn**, giúp người dùng hoàn toàn tin tưởng vào kế hoạch.
3.  **Lập Kế hoạch (Plan):** **SAU KHI** hoàn thành reasoning chi tiết, tóm tắt thành một kế hoạch **súc tích, rõ ràng** (3-5 câu) nêu bật cấu trúc, các bữa ăn chính, và điểm nhấn của thực đơn.
4.  **Định dạng Output:** Chỉ trả lời bằng một đối tượng JSON hợp lệ duy nhất, khớp chính xác với schema: { "plan": "...", "reasoning": "..." }. **TUYỆT ĐỐI KHÔNG** thêm bất kỳ văn bản nào khác.`,
    }
);

// --- Input Schemas for Content Prompts (Update with searchContent and citations) ---
const BaseContentInputSchema = z.object({
    preferences: z.string(),
    menuPlan: z.string(),
    searchContent: z.string().optional(),
    citations: z.array(CitationSchema).optional(),
});

const GenerateDailyMenuContentInputSchema = BaseContentInputSchema.extend({
    menuType: z.literal('daily'),
});
type GenerateDailyMenuContentInput = z.infer<typeof GenerateDailyMenuContentInputSchema>;

const GenerateWeeklyMenuContentInputSchema = BaseContentInputSchema.extend({
    menuType: z.literal('weekly'),
});
type GenerateWeeklyMenuContentInput = z.infer<typeof GenerateWeeklyMenuContentInputSchema>;


// --- "Content Writing Agent" Prompts (THÊM YÊU CẦU REASONING NGẮN) ---
const MenuContentOutputSchema = z.object({
    menu: AnyMenuSchema.describe("Đối tượng JSON chứa thực đơn chi tiết."),
    reasoning: z.string().describe("Giải thích ngắn gọn về việc tuân thủ kế hoạch khi tạo menu."),
});
const DailyMenuContentOutputSchema = z.object({ menu: DailyMenuSchema, reasoning: z.string() });
const WeeklyMenuContentOutputSchema = z.object({ menu: WeeklyMenuSchema, reasoning: z.string() });

const generateMenuContentPrompt = ai.definePrompt({ // For Daily
    name: 'generateDailyMenuContentPrompt',
    input: { schema: GenerateDailyMenuContentInputSchema },
    output: { schema: DailyMenuContentOutputSchema }, // Schema output mới
    prompt: `Là một AI chuyên tạo nội dung thực đơn Việt Nam, hãy tạo thực đơn chi tiết cho **một ngày** dựa **CHÍNH XÁC** theo kế hoạch được cung cấp, có tham khảo thông tin tìm kiếm nếu cần.
**Thông tin:**
*   Sở thích người dùng: {{{preferences}}}
*   Loại thực đơn: {{{menuType}}}
*   **Kế hoạch BẮT BUỘC phải theo:** {{{menuPlan}}}
*   Thông tin bổ sung từ Google Search (tham khảo nếu cần):
    *   Nội dung tóm tắt: {{#if searchContent}} {{{searchContent}}} {{else}} Không có. {{/if}}
    *   Nguồn tham khảo (Citations): {{#if citations}} {{#each citations}} - {{{title}}} ({{{uri}}}) {{/each}} {{else}} Không có. {{/if}}
**Nhiệm vụ:**
1.  Tạo các mục thực đơn chi tiết (tên món, nguyên liệu, cách làm tóm tắt, chi phí ước tính) cho các bữa ăn trong ngày, **TUÂN THỦ TUYỆT ĐỐI** kế hoạch đã cho. Có thể sử dụng thông tin tìm kiếm để làm phong phú chi tiết món ăn (ví dụ: cách chế biến cụ thể, mẹo nhỏ) nhưng phải bám sát kế hoạch tổng thể.
2.  Cung cấp một câu **reasoning ngắn gọn** (1-2 câu) xác nhận việc tuân thủ kế hoạch.
**Yêu cầu Output:** Định dạng output **CHÍNH XÁC** là JSON: { "menu": { /* DailyMenuSchema */ }, "reasoning": "Câu giải thích ngắn gọn." }. Phần "menu" phải hợp lệ theo DailyMenuSchema. **KHÔNG** thêm bất kỳ văn bản nào khác.`,
});

const generateWeeklyMenuContentPrompt = ai.definePrompt({ // For Weekly
    name: 'generateWeeklyMenuContentPrompt',
    input: { schema: GenerateWeeklyMenuContentInputSchema },
    output: { schema: WeeklyMenuContentOutputSchema }, // Schema output mới
    prompt: `Là một AI chuyên tạo nội dung thực đơn Việt Nam, hãy tạo thực đơn chi tiết cho **cả tuần** dựa **CHÍNH XÁC** theo kế hoạch được cung cấp, có tham khảo thông tin tìm kiếm nếu cần.
**Thông tin:**
*   Sở thích người dùng: {{{preferences}}}
*   Loại thực đơn: {{{menuType}}}
*   **Kế hoạch BẮT BUỘC phải theo cho cả tuần:** {{{menuPlan}}}
*   Thông tin bổ sung từ Google Search (tham khảo nếu cần):
    *   Nội dung tóm tắt: {{#if searchContent}} {{{searchContent}}} {{else}} Không có. {{/if}}
    *   Nguồn tham khảo (Citations): {{#if citations}} {{#each citations}} - {{{title}}} ({{{uri}}}) {{/each}} {{else}} Không có. {{/if}}
**Nhiệm vụ:**
1.  Tạo các mục thực đơn chi tiết (tên món, nguyên liệu, cách làm tóm tắt, chi phí ước tính) cho mỗi ngày trong tuần, **TUÂN THỦ TUYỆT ĐỐI** kế hoạch đã cho. Có thể sử dụng thông tin tìm kiếm để làm phong phú chi tiết món ăn nhưng phải bám sát kế hoạch tổng thể.
2.  Cung cấp một câu **reasoning ngắn gọn** (1-2 câu) xác nhận việc tuân thủ kế hoạch.
**Yêu cầu Output:** Định dạng output **CHÍNH XÁC** là JSON: { "menu": { /* WeeklyMenuSchema */ }, "reasoning": "Câu giải thích ngắn gọn." }. Phần "menu" phải hợp lệ theo WeeklyMenuSchema. **KHÔNG** thêm bất kỳ văn bản nào khác.`,
});


// --- "Feedback Request Agent" Prompt (CHẤP NHẬN NULL & THÊM REASONING) ---
const FeedbackRequestOutputSchema = z.object({
    // Chấp nhận null cho question
    question: z.string().nullable().describe("Câu hỏi phản hồi được tạo ra, hoặc null."),
    reasoning: z.string().describe("Giải thích ngắn gọn tại sao câu hỏi này được tạo/không được tạo."),
});

const generateFeedbackRequestPrompt = ai.definePrompt({
    name: 'generateFeedbackRequestPrompt',
    input: { schema: z.object({ menuType: z.enum(['daily', 'weekly']) }) },
    output: { schema: FeedbackRequestOutputSchema }, // Schema output mới
    prompt: `Nhiệm vụ của bạn là tạo ra một câu hỏi phản hồi ngắn gọn, thân thiện bằng tiếng Việt về thực đơn {{{menuType}}} và giải thích ngắn gọn lý do tạo câu hỏi đó.
**Nhiệm vụ:**
1.  Tạo một câu hỏi **ngắn gọn, thân thiện** để hỏi xin phản hồi về thực đơn {{{menuType}}} vừa được tạo. Khuyến khích người dùng đề xuất thay đổi.
2.  Cung cấp một câu **reasoning ngắn gọn** về mục đích của câu hỏi này (ví dụ: "Câu hỏi này nhằm thu thập phản hồi để cải thiện thực đơn."). Nếu không thể tạo câu hỏi, hãy giải thích ngắn gọn lý do trong phần reasoning và đặt question là null.
**Yêu cầu Output:** Chỉ trả lời bằng một đối tượng JSON hợp lệ duy nhất, khớp chính xác với schema: { "question": "chuỗi câu hỏi hoặc null", "reasoning": "chuỗi giải thích ngắn gọn" }. **TUYỆT ĐỐI KHÔNG** thêm bất kỳ văn bản nào khác.`,
});

// --- Main Orchestrator Flow (CẬP NHẬT ĐỂ GHI REASONING CHO MỌI BƯỚC) ---
const generateMenuFromPreferencesFlow = ai.defineFlow<
    typeof GenerateMenuFromPreferencesInputSchema,
    typeof GenerateMenuFromPreferencesOutputSchema
>(
    {
        name: 'generateMenuFromPreferencesFlow',
        inputSchema: GenerateMenuFromPreferencesInputSchema,
        outputSchema: GenerateMenuFromPreferencesOutputSchema,
    },
    async (input) => {
        logger.info(`[Flow Start] Bắt đầu tạo thực đơn ${input.menuType} với tracing chi tiết`, { preferences: input.preferences });
        const traceLog: StepTrace[] = [];
        let startTime: number;
        let menuContent: AnyMenuData | undefined = undefined;
        let feedbackRequest: string | undefined = undefined;
        const fallbackFeedbackRequest = `Bạn thấy thực đơn ${input.menuType} này thế nào? Nếu có điểm nào chưa phù hợp hoặc muốn thay đổi, đừng ngần ngại cho tôi biết nhé!`;
        let menuPlan: string = `(Kế hoạch dự phòng) Tạo thực đơn ${input.menuType} dựa trên sở thích: ${input.preferences}.`;
        let planningReasoning: string = `(Reasoning dự phòng) **Bước lập kế hoạch chi tiết đã thất bại hoặc bị bỏ qua.** Thực đơn được tạo trực tiếp dựa trên sở thích chung "${input.preferences}" mà không có phân tích sâu hoặc liên kết cụ thể.`;
        // Use the new type for the search result
        let groundedSearchResult: GroundedSearchResult | undefined = undefined;

        // --- Step 1: RAG/Search Agent ---
        const searchStepName = "Bước 1: Tìm kiếm Thông tin (RAG)";
        startTime = Date.now();
        let searchInput = `Công thức nấu ăn Việt Nam ${input.preferences} thực đơn ${input.menuType}`;
        let step1Reasoning = `Thực hiện tìm kiếm trên Google để thu thập các công thức, gợi ý món ăn, hoặc thông tin dinh dưỡng liên quan đến sở thích '${input.preferences}' và loại thực đơn '${input.menuType}'. Kết quả này sẽ làm cơ sở thông tin cho bước lập kế hoạch tiếp theo, giúp tạo ra thực đơn phù hợp và đa dạng hơn.`;
        let step1Status: StepTrace['status'] = 'success';
        let step1ErrorDetails: string | undefined = undefined;
        let step1OutputData: any = {};
        try {
             logger.info(`[${searchStepName}] Gọi googleSearch với query: "${searchInput}"`);
             // Call the updated googleSearch function
             groundedSearchResult = await googleSearch(searchInput);
             // Log and store relevant info from the grounded result
             const citations = groundedSearchResult.metadata?.groundingChunks?.map(chunk => chunk.web) || [];
             step1OutputData = {
                 contentSummary: safeStringify(groundedSearchResult.content, 500),
                 citationCount: citations.length,
                 citationsPreview: safeStringify(citations.map(c => ({ title: c.title, uri: c.uri })), 500),
                 searchQueries: groundedSearchResult.metadata?.webSearchQueries,
             };
             // Check if the result is empty, which might indicate rate limiting or no results found
             if (!groundedSearchResult.content && citations.length === 0) {
                 logger.warn(`[${searchStepName}] Hoàn thành nhưng không có nội dung hoặc trích dẫn. Có thể do giới hạn tỷ lệ hoặc không tìm thấy kết quả.`);
                 // Modify reasoning slightly for this case, but keep status as success
                 step1Reasoning = `Tìm kiếm Google được thực hiện cho '${input.preferences}' và '${input.menuType}', nhưng không trả về nội dung hoặc trích dẫn. Điều này có thể do không tìm thấy kết quả liên quan hoặc đã đạt đến giới hạn tỷ lệ API. Kế hoạch sẽ được tạo mà không có thông tin tìm kiếm bổ sung.`;
             } else {
                 logger.info(`[${searchStepName}] Thành công: Nhận được nội dung dài ${groundedSearchResult.content.length} ký tự và ${citations.length} trích dẫn.`);
                 // Keep the original success reasoning if results were found
                 step1Reasoning = `Thực hiện tìm kiếm trên Google để thu thập các công thức, gợi ý món ăn, hoặc thông tin dinh dưỡng liên quan đến sở thích '${input.preferences}' và loại thực đơn '${input.menuType}'. Kết quả này sẽ làm cơ sở thông tin cho bước lập kế hoạch tiếp theo, giúp tạo ra thực đơn phù hợp và đa dạng hơn. Tìm thấy ${citations.length} nguồn tham khảo.`;
             }
        } catch (error: any) {
             // This catch block now only handles non-rate-limit errors thrown by googleSearch
             step1Status = 'error';
             step1ErrorDetails = error.message || String(error);
             logger.error(`[${searchStepName}] Lỗi nghiêm trọng: Google Search thất bại. ${step1ErrorDetails}`, error);
             step1Reasoning = `Tìm kiếm Google cho '${input.preferences}' và '${input.menuType}' thất bại do lỗi nghiêm trọng: ${step1ErrorDetails}. Kế hoạch sẽ được tạo mà không có thông tin tìm kiếm bổ sung.`; // Update reasoning for critical failure
        } finally {
            // Log the final reasoning determined in try/catch
            traceLog.push({
                 stepName: searchStepName,
                 status: step1Status, // Will be 'success' even if rate limited, 'error' otherwise
                 inputData: { query: searchInput },
                 outputData: { ...step1OutputData, reasoning: step1Reasoning }, // Log the determined reasoning
                 errorDetails: step1ErrorDetails, // Will be undefined if rate limited or successful
                 durationMs: Date.now() - startTime
             });
        }


        // --- Step 2: Planning Agent ---
        const planningStepName = "Bước 2: Lập Kế hoạch & Suy luận (Reasoning)";
        startTime = Date.now();
        // Pass the grounded search result (or parts of it) to the planning step
        // We'll adjust the planning prompt's input schema next
        let planningInput = {
            preferences: input.preferences,
            menuType: input.menuType,
            // Pass content and citations separately for clarity in the prompt
            searchContent: groundedSearchResult?.content,
            citations: groundedSearchResult?.metadata?.groundingChunks?.map(chunk => chunk.web)
        };
        let step2Status: StepTrace['status'] = 'success';
        let step2ErrorDetails: string | undefined = undefined;
        let step2OutputData: any = { plan: menuPlan }; // Bắt đầu với plan fallback
        // planningReasoning đã có giá trị fallback
        try {
            logger.info(`[${planningStepName}] Gọi planMenuStructurePrompt.`);
            const planResponse = await planMenuStructurePrompt(planningInput);
            const output = planResponse.output;
            if (!output || typeof output.plan !== 'string' || typeof output.reasoning !== 'string' || !output.plan.trim() || !output.reasoning.trim()) {
                 throw new Error("Output từ bước lập kế hoạch không hợp lệ hoặc bị trống.");
            }
            menuPlan = output.plan;
            planningReasoning = output.reasoning; // Ghi đè reasoning fallback bằng kết quả LLM
            step2OutputData = { plan: menuPlan };
            logger.info(`[${planningStepName}] Thành công.`);
            logger.debug(`[${planningStepName}] Reasoning chi tiết:\n${planningReasoning}`);
        } catch (error: any) {
            step2Status = 'error';
            step2ErrorDetails = error.message || String(error);
            step2OutputData.errorOutput = safeStringify(error.output || error, 1000);
            logger.error(`[${planningStepName}] Lỗi: ${step2ErrorDetails}`, error);
            logger.warn(`[${planningStepName}] Sử dụng kế hoạch và reasoning dự phòng.`);
            // planningReasoning giữ giá trị fallback
        } finally {
             traceLog.push({
                stepName: planningStepName,
                status: step2Status,
                inputData: safeStringify(planningInput, 1500),
                // Ghi reasoning (từ LLM hoặc fallback) vào outputData
                outputData: { ...step2OutputData, reasoning: safeStringify(planningReasoning, 4000) }, // Tăng giới hạn cho reasoning chi tiết
                errorDetails: step2ErrorDetails,
                durationMs: Date.now() - startTime,
            });
        }

        // --- Step 3: Content Writing Agent ---
        const writingStepName = `Bước 3: Tạo Nội dung Thực đơn (${input.menuType})`;
        startTime = Date.now();
        // Pass relevant search info to content writing step as well
        let writingInputBase = {
            preferences: input.preferences,
            searchContent: groundedSearchResult?.content, // Pass content
            citations: groundedSearchResult?.metadata?.groundingChunks?.map(chunk => chunk.web), // Pass citations
            menuPlan: menuPlan
        };
        let step3Reasoning = `(Reasoning dự phòng) Không thể tạo nội dung thực đơn do lỗi ở bước này hoặc bước trước.`;
        let step3Status: StepTrace['status'] = 'success';
        let step3ErrorDetails: string | undefined = undefined;
        let step3OutputData: any = {};
        try {
            // Chỉ thực hiện nếu bước planning thành công (có menuPlan không phải fallback)
            if (step2Status === 'success' && menuPlan !== `(Kế hoạch dự phòng) Tạo thực đơn ${input.menuType} dựa trên sở thích: ${input.preferences}.`) {
                logger.info(`[${writingStepName}] Gọi prompt tạo nội dung.`);
                let menuContentResponse;
                let inputForPrompt: GenerateDailyMenuContentInput | GenerateWeeklyMenuContentInput;
                if (input.menuType === 'weekly') {
                    inputForPrompt = { ...writingInputBase, menuType: 'weekly' };
                    menuContentResponse = await generateWeeklyMenuContentPrompt(inputForPrompt);
                } else {
                    inputForPrompt = { ...writingInputBase, menuType: 'daily' };
                    menuContentResponse = await generateMenuContentPrompt(inputForPrompt);
                }
                const output = menuContentResponse.output;
                if (!output || !output.menu || typeof output.reasoning !== 'string') {
                    throw new Error(`Tạo nội dung trả về output không hợp lệ (thiếu menu hoặc reasoning).`);
                }
                const schemaToValidate = input.menuType === 'weekly' ? WeeklyMenuSchema : DailyMenuSchema;
                const validationResult = schemaToValidate.safeParse(output.menu);
                if (!validationResult.success) {
                    logger.error(`[${writingStepName}] Lỗi: Output menu không khớp schema. Lỗi: ${validationResult.error.message}`, { outputReceived: output.menu });
                    throw new Error(`Output nội dung menu không khớp schema.`);
                }
                menuContent = validationResult.data;
                step3Reasoning = output.reasoning; // Lấy reasoning từ LLM
                step3OutputData = { menuSummary: `Generated ${Object.keys(menuContent || {}).length} days/meals`, menuDetails: safeStringify(menuContent, 1500) };
                logger.info(`[${writingStepName}] Thành công.`);
            } else {
                // Bỏ qua bước này nếu bước planning lỗi
                step3Status = 'skipped';
                step3Reasoning = `Bước tạo nội dung bị bỏ qua do bước lập kế hoạch trước đó thất bại hoặc sử dụng kế hoạch dự phòng.`;
                logger.warn(`[${writingStepName}] Bỏ qua bước tạo nội dung do lỗi ở bước trước.`);
            }
        } catch (error: any) {
            step3Status = 'error';
            step3ErrorDetails = error.message || String(error);
            step3OutputData.errorOutput = safeStringify(error.output || error, 1000);
            logger.error(`[${writingStepName}] Lỗi: ${step3ErrorDetails}`, error);
            // menuContent sẽ là undefined, step3Reasoning giữ giá trị fallback
        } finally {
            traceLog.push({
                stepName: writingStepName,
                status: step3Status,
                inputData: step3Status !== 'skipped' ? safeStringify(writingInputBase, 1500) : { note: "Step skipped due to previous error." },
                outputData: { ...step3OutputData, reasoning: step3Reasoning }, // Ghi reasoning
                errorDetails: step3ErrorDetails,
                durationMs: Date.now() - startTime
            });
        }

        // --- Step 4: Feedback Request Agent ---
        const feedbackStepName = "Bước 4: Tạo Câu hỏi Phản hồi";
        startTime = Date.now();
        let feedbackInput = { menuType: input.menuType };
        let step4Reasoning = `(Reasoning dự phòng) Không thể tạo câu hỏi phản hồi do lỗi.`;
        let step4Status: StepTrace['status'] = 'success';
        let step4ErrorDetails: string | undefined = undefined;
        let step4OutputData: any = {};
        try {
            logger.info(`[${feedbackStepName}] Gọi generateFeedbackRequestPrompt.`);
            const feedbackResponse = await generateFeedbackRequestPrompt(feedbackInput);
            const output = feedbackResponse.output; // Output là { question: string | null, reasoning: string }

            if (!output || typeof output.reasoning !== 'string') {
                 throw new Error("Output từ bước tạo phản hồi không hợp lệ (thiếu reasoning).");
            }
            step4Reasoning = output.reasoning; // Lấy reasoning từ LLM

            if (output.question && typeof output.question === 'string' && output.question.trim()) {
                feedbackRequest = output.question.trim();
                step4OutputData = { request: feedbackRequest };
                logger.info(`[${feedbackStepName}] Thành công: Câu hỏi phản hồi đã được tạo: "${feedbackRequest}"`);
            } else {
                logger.warn(`[${feedbackStepName}] LLM trả về question là null hoặc rỗng. Sử dụng fallback.`);
                feedbackRequest = fallbackFeedbackRequest;
                step4OutputData = { request: feedbackRequest, note: "Used fallback question because LLM returned null or empty." };
                // Vẫn coi là success vì có fallback, nhưng reasoning có thể giải thích thêm
                step4Reasoning += ` (LLM không tạo được câu hỏi cụ thể, đã sử dụng câu hỏi mặc định).`;
            }
        } catch (error: any) {
            step4Status = 'error';
            step4ErrorDetails = error.message || String(error);
            step4OutputData.errorOutput = safeStringify(error.output || error, 500);
            logger.error(`[${feedbackStepName}] Lỗi: ${step4ErrorDetails}`, error);
            logger.warn(`[${feedbackStepName}] Sử dụng câu hỏi phản hồi dự phòng.`);
            feedbackRequest = fallbackFeedbackRequest;
            // step4Reasoning giữ giá trị fallback
        } finally {
             traceLog.push({
                 stepName: feedbackStepName,
                 status: step4Status,
                 inputData: feedbackInput,
                 outputData: { ...step4OutputData, reasoning: step4Reasoning }, // Ghi reasoning
                 errorDetails: step4ErrorDetails,
                 durationMs: Date.now() - startTime
             });
        }


        // --- Step 5: Formatting Agent ---
        const formattingStepName = "Bước 5: Định dạng Kết quả Cuối cùng";
        startTime = Date.now();
        let step5Reasoning = `Tổng hợp kết quả từ các bước trước: thực đơn (nếu thành công), câu hỏi phản hồi (từ LLM hoặc fallback), và toàn bộ trace log (bao gồm reasoning của từng bước) vào cấu trúc JSON output cuối cùng để trả về cho client.`;
        let step5Status: StepTrace['status'] = 'success'; // Giả định bước này không lỗi
        let step5InputSummary = {
             menuGenerated: menuContent !== undefined,
             feedbackGenerated: feedbackRequest !== fallbackFeedbackRequest,
             planAvailable: menuPlan !== `(Kế hoạch dự phòng) Tạo thực đơn ${input.menuType} dựa trên sở thích: ${input.preferences}.`,
             planningReasoningAvailable: planningReasoning !== `(Reasoning dự phòng) **Bước lập kế hoạch chi tiết đã thất bại hoặc bị bỏ qua.** Thực đơn được tạo trực tiếp dựa trên sở thích chung "${input.preferences}" mà không có phân tích sâu hoặc liên kết cụ thể.`
         };

        traceLog.push({
             stepName: formattingStepName,
             status: step5Status,
             inputData: step5InputSummary,
             outputData: { reasoning: step5Reasoning, finalOutputStructure: "{ menu, feedbackRequest, trace, menuType }" },
             durationMs: Date.now() - startTime
         });
        logger.info(`[${formattingStepName}] Hoàn tất định dạng kết quả cuối cùng.`);


        // --- Construct Final Output ---
        const finalOutput: GenerateMenuFromPreferencesOutput = {
            menu: menuContent,
            feedbackRequest: feedbackRequest || fallbackFeedbackRequest, // Đảm bảo luôn có giá trị
            trace: traceLog,
            menuType: input.menuType,
            // Add citations from the search result to the final output
            citations: groundedSearchResult?.metadata?.groundingChunks?.map(chunk => chunk.web),
        };
        logger.info(`[Flow End] Hoàn thành tạo thực đơn ${input.menuType}. Trả về kết quả, trace, và citations.`);
        return finalOutput;
    }
);

// --- Exported Entry Point (Giữ nguyên) ---
export async function generateMenuFromPreferences(
    input: GenerateMenuFromPreferencesInput
): Promise<GenerateMenuFromPreferencesOutput> {
    // ... (code validation input và gọi flow giữ nguyên) ...
    logger.info("[Entry Point] Received request to generate menu.", input);
    const parseResult = GenerateMenuFromPreferencesInputSchema.safeParse(input);
    if (!parseResult.success) {
        const formattedError = parseResult.error.format();
        logger.error('[Entry Point] Input validation failed.', formattedError);
        throw new Error(`Input không hợp lệ: ${JSON.stringify(formattedError)}`);
    }
    try {
        const result = await generateMenuFromPreferencesFlow(parseResult.data);
        return result;
    } catch (error: any) {
        const errorMessage = error.message || String(error);
        logger.error(`[Entry Point] Lỗi nghiêm trọng khi thực thi generateMenuFromPreferencesFlow: ${errorMessage}`, error);
        throw new Error(`Tạo thực đơn thất bại: ${errorMessage}`);
    }
}
