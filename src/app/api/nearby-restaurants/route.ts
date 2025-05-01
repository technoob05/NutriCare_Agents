import { NextRequest, NextResponse } from 'next/server';
import { findNearbyRestaurants } from '@/services/openstreetmap';
import logger from '@/lib/logger'; // Corrected import based on previous fix

// Default search radius if not provided by the client
const DEFAULT_API_SEARCH_RADIUS = 1000; // 1km

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latParam = searchParams.get('lat');
  const lonParam = searchParams.get('lon');
  const queryParam = searchParams.get('query'); // e.g., "phở", "pizza", "vietnamese"
  const radiusParam = searchParams.get('radius');

  if (!latParam || !lonParam) {
    logger.warn('Missing latitude or longitude parameters for nearby restaurants API.');
    return NextResponse.json({ error: 'Missing required parameters: lat, lon' }, { status: 400 });
  }

  const lat = parseFloat(latParam);
  const lon = parseFloat(lonParam);
  const radius = radiusParam ? parseInt(radiusParam, 10) : DEFAULT_API_SEARCH_RADIUS;

  if (isNaN(lat) || isNaN(lon) || isNaN(radius)) {
     logger.warn(`Invalid numeric parameters received: lat=${latParam}, lon=${lonParam}, radius=${radiusParam}`);
    return NextResponse.json({ error: 'Invalid numeric parameters for lat, lon, or radius' }, { status: 400 });
  }

  try {
    logger.info(`API request for nearby restaurants: lat=${lat}, lon=${lon}, radius=${radius}, query=${queryParam || 'any'}`);
    const allRestaurants = await findNearbyRestaurants(lat, lon, radius);

    // Optional filtering based on the query parameter (case-insensitive)
    const filteredRestaurants = queryParam
      ? allRestaurants.filter(restaurant => {
          const queryLower = queryParam.toLowerCase();
          const nameMatch = restaurant.tags.name?.toLowerCase().includes(queryLower);
          const cuisineMatch = restaurant.tags.cuisine?.toLowerCase().includes(queryLower);
          // Add more tag checks if needed, e.g., description
          return nameMatch || cuisineMatch;
        })
      : allRestaurants;

    logger.info(`Returning ${filteredRestaurants.length} restaurants matching query "${queryParam || 'any'}".`);
    return NextResponse.json(filteredRestaurants);

  } catch (error) {
    logger.error('Error in nearby restaurants API:', error);
    return NextResponse.json({ error: 'Internal server error fetching restaurant data' }, { status: 500 });
  }
}
