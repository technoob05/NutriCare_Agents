import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import logger from '@/lib/logger';
import { ApiRecommendationItem } from '@/components/chat-mobi/RecommendedFoodItem';

// Error handling types
enum FoodSuggestionError {
  INVALID_INPUT = 'INVALID_INPUT',
  API_ERROR = 'API_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}

interface ErrorDetails {
  code: FoodSuggestionError;
  message: string;
  details?: any;
}

// Input management configuration
const INPUT_CONFIG = {
  maxItems: 50,      // Maximum number of food items to process
  chunkSize: 25,     // Items per chunk for API calls
  maxRetries: 3,     // Maximum retry attempts
  baseDelay: 1000,   // Base delay for exponential backoff (ms)
} as const;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  logger.warn("GEMINI_API_KEY is not set. Food suggestion by emotion will not work.");
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

const generationConfig = {
  temperature: 0.7,
  maxOutputTokens: 1000,
  responseMimeType: "application/json",
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// Helper functions
function base64ToGenerativePart(imageB64: string, mimeType: string) {
  return {
    inlineData: {
      data: imageB64.split(',')[1],
      mimeType,
    },
  };
}

async function retryWithExponentialBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts: number = INPUT_CONFIG.maxRetries,
  baseDelay: number = INPUT_CONFIG.baseDelay
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      const isLastAttempt = attempt === maxAttempts;
      logger.warn(`Attempt ${attempt}/${maxAttempts} failed:`, {
        error: error.message,
        attempt,
        maxAttempts,
        isLastAttempt
      });

      if (isLastAttempt) throw error;
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Retry operation failed');
}

function filterAndChunkFoodItems(items: ApiRecommendationItem[], limit: number = INPUT_CONFIG.maxItems): ApiRecommendationItem[][] {
  // Filter invalid items
  const validItems = items.filter(food => food && typeof food.name === 'string' && food.name);
  
  // Sort by relevance (can be enhanced with more sophisticated matching)
  const sortedItems = validItems.slice(0, limit);
  
  // Split into chunks
  const chunks: ApiRecommendationItem[][] = [];
  for (let i = 0; i < sortedItems.length; i += INPUT_CONFIG.chunkSize) {
    chunks.push(sortedItems.slice(i, i + INPUT_CONFIG.chunkSize));
  }
  
  return chunks;
}

export async function suggestFoodByEmotion(
  imageBase64: string,
  foodItemsFromLocalStorage: ApiRecommendationItem[]
): Promise<{
  suggestions: ApiRecommendationItem[];
  detectedEmotion: string;
  foodCharacteristics: string;
  error?: ErrorDetails;
}> {
  logger.info("Entering suggestFoodByEmotion function.");

  const defaultReturn = {
    suggestions: [],
    detectedEmotion: "neutral",
    foodCharacteristics: "phù hợp với tâm trạng hiện tại"
  };

  // Validate inputs
  if (!genAI) {
    const error = {
      code: FoodSuggestionError.API_ERROR,
      message: "AI service not initialized"
    };
    logger.error("Gemini AI SDK not initialized", error);
    return { ...defaultReturn, error };
  }

  if (!foodItemsFromLocalStorage?.length) {
    const error = {
      code: FoodSuggestionError.INVALID_INPUT,
      message: "No food items provided"
    };
    logger.warn("No food items provided from localStorage", error);
    return { ...defaultReturn, error };
  }

  if (!imageBase64) {
    const error = {
      code: FoodSuggestionError.INVALID_INPUT,
      message: "No image data provided"
    };
    logger.warn("No image data provided", error);
    return { ...defaultReturn, error };
  }

  try {
    // Initialize models
    const visionModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const textModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Step 1: Detect Emotion with retry
    const imagePart = base64ToGenerativePart(imageBase64, "image/jpeg");
    const emotionPrompt = "Analyze this image and return ONLY the primary emotion as a single lowercase word (e.g., happy, sad, angry, surprised, neutral).";
    
    const emotionResult = await retryWithExponentialBackoff(async () => {
      return await visionModel.generateContent({
        contents: [{ role: "user", parts: [imagePart, { text: emotionPrompt }] }],
        safetySettings,
      });
    });

    const detectedEmotion = emotionResult.response.text().trim().toLowerCase() || defaultReturn.detectedEmotion;
    logger.info(`Detected emotion: ${detectedEmotion}`);

    // Step 2: Generate Food Characteristics with retry
    const characteristicsPrompt = `Một người đang cảm thấy ${detectedEmotion}. Hãy liệt kê 3-5 đặc điểm của món ăn phù hợp bằng tiếng Việt, cách nhau bằng dấu phẩy.`;
    
    const characteristicsResult = await retryWithExponentialBackoff(async () => {
      return await textModel.generateContent({
        contents: [{ role: "user", parts: [{ text: characteristicsPrompt }] }],
        safetySettings,
      });
    });

    const foodCharacteristics = characteristicsResult.response.text().trim() || defaultReturn.foodCharacteristics;
    logger.info(`Generated food characteristics: ${foodCharacteristics}`);

    // Step 3: Process food items in chunks
    const chunks = filterAndChunkFoodItems(foodItemsFromLocalStorage);
    let allSuggestions: ApiRecommendationItem[] = [];

    for (const chunk of chunks) {
      const chunkString = chunk
        .map((food, index) => {
          // Provide a minimal set of info for the LLM to make a selection.
          // The 'index' or 'name' will be used to retrieve the full object later.
          // We can use the original index from foodItemsFromLocalStorage if items are not significantly reordered by filterAndChunkFoodItems
          // Or, ensure names are unique enough for matching. For simplicity, let's use name.
          return `
Item Name: ${food.name}
Description: ${food.description || 'N/A'}
Categories: ${food.categories || 'N/A'}
`;
        })
        .join("\n");

      const selectionPrompt = `
Based on the emotion '${detectedEmotion}' and characteristics '${foodCharacteristics}', select up to 5 most suitable foods from the list below.
For each selected food, provide its exact "name" (string), a "score" (0-100 indicating suitability for the emotion), and a brief "selectionReasoning" (string, in Vietnamese, explaining why it's suitable).

Return a JSON array of objects, like this:
[
  { "name": "Exact Name of Food 1", "score": 90, "selectionReasoning": "Lý do chọn món 1..." },
  { "name": "Exact Name of Food 2", "score": 85, "selectionReasoning": "Lý do chọn món 2..." }
]

Available Foods:
${chunkString}
`;

      try {
        const result = await retryWithExponentialBackoff(async () => {
          return await textModel.generateContent({
            contents: [{ role: "user", parts: [{ text: selectionPrompt }] }],
            generationConfig,
            safetySettings,
          });
        });

        const text = result.response.text().trim();
        const cleanedText = text.replace(/```json\s*|\s*```/g, '').trim();
        logger.debug("LLM response for emotion food selection:", cleanedText);
        const llmSelections: { name: string; score: number; selectionReasoning: string }[] = JSON.parse(cleanedText);

        if (Array.isArray(llmSelections)) {
          llmSelections.forEach(selection => {
            const originalItem = foodItemsFromLocalStorage.find(item => item.name === selection.name);
            if (originalItem) {
              allSuggestions.push({
                ...originalItem, // Spread all original fields
                score: selection.score, // Override score with LLM's contextual score
                selectionReasoning: selection.selectionReasoning, // Add LLM's reasoning
              });
            } else {
              logger.warn(`Could not find original item for name: ${selection.name} in foodItemsFromLocalStorage`);
            }
          });
        }
      } catch (error: any) {
        logger.error("Error processing chunk or parsing LLM response for emotion food selection:", { error, chunkSize: chunk.length });
        continue; // Continue with next chunk if one fails
      }
    }

    // Sort by score and take top 10
    allSuggestions.sort((a, b) => (b.score || 0) - (a.score || 0));
    const finalSuggestions = allSuggestions.slice(0, 10);

    return {
      suggestions: finalSuggestions,
      detectedEmotion,
      foodCharacteristics,
    };

  } catch (error: any) {
    logger.error("Error in suggestFoodByEmotion:", {
      errorMessage: error.message,
      errorStack: error.stack,
    });

    return {
      ...defaultReturn,
      error: {
        code: FoodSuggestionError.API_ERROR,
        message: "Error processing food suggestions",
        details: error.message
      }
    };
  }
}

export async function getEmotionBasedExplanation(emotion: string, characteristics: string): Promise<string> {
  if (!genAI) {
    return "Xin lỗi, tôi không thể tạo giải thích dựa trên cảm xúc lúc này.";
  }

  try {
    const textModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `Người dùng đang cảm thấy ${emotion}. Dựa vào điều này, chúng tôi gợi ý những món ăn ${characteristics}. Hãy giải thích ngắn gọn, đồng cảm (1-2 câu) tại sao những món ăn này phù hợp với cảm xúc của họ.`;

    const result = await retryWithExponentialBackoff(async () => {
      return await textModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        safetySettings,
      });
    });

    return result.response.text().trim();
  } catch (error: any) {
    logger.error("Error in getEmotionBasedExplanation:", error);
    return "Xin lỗi, đã có lỗi khi tạo giải thích dựa trên cảm xúc.";
  }
}
