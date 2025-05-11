import { NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { suggestFoodByEmotion, getEmotionBasedExplanation } from '@/ai/flows/suggest-food-by-emotion';
import { ApiRecommendationItem } from '@/components/chat-mobi/RecommendedFoodItem';

export async function POST(request: Request) {
  logger.info("Received request for emotion-based food suggestions.");
  try {
    const body = await request.json();
    const { imageBase64, foodItemsFromLocalStorage } = body;

    if (!imageBase64) {
      logger.warn("Missing imageBase64 in request body for emotion food suggestions.");
      return NextResponse.json({ error: "Missing imageBase64" }, { status: 400 });
    }
    if (!foodItemsFromLocalStorage || !Array.isArray(foodItemsFromLocalStorage)) {
      logger.warn("Missing or invalid foodItemsFromLocalStorage in request body for emotion food suggestions.");
      return NextResponse.json({ error: "Missing or invalid foodItemsFromLocalStorage" }, { status: 400 });
    }

    logger.info("Calling suggestFoodByEmotion flow...");
    const { suggestions, detectedEmotion, foodCharacteristics } = await suggestFoodByEmotion(imageBase64, foodItemsFromLocalStorage);

    let explanation = "Dựa trên cảm xúc của bạn, đây là một số gợi ý món ăn."; // Default explanation
    if (suggestions.length > 0 && detectedEmotion && foodCharacteristics) {
      explanation = await getEmotionBasedExplanation(detectedEmotion, foodCharacteristics);
      logger.info("Generated explanation for emotion-based suggestions using detected emotion and characteristics.");
    } else if (suggestions.length > 0) {
      // Fallback if emotion/characteristics are not available for some reason
      const fallbackEmotion = "hiện tại";
      const fallbackChars = "phù hợp";
      explanation = await getEmotionBasedExplanation(fallbackEmotion, fallbackChars);
      logger.warn("Used fallback for generating emotion-based explanation as detected emotion/characteristics were not fully available.");
    }


    logger.info(`Returning ${suggestions.length} emotion-based food suggestions for emotion: ${detectedEmotion}.`);
    // Include detectedEmotion in the response
    return NextResponse.json({ suggestions, explanation, detectedEmotion });

  } catch (error: any) {
    logger.error("Error in POST /api/emotion-food-suggestions:", {
      errorMessage: error.message,
      errorStack: error.stack,
      errorDetails: error.cause, // For more detailed error info if available
    });
    return NextResponse.json({ error: "Internal server error while suggesting food by emotion." }, { status: 500 });
  }
}
