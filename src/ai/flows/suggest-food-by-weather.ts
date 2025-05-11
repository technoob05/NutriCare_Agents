import { GoogleGenerativeAI } from "@google/generative-ai";
import { HarmCategory, HarmBlockThreshold } from "@google/generative-ai"; // Assuming these are correctly typed/exported
import logger from '@/lib/logger';
import { ApiRecommendationItem } from '@/components/chat-mobi/RecommendedFoodItem';

// Assume GEMINI_API_KEY is available as an environment variable
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  logger.warn("GEMINI_API_KEY is not set. Food suggestion by weather will not work.");
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// No longer need InputFoodItem, we expect ApiRecommendationItem directly from localStorage

interface WeatherData {
  temperature: number; // Celsius
  conditionCode: number; // Open-Meteo WMO Weather interpretation codes
  // Potentially add a textual description of the weather condition if available
  conditionText?: string;
}

// Helper to map WMO codes to descriptive text (simplified)
// Refer to: https://open-meteo.com/en/docs#weathervariables
export function getWeatherDescription(code: number): string { // Added export
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code >= 45 && code <= 48) return "Foggy";
  if (code >= 51 && code <= 55) return "Drizzly";
  if (code >= 56 && code <= 57) return "Freezing Drizzle";
  if (code >= 61 && code <= 65) return "Rainy";
  if (code >= 66 && code <= 67) return "Freezing Rain";
  if (code >= 71 && code <= 75) return "Snowy";
  if (code === 77) return "Snow grains";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95 && code <= 99) return "Thunderstorm"; // Includes slight/moderate/heavy
  // Default return for unhandled codes
  logger.warn(`Unknown weather code received: ${code}`); // Ensuring this line is pristine with standard backticks
  return "Unknown weather condition";
}

export async function suggestFoodByWeather(
  weather: WeatherData,
  // Expect items directly matching the structure stored in localStorage, which should be ApiRecommendationItem
  foodItemsFromLocalStorage: ApiRecommendationItem[]
): Promise<ApiRecommendationItem[]> {
  logger.info("Entering suggestFoodByWeather function."); // Log entry

  if (!genAI) {
    logger.error("Gemini AI SDK (genAI object) is null or undefined, likely due to missing API key.");
    return [];
  }
  logger.info("genAI object seems valid."); // Log after genAI check

  if (!foodItemsFromLocalStorage || foodItemsFromLocalStorage.length === 0) {
    logger.warn("No food items provided from localStorage to suggestFoodByWeather.");
    return [];
  }

  let model;
  try {
    logger.info("Attempting to get Gemini model (gemini-1.5-flash-latest)...");
    model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    logger.info("Successfully got Gemini model.");
  } catch (modelError: any) {
    logger.error("Error getting Gemini model:", {
      errorMessage: modelError.message,
      errorStack: modelError.stack,
    });
    return []; // Cannot proceed without a model
  }

  const weatherDescription = weather.conditionText || getWeatherDescription(weather.conditionCode);

  let foodListString = "";
  try {
    logger.info("Starting to map food items from localStorage for prompt...");
    foodListString = foodItemsFromLocalStorage
      .filter((food, index) => {
        // Add filtering for essential data needed for the prompt
        if (!food || typeof food.name !== 'string' || !food.name) {
          logger.warn(`Skipping food item at index ${index} due to missing or invalid name.`, food);
          return false;
        }
        // Add checks for other essential fields if necessary (e.g., ingredients)
        return true;
      })
      .map((food, index) => {
        // Log structure of the first valid item being processed for debugging
        if (index === 0) {
            logger.debug("Processing first valid food item from localStorage:", food);
        }

        // Provide a minimal set of info for the LLM to make a selection.
        // The 'name' will be used to retrieve the full object later.
        return `
Item Name: ${food.name}
Description: ${food.description || 'N/A'}
Categories: ${food.categories || 'N/A'}
Vegan: ${food.vegan !== undefined ? String(food.vegan) : 'N/A'}
`;
      }).join("\n\n");
    logger.info("Successfully mapped food items for prompt.");
  } catch (mapError: any) {
    logger.error("Error occurred while mapping food items for prompt:", {
      errorMessage: mapError.message,
      errorStack: mapError.stack,
    });
    // Return empty array as we cannot proceed without a valid prompt section
    return [];
  }

  // Check if foodListString is empty after filtering/mapping
  if (!foodListString) {
    logger.warn("foodListString is empty after mapping/filtering, cannot generate prompt.");
    return [];
  }

  const prompt = `You are a helpful AI assistant specializing in Vietnamese cuisine and nutrition.
The current weather is: ${weather.temperature}°C, ${weatherDescription}.

Given the following list of Vietnamese food items, select up to 10 items that are most suitable for this weather.
For each selected food, provide its exact "name" (string), a "score" (0-100 indicating suitability for the weather), and a brief "selectionReasoning" (string, in Vietnamese, explaining why it's suitable for the current weather conditions).

Return a JSON array of objects, like this:
[
  { "name": "Exact Name of Food 1", "score": 90, "selectionReasoning": "Lý do chọn món 1 hợp với thời tiết..." },
  { "name": "Exact Name of Food 2", "score": 85, "selectionReasoning": "Lý do chọn món 2 hợp với thời tiết..." }
]

Available Food items list:
${foodListString}

Ensure the output is ONLY the JSON array, without any surrounding text or markdown.`;

  logger.info({
    message: "Calling Gemini for weather-based food suggestions.",
    weather,
    foodItemsCount: foodItemsFromLocalStorage.length,
    // promptLength: prompt.length // Avoid logging potentially large prompt length unless needed
  });

  try {
    logger.info("Preparing generation config and safety settings for Gemini.");
    const generationConfig = {
      // temperature: 0.7, // Adjust as needed for creativity vs. determinism
      // topK: 1,
      // topP: 1,
      // maxOutputTokens: 8192, // Increased if necessary for large lists
      responseMimeType: "application/json",
    };
    const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{text: prompt}] }],
        generationConfig,
        safetySettings,
    });
    
    logger.info("Received response from Gemini.");
    const responseText = result.response.text();
    // Log only a snippet of the response text for debugging, avoid logging potentially huge responses entirely
    logger.debug("Gemini raw response text (snippet):", responseText.substring(0, 500) + (responseText.length > 500 ? "..." : ""));

    logger.info("Attempting to parse Gemini response text as JSON for weather suggestions.");
    const llmSelections: { name: string; score: number; selectionReasoning: string }[] = JSON.parse(responseText);
    logger.info("Successfully parsed Gemini response for weather suggestions.");

    const finalSuggestions: ApiRecommendationItem[] = [];
    if (Array.isArray(llmSelections)) {
      llmSelections.forEach(selection => {
        const originalItem = foodItemsFromLocalStorage.find(item => item.name === selection.name);
        if (originalItem) {
          finalSuggestions.push({
            ...originalItem, // Spread all original fields
            score: selection.score, // Override score with LLM's contextual score
            selectionReasoning: selection.selectionReasoning, // Add LLM's reasoning
          });
        } else {
          logger.warn(`Could not find original item for name: ${selection.name} in foodItemsFromLocalStorage for weather suggestions.`);
        }
      });
      // Sort by score and take top 10
      finalSuggestions.sort((a, b) => (b.score || 0) - (a.score || 0));
      return finalSuggestions.slice(0, 10);
    } else {
      logger.warn("Gemini response for weather suggestions is not a valid array or is empty. Returning empty array.", llmSelections);
      return [];
    }

  } catch (error: any) {
    logger.error("Error calling Gemini API or parsing response in suggestFoodByWeather:", {
      errorMessage: error.message,
      errorStack: error.stack,
    });
    // Fallback to returning an empty array on error, as per previous logic for critical errors.
    // A more sophisticated fallback (like returning a few random items) could be implemented if desired.
    return [];
  }
}

// --- Function to get weather-based explanation ---

export async function getWeatherExplanation(weather: WeatherData): Promise<string> {
  if (!genAI) {
    logger.error("Gemini AI SDK not initialized for getWeatherExplanation.");
    return "Xin lỗi, tôi không thể tạo giải thích thời tiết lúc này.";
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Use the same or a faster model if preferred
  const weatherDescription = weather.conditionText || getWeatherDescription(weather.conditionCode);

  // Reconstruct the prompt string carefully
  const prompt = `The current weather is ${weather.temperature}°C, ${weatherDescription}. Briefly explain (1-2 sentences in Vietnamese) the general type of food suitable for this weather (e.g., refreshing dishes for hot weather, warm soups for cold/rainy weather). Focus on the feeling or type of food, not specific dishes.`;

  logger.info("Calling Gemini for weather explanation.", { weather });

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    logger.info("Received weather explanation from Gemini.");
    return responseText.trim();
  } catch (error: any) {
    logger.error("Error calling Gemini API for weather explanation:", {
      errorMessage: error.message,
      errorStack: error.stack,
    });
    return "Xin lỗi, đã có lỗi khi tạo giải thích thời tiết."; // Fallback explanation
  }
}
