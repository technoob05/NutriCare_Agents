'use server';
/**
 * @fileOverview Generates daily/weekly Vietnamese menus, capturing detailed trace information including reasoning for all steps,
 * focusing on transparency, explainability, and professional output quality (Responsible AI). Includes Google Search grounding and citations.
 * Uses text-based generation for menu content to avoid complex schema issues and includes fallback for missing reasoning.
 */

import { ai } from '@/ai/ai-instance'; // Reverted import
import { z } from 'genkit';
import { googleSearch, GroundedSearchResult } from '@/services/google-search';
import { logger } from 'genkit/logging';
import { allDefaultMenus, DefaultMenuWithMetadata, defaultStandardFamilyMenu } from '@/ai/data/default-menus'; // Import default menus
// Removed unused FlowOptions import

// --- Input Schema (Giữ nguyên) ---
const GenerateMenuFromPreferencesInputSchema = z.object({
    preferences: z.string().describe('User preferences (e.g., "thích ăn cay", "ăn chay", "nhiều rau", "ít dầu mỡ", "ngân sách 100k/ngày", "dị ứng hải sản").'),
    menuType: z.enum(['daily', 'weekly']).describe('Menu type (daily or weekly).'),
    userContext: z.object({
        username: z.string().optional().describe("Tên người dùng (nếu có)."),
        // Explicitly add health info fields
        age: z.number().positive().nullable().optional().describe("Tuổi."),
        gender: z.string().optional().describe("Giới tính."),
        height: z.number().positive().nullable().optional().describe("Chiều cao (cm)."),
        weight: z.number().positive().nullable().optional().describe("Cân nặng (kg)."),
        activityLevel: z.string().optional().describe("Mức độ vận động."),
        allergies: z.string().optional().describe("Dị ứng thực phẩm."),
        dietaryRestrictions: z.string().optional().describe("Hạn chế ăn uống."),
        medicalConditions: z.string().optional().describe("Tình trạng sức khỏe liên quan."),
        healthGoals: z.string().optional().describe("Mục tiêu sức khỏe/dinh dưỡng."),
        generalFoodPreferences: z.string().optional().describe("Sở thích ăn uống chung (từ form)."),
        currentRequestPreferences: z.string().optional().describe("Yêu cầu cụ thể cho lần tạo thực đơn này."),
    }).optional().describe("Thông tin ngữ cảnh về người dùng, bao gồm cả thông tin sức khỏe."),
});
export type GenerateMenuFromPreferencesInput = z.infer<typeof GenerateMenuFromPreferencesInputSchema>;

// --- Shared Schemas (Giữ nguyên) ---
const MenuItemSchema = z.object({
    name: z.string().describe('Tên món ăn (Vietnamese dish name).'),
    ingredients: z.array(z.string()).describe('Danh sách nguyên liệu cần thiết.'),
    preparation: z.string().describe('Hướng dẫn chế biến tóm tắt.'),
    estimatedCost: z.string().optional().describe('Chi phí ước tính (ví dụ: "khoảng 30k", "dưới 50k").'),
    calories: z.number().optional().describe('Lượng calo ước tính.'),
    protein: z.number().optional().describe('Lượng protein ước tính (gram).'),
    carbs: z.number().optional().describe('Lượng carbohydrate ước tính (gram).'),
    fat: z.number().optional().describe('Lượng chất béo ước tính (gram).'),
    healthBenefits: z.array(z.string()).optional().describe('Lợi ích sức khỏe tiềm năng (ngắn gọn).'),
}).describe("Thông tin chi tiết cho một món ăn, bao gồm dinh dưỡng và lợi ích.");
export type MenuItemData = z.infer<typeof MenuItemSchema>; // Export type

const DailyMenuSchema = z.object({
    breakfast: z.array(MenuItemSchema).describe('Thực đơn bữa sáng (BẮT BUỘC).'),
    lunch: z.array(MenuItemSchema).describe('Thực đơn bữa trưa (BẮT BUỘC).'),
    dinner: z.array(MenuItemSchema).describe('Thực đơn bữa tối (BẮT BUỘC).'),
    snacks: z.array(MenuItemSchema).optional().describe('Thực đơn bữa phụ (nếu có).')
}).describe('Thực đơn chi tiết cho một ngày, LUÔN CÓ bữa sáng, trưa, tối.');
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

// --- Trace Schema (Giữ nguyên) ---
const StepTraceSchema = z.object({
    stepName: z.string().describe("Tên của bước xử lý hoặc agent."),
    status: z.enum(['success', 'error', 'skipped']).describe("Trạng thái hoàn thành của bước."),
    inputData: z.any().optional().describe("Dữ liệu đầu vào cho bước này (đã được rút gọn nếu cần)."),
    outputData: z.object({
        reasoning: z.string().optional().describe("Giải thích cho quyết định/hành động của bước này."),
    }).catchall(z.any()).optional().describe("Dữ liệu đầu ra, bao gồm cả reasoning (nếu có)."),
    errorDetails: z.string().optional().describe("Chi tiết lỗi nếu bước này gặp sự cố."),
    durationMs: z.number().optional().describe("Thời gian thực hiện bước (ms)."),
});
export type StepTrace = z.infer<typeof StepTraceSchema>;

// --- Citation Schema (Giữ nguyên) ---
const CitationSchema = z.object({
    title: z.string().optional().describe("Tiêu đề của nguồn trích dẫn."),
    uri: z.string().url().describe("URL của nguồn trích dẫn."),
}).describe("Thông tin trích dẫn từ kết quả tìm kiếm Google.");
export type Citation = z.infer<typeof CitationSchema>;

// --- Output Schema (Giữ nguyên) ---
const GenerateMenuFromPreferencesOutputSchema = z.object({
    menu: AnyMenuSchema.optional().describe("Thực đơn được tạo ra (sau khi parse từ text)."),
    feedbackRequest: z.string().optional().describe("Câu hỏi gợi ý người dùng phản hồi."),
    trace: z.array(StepTraceSchema).describe("Trace chi tiết các bước xử lý."),
    menuType: z.enum(['daily', 'weekly']).describe("Loại thực đơn đã được tạo."),
    citations: z.array(CitationSchema).optional().describe("Danh sách các nguồn trích dẫn."),
    searchSuggestionHtml: z.string().optional().describe("HTML chip Google Search Suggestion."),
});
export type GenerateMenuFromPreferencesOutput = z.infer<typeof GenerateMenuFromPreferencesOutputSchema>;

// --- Helper safeStringify (Giữ nguyên) ---
function safeStringify(data: any, maxLength: number = 1500): string | undefined {
    if (data === undefined || data === null) return undefined;
    try {
        let str: string;
        if (typeof data === 'string') str = data;
        else if (typeof data === 'object') {
            const jsonStr = JSON.stringify(data, null, 2);
            if (jsonStr.length <= maxLength) return jsonStr;
            str = JSON.stringify(data); // Fallback to compact if pretty exceeds limit
        } else str = String(data);
        return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        logger.warn(`Error in safeStringify: ${errorMessage}. Data type: ${typeof data}`, data);
        return `[Error stringifying data: ${errorMessage}]`;
    }
}

// --- "Planning Agent" Prompt (Giữ nguyên) ---
const PlanningOutputSchema = z.object({
    plan: z.string().describe("Kế hoạch ngắn gọn."),
    reasoning: z.string().describe("Giải thích chi tiết, step-by-step."),
});

const planMenuStructurePrompt = ai.definePrompt(
    {
        name: 'planMenuStructurePrompt',
        input: {
            schema: z.object({
                preferences: z.string(),
                menuType: z.enum(['daily', 'weekly']),
                searchContent: z.string().optional(),
                citations: z.array(CitationSchema).optional(),
                userContext: z.object({ // Explicitly define userContext fields for planning prompt
                    username: z.string().optional(),
                    age: z.number().positive().nullable().optional(),
                    gender: z.string().optional(),
                    height: z.number().positive().nullable().optional(),
                    weight: z.number().positive().nullable().optional(),
                    activityLevel: z.string().optional(),
                    allergies: z.string().optional(),
                    dietaryRestrictions: z.string().optional(),
                    medicalConditions: z.string().optional(),
                    healthGoals: z.string().optional(),
                    generalFoodPreferences: z.string().optional(),
                    currentRequestPreferences: z.string().optional(),
                }).optional(),
            }),
        },
        output: { schema: PlanningOutputSchema },
        prompt: `Là một Chuyên gia Dinh dưỡng và Lập Kế hoạch Thực đơn **chuyên nghiệp, tỉ mỉ, và có trách nhiệm cao**, hãy tạo ra một kế hoạch thực đơn Việt Nam và giải thích **chi tiết từng bước suy luận (step-by-step reasoning)** của bạn.

**Thông tin đầu vào:**
*   Người dùng: {{#if userContext.username}} Tên: {{{userContext.username}}} {{else}} Không rõ {{/if}}
*   Sở thích & Yêu cầu người dùng: "{{{preferences}}}" (Phân tích kỹ lưỡng mọi chi tiết).
*   Loại thực đơn: "{{{menuType}}}"
*   Thông tin bổ sung từ Google Search (nếu có):
    *   Nội dung tóm tắt: {{#if searchContent}} {{{searchContent}}} {{else}} Không có. {{/if}}
    *   Nguồn tham khảo (Citations): {{#if citations}} {{#each citations}} - Tiêu đề: {{{title}}} (URL: {{{uri}}}) {{/each}} {{else}} Không có. {{/if}}

**Nhiệm vụ:**
1.  **Phân tích sâu:** Đọc và hiểu rõ **tất cả** yêu cầu của người dùng. **Tích hợp thông tin** từ nội dung tìm kiếm và các nguồn tham khảo (citations) nếu chúng liên quan và hữu ích.
2.  **Suy luận (Reasoning - Quan trọng nhất):**
    *   Trình bày **chi tiết, logic, step-by-step** quá trình tư duy để xây dựng cấu trúc thực đơn.
    *   Với **mỗi quyết định quan trọng**, giải thích **TẠI SAO** bạn đưa ra lựa chọn đó.
    *   **BẮT BUỘC LIÊN KẾT RÕ RÀNG:**
        *   **Trích dẫn chính xác yêu cầu nào** của người dùng dẫn đến quyết định.
        *   **Chỉ rõ nội dung tìm kiếm hoặc nguồn tham khảo (citation) nào** (nếu dùng) đã cung cấp thông tin hữu ích (Ví dụ: "Dựa trên nội dung tìm kiếm về 'cách chế biến cá hồi ít dầu mỡ' và nguồn tham khảo từ '{{{citations.[0].title}}}' ({{{citations.[0].uri}}}), món cá hồi áp chảo được đề xuất..."). **Phải trích dẫn cụ thể URL khi sử dụng thông tin từ citation.**
        *   Giải thích cách bạn **cân bằng chuyên nghiệp** các yếu tố: sở thích, dị ứng, dinh dưỡng, ngân sách, đa dạng, khả thi, **thông tin từ tìm kiếm**. **Đảm bảo kế hoạch LUÔN bao gồm bữa sáng, trưa, và tối.**
        *   **Phân tích lựa chọn thay thế:** Nếu có nhiều lựa chọn, giải thích tại sao phương án được chọn là tối ưu.
        *   **Đánh giá dinh dưỡng & phù hợp:** Nhận xét ngắn gọn về tính cân bằng và phù hợp. **Khuyến khích đề xuất các món ăn có thông tin dinh dưỡng rõ ràng nếu có thể.**
    *   Reasoning phải thể hiện **tư duy phản biện, logic chặt chẽ, và kiến thức chuyên môn**.
3.  **Lập Kế hoạch (Plan):** **SAU KHI** hoàn thành reasoning, tóm tắt thành kế hoạch **súc tích, rõ ràng**. Kế hoạch phải **ghi rõ** sẽ bao gồm bữa sáng, trưa, tối (và bữa phụ nếu có) cho mỗi ngày (nếu là weekly).
4.  **Định dạng Output:** Chỉ trả lời bằng JSON hợp lệ: { "plan": "...", "reasoning": "..." }. **KHÔNG** thêm văn bản nào khác.`,
    }
);

// --- Input Schema for Content Prompt (Giữ nguyên Base, thêm menuType) ---
const GenerateMenuContentInputSchema = z.object({
    preferences: z.string(),
    menuPlan: z.string(),
    menuType: z.enum(['daily', 'weekly']), // Thêm menuType vào đây
    searchContent: z.string().optional(),
    citations: z.array(CitationSchema).optional(),
    userContext: z.object({ // Explicitly define userContext fields for content prompt
        username: z.string().optional(),
        age: z.number().positive().nullable().optional(),
        gender: z.string().optional(),
        height: z.number().positive().nullable().optional(),
        weight: z.number().positive().nullable().optional(),
        activityLevel: z.string().optional(),
        allergies: z.string().optional(),
        dietaryRestrictions: z.string().optional(),
        medicalConditions: z.string().optional(),
        healthGoals: z.string().optional(),
        generalFoodPreferences: z.string().optional(),
        currentRequestPreferences: z.string().optional(),
    }).optional(),
});
type GenerateMenuContentInput = z.infer<typeof GenerateMenuContentInputSchema>;

// +++ NEW: Output Schema for Content Prompt (Text-based) +++
const MenuContentStringOutputSchema = z.object({
    menuContentString: z.string().describe(
        "Nội dung chi tiết của thực đơn dưới dạng văn bản có cấu trúc rõ ràng (sử dụng Markdown). KHÔNG phải là JSON lồng nhau."
    ),
    reasoning: z.string().describe("Giải thích ngắn gọn về việc tuân thủ kế hoạch và nỗ lực cung cấp thông tin dinh dưỡng.")
});

// +++ UPDATED: Content Writing Prompt (Text-based Output with Stronger JSON Emphasis) +++
const generateMenuContentPrompt = ai.definePrompt({
    name: 'generateMenuContentPrompt', // Dùng chung cho daily/weekly
    input: { schema: GenerateMenuContentInputSchema }, // Sử dụng schema input đã cập nhật
    output: { schema: MenuContentStringOutputSchema }, // Sử dụng schema output mới (text-based)
    prompt: `Là một AI chuyên tạo nội dung thực đơn Việt Nam, hãy tạo nội dung chi tiết cho thực đơn {{{menuType}}} dựa **CHÍNH XÁC** theo kế hoạch được cung cấp, có tham khảo thông tin tìm kiếm nếu cần.
**Thông tin:**
*   Người dùng: {{#if userContext.username}} Tên: {{{userContext.username}}} {{else}} Không rõ {{/if}}
*   Sở thích người dùng: {{{preferences}}}
*   Loại thực đơn: {{{menuType}}}
*   **Kế hoạch BẮT BUỘC phải theo:** {{{menuPlan}}} (Kế hoạch này PHẢI bao gồm bữa sáng, trưa, tối cho mỗi ngày).
*   Thông tin bổ sung từ Google Search (tham khảo nếu cần):
    *   Nội dung tóm tắt: {{#if searchContent}} {{{searchContent}}} {{else}} Không có. {{/if}}
    *   Nguồn tham khảo (Citations): {{#if citations}} {{#each citations}} - {{{title}}} ({{{uri}}}) {{/each}} {{else}} Không có. {{/if}}
**Nhiệm vụ:**
1.  Tạo nội dung thực đơn chi tiết (tên món, nguyên liệu, cách làm tóm tắt, chi phí ước tính) cho **BẮT BUỘC CÁC BỮA ĂN THEO KẾ HOẠCH** (luôn có sáng, trưa, tối), **TUÂN THỦ TUYỆT ĐỐI** kế hoạch.
2.  **CỐ GẮNG** cung cấp thông tin dinh dưỡng ước tính (calories, protein, carbs, fat) và lợi ích sức khỏe ngắn gọn (healthBenefits) cho **MỖI MÓN ĂN** nếu bạn biết hoặc có thể suy luận hợp lý. Ghi rõ đây là ước tính.
3.  Cung cấp một câu **reasoning ngắn gọn** xác nhận việc tuân thủ kế hoạch và nỗ lực cung cấp thông tin dinh dưỡng.
**Yêu cầu Output:**
*   Định dạng output **CHÍNH XÁC** là JSON: { "menuContentString": "...", "reasoning": "..." }.
*   Trong trường "menuContentString", trình bày thực đơn dưới dạng **VĂN BẢN CÓ CẤU TRÚC RÕ RÀNG sử dụng Markdown**.
    *   **Đối với thực đơn tuần (weekly):** Bắt đầu mỗi ngày bằng tiêu đề cấp 2 (ví dụ: \`## Thứ Hai\`).
    *   **Đối với mỗi ngày:** Sử dụng tiêu đề cấp 3 cho các bữa ăn (ví dụ: \`### Bữa Sáng\`, \`### Bữa Trưa\`, \`### Bữa Tối\`, \`### Bữa Phụ (nếu có)\`).
    *   **Đối với mỗi bữa ăn:** Liệt kê các món ăn bằng dấu gạch đầu dòng (\`-\`).
    *   **Đối với mỗi món ăn:** Trình bày thông tin chi tiết theo định dạng sau (mỗi mục trên một dòng mới, bắt đầu bằng dấu \`*\` hoặc tương tự):
        *   \`* Tên món:\` [Tên món ăn]
        *   \`* Nguyên liệu:\` [Liệt kê nguyên liệu chính, cách nhau bằng dấu phẩy hoặc xuống dòng]
        *   \`* Cách làm:\` [Hướng dẫn tóm tắt]
        *   \`* Chi phí:\` [Ước tính, ví dụ: khoảng 30k] (Nếu có)
        *   \`* Calories:\` [Số calo] (Ước tính, nếu có)
        *   \`* Protein:\` [Số protein]g (Ước tính, nếu có)
        *   \`* Carbs:\` [Số carbs]g (Ước tính, nếu có)
        *   \`* Fat:\` [Số fat]g (Ước tính, nếu có)
        *   \`* Lợi ích:\` [Liệt kê lợi ích, cách nhau bằng dấu phẩy] (Nếu có)
*   **QUAN TRỌNG:** Đảm bảo tuân thủ định dạng Markdown này một cách nhất quán trong \`menuContentString\`.
*   **BẮT BUỘC:** Output phải là một JSON object **duy nhất** và **luôn luôn** chứa cả hai trường \`menuContentString\` (với nội dung Markdown) và \`reasoning\` (với giải thích ngắn gọn).
*   **KHÔNG** trả về JSON lồng nhau phức tạp trong trường "menuContentString". Chỉ trả về văn bản Markdown được định dạng.
*   **KHÔNG** thêm bất kỳ văn bản nào khác ngoài cấu trúc JSON { "menuContentString": "...", "reasoning": "..." } được yêu cầu.`,
});


// --- "Feedback Request Agent" Prompt (Giữ nguyên) ---
const FeedbackRequestOutputSchema = z.object({
    question: z.string().nullable().describe("Câu hỏi phản hồi hoặc null."),
    reasoning: z.string().describe("Giải thích ngắn gọn."),
});
const generateFeedbackRequestPrompt = ai.definePrompt({
    name: 'generateFeedbackRequestPrompt',
    input: { schema: z.object({ menuType: z.enum(['daily', 'weekly']) }) },
    output: { schema: FeedbackRequestOutputSchema },
    prompt: `Nhiệm vụ của bạn là tạo ra một câu hỏi phản hồi ngắn gọn, thân thiện bằng tiếng Việt về thực đơn {{{menuType}}} và giải thích ngắn gọn lý do tạo câu hỏi đó.
**Nhiệm vụ:**
1.  Tạo một câu hỏi **ngắn gọn, thân thiện** để hỏi xin phản hồi về thực đơn {{{menuType}}} vừa được tạo.
2.  Cung cấp một câu **reasoning ngắn gọn** về mục đích của câu hỏi này. Nếu không thể tạo câu hỏi, hãy giải thích ngắn gọn lý do trong phần reasoning và đặt question là null.
**Yêu cầu Output:** Chỉ trả lời bằng JSON hợp lệ: { "question": "chuỗi câu hỏi hoặc null", "reasoning": "chuỗi giải thích ngắn gọn" }. **KHÔNG** thêm văn bản nào khác.`,
});

// +++ NEW: Parser Function (Basic Implementation - Giữ nguyên từ lần sửa trước) +++
/**
 * Parses a Markdown-formatted menu string into a Zod schema object.
 * Parses a Markdown-formatted menu string into a Zod schema object.
 * Enhanced for robustness against common LLM output variations.
 */
async function parseMenuTextToZod(
    menuString: string,
    menuType: 'daily' | 'weekly'
): Promise<AnyMenuData> {
    logger.info(`[Parser] Starting to parse ${menuType} menu text.`);
    const lines = menuString.trim().split('\n');
    let currentDay: keyof WeeklyMenuData | 'daily' | null = menuType === 'daily' ? 'daily' : null;
    let currentMeal: keyof DailyMenuData | null = null;
    let currentItem: Partial<MenuItemData> | null = null;
    const result: any = menuType === 'weekly' ? {} : { breakfast: [], lunch: [], dinner: [], snacks: [] };

    // More flexible day/meal mapping
    const daysMap: { [key: string]: keyof WeeklyMenuData } = {
        "thứ hai": "Monday", "thứ 2": "Monday", "monday": "Monday",
        "thứ ba": "Tuesday", "thứ 3": "Tuesday", "tuesday": "Tuesday",
        "thứ tư": "Wednesday", "thứ 4": "Wednesday", "wednesday": "Wednesday",
        "thứ năm": "Thursday", "thứ 5": "Thursday", "thursday": "Thursday",
        "thứ sáu": "Friday", "thứ 6": "Friday", "friday": "Friday",
        "thứ bảy": "Saturday", "thứ 7": "Saturday", "saturday": "Saturday",
        "chủ nhật": "Sunday", "cn": "Sunday", "sunday": "Sunday"
    };
    const mealsMap: { [key: string]: keyof DailyMenuData } = {
        "bữa sáng": "breakfast", "sáng": "breakfast", "breakfast": "breakfast",
        "bữa trưa": "lunch", "trưa": "lunch", "lunch": "lunch",
        "bữa tối": "dinner", "tối": "dinner", "dinner": "dinner",
        "bữa phụ": "snacks", "phụ": "snacks", "snacks": "snacks"
    };

    function normalizeKey(key: string): string {
        return key.trim().toLowerCase().replace(/[:\s]+$/, ''); // Remove trailing colons/spaces
    }

    function parseNumeric(value: string): number | undefined {
        if (!value) return undefined;
        // Try to extract numbers, handling potential units like 'g', 'kcal'
        const match = value.match(/([0-9]+(?:[.,][0-9]+)?)/);
        if (match && match[1]) {
            // Replace comma with dot for float parsing if needed
            const numericString = match[1].replace(',', '.');
            const num = parseFloat(numericString);
            return isNaN(num) ? undefined : num;
        }
        return undefined;
    }

    function finalizeCurrentItem() {
        if (currentItem && currentItem.name && currentDay) {
            const targetDay = menuType === 'weekly' ? result[currentDay as keyof WeeklyMenuData] : result;
            if (targetDay && currentMeal && Array.isArray(targetDay[currentMeal])) {
                // Set defaults more reliably
                if (!currentItem.ingredients || currentItem.ingredients.length === 0) {
                    currentItem.ingredients = ["Chưa rõ"];
                    logger.debug(`[Parser] Setting default ingredients for "${currentItem.name}"`);
                }
                if (!currentItem.preparation) {
                    currentItem.preparation = "Chưa rõ";
                    logger.debug(`[Parser] Setting default preparation for "${currentItem.name}"`);
                }

                try {
                    // Validate item against schema before pushing
                    const validatedItem = MenuItemSchema.parse(currentItem);
                    targetDay[currentMeal].push(validatedItem);
                    logger.debug(`[Parser] Added item "${validatedItem.name}" to ${currentDay} - ${currentMeal}`);
                } catch (itemValidationError: any) {
                    logger.warn(`[Parser] Invalid MenuItem data for "${currentItem.name}". Skipping item. Error: ${itemValidationError.message}`, { itemData: currentItem, errorDetails: itemValidationError.errors });
                }
            } else {
                logger.warn(`[Parser] Could not add item "${currentItem?.name || 'Unnamed Item'}", invalid day/meal structure: Day=${currentDay}, Meal=${currentMeal}`);
            }
        } else if (currentItem && !currentItem.name) {
             logger.warn(`[Parser] Discarding item without a name.`, { itemData: currentItem });
        }
        currentItem = null;
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Match Day (Weekly only) - More flexible matching
        if (menuType === 'weekly') {
            const dayMatch = trimmedLine.match(/^##\s*([^#]+)/i); // Match ## followed by non-# chars
            if (dayMatch) {
                finalizeCurrentItem();
                const dayNameRaw = dayMatch[1].trim().toLowerCase();
                let mappedDayKey: keyof WeeklyMenuData | null = null;
                // Find the key in daysMap that is contained within dayNameRaw
                for (const key in daysMap) {
                    if (dayNameRaw.includes(key)) {
                        mappedDayKey = daysMap[key];
                        break;
                    }
                }
                currentDay = mappedDayKey;

                if (currentDay) {
                    if (!result[currentDay]) {
                        result[currentDay] = { breakfast: [], lunch: [], dinner: [], snacks: [] };
                    }
                    currentMeal = null;
                    logger.debug(`[Parser] Switched to day: ${currentDay} (from "${dayNameRaw}")`);
                } else {
                    logger.warn(`[Parser] Could not map day: "${dayNameRaw}"`);
                    currentDay = null; // Prevent adding items to unknown day
                }
                continue;
            }
        }

        // Match Meal (Only if currentDay is valid) - More flexible matching
        if (currentDay) {
            const mealMatch = trimmedLine.match(/^###\s*([^#]+)/i); // Match ### followed by non-# chars
            if (mealMatch) {
                finalizeCurrentItem();
                const mealNameRaw = mealMatch[1].trim().toLowerCase();
                let mappedMealKey: keyof DailyMenuData | null = null;
                 // Find the key in mealsMap that is contained within mealNameRaw
                 for (const key in mealsMap) {
                    if (mealNameRaw.includes(key)) {
                        mappedMealKey = mealsMap[key];
                        break;
                    }
                }
                currentMeal = mappedMealKey;

                if (!currentMeal) {
                    logger.warn(`[Parser] Could not map meal: "${mealNameRaw}"`);
                } else {
                    const targetDay = menuType === 'weekly' ? result[currentDay as keyof WeeklyMenuData] : result;
                    if (targetDay && !targetDay[currentMeal]) {
                        targetDay[currentMeal] = [];
                    }
                     logger.debug(`[Parser] Switched to meal: ${currentMeal} (from "${mealNameRaw}")`);
                }
                continue;
            }
        }

        // Match start of a new Dish Item (More flexible: starts with '-' or '*')
        if (currentDay && currentMeal && (trimmedLine.startsWith('-') || trimmedLine.startsWith('*'))) {
             // Check if it's a detail line first (e.g., "* Nguyên liệu:")
             const detailMatchTest = trimmedLine.match(/^[\-\*]\s*([^:]+):\s*(.+)/i);
             if (!detailMatchTest) { // If it doesn't look like a detail line, treat as new item
                 finalizeCurrentItem();
                 currentItem = {};
                 // Extract name after '-' or '*'
                 const nameMatch = trimmedLine.match(/^[\-\*]\s*(.+)/);
                 if (nameMatch && nameMatch[1]) {
                     // Further check if the extracted part looks like a key-value pair itself
                     const potentialDetailMatch = nameMatch[1].match(/^([^:]+):\s*(.+)/);
                     if (potentialDetailMatch) {
                         // It looks like a detail line that started with '-' or '*', handle it below
                         // Reset currentItem as this wasn't a new item name line
                         currentItem = null;
                     } else {
                         currentItem.name = nameMatch[1].trim();
                         logger.debug(`[Parser] Started new item with name: "${currentItem.name}"`);
                         continue; // Name found, move to next line
                     }
                 } else {
                      // Could not extract name, reset item
                      currentItem = null;
                 }
             }
             // If it was a detail line, it will be handled by the detail matching logic below
        }


        // Match Dish Item Details (Only if inside an item) - More flexible key matching
        if (currentItem) {
            // Match lines starting with '*' or '-' followed by Key: Value
            const detailMatch = trimmedLine.match(/^[\-\*]\s*([^:]+):\s*(.+)/i);
            if (detailMatch) {
                const keyRaw = detailMatch[1];
                const key = normalizeKey(keyRaw);
                const value = detailMatch[2].trim();

                logger.debug(`[Parser] Matched detail: KeyRaw="${keyRaw}", KeyNorm="${key}", Value="${value}"`); // Changed trace to debug

                try {
                    if ((key.includes("tên") || key.includes("name")) && !currentItem.name) currentItem.name = value;
                    else if (key.includes("nguyên liệu") || key.includes("ingredient")) currentItem.ingredients = value.split(/[,;\n]|(\s-\s)/).map(s => s?.trim()).filter(Boolean); // Split by ,, ;, newline, or ' - '
                    else if (key.includes("cách làm") || key.includes("preparation") || key.includes("hướng dẫn") || key.includes("instruction")) currentItem.preparation = value;
                    else if (key.includes("chi phí") || key.includes("cost")) currentItem.estimatedCost = value;
                    else if (key.includes("calories") || key.includes("calo") || key.includes("năng lượng")) currentItem.calories = parseNumeric(value);
                    else if (key.includes("protein") || key.includes("đạm")) currentItem.protein = parseNumeric(value);
                    else if (key.includes("carbs") || key.includes("carb") || key.includes("tinh bột")) currentItem.carbs = parseNumeric(value);
                    else if (key.includes("fat") || key.includes("chất béo")) currentItem.fat = parseNumeric(value);
                    else if (key.includes("lợi ích") || key.includes("benefit")) currentItem.healthBenefits = value.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
                    else {
                        logger.debug(`[Parser] Unmapped key "${key}" for item "${currentItem.name || 'Unnamed'}"`); // Changed trace to debug
                    }
                } catch (parseValueError: any) {
                    logger.warn(`[Parser] Error processing value for key "${key}": ${value}. Error: ${parseValueError.message}`);
                }
            } else if (currentItem.preparation && !trimmedLine.startsWith('#') && !trimmedLine.startsWith('-') && !trimmedLine.startsWith('*')) {
                // Append to preparation if it's a continuation line (more robust check)
                currentItem.preparation += "\n" + trimmedLine;
                 logger.debug(`[Parser] Appended to preparation for item "${currentItem.name || 'Unnamed'}"`); // Changed trace to debug
            } else if (!currentItem.name && !trimmedLine.startsWith('#') && !trimmedLine.startsWith('-') && !trimmedLine.startsWith('*')) {
                // If name wasn't found yet and line doesn't match other patterns, assume it's the name
                currentItem.name = trimmedLine;
                 logger.debug(`[Parser] Assumed item name from line: "${currentItem.name}"`);
            }
        }
    }

    finalizeCurrentItem(); // Finalize the last item

    // Final validation against the appropriate schema
    try {
        if (menuType === 'daily') {
            if (!result.breakfast) { result.breakfast = []; logger.warn("[Parser] Daily menu missing breakfast array entirely, initializing."); }
            if (!result.lunch) { result.lunch = []; logger.warn("[Parser] Daily menu missing lunch array entirely, initializing."); }
            if (!result.dinner) { result.dinner = []; logger.warn("[Parser] Daily menu missing dinner array entirely, initializing."); }
            logger.info("[Parser] Attempting final Zod validation for DailyMenuSchema.");
            return DailyMenuSchema.parse(result);
        } else {
             // Add check for weekly menu structure integrity before parsing
             for (const dayKey of Object.keys(result)) {
                 const dayData = result[dayKey];
                 if (!dayData.breakfast) { dayData.breakfast = []; logger.warn(`[Parser] Weekly menu missing breakfast array for ${dayKey}, initializing.`); }
                 if (!dayData.lunch) { dayData.lunch = []; logger.warn(`[Parser] Weekly menu missing lunch array for ${dayKey}, initializing.`); }
                 if (!dayData.dinner) { dayData.dinner = []; logger.warn(`[Parser] Weekly menu missing dinner array for ${dayKey}, initializing.`); }
             }
            logger.info("[Parser] Attempting final Zod validation for WeeklyMenuSchema.");
            return WeeklyMenuSchema.parse(result);
        }
    } catch (e: any) {
        logger.error(`[Parser] Final Zod validation failed: ${e.message}`, { parsedObject: JSON.stringify(result, null, 2), errorDetails: e.errors }); // Log full error details
        throw new Error(`Failed to parse menu text into valid Zod schema: ${e.message}. Check logs for details.`);
    }
}


// +++ NEW: Helper function to select the best default menu +++
function selectBestDefaultMenu(preferences: string): DefaultMenuWithMetadata {
    const normalizedPrefs = preferences.toLowerCase().trim();
    if (!normalizedPrefs) {
        logger.warn("[Default Menu Selector] Empty preferences, returning standard family menu.");
        // Return a copy to avoid potential mutations
        return { ...defaultStandardFamilyMenu };
    }

    let bestMatch: DefaultMenuWithMetadata = defaultStandardFamilyMenu; // Default fallback
    let highestScore = 0;

    logger.info(`[Default Menu Selector] Selecting default menu for preferences: "${preferences}"`);

    allDefaultMenus.forEach(menu => {
        // Ensure menu is treated as DefaultMenuWithMetadata for type safety
        const currentMenu = menu as DefaultMenuWithMetadata;
        let currentScore = 0;
        currentMenu.keywords.forEach(keyword => {
            if (normalizedPrefs.includes(keyword.toLowerCase())) {
                currentScore++;
            }
        });

        logger.debug(`[Default Menu Selector] Menu "${currentMenu.description}" score: ${currentScore}`);

        if (currentScore > highestScore) {
            highestScore = currentScore;
            bestMatch = currentMenu;
        }
    });

    if (highestScore > 0) {
        logger.info(`[Default Menu Selector] Best match found: "${bestMatch.description}" with score ${highestScore}.`);
    } else {
        logger.warn(`[Default Menu Selector] No keywords matched preferences. Returning standard family menu.`);
    }

    // Return a deep copy to avoid potential mutations if the original objects are modified later
    // Also, ensure the returned object matches AnyMenuData (Daily or Weekly) by removing extra props
    const { description, keywords, ...menuData } = JSON.parse(JSON.stringify(bestMatch));
    // We need to cast here because the default menus are currently only DailyMenuData
    // If Weekly defaults were added, more complex logic might be needed.
    return menuData as DailyMenuData & { description: string; keywords: string[] }; // Keep metadata for logging, but the core is DailyMenuData
}


// --- Main Orchestrator Flow (UPDATED Step 3 with Reasoning Fallback) ---
const generateMenuFromPreferencesFlow = ai.defineFlow<
    typeof GenerateMenuFromPreferencesInputSchema,
    typeof GenerateMenuFromPreferencesOutputSchema
    // Removed trailing comma here
>(
    {
        name: 'generateMenuFromPreferencesFlow',
        inputSchema: GenerateMenuFromPreferencesInputSchema,
        outputSchema: GenerateMenuFromPreferencesOutputSchema,
    },
    async (input) => { // Reverted signature
        // Removed signal extraction
        logger.info(`[Flow Start] Bắt đầu tạo thực đơn ${input.menuType} (text-based) với tracing và grounding`, { preferences: input.preferences }); // Removed hasSignal log
        const traceLog: StepTrace[] = [];
        let startTime: number;
        let menuContent: AnyMenuData | undefined = undefined; // Will hold the PARSED menu
        let feedbackRequest: string | undefined = undefined;
        const fallbackFeedbackRequest = `Bạn thấy thực đơn ${input.menuType} này thế nào? Nếu có điểm nào chưa phù hợp hoặc muốn thay đổi, đừng ngần ngại cho tôi biết nhé!`;
        let menuPlan: string = `(Kế hoạch dự phòng) Tạo thực đơn ${input.menuType} dựa trên sở thích: ${input.preferences}.`;
        let planningReasoning: string = `(Reasoning dự phòng) **Bước lập kế hoạch chi tiết đã thất bại hoặc bị bỏ qua.**`;
        let groundedSearchResult: GroundedSearchResult | undefined = undefined;
        let extractedCitations: Citation[] = [];
        let searchSuggestionHtml: string | undefined = undefined;

        // --- Step 1: RAG/Search Agent (Giữ nguyên) ---
        const searchStepName = "Bước 1: Tìm kiếm Thông tin (RAG)";
        startTime = Date.now();

        // Explicit check to satisfy TypeScript, though Zod validation should guarantee this
        if (typeof input.preferences !== 'string' || typeof input.menuType !== 'string') {
             logger.error("[Flow Start] Critical error: Input preferences or menuType are not strings despite Zod validation.");
             throw new Error("Internal error: Invalid input types detected within the flow.");
        }
        // Assign to new constants *after* the check to help TS inference
        const userPreferences: string = input.preferences;
        const typeOfMenu: string = input.menuType;

        let searchInput = `Công thức nấu ăn Việt Nam ${userPreferences} thực đơn ${typeOfMenu}`; // Use the new constants
        let step1Reasoning = `Thực hiện tìm kiếm Google để thu thập thông tin liên quan đến sở thích '${userPreferences}' và loại thực đơn '${typeOfMenu}'.`; // Use constants here too
        let step1Status: StepTrace['status'] = 'success';
        let step1ErrorDetails: string | undefined = undefined;
        let step1OutputData: any = {};
        try {
            // Ensure searchInput is definitely a string before calling googleSearch
            if (typeof searchInput !== 'string') {
                 // This should theoretically not happen due to initial checks, but belts and suspenders.
                 logger.error(`[${searchStepName}] Critical internal error: searchInput is not a string despite prior checks.`);
                 throw new Error("Internal error: searchInput is not a string before Google Search call.");
            }
            // Assign to a new constant after the check to satisfy TS type narrowing
            const validatedSearchInput: string = searchInput;
            logger.info(`[${searchStepName}] Gọi googleSearch với query: "${validatedSearchInput}"`);
            // Removed signal from googleSearch call
            groundedSearchResult = await googleSearch(validatedSearchInput);
            extractedCitations = groundedSearchResult.metadata?.groundingChunks?.map(chunk => ({
                title: chunk.web.title, // Reverted title fallback for now, assuming original data structure
                uri: chunk.web.uri,
            })) || [];
            searchSuggestionHtml = groundedSearchResult.metadata?.searchEntryPoint?.renderedContent;
            step1OutputData = {
                contentSummary: safeStringify(groundedSearchResult.content, 500),
                citationCount: extractedCitations.length,
                citationsPreview: safeStringify(extractedCitations, 500),
                searchQueries: groundedSearchResult.metadata?.webSearchQueries,
                searchSuggestionHtmlProvided: !!searchSuggestionHtml,
            };
            if (!groundedSearchResult.content && extractedCitations.length === 0) {
                logger.warn(`[${searchStepName}] Hoàn thành nhưng không có nội dung hoặc trích dẫn.`);
                step1Reasoning = `Tìm kiếm Google được thực hiện cho '${input.preferences}' và '${input.menuType}', nhưng không trả về nội dung hoặc trích dẫn.`;
            } else {
                logger.info(`[${searchStepName}] Thành công: Nhận được nội dung dài ${groundedSearchResult.content?.length ?? 0} ký tự, ${extractedCitations.length} trích dẫn, và ${searchSuggestionHtml ? 'có' : 'không có'} HTML chip gợi ý.`);
                step1Reasoning = `Thực hiện tìm kiếm Google cho '${userPreferences}' và '${typeOfMenu}'. Tìm thấy ${extractedCitations.length} nguồn tham khảo.${searchSuggestionHtml ? ' Chip gợi ý tìm kiếm cũng được cung cấp.' : ''}`; // Use constants
            }
        } catch (error: any) {
            step1Status = 'error';
            step1ErrorDetails = error.message || String(error);
            logger.error(`[${searchStepName}] Lỗi nghiêm trọng: ${step1ErrorDetails}`, error);
            step1Reasoning = `Tìm kiếm Google cho '${userPreferences}' và '${typeOfMenu}' thất bại: ${step1ErrorDetails}.`; // Use constants
        } finally {
            // Define inputData and outputData for trace log separately to ensure type correctness
            const traceInputData = { query: searchInput ?? "[Search input unavailable]" };
            const finalReasoning = typeof step1Reasoning === 'string' ? step1Reasoning : "[Reasoning unavailable]";
            const traceOutputData = { ...step1OutputData, reasoning: finalReasoning };

            // Explicitly construct the object matching StepTrace type
            const traceEntry: StepTrace = {
                stepName: searchStepName, // string
                status: step1Status, // 'success' | 'error' | 'skipped'
                inputData: traceInputData, // any | undefined
                outputData: traceOutputData, // object | undefined
                errorDetails: step1ErrorDetails, // string | undefined
                durationMs: Date.now() - startTime // number | undefined
            };
            traceLog.push(traceEntry); // Push the explicitly typed object
        }

        // --- Step 2: Planning Agent (Giữ nguyên) ---
        const planningStepName = "Bước 2: Lập Kế hoạch & Suy luận";
        startTime = Date.now()
        let planningInput = {
            preferences: input.preferences,
            menuType: input.menuType,
            searchContent: groundedSearchResult?.content,
            citations: extractedCitations,
            userContext: input.userContext // Pass userContext to planning
        };
        let step2Status: StepTrace['status'] = 'success';
        let step2ErrorDetails: string | undefined = undefined;
        let step2OutputData: any = { plan: menuPlan };
        try {
            // Removed signal check
            logger.info(`[${planningStepName}] Gọi planMenuStructurePrompt.`);
            // Removed signal from prompt execution
            const planResponse = await planMenuStructurePrompt(planningInput);
            const output = planResponse.output;
            if (!output?.plan?.trim() || !output?.reasoning?.trim()) {
                // Removed signal check
                throw new Error("Output từ bước lập kế hoạch không hợp lệ hoặc bị trống.");
            }
            menuPlan = output.plan;
            planningReasoning = output.reasoning;
            step2OutputData = { plan: menuPlan };
            logger.info(`[${planningStepName}] Thành công.`);
            logger.debug(`[${planningStepName}] Reasoning chi tiết:\n${planningReasoning}`);
        } catch (error: any) {
            step2Status = 'error';
            step2ErrorDetails = error.message || String(error);
            step2OutputData.errorOutput = safeStringify(error.output || error, 1000);
            logger.error(`[${planningStepName}] Lỗi: ${step2ErrorDetails}`, error);
            // Reverted AbortError handling, always use fallback on error
            logger.warn(`[${planningStepName}] Sử dụng kế hoạch và reasoning dự phòng.`);
            menuPlan = `(Kế hoạch dự phòng) Tạo thực đơn ${input.menuType} dựa trên sở thích: ${input.preferences}.`;
            planningReasoning = `(Reasoning dự phòng) **Bước lập kế hoạch chi tiết đã thất bại hoặc bị bỏ qua do lỗi: ${step2ErrorDetails}**`;
        } finally {
            // Define inputData and outputData for trace log separately
            const traceInputData = safeStringify(planningInput, 1500);
            const finalReasoning = safeStringify(planningReasoning, 4000) ?? "[Reasoning unavailable]";
            const traceOutputData = { ...step2OutputData, reasoning: finalReasoning };

            // Explicitly construct the object matching StepTrace type
            const traceEntry: StepTrace = {
                stepName: planningStepName, // string
                status: step2Status, // 'success' | 'error' | 'skipped'
                inputData: traceInputData, // any | undefined
                outputData: traceOutputData, // object | undefined
                errorDetails: step2ErrorDetails, // string | undefined
                durationMs: Date.now() - startTime // number | undefined
            };
            traceLog.push(traceEntry); // Push the explicitly typed object
        }

        // --- Step 3: Content Writing & Parsing Agent (UPDATED with Reasoning Fallback) ---
        const writingStepName = `Bước 3: Tạo & Phân tích Nội dung Thực đơn (${input.menuType})`;
        startTime = Date.now();
        let writingInput: GenerateMenuContentInput = {
            preferences: input.preferences,
            searchContent: groundedSearchResult?.content,
            citations: extractedCitations,
            menuPlan: menuPlan,
            menuType: input.menuType,
            userContext: input.userContext // Pass userContext to content writing
        };
        let step3Reasoning = `(Reasoning dự phòng) Không thể tạo hoặc phân tích nội dung thực đơn.`; // Initial fallback
        let step3Status: StepTrace['status'] = 'success';
        let step3ErrorDetails: string | undefined = undefined;
        let step3OutputData: any = {};
        let generatedMenuString: string | undefined = undefined;

        try {
            // Removed signal check
            if (step2Status === 'success' && !menuPlan.startsWith('(Kế hoạch dự phòng)')) { // Reverted check for aborted plan
                logger.info(`[${writingStepName}] Gọi generateMenuContentPrompt (yêu cầu text output).`);
                // Removed signal from prompt execution
                const menuContentResponse = await generateMenuContentPrompt(writingInput);
                // IMPORTANT: Access the output carefully. It might not conform to the schema.
                const output = menuContentResponse.output as any; // Cast to any to check fields safely

                // Removed signal check
                // +++ START: Reasoning Fallback Logic +++
                let llmReasoning = (typeof output?.reasoning === 'string' && output.reasoning.trim())
                                    ? output.reasoning.trim()
                                    : null; // Get reasoning safely

                if (!llmReasoning) {
                    logger.warn(`[${writingStepName}] LLM did not provide 'reasoning' field or it was empty. Using fallback.`);
                    llmReasoning = "(LLM không cung cấp suy luận)"; // Assign fallback
                }
                step3Reasoning = llmReasoning; // Use the (potentially fallback) reasoning for logs/trace
                // +++ END: Reasoning Fallback Logic +++

                // Validate menuContentString presence AFTER handling reasoning
                if (typeof output?.menuContentString !== 'string' || !output.menuContentString.trim()) {
                     // Removed signal check
                     throw new Error(`LLM trả về output không hợp lệ hoặc menuContentString trống.`);
                }

                generatedMenuString = output.menuContentString;
                step3OutputData = {
                    llmReasoning: step3Reasoning, // Log the reasoning used (original or fallback)
                    rawMenuStringPreview: safeStringify(generatedMenuString, 500)
                };
                logger.info(`[${writingStepName}] LLM tạo menu string thành công.`);
                logger.debug(`[${writingStepName}] Raw menu string:\n${generatedMenuString}`);

                // --- Parsing Sub-step ---
                if (generatedMenuString) { // Add check to ensure string is not undefined
                    logger.info(`[${writingStepName}] Bắt đầu phân tích menu string...`);
                    try {
                        menuContent = await parseMenuTextToZod(generatedMenuString, input.menuType);
                        step3OutputData.parsingStatus = 'Success';
                        step3OutputData.parsedMenuSummary = `Parsed ${Object.keys(menuContent || {}).length} days/meals`;
                        step3OutputData.parsedMenuDetails = safeStringify(menuContent, 1000);
                    } catch (parseError: any) {
                        const originalParseErrorMsg = `Lỗi phân tích menu string: ${parseError.message}`;
                        logger.error(`[${writingStepName}] ${originalParseErrorMsg}`, { rawString: generatedMenuString, errorDetails: parseError });

                        // +++ NEW: Fallback to Default Menu on Parse Error +++
                        logger.warn(`[${writingStepName}] Parsing failed. Attempting to select a default menu based on preferences: "${input.preferences}"`);
                        try {
                            // Select the best default menu based on original preferences
                            const selectedDefaultMenu = selectBestDefaultMenu(input.preferences);
                            // We only support Daily defaults for now, ensure type matches
                            if (input.menuType === 'daily') {
                                // Remove metadata before assigning to menuContent
                                const { description, keywords, ...dailyMenuData } = selectedDefaultMenu;
                                menuContent = dailyMenuData as DailyMenuData; // Assign the selected default Daily menu
                                step3Status = 'error'; // Keep status as error because original parse failed
                                step3ErrorDetails = `${originalParseErrorMsg}. Fallback: Used default menu "${selectedDefaultMenu.description}".`;
                            step3OutputData.parsingStatus = 'FailedWithFallback';
                            step3OutputData.parsingError = originalParseErrorMsg;
                            step3OutputData.fallbackMenuUsed = selectedDefaultMenu.description;
                            step3Reasoning += ` | Lỗi khi phân tích văn bản. Đã sử dụng thực đơn mặc định: "${selectedDefaultMenu.description}".`; // Already Vietnamese
                            logger.info(`[${writingStepName}] Successfully selected default daily menu: "${selectedDefaultMenu.description}"`);
                        } else { // Handle weekly menu fallback by constructing from daily default
                                logger.warn(`[${writingStepName}] Parsing failed for weekly menu. Constructing fallback weekly menu from default daily menu: "${selectedDefaultMenu.description}"`);
                                const { description, keywords, ...dailyMenuData } = selectedDefaultMenu;
                                const fallbackWeeklyMenu: WeeklyMenuData = {
                                    Monday: dailyMenuData as DailyMenuData,
                                    Tuesday: dailyMenuData as DailyMenuData,
                                    Wednesday: dailyMenuData as DailyMenuData,
                                    Thursday: dailyMenuData as DailyMenuData,
                                    Friday: dailyMenuData as DailyMenuData,
                                    Saturday: dailyMenuData as DailyMenuData,
                                    Sunday: dailyMenuData as DailyMenuData,
                                };
                                menuContent = fallbackWeeklyMenu; // Assign the constructed weekly menu
                                step3Status = 'error'; // Keep status as error because original parse failed
                                step3ErrorDetails = `${originalParseErrorMsg}. Fallback: Constructed weekly menu using default daily menu "${selectedDefaultMenu.description}".`;
                            step3OutputData.parsingStatus = 'FailedWithConstructedWeeklyFallback';
                            step3OutputData.parsingError = originalParseErrorMsg;
                            step3OutputData.fallbackMenuUsed = `Constructed Weekly from: ${selectedDefaultMenu.description}`;
                            step3Reasoning += ` | Lỗi khi phân tích văn bản. Đã xây dựng thực đơn tuần mặc định từ thực đơn ngày: "${selectedDefaultMenu.description}".`; // Already Vietnamese
                            logger.info(`[${writingStepName}] Successfully constructed fallback weekly menu.`);
                        }
                    } catch (fallbackError: any) {
                            logger.error(`[${writingStepName}] Critical error during default menu fallback selection/construction: ${fallbackError.message}`, fallbackError);
                            step3Status = 'error';
                            step3ErrorDetails = `${originalParseErrorMsg}. Fallback selection also failed: ${fallbackError.message}`;
                        step3OutputData.parsingStatus = 'FailedFallbackFailed';
                        step3OutputData.parsingError = originalParseErrorMsg;
                        step3OutputData.fallbackError = fallbackError.message;
                        step3Reasoning += ` | Lỗi khi phân tích văn bản VÀ lỗi khi chọn thực đơn mặc định: ${fallbackError.message}`; // Already Vietnamese
                        menuContent = undefined; // Ensure menu is undefined
                    }
                        // +++ END: Fallback to Default Menu on Parse Error +++
                    }

                    // Ensure menuContent is not undefined after fallback
                    if (!menuContent) {
                        logger.error(`[${writingStepName}] Critical: menuContent is still undefined after all fallbacks! Using last-resort default.`);
                        const selectedDefaultMenu = selectBestDefaultMenu(input.preferences);
                        if (input.menuType === 'daily') {
                            const { description, keywords, ...dailyMenuData } = selectedDefaultMenu;
                            menuContent = dailyMenuData as DailyMenuData;
                            step3Status = 'error';
                            step3ErrorDetails = `Mọi nỗ lực tạo và phân tích menu đều thất bại. Đã sử dụng thực đơn mặc định cuối cùng "${selectedDefaultMenu.description}".`; // Translated error detail
                            step3OutputData.parsingStatus = 'FailedWithLastResort';
                            step3OutputData.fallbackMenuUsed = selectedDefaultMenu.description;
                            step3Reasoning += ` | Lỗi nghiêm trọng: Đã sử dụng thực đơn mặc định cuối cùng "${selectedDefaultMenu.description}".`; // Translated reasoning
                        } else {
                            step3Status = 'error';
                            step3ErrorDetails = `Mọi nỗ lực tạo và phân tích menu đều thất bại và không có thực đơn tuần mặc định nào được định nghĩa.`; // Translated error detail
                            step3OutputData.parsingStatus = 'FailedNoFallback';
                            step3Reasoning += ` | Lỗi nghiêm trọng: Không tìm thấy thực đơn tuần mặc định phù hợp.`; // Translated reasoning
                        }
                    }
                } else {
                    // Handle case where generatedMenuString is undefined (shouldn't happen if previous checks pass, but good safety)
                    step3Status = 'error';
                    step3ErrorDetails = 'Không có nội dung menu string để phân tích.';
                    step3OutputData.parsingStatus = 'Skipped (No Content)';
                    step3Reasoning += ` | ${step3ErrorDetails}`;
                    logger.error(`[${writingStepName}] ${step3ErrorDetails}`);
                    menuContent = undefined;
                }
                // --- End Parsing Sub-step ---

            } else { // Reverted specific check for aborted step 2
                 step3Status = 'skipped';
                 step3Reasoning = `Bước tạo nội dung bị bỏ qua do bước lập kế hoạch trước đó thất bại hoặc sử dụng kế hoạch dự phòng.`;
                 logger.warn(`[${writingStepName}] Bỏ qua bước tạo nội dung.`);
            }
        } catch (error: any) {
            // Reverted AbortError handling
            step3Status = 'error';
            step3ErrorDetails = error.message || String(error);
            // Log the raw output if available in the error object for debugging
            step3OutputData.errorOutput = safeStringify(error.output || error, 1000);
            logger.error(`[${writingStepName}] Lỗi trong quá trình gọi LLM hoặc xử lý đầu ra: ${step3ErrorDetails}`, error); // output -> đầu ra
            // Ensure reasoning reflects the error state if an LLM call error occurred
            step3Reasoning = `Lỗi khi gọi LLM hoặc xử lý đầu ra ban đầu: ${step3ErrorDetails}`; // output -> đầu ra
            menuContent = undefined; // Ensure menu is undefined on any error in this step
        } finally {
             // Define inputData and outputData for trace log separately
             const traceInputData = step3Status !== 'skipped' ? safeStringify(writingInput, 1500) : { note: "Step skipped due to previous error." }; // Reverted note text
             // Ensure finalReasoning is string | undefined to match schema
             const finalReasoning = typeof step3Reasoning === 'string' ? step3Reasoning : undefined;
             const otherOutputProps = { ...step3OutputData }; // Get other props like parsingStatus etc.

             // Construct the trace entry directly
             const traceEntry: StepTrace = {
                 stepName: writingStepName,
                 status: step3Status,
                 inputData: traceInputData,
                 // Conditionally include outputData only if there's reasoning or other props
                 outputData: (finalReasoning !== undefined || Object.keys(otherOutputProps).length > 0)
                     ? { ...otherOutputProps, reasoning: finalReasoning }
                     : undefined,
                 errorDetails: step3ErrorDetails,
                 durationMs: Date.now() - startTime
             };
             traceLog.push(traceEntry); // Push the explicitly typed object
        }


        // +++ Step 3.5: Check for Missing/Empty Meals (NO LONGER ADDS PLACEHOLDERS) +++
        const checkStepName = "Bước 3.5: Kiểm tra Bữa ăn Bắt buộc (Chỉ cảnh báo)";
        startTime = Date.now();
        let mealsChecked = false;
        let missingMealsDetected = false;
        let checkReasoning = "Kiểm tra xem các bữa ăn bắt buộc (sáng, trưa, tối) có bị thiếu hoặc trống sau khi parse không.";
        try {
            if (step3Status === 'success' && menuContent) {
                mealsChecked = true;
                if (input.menuType === 'daily') {
                    const dailyMenu = menuContent as DailyMenuData;
                    if (!dailyMenu.breakfast || dailyMenu.breakfast.length === 0) { missingMealsDetected = true; logger.warn(`[${checkStepName}] Cảnh báo: Bữa sáng bị thiếu hoặc trống.`); }
                    if (!dailyMenu.lunch || dailyMenu.lunch.length === 0) { missingMealsDetected = true; logger.warn(`[${checkStepName}] Cảnh báo: Bữa trưa bị thiếu hoặc trống.`); }
                    if (!dailyMenu.dinner || dailyMenu.dinner.length === 0) { missingMealsDetected = true; logger.warn(`[${checkStepName}] Cảnh báo: Bữa tối bị thiếu hoặc trống.`); }
                } else if (input.menuType === 'weekly') {
                    const weeklyMenu = menuContent as WeeklyMenuData;
                    const days: (keyof WeeklyMenuData)[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
                    for (const day of days) {
                        if (weeklyMenu[day] && typeof weeklyMenu[day] === 'object') {
                            const dailyMenu = weeklyMenu[day] as DailyMenuData;
                            if (!dailyMenu.breakfast || dailyMenu.breakfast.length === 0) { missingMealsDetected = true; logger.warn(`[${checkStepName}] Cảnh báo: Bữa sáng ngày ${day} bị thiếu hoặc trống.`); }
                            if (!dailyMenu.lunch || dailyMenu.lunch.length === 0) { missingMealsDetected = true; logger.warn(`[${checkStepName}] Cảnh báo: Bữa trưa ngày ${day} bị thiếu hoặc trống.`); }
                            if (!dailyMenu.dinner || dailyMenu.dinner.length === 0) { missingMealsDetected = true; logger.warn(`[${checkStepName}] Cảnh báo: Bữa tối ngày ${day} bị thiếu hoặc trống.`); }
                        } else {
                             // Log if a whole day is missing, though parser should ideally create it
                             logger.warn(`[${checkStepName}] Cảnh báo: Dữ liệu cho ngày ${day} không tồn tại hoặc không phải object.`);
                        }
                    }
                }
                checkReasoning = missingMealsDetected
                    ? "Đã kiểm tra. Phát hiện một số bữa ăn bắt buộc (sáng, trưa, tối) bị thiếu hoặc trống trong menu đã parse. Sẽ kiểm tra ở bước sau để dùng menu mặc định nếu cần."
                    : "Kiểm tra hoàn tất: Tất cả các bữa ăn bắt buộc (sáng, trưa, tối) dường như tồn tại (có thể trống) trong cấu trúc menu đã phân tích.";
            } else {
                checkReasoning = "Bỏ qua kiểm tra bữa ăn do bước tạo/phân tích nội dung trước đó thất bại, bị bỏ qua, hoặc không tạo menuContent.";
                logger.info(`[${checkStepName}] Bỏ qua do step3 status là ${step3Status} hoặc menuContent không tồn tại.`);
            }
        } catch (error: any) {
            logger.error(`[${checkStepName}] Lỗi không mong muốn khi kiểm tra bữa ăn: ${error.message}`, error);
            checkReasoning = `Gặp lỗi khi kiểm tra bữa ăn: ${error.message}`;
        } finally {
            const traceInputData = { menuExists: !!menuContent, step3Status: step3Status };
            const finalReasoning = typeof checkReasoning === 'string' ? checkReasoning : "[Check reasoning unavailable]";
            const traceOutputData = { reasoning: finalReasoning, mealsChecked: mealsChecked, missingMealsDetected: missingMealsDetected };
            const traceEntry: StepTrace = {
                stepName: checkStepName,
                status: 'success', // This step itself doesn't fail easily
                inputData: traceInputData,
                outputData: traceOutputData,
                durationMs: Date.now() - startTime
            };
            traceLog.push(traceEntry);
        }

        // +++ NEW Step 3.6: Use Default Menu if Parsed Menu is Effectively Empty +++
        const defaultMenuStepName = "Bước 3.6: Sử dụng Menu Mặc định nếu Cần";
        startTime = Date.now();
        let usedDefaultMenu = false;
        let defaultMenuReasoning = "Kiểm tra xem menu đã parse có thực sự trống không và sử dụng menu mặc định nếu cần.";
        let defaultMenuErrorDetails: string | undefined = undefined;
        let defaultMenuStatus: StepTrace['status'] = 'success';

        try {
            let isEffectivelyEmpty = false;
            if (menuContent) { // Only proceed if menuContent exists
                if (input.menuType === 'daily') {
                    const dailyMenu = menuContent as DailyMenuData;
                    // Check if ALL required meals are empty arrays
                    isEffectivelyEmpty = (!dailyMenu.breakfast || dailyMenu.breakfast.length === 0) &&
                                         (!dailyMenu.lunch || dailyMenu.lunch.length === 0) &&
                                         (!dailyMenu.dinner || dailyMenu.dinner.length === 0);
                } else if (input.menuType === 'weekly') {
                    // For weekly, consider it empty if *all defined days* have empty required meals
                    // Or if no days were defined at all by the parser
                    const weeklyMenu = menuContent as WeeklyMenuData;
                    const days = Object.keys(weeklyMenu) as (keyof WeeklyMenuData)[];
                    if (days.length === 0) {
                        isEffectivelyEmpty = true; // No days parsed
                    } else {
                        isEffectivelyEmpty = days.every(day => {
                            const daily = weeklyMenu[day];
                            return daily &&
                                   (!daily.breakfast || daily.breakfast.length === 0) &&
                                   (!daily.lunch || daily.lunch.length === 0) &&
                                   (!daily.dinner || daily.dinner.length === 0);
                        });
                    }
                }

                if (isEffectivelyEmpty) {
                    logger.warn(`[${defaultMenuStepName}] Menu đã parse thành công nhưng không chứa món ăn nào cho các bữa bắt buộc. Sử dụng menu mặc định.`);
                    // Select and assign default menu (currently only handles daily)
                    if (input.menuType === 'daily') {
                        const selectedDefaultMenu = selectBestDefaultMenu(input.preferences);
                        const { description, keywords, ...dailyMenuData } = selectedDefaultMenu;
                        menuContent = dailyMenuData as DailyMenuData; // OVERWRITE menuContent
                        usedDefaultMenu = true;
                        defaultMenuReasoning = `Menu được parse từ LLM không có món ăn nào. Đã chọn và sử dụng menu mặc định "${selectedDefaultMenu.description}" dựa trên sở thích.`;
                    } else { // Handle weekly menu fallback by constructing from daily default
                        logger.warn(`[${defaultMenuStepName}] Parsed weekly menu is effectively empty. Constructing fallback weekly menu from default daily menu.`);
                        const selectedDefaultMenu = selectBestDefaultMenu(input.preferences);
                        const { description, keywords, ...dailyMenuData } = selectedDefaultMenu;
                        const fallbackWeeklyMenu: WeeklyMenuData = {
                            Monday: dailyMenuData as DailyMenuData,
                            Tuesday: dailyMenuData as DailyMenuData,
                            Wednesday: dailyMenuData as DailyMenuData,
                            Thursday: dailyMenuData as DailyMenuData,
                            Friday: dailyMenuData as DailyMenuData,
                            Saturday: dailyMenuData as DailyMenuData,
                            Sunday: dailyMenuData as DailyMenuData,
                        };
                        menuContent = fallbackWeeklyMenu; // OVERWRITE menuContent
                        usedDefaultMenu = true;
                        defaultMenuReasoning = `Menu tuần được parse từ LLM không có món ăn nào. Đã xây dựng thực đơn tuần mặc định từ thực đơn ngày "${selectedDefaultMenu.description}" dựa trên sở thích.`;
                        logger.info(`[${defaultMenuStepName}] Successfully constructed fallback weekly menu from default: "${selectedDefaultMenu.description}"`);
                    }
                } else {
                    defaultMenuReasoning = "Menu đã parse có chứa ít nhất một món ăn trong các bữa bắt buộc. Không cần sử dụng menu mặc định.";
                }
            } else {
                 defaultMenuReasoning = "Bỏ qua bước kiểm tra menu mặc định vì menuContent không tồn tại (do lỗi ở các bước trước).";
                 defaultMenuStatus = 'skipped';
            }
        } catch (error: any) {
            defaultMenuStatus = 'error';
            defaultMenuErrorDetails = error.message || String(error);
            logger.error(`[${defaultMenuStepName}] Lỗi khi chọn hoặc gán menu mặc định: ${defaultMenuErrorDetails}`, error);
            defaultMenuReasoning = `Gặp lỗi trong quá trình kiểm tra hoặc sử dụng menu mặc định: ${defaultMenuErrorDetails}`;
            // menuContent might be in an inconsistent state, but the final fallback should handle it
        } finally {
            const traceInputData = { menuContentExists: !!menuContent, previousStepMissingMeals: missingMealsDetected };
            const finalReasoning = typeof defaultMenuReasoning === 'string' ? defaultMenuReasoning : "[Default menu reasoning unavailable]";
            const traceOutputData = { reasoning: finalReasoning, usedDefaultMenu: usedDefaultMenu };
            const traceEntry: StepTrace = {
                stepName: defaultMenuStepName,
                status: defaultMenuStatus,
                inputData: traceInputData,
                outputData: traceOutputData,
                errorDetails: defaultMenuErrorDetails,
                durationMs: Date.now() - startTime
            };
            traceLog.push(traceEntry);
        }


        // --- Step 4: Feedback Request Agent ---
        const feedbackStepName = "Bước 4: Tạo Câu hỏi Phản hồi"; // Renumbered from 4 to 4
        startTime = Date.now();
        let feedbackInput = { menuType: input.menuType };
        let step4Reasoning = `(Reasoning dự phòng) Không thể tạo câu hỏi phản hồi.`;
        let step4Status: StepTrace['status'] = 'success';
        let step4ErrorDetails: string | undefined = undefined;
        let step4OutputData: any = {};
        try {
            // Removed signal check and skip logic based on abort
            logger.info(`[${feedbackStepName}] Gọi generateFeedbackRequestPrompt.`);
            // Removed signal from prompt execution
            const feedbackResponse = await generateFeedbackRequestPrompt(feedbackInput);
            const output = feedbackResponse.output;
            // Removed signal check
            if (!output || typeof output.reasoning !== 'string') {
                throw new Error("Output từ bước tạo phản hồi không hợp lệ.");
            }
            step4Reasoning = output.reasoning;
            if (output.question?.trim()) {
                feedbackRequest = output.question.trim();
                step4OutputData = { request: feedbackRequest };
                logger.info(`[${feedbackStepName}] Thành công: "${feedbackRequest}"`);
            } else {
                logger.warn(`[${feedbackStepName}] LLM trả về question là null/rỗng. Sử dụng fallback.`);
                feedbackRequest = fallbackFeedbackRequest;
                step4OutputData = { request: feedbackRequest, note: "Used fallback question." };
                step4Reasoning += ` (LLM không tạo được câu hỏi, đã dùng phương án dự phòng).`; // fallback -> phương án dự phòng
            }
        } catch (error: any) {
            // Reverted AbortError handling
            step4Status = 'error';
            step4ErrorDetails = error.message || String(error);
            step4OutputData.errorOutput = safeStringify(error.output || error, 500);
            logger.error(`[${feedbackStepName}] Lỗi: ${step4ErrorDetails}`, error);
            logger.warn(`[${feedbackStepName}] Sử dụng câu hỏi phản hồi dự phòng.`);
            feedbackRequest = fallbackFeedbackRequest; // Always use fallback on error
        } finally {
             // Define inputData and outputData for trace log separately
             const traceInputData = feedbackInput; // Reverted conditional input data
             const finalReasoning = typeof step4Reasoning === 'string' ? step4Reasoning : "[Feedback reasoning unavailable]";
             const traceOutputData = { ...step4OutputData, reasoning: finalReasoning };

             // Explicitly construct the object matching StepTrace type
             const traceEntry: StepTrace = {
                 stepName: feedbackStepName, // string
                 status: step4Status, // 'success' | 'error' | 'skipped'
                 inputData: traceInputData, // any | undefined
                 outputData: traceOutputData, // object | undefined
                 errorDetails: step4ErrorDetails, // string | undefined (already handled potential undefined)
                 durationMs: Date.now() - startTime // number | undefined
             };
             traceLog.push(traceEntry); // Push the explicitly typed object
        }

        // --- Step 5: Formatting Agent (Giữ nguyên) ---
        const formattingStepName = "Bước 5: Định dạng Kết quả Cuối cùng";
        startTime = Date.now();
        let step5Reasoning = `Tổng hợp kết quả từ các bước trước: thực đơn (đã parse), câu hỏi phản hồi, trace log, citations, và HTML gợi ý tìm kiếm vào cấu trúc JSON output cuối cùng.`;
        let step5Status: StepTrace['status'] = 'success';
        let step5InputSummary = {
            menuParsedSuccessfully: menuContent !== undefined && step3Status === 'success', // Reverted check
            feedbackGenerated: feedbackRequest !== fallbackFeedbackRequest, // Reverted check
            planAvailable: !menuPlan.startsWith('(Kế hoạch dự phòng)'), // Reverted check
            planningReasoningAvailable: !planningReasoning.startsWith('(Reasoning dự phòng)'), // Reverted check
            citationsAvailable: extractedCitations.length > 0,
            searchSuggestionHtmlAvailable: !!searchSuggestionHtml
            // Removed wasAborted check
        };
         // Define inputData and outputData for trace log separately
         const traceInputData = step5InputSummary;
         const finalReasoning = typeof step5Reasoning === 'string' ? step5Reasoning : "[Formatting reasoning unavailable]";
         const traceOutputData = { reasoning: finalReasoning, finalOutputStructure: "{ menu, feedbackRequest, trace, menuType, citations, searchSuggestionHtml }" };

         // Explicitly construct the object matching StepTrace type
         const traceEntry: StepTrace = {
             stepName: formattingStepName, // string
             status: step5Status, // 'success' | 'error' | 'skipped'
             inputData: traceInputData, // any | undefined
             outputData: traceOutputData, // object | undefined
             // errorDetails: undefined, // No error details in this step
             durationMs: Date.now() - startTime // number | undefined
         };
        traceLog.push(traceEntry); // Push the explicitly typed object
        logger.info(`[${formattingStepName}] Hoàn tất định dạng kết quả cuối cùng.`);

        // --- Construct Final Output ---
        // Assign all properties directly, using ternary for feedbackRequest
        const finalOutput: GenerateMenuFromPreferencesOutput = {
            menu: menuContent, // The parsed menu object (or undefined if failed)
            feedbackRequest: feedbackRequest ? feedbackRequest : fallbackFeedbackRequest, // Assign guaranteed string - Reverted
            trace: traceLog,
            menuType: input.menuType,
            citations: extractedCitations.length > 0 ? extractedCitations : undefined,
            searchSuggestionHtml: searchSuggestionHtml,
        };

        // +++ NEW: Final Fallback Check to ensure menu is never undefined/null +++
        // This guarantees the output always contains *some* menu structure, even if it's an error state.
        // Reverted wasAborted check
        if (!finalOutput.menu) {
            logger.error(`[Flow End] Critical Failure: No menu content generated or parsed successfully after all steps. Generating default fallback error menu.`);

            // Define placeholder meal and default menu structure within the scope
             const defaultPlaceholderMeal: MenuItemData = {
                name: "Món ăn mặc định (Lỗi)", // Already Vietnamese
                ingredients: ["Đã xảy ra lỗi trong quá trình tạo thực đơn."], // Already Vietnamese
                preparation: "Vui lòng thử lại hoặc liên hệ hỗ trợ.", // Already Vietnamese
                // Ensure all required fields from MenuItemSchema have a value or are explicitly undefined if optional
                estimatedCost: undefined,
                calories: undefined,
                protein: undefined,
                carbs: undefined,
                fat: undefined,
                healthBenefits: undefined,
            };

            // Always generate a daily menu structure as the ultimate fallback
            // Ensure it conforms to DailyMenuSchema
            const defaultMenu: DailyMenuData = {
                breakfast: [defaultPlaceholderMeal],
                lunch: [defaultPlaceholderMeal],
                dinner: [defaultPlaceholderMeal],
                snacks: undefined, // Explicitly undefined if optional
            };

             finalOutput.menu = defaultMenu; // Assign the default menu

            // Add/Update trace log to reflect this critical fallback
            const fallbackTraceEntry: StepTrace = {
                stepName: "Bước 6: Fallback Cuối cùng (Lỗi Nghiêm trọng)", // Translated parenthetical
                status: 'error', // Indicate an overall process failure led to this
                inputData: { previousMenuState: 'undefined or null' }, // Removed wasAborted
                outputData: { reasoning: "Không có nội dung thực đơn nào được tạo hoặc phân tích thành công trong toàn bộ quy trình. Đã tạo thực đơn mặc định báo lỗi.", generatedMenuType: 'Default Daily Error Menu' }, // Already Vietnamese
                errorDetails: "Toàn bộ quá trình tạo thực đơn chính và các phương án dự phòng trước đó đều thất bại trong việc tạo ra một đối tượng menu hợp lệ.", // fallback -> phương án dự phòng
                durationMs: 0 // Indicate this is an immediate check/fix step
            };
            // Ensure trace exists before pushing
            if (!finalOutput.trace) { finalOutput.trace = []; }
            finalOutput.trace.push(fallbackTraceEntry);
        }
        // +++ END: Final Fallback Check +++

        // Reverted logging and re-throwing of AbortError
        logger.info(`[Flow End] Hoàn thành tạo thực đơn ${input.menuType}. Trả về kết quả (menu ${finalOutput.menu ? 'có dữ liệu' : 'KHÔNG CÓ DỮ LIỆU - LỖI NGHIÊM TRỌNG'}), trace, ${extractedCitations.length} citations, và ${searchSuggestionHtml ? 'có' : 'không có'} HTML chip gợi ý.`);
        return finalOutput;
    }
);

// --- Exported Entry Point ---
export async function generateMenuFromPreferences(
    input: GenerateMenuFromPreferencesInput
    // REMOVED options parameter
): Promise<GenerateMenuFromPreferencesOutput> {
    // REMOVED signal variable
    logger.info("[Entry Point] Received request to generate menu.", { ...input }); // REMOVED hasSignal log
    const parseResult = GenerateMenuFromPreferencesInputSchema.safeParse(input);
    if (!parseResult.success) {
        const formattedError = parseResult.error.format();
        const errorMsg = `Input không hợp lệ: ${JSON.stringify(formattedError)}`;
        logger.error('[Entry Point] Input validation failed.', formattedError);
        throw new Error(errorMsg);
    }
    try {
        // REMOVED Cancellation Check

        // Call the flow without passing the signal internally
        const result = await generateMenuFromPreferencesFlow(parseResult.data);
        return result;
    } catch (error: any) {
         // REMOVED AbortError check
        // Handle general errors
        const errorMessage = error.message || String(error);
        logger.error(`[Entry Point] Lỗi nghiêm trọng khi thực thi flow: ${errorMessage}`, error);
        throw new Error(`Tạo thực đơn thất bại: ${errorMessage}`);
    }
}

// Removed extra closing braces and fixed syntax errors from previous attempt
