import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import logger from '@/lib/logger';
import { geocodeAddress, GeocodeResult } from '@/services/openstreetmap';
// Import both functions and the helper from the AI flow
import { suggestFoodByWeather, getWeatherExplanation, getWeatherDescription } from '@/ai/flows/suggest-food-by-weather';
import { ApiRecommendationItem } from '@/components/chat-mobi/RecommendedFoodItem';


interface RequestBody {
  location: {
    lat?: number;
    lng?: number; // Accept lng from client
    address?: string;
  };
  foodItems: ApiRecommendationItem[]; // Changed type to ApiRecommendationItem[]
}

interface WeatherData {
  temperature: number;
  conditionCode: number;
  conditionText?: string;
}

// Open-Meteo API URL
const OPEN_METEO_API_URL = 'https://api.open-meteo.com/v1/forecast';

async function fetchWeatherData(lat: number, lon: number): Promise<WeatherData | null> {
  // Construct the URL for Open-Meteo API
  // Requesting current temperature and weather code
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: 'temperature_2m,weathercode', // Request current hour's data
    current: 'temperature_2m,weathercode', // More robust way to get current weather
    timezone: 'Asia/Ho_Chi_Minh', // As per user's example
    forecast_days: '1', // Only need current day
  });
  const url = `${OPEN_METEO_API_URL}?${params.toString()}`;

  logger.info(`Fetching weather data from Open-Meteo: ${url}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Open-Meteo API error: ${response.status} ${response.statusText} - ${errorText}`);
      return null;
    }
    const data = await response.json();

    // Extract current weather data
    // The 'current' object is usually more reliable for immediate weather
    if (data.current && typeof data.current.temperature_2m === 'number' && typeof data.current.weathercode === 'number') {
      return {
        temperature: data.current.temperature_2m,
        conditionCode: data.current.weathercode,
      };
    } else if (data.hourly && data.hourly.temperature_2m && data.hourly.weathercode) {
       // Fallback to the first hour if 'current' is not available or malformed
      const now = new Date();
      const currentHour = now.getHours(); // Get current hour (0-23)
      
      // Find the index corresponding to the current hour in the hourly data
      // The API returns hourly data starting from 00:00 of the current day.
      // We need to find the entry for the current hour.
      // Note: This assumes the API returns data for the current day.
      // A more robust solution might involve checking `data.hourly.time` array.
      // For simplicity, we'll use currentHour as an index if time array matches typical 24h format.
      let hourIndex = currentHour;
      if (data.hourly.time && Array.isArray(data.hourly.time)) {
        const currentTimeISO = now.toISOString().substring(0, 13); // e.g., "2023-10-27T10"
        const foundIndex = data.hourly.time.findIndex((t: string) => t.startsWith(currentTimeISO));
        if (foundIndex !== -1) {
          hourIndex = foundIndex;
        } else {
            logger.warn("Could not precisely match current hour in Open-Meteo hourly data, using current local hour as index fallback.");
        }
      }


      if (data.hourly.temperature_2m[hourIndex] !== undefined && data.hourly.weathercode[hourIndex] !== undefined) {
        return {
          temperature: data.hourly.temperature_2m[hourIndex],
          conditionCode: data.hourly.weathercode[hourIndex],
        };
      }
    }
    logger.error("Open-Meteo response missing expected current or hourly weather data fields.", data);
    return null;
  } catch (error) {
    logger.error("Error fetching or processing weather data:", error);
    return null;
  }
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as RequestBody;
    const { location, foodItems } = body;

    if (!location || !foodItems) {
      return NextResponse.json({ error: "Missing location or foodItems in request body" }, { status: 400 });
    }
    if (!Array.isArray(foodItems) || foodItems.length === 0) {
        return NextResponse.json({ error: "foodItems must be a non-empty array" }, { status: 400 });
    }


    let lat: number | undefined = location.lat;
    let lon: number | undefined = location.lng; // Use lng from client

    if (!lat || !lon) {
      if (location.address) {
        logger.info(`Geocoding address for weather suggestions: "${location.address}"`);
        const geocodeResult: GeocodeResult | null = await geocodeAddress(location.address);
        if (geocodeResult) {
          lat = geocodeResult.lat;
          lon = geocodeResult.lon; // Nominatim returns 'lon'
        } else {
          return NextResponse.json({ error: "Failed to geocode address" }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: "Missing lat/lng or address in location object" }, { status: 400 });
      }
    }

    if (lat === undefined || lon === undefined) {
        // This case should ideally not be reached if logic above is correct
        return NextResponse.json({ error: "Could not determine location coordinates." }, { status: 500 });
    }

    const weatherData = await fetchWeatherData(lat, lon);
    if (!weatherData) {
      return NextResponse.json({ error: "Failed to fetch weather data" }, { status: 500 });
    }

    logger.info("Calling suggestFoodByWeather AI flow.", { weatherData: weatherData, foodItemsCount: foodItems.length });
    const recommendations: ApiRecommendationItem[] = await suggestFoodByWeather(weatherData, foodItems);

    // Even if recommendations fail, try to get an explanation based on weather
    logger.info("Calling getWeatherExplanation AI flow.", { weatherData });
    const explanation: string = await getWeatherExplanation(weatherData);

    // Add weather description to weatherData object before returning
    const weatherDescription = (weatherData as any).conditionText || getWeatherDescription(weatherData.conditionCode); // Reuse helper if needed
    const fullWeatherData = { ...weatherData, description: weatherDescription };


    if (!recommendations || recommendations.length === 0) {
        logger.warn("AI flow returned no recommendations or an empty array.");
        // Return explanation even if no recommendations
        return NextResponse.json({
            weatherData: fullWeatherData,
            explanation: explanation || "Không thể tạo giải thích thời tiết.", // Provide fallback explanation
            recommendations: [],
            message: "Could not retrieve food suggestions at this time. Please try again later or check system configuration."
        }, { status: 200 });
    }

    // Return weather, explanation, and recommendations
    return NextResponse.json({ weatherData: fullWeatherData, explanation, recommendations }, { status: 200 });

  } catch (error: any) {
    logger.error("Error in /api/weather-food-suggestions:", {
      errorMessage: error.message,
      errorStack: error.stack,
      // requestBody: await request.text(), // Be cautious logging raw request if it's large or sensitive
    });
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
  }
}
