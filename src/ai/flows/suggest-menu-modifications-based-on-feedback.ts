'use server';
/**
 * @fileOverview This file defines an enhanced Genkit flow for suggesting professional menu modifications based on user feedback,
 * or answering nutrition-related questions based on user input.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

// Input schema
const SuggestMenuModificationsBasedOnFeedbackInputSchema = z.object({
  menu: z.string().describe('The current menu context (as a JSON string).'),
  feedback: z.string().describe('User input: This could be feedback requesting modification OR a question.'),
  userPreferences: z
    .object({
      dietaryRestrictions: z.array(z.string()).optional(),
      allergies: z.array(z.string()).optional(),
      favoriteIngredients: z.array(z.string()).optional(),
      dislikedIngredients: z.array(z.string()).optional(),
      calorieGoal: z.number().optional(),
      fitnessGoal: z.string().optional(),
    })
    .optional(),
  userContext: z
    .object({
      username: z.string().optional(),
      age: z.number().optional(),
      gender: z.string().optional(),
      weight: z.number().optional(),
      height: z.number().optional(),
      activityLevel: z.string().optional(),
      medicalConditions: z.array(z.string()).optional(),
    })
    .optional(),
  mealTiming: z
    .object({
      breakfast: z.string().optional(),
      lunch: z.string().optional(),
      dinner: z.string().optional(),
      snacks: z.array(z.string()).optional(),
    })
    .optional(),
});

export type SuggestMenuModificationsBasedOnFeedbackInput = z.infer<
  typeof SuggestMenuModificationsBasedOnFeedbackInputSchema
>;

// Versatile Output Schema
const SuggestMenuModificationsBasedOnFeedbackOutputSchema = z.object({
  responseType: z.enum(['answer', 'menu_modification']).describe(
    'Type of response: "answer" or "menu_modification".'
  ),
  answerText: z.string().optional().describe(
    'Answer content (Markdown) if responseType is "answer".'
  ),
  modifiedMenu: z.string().optional().describe(
    'Adjusted menu (valid JSON string) if responseType is "menu_modification".'
  ),
  reasoning: z.string().optional().describe(
    'Reasoning (Markdown) if responseType is "menu_modification".'
  ),
  nutritionalAnalysis: z.string().optional().describe(
    'Nutritional analysis (Markdown) if responseType is "menu_modification".'
  ),
  mealPrepTips: z.string().optional().describe(
    'Prep tips (Markdown) if responseType is "menu_modification".'
  ),
  shoppingList: z.string().optional().describe(
    'Shopping list (Markdown) if responseType is "menu_modification".'
  ),
});

export type SuggestMenuModificationsBasedOnFeedbackOutput = z.infer<
  typeof SuggestMenuModificationsBasedOnFeedbackOutputSchema
>;

// Define a structured error type for the output
const ErrorOutputSchema = z.object({
  error: z.literal(true),
  message: z.string(),
});
type ErrorOutput = z.infer<typeof ErrorOutputSchema>;


// Main exported function
// Update the return type of the main function to include the error type
// REMOVED options argument for signal
export async function suggestMenuModificationsBasedOnFeedback(
  input: SuggestMenuModificationsBasedOnFeedbackInput
  // REMOVED options parameter
): Promise<SuggestMenuModificationsBasedOnFeedbackOutput | ErrorOutput> { // <-- Updated return type
  // REMOVED signal variable
  try {
    // Validate input menu JSON first
    try {
      JSON.parse(input.menu);
    } catch (e) {
      console.error("Invalid JSON provided for menu input:", input.menu);
      // Return a structured error for invalid input JSON
      return {
          error: true,
          message: 'Lỗi: Dữ liệu thực đơn đầu vào không hợp lệ. Vui lòng kiểm tra lại.',
      };
    }

    // REMOVED Cancellation Check

    // Call the flow within a try...catch block
    // Do NOT pass the signal here as the flow function doesn't accept it directly
    const result = await suggestMenuModificationsBasedOnFeedbackFlow(input);
    return result;

  } catch (error: any) { // Explicitly type error as any
    // REMOVED AbortError check

    // Catch other errors thrown by the flow execution
    console.error("Error executing suggestMenuModificationsBasedOnFeedbackFlow:", error);

    // Return a structured error object for non-abort errors
    return {
      error: true,
      message: error instanceof Error ? error.message : 'Đã xảy ra lỗi không mong muốn khi xử lý yêu cầu của bạn.',
    };
  }
}

// Helper functions (unchanged)
type UserPreferences = SuggestMenuModificationsBasedOnFeedbackInput['userPreferences'];
type UserContext = SuggestMenuModificationsBasedOnFeedbackInput['userContext'];
type MealTiming = SuggestMenuModificationsBasedOnFeedbackInput['mealTiming'];

function formatUserPreferences(userPrefs: UserPreferences): string {
  if (!userPrefs) return 'Không có thông tin tùy chọn.';
  let prefText = '';
  if (userPrefs.dietaryRestrictions && userPrefs.dietaryRestrictions.length) {
    prefText += `* 🍽️ **Chế độ ăn uống đặc biệt:** ${userPrefs.dietaryRestrictions.join(', ')}\n`;
  }
  if (userPrefs.allergies && userPrefs.allergies.length) {
    prefText += `* ⚠️ **Dị ứng:** ${userPrefs.allergies.join(', ')}\n`;
  }
  if (userPrefs.favoriteIngredients && userPrefs.favoriteIngredients.length) {
    prefText += `* 👍 **Thích:** ${userPrefs.favoriteIngredients.join(', ')}\n`;
  }
  if (userPrefs.dislikedIngredients && userPrefs.dislikedIngredients.length) {
    prefText += `* 👎 **Không thích:** ${userPrefs.dislikedIngredients.join(', ')}\n`;
  }
  if (userPrefs.calorieGoal) {
    prefText += `* 🔥 **Mục tiêu calo:** ${userPrefs.calorieGoal} kcal/ngày\n`;
  }
  if (userPrefs.fitnessGoal) {
    prefText += `* 💪 **Mục tiêu thể hình:** ${userPrefs.fitnessGoal}\n`;
  }
  return prefText || 'Không có thông tin tùy chọn.';
}

function formatUserContext(context: UserContext): string {
  if (!context) return 'Không có thông tin người dùng.';
  let contextText = '';
  if (context.username) {
    contextText += `* 👤 **Tên:** ${context.username}\n`;
  }
  if (context.age) {
    contextText += `* 🎂 **Tuổi:** ${context.age}\n`;
  }
  if (context.gender) {
    contextText += `* ⚧️ **Giới tính:** ${context.gender}\n`;
  }
  if (context.weight) {
    contextText += `* ⚖️ **Cân nặng:** ${context.weight} kg\n`;
  }
  if (context.height) {
    contextText += `* 📏 **Chiều cao:** ${context.height} cm\n`;
  }
  if (context.activityLevel) {
    contextText += `* 🏃 **Mức độ hoạt động:** ${context.activityLevel}\n`;
  }
  if (context.medicalConditions && context.medicalConditions.length) {
    contextText += `* 🏥 **Vấn đề sức khỏe:** ${context.medicalConditions.join(', ')}\n`;
  }
  return contextText || 'Không có thông tin người dùng.';
}

function formatMealTiming(timing: MealTiming): string {
  if (!timing) return '';
  let timingText = '### ⏰ Thời gian ăn uống\n';
  if (timing.breakfast) {
    timingText += `* 🍳 **Bữa sáng:** ${timing.breakfast}\n`;
  }
  if (timing.lunch) {
    timingText += `* 🍲 **Bữa trưa:** ${timing.lunch}\n`;
  }
  if (timing.dinner) {
    timingText += `* 🍽️ **Bữa tối:** ${timing.dinner}\n`;
  }
  if (timing.snacks && timing.snacks.length) {
    timingText += `* 🥨 **Ăn nhẹ:** ${timing.snacks.join(', ')}\n`;
  }
  return timingText;
}

// Define the prompt
const prompt = ai.definePrompt(
  {
    name: 'suggestMenuModificationsOrAnswerPrompt',
    input: { schema: SuggestMenuModificationsBasedOnFeedbackInputSchema }, // Use input schema directly
    output: { schema: SuggestMenuModificationsBasedOnFeedbackOutputSchema },
    prompt: `# 🧑‍⚕️ CHUYÊN GIA DINH DƯỠNG & TRỢ LÝ THỰC ĐƠN VIỆT NAM

Bạn là một AI đa năng, vừa là chuyên gia dinh dưỡng am hiểu ẩm thực Việt, vừa là trợ lý chỉnh sửa thực đơn. Nhiệm vụ của bạn là phân tích yêu cầu của người dùng và phản hồi một cách phù hợp.

## 📝 NGỮ CẢNH HIỆN TẠI:

### 1. Thực đơn đang thảo luận (JSON String):
\`\`\`json
{{menu}}
\`\`\`

### 2. Yêu cầu/Phản hồi từ người dùng:
{{feedback}}

### 3. Thông tin người dùng (nếu có):
{{formattedUserContext}}
{{formattedUserPreferences}}
{{formattedMealTiming}}

## 🎯 NHIỆM VỤ CỦA BẠN:

**Phân tích ý định của người dùng từ "{{feedback}}" và chọn MỘT trong hai hành động sau:**

**HÀNH ĐỘNG 1: Trả lời câu hỏi (Nếu người dùng hỏi thông tin)**
*   **Khi nào chọn:** Nếu "{{feedback}}" là một câu hỏi về thực đơn, món ăn cụ thể, dinh dưỡng chung, hoặc bất kỳ chủ đề nào liên quan mà không yêu cầu thay đổi thực đơn.
*   **Cách thực hiện:**
    1.  Đóng vai trò chuyên gia dinh dưỡng, trả lời câu hỏi của người dùng một cách chi tiết, chính xác và hữu ích.
    2.  Sử dụng kiến thức về ẩm thực Việt Nam và dinh dưỡng.
    3.  Định dạng câu trả lời bằng Markdown rõ ràng.
*   **Đầu ra:**
    *   \`responseType\`: "answer"
    *   \`answerText\`: [Nội dung câu trả lời bằng Markdown]
    *   (Để trống các trường khác: modifiedMenu, reasoning, etc.)

**HÀNH ĐỘNG 2: Chỉnh sửa thực đơn (Nếu người dùng yêu cầu thay đổi)**
*   **Khi nào chọn:** Nếu "{{feedback}}" thể hiện sự không hài lòng, yêu cầu thay đổi cụ thể (thêm món, bớt món, thay đổi nguyên liệu, điều chỉnh calo, v.v.), hoặc đưa ra phản hồi rõ ràng cần điều chỉnh thực đơn.
*   **Cách thực hiện:**
    1.  Dựa trên "{{feedback}}" và ngữ cảnh (thực đơn hiện tại, thông tin người dùng), tạo ra một phiên bản thực đơn mới đã được điều chỉnh.
    2.  Cung cấp lý do chi tiết cho các thay đổi.
    3.  Cung cấp phân tích dinh dưỡng, mẹo chuẩn bị, danh sách mua sắm (nếu có thể).
*   **Đầu ra:**
    *   \`responseType\`: "menu_modification"
    *   \`responseType\`: "menu_modification"
    *   \`modifiedMenu\`: (**BẮT BUỘC**) [Thực đơn mới dưới dạng **chuỗi JSON hợp lệ**, cấu trúc giống hệt thực đơn đầu vào]
    *   \`reasoning\`: (**BẮT BUỘC**) [Lý do chi tiết cho việc chỉnh sửa, định dạng Markdown]
    *   \`nutritionalAnalysis\`: (**BẮT BUỘC**) [Phân tích dinh dưỡng cho thực đơn mới, định dạng Markdown]
    *   \`mealPrepTips\`: (*Tùy chọn*) [Mẹo chuẩn bị bằng Markdown]
    *   \`shoppingList\`: (*Tùy chọn*) [Danh sách mua sắm bằng Markdown]
    *   (Để trống trường \`answerText\`)

**QUAN TRỌNG:**
*   Chỉ chọn MỘT hành động.
*   **Nếu thực hiện Hành động 2 (menu_modification), bạn BẮT BUỘC phải cung cấp giá trị hợp lệ cho các trường \`modifiedMenu\`, \`reasoning\`, và \`nutritionalAnalysis\`.** Đảm bảo \`modifiedMenu\` là một chuỗi JSON hợp lệ. Các trường khác như \`mealPrepTips\` và \`shoppingList\` là tùy chọn.
*   Nếu thực hiện Hành động 1, đảm bảo \`answerText\` được định dạng bằng Markdown và các trường liên quan đến chỉnh sửa thực đơn được để trống.`
  }
);

// Define the flow
const suggestMenuModificationsBasedOnFeedbackFlow = ai.defineFlow<
  typeof SuggestMenuModificationsBasedOnFeedbackInputSchema,
  typeof SuggestMenuModificationsBasedOnFeedbackOutputSchema
>(
  {
    name: 'suggestMenuModificationsOrAnswerFlow',
    inputSchema: SuggestMenuModificationsBasedOnFeedbackInputSchema,
    outputSchema: SuggestMenuModificationsBasedOnFeedbackOutputSchema,
  },
  // Flow function signature does NOT accept signal directly
  async (input): Promise<SuggestMenuModificationsBasedOnFeedbackOutput> => {
    // Signal is not available here

    // Format context for the prompt template (using helper functions)
    const formattedUserPreferences = formatUserPreferences(input.userPreferences);
    const formattedUserContext = formatUserContext(input.userContext);
    const formattedMealTiming = formatMealTiming(input.mealTiming);

    // Prepare input for the prompt, replacing placeholders in the template string
    // Note: Genkit's `prompt` function expects the direct input object matching its input schema.
    // The formatting helpers are used *within* the prompt template string itself.
    // We need to pass the raw input data here.
    const promptInput = {
        menu: input.menu,
        feedback: input.feedback,
        // Pass formatted strings directly if the prompt template uses them like {{formattedUserContext}}
        // Or pass the objects if the prompt needs to process them internally (less common for simple templates)
        // Let's assume the template uses the formatted strings:
        formattedUserPreferences: formattedUserPreferences,
        formattedUserContext: formattedUserContext,
        formattedMealTiming: formattedMealTiming,
        // Also pass raw objects if needed elsewhere, though schema doesn't strictly require it here
        userPreferences: input.userPreferences,
        userContext: input.userContext,
        mealTiming: input.mealTiming,
    };


    // Call the prompt - Do NOT pass signal here
    const promptResponse = await prompt(promptInput);
    const output = promptResponse.output; // Access the output property

    // Cannot check for cancellation here as signal is not available

    if (!output) {
      throw new Error("AI did not return a valid structured output.");
    }

    // Validate the output based on responseType and clean up
    let finalOutput: SuggestMenuModificationsBasedOnFeedbackOutput;

    if (output.responseType === 'menu_modification') {
      // 1. Check for modifiedMenu first and validate its JSON structure
      if (!output.modifiedMenu) {
        throw new Error("AI chose 'menu_modification' but did not provide 'modifiedMenu'.");
      }
      try {
        JSON.parse(output.modifiedMenu); // Validate JSON
      } catch (e) {
        console.error("AI returned invalid JSON for modifiedMenu:", output.modifiedMenu);
        throw new Error("AI failed to generate a valid JSON menu modification.");
      }

      // 2. If modifiedMenu is valid JSON, proceed but handle missing optional fields gracefully
      const reasoning = output.reasoning || "[AI không cung cấp lý do chi tiết]";
      const nutritionalAnalysis = output.nutritionalAnalysis || "[AI không cung cấp phân tích dinh dưỡng]";

      // 3. Construct the final output, using placeholders if necessary
      finalOutput = {
        responseType: 'menu_modification',
        modifiedMenu: output.modifiedMenu, // Known to be valid JSON string here
        reasoning: reasoning,
        nutritionalAnalysis: nutritionalAnalysis,
        mealPrepTips: output.mealPrepTips || undefined,
        shoppingList: output.shoppingList || undefined,
        answerText: undefined, // Ensure answerText is undefined
      };
    } else if (output.responseType === 'answer') {
      // Validation for 'answer' type remains the same
      if (!output.answerText) {
        throw new Error("AI chose 'answer' but did not provide 'answerText'.");
      }
      finalOutput = {
        responseType: 'answer',
        answerText: output.answerText,
        modifiedMenu: undefined, // Ensure modification fields are undefined
        reasoning: undefined,
        nutritionalAnalysis: undefined,
        mealPrepTips: undefined,
        shoppingList: undefined,
      };
    } else {
      throw new Error(`AI returned an unknown responseType: ${output.responseType}`);
    }

    return finalOutput;
  }
);
