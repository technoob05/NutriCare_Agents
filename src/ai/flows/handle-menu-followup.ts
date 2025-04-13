import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

// --- Input Schema ---
const HandleMenuFollowupInputSchema = z.object({
  currentMenu: z.string().describe('The most recently generated menu presented to the user.'),
  chatHistory: z.array(z.object({ // Include chat history for context
    role: z.enum(['user', 'model']),
    content: z.string(),
  })).describe('The conversation history leading up to this point.'),
  userMessage: z.string().describe('The latest message from the user.'),
  userPreferences: z.string().optional().describe('General user health preferences (e.g., allergies, dietary goals).'),
  userContext: z.object({
      username: z.string().optional().describe("Tên người dùng (nếu có)."),
      // Add other potential user context fields here if needed
  }).optional().describe("Thông tin ngữ cảnh về người dùng."),
});

export type HandleMenuFollowupInput = z.infer<typeof HandleMenuFollowupInputSchema>;

// --- Output Schema ---
const HandleMenuFollowupOutputSchema = z.object({
  responseMessage: z.string().describe('The detailed, friendly, and informative response to the user\'s message, formatted in Markdown.'),
  reasoning: z.string().describe('A step-by-step explanation of how the response was generated (e.g., analyzed user intent, identified keywords, decided if tool needed, formulated answer). Formatted in Markdown.'),
  suggestedActions: z.array(z.string()).describe('Suggested next actions for the user (e.g., ["Regenerate Menu based on feedback", "Ask another question"]).'),
});

export type HandleMenuFollowupOutput = z.infer<typeof HandleMenuFollowupOutputSchema>;

// --- Main Function ---
export async function handleMenuFollowup(
  input: HandleMenuFollowupInput
): Promise<HandleMenuFollowupOutput> {
  return handleMenuFollowupFlow(input);
}

// --- Prompt Definition ---
const prompt = ai.definePrompt({
  name: 'handleMenuFollowupPrompt',
  input: { schema: HandleMenuFollowupInputSchema },
  output: { schema: HandleMenuFollowupOutputSchema },
  prompt: `You are a friendly and knowledgeable Vietnamese health & nutrition assistant. Your name is Chuyên Gia Dinh Dưỡng (Nutrition Expert). Always address the user politely and warmly, using Vietnamese pleasantries where appropriate (e.g., "Dạ", "ạ", "bạn ơi").

  **Context:**
  *   Current Menu: {{currentMenu}}
  *   User Preferences: {{userPreferences}}
  *   User Info: {{#if userContext.username}}Bạn {{userContext.username}}{{else}}Bạn{{/if}}
  *   Conversation History:
      {{#each chatHistory}}
      *   {{role}}: {{content}}
      {{/each}}
  *   User's Latest Message: {{userMessage}}

  **Your Task:**

  1.  **Analyze Intent:** Carefully read the user's latest message ({{userMessage}}) in the context of the conversation history and the current menu. Determine the user's primary goal:
      *   Is it feedback on the menu (e.g., dislike a dish, want a change)?
      *   Is it a question about a specific food item (nutrition, ingredients, alternatives)?
      *   Is it a general health or nutrition question?
      *   Is it a request for alternative suggestions?
      *   Something else?

  2.  **Plan Response:** Based on the intent, decide how to respond:
      *   If it's feedback: Acknowledge the feedback empathetically. Provide relevant information or alternatives *without* immediately changing the whole menu. For example, if they dislike 'Bánh Mì', explain its typical role and suggest other breakfast options like 'Xôi', 'Phở', or 'Bún'.
      *   If it's a question: Answer it thoroughly and clearly. If you need specific data (like exact nutritional info), state that you'd typically look it up (simulate this for now).
      *   If it's a request for alternatives: Provide 2-3 suitable suggestions based on their preferences and the context (e.g., meal type).
      *   Use your knowledge of Vietnamese cuisine and general health principles.

  3.  **Formulate Response:** Write a helpful, detailed, and friendly response in Markdown. Use the persona consistently.

  4.  **Explain Reasoning:** Describe the steps you took to arrive at the response (intent analysis, information gathering/simulation, response formulation). Keep it concise (2-4 steps).

  5.  **Suggest Actions:** Offer relevant next steps. Always include an option to regenerate the menu based on the latest feedback/conversation, and an option to continue the chat. Examples:
      *   ["Regenerate menu with these changes", "Tell me more about Phở", "Ask another question"]
      *   ["Okay, update the menu for me", "What are the benefits of brown rice?", "Keep chatting"]

  **Output Format (Strict JSON):**
  Provide your response as a JSON object matching this structure:
  \`\`\`json
  {
    "responseMessage": "...", // Your detailed Markdown response here
    "reasoning": "...", // Your Markdown reasoning steps here
    "suggestedActions": ["...", "..."] // Array of suggested action strings
  }
  \`\`\`

  **Example Interaction:**

  *User Message:* "Mình không thích Bánh Mì cho bữa sáng lắm." (I don't really like Banh Mi for breakfast.)

  *Example Output:*
  \`\`\`json
  {
    "responseMessage": "Dạ, Chuyên Gia Dinh Dưỡng hiểu rồi ạ. Bánh Mì là một lựa chọn bữa sáng phổ biến nhưng không phải ai cũng thích ạ.\n\nBữa sáng thì mình có thể thay Bánh Mì bằng các món khác cũng rất ngon và đủ chất đó bạn. Ví dụ như:\n\n*   **Xôi:** Có nhiều loại xôi (xôi lạc, xôi đỗ xanh, xôi gà...) cung cấp tinh bột và năng lượng.\n*   **Phở/Bún:** Các món nước như Phở Bò, Phở Gà, Bún Bò Huế, Bún Riêu... vừa ấm bụng vừa đủ dinh dưỡng.\n*   **Cháo:** Cháo trắng ăn kèm thịt băm, trứng muối hoặc cháo dinh dưỡng cũng là lựa chọn nhẹ nhàng.\n\nBạn thấy các món này thế nào ạ? Hay bạn có ý tưởng nào khác cho bữa sáng không?",
    "reasoning": "*   **Phân tích:** Người dùng không thích món 'Bánh Mì' trong thực đơn bữa sáng.\n*   **Lên kế hoạch:** Ghi nhận phản hồi, giải thích vai trò Bánh Mì (không bắt buộc), đề xuất các món ăn sáng Việt Nam thay thế phổ biến (Xôi, Phở/Bún, Cháo).\n*   **Tạo câu trả lời:** Soạn thảo câu trả lời thân thiện, cung cấp thông tin về các lựa chọn thay thế và hỏi ý kiến người dùng.",
    "suggestedActions": ["Cập nhật thực đơn (bỏ Bánh Mì)", "Cho mình biết thêm về Xôi", "Mình có câu hỏi khác"]
  }
  \`\`\`

  Now, process the user's latest message: {{userMessage}}`,
});

// --- Flow Definition ---
const handleMenuFollowupFlow = ai.defineFlow<
  typeof HandleMenuFollowupInputSchema,
  typeof HandleMenuFollowupOutputSchema
>(
  {
    name: 'handleMenuFollowupFlow',
    inputSchema: HandleMenuFollowupInputSchema,
    outputSchema: HandleMenuFollowupOutputSchema,
  },
  async (input) => {
    // Add simple logging for debugging
    console.log('handleMenuFollowupFlow input:', JSON.stringify(input, null, 2));

    const { output } = await prompt(input);

    // Add logging for the output
    console.log('handleMenuFollowupFlow output:', JSON.stringify(output, null, 2));

    if (!output) {
      // Handle potential null output from the prompt
      console.error('Error: Prompt returned null output.');
      // Return a default error response or throw an error
      return {
        responseMessage: "Xin lỗi bạn, có chút trục trặc nhỏ. Bạn thử lại sau nhé.",
        reasoning: "Lỗi hệ thống khi xử lý yêu cầu.",
        suggestedActions: ["Thử lại", "Bắt đầu lại"]
      };
    }

    // Ensure suggestedActions is always an array, even if the model fails
    if (!Array.isArray(output.suggestedActions)) {
        console.warn('Warning: suggestedActions was not an array, defaulting.');
        output.suggestedActions = ["Regenerate menu based on feedback", "Ask another question"];
    }

    return output;
  }
);
