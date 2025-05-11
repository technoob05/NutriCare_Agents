import logger from '@/lib/logger';

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
// Define a default radius in meters (e.g., 1km)
const DEFAULT_SEARCH_RADIUS = 1000;

export interface OsmRestaurant { // <-- Add export keyword
  id: number;
  lat: number;
  lon: number;
  tags: {
    [key: string]: string | undefined; // Allow undefined for optional tags
    name?: string;
    cuisine?: string;
    opening_hours?: string;
    phone?: string;
    website?: string;
    addr_street?: string;
    addr_housenumber?: string;
    addr_city?: string;
    addr_postcode?: string;
  };
}

interface OverpassResponse {
  elements: Array<{
    type: 'node' | 'way' | 'relation';
    id: number;
    lat?: number; // Available for nodes
    lon?: number; // Available for nodes
    center?: { lat: number; lon: number }; // Available for ways/relations
    tags?: { [key: string]: string };
  }>;
}

/**
 * Finds nearby restaurants using the OpenStreetMap Overpass API.
 *
 * @param lat User's latitude.
 * @param lon User's longitude.
 * @param radius Search radius in meters (defaults to DEFAULT_SEARCH_RADIUS).
 * @returns A promise that resolves to an array of nearby restaurant objects.
 */
export async function findNearbyRestaurants(
  lat: number,
  lon: number,
  radius: number = DEFAULT_SEARCH_RADIUS
): Promise<OsmRestaurant[]> {
  // Construct the Overpass QL query
  // This query looks for nodes, ways, and relations tagged as restaurants
  // within the specified radius around the given coordinates.
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="restaurant"](around:${radius},${lat},${lon});
      way["amenity"="restaurant"](around:${radius},${lat},${lon});
      relation["amenity"="restaurant"](around:${radius},${lat},${lon});
    );
    out center; // 'center' provides coordinates for ways/relations
  `;

  logger.info(`Executing Overpass query for restaurants near (${lat}, ${lon}), radius ${radius}m`);

  try {
    const response = await fetch(OVERPASS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Overpass API error: ${response.status} ${response.statusText} - ${errorText}`);
      throw new Error(`Overpass API request failed with status ${response.status}`);
    }

    const data: OverpassResponse = await response.json();
    logger.info(`Received ${data.elements.length} elements from Overpass API.`);

    // Process the results
    const restaurants: OsmRestaurant[] = data.elements
      .filter(element => element.tags && (element.lat || element.center)) // Ensure element has tags and coordinates
      .map(element => {
        const coords = element.type === 'node'
          ? { lat: element.lat!, lon: element.lon! }
          : { lat: element.center!.lat, lon: element.center!.lon }; // Use center for ways/relations

        return {
          id: element.id,
          lat: coords.lat,
          lon: coords.lon,
          tags: element.tags || {}, // Ensure tags object exists
        };
      });

    logger.info(`Found ${restaurants.length} restaurants.`);
    return restaurants;

  } catch (error) {
    logger.error('Error fetching or processing data from Overpass API:', error);
    // Depending on requirements, could return empty array or re-throw
    return [];
  }
}

// Example usage (optional, for testing)
/*
async function test() {
  // Example coordinates (e.g., somewhere in Ho Chi Minh City)
  const lat = 10.7769;
  const lon = 106.7009;
  console.log(`Searching for restaurants near ${lat}, ${lon}`);
  const results = await findNearbyRestaurants(lat, lon, 1000); // 1km radius
  console.log(`Found ${results.length} restaurants:`);
  results.forEach(r => {
    console.log(`- ${r.tags.name || 'Unnamed Restaurant'} (ID: ${r.id}) at ${r.lat}, ${r.lon}`);
    if (r.tags.cuisine) console.log(`  Cuisine: ${r.tags.cuisine}`);
  });
}

// test(); // Uncomment to run test when executing this file directly
*/

const NOMINATIM_API_URL = 'https://nominatim.openstreetmap.org/search';

export interface GeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
}

/**
 * Geocodes an address string to latitude and longitude using Nominatim API.
 *
 * @param address The address string to geocode (e.g., "Hanoi, Vietnam").
 * @returns A promise that resolves to a GeocodeResult object or null if not found.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    q: address,
    format: 'json',
    limit: '1', // We only need the top result
    addressdetails: '1', // Include address details for better display name
    // Consider adding 'accept-language': 'vi,en' if you want to influence language of results
  });

  const url = `${NOMINATIM_API_URL}?${params.toString()}`;
  logger.info(`Geocoding address: "${address}" using Nominatim: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'NutriCareApp/1.0 (contact@example.com)', // Good practice to set a User-Agent
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Nominatim API error: ${response.status} ${response.statusText} - ${errorText}`);
      throw new Error(`Nominatim API request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const topResult = data[0];
      const result: GeocodeResult = {
        lat: parseFloat(topResult.lat),
        lon: parseFloat(topResult.lon),
        displayName: topResult.display_name,
      };
      logger.info(`Geocoded "${address}" to: ${result.displayName} (${result.lat}, ${result.lon})`);
      return result;
    } else {
      logger.warn(`No geocoding results found for address: "${address}"`);
      return null;
    }
  } catch (error) {
    logger.error('Error fetching or processing data from Nominatim API:', error);
    return null;
  }
}

// Example usage for geocodeAddress (optional, for testing)
/*
async function testGeocode() {
  const addressToTest = "Hồ Hoàn Kiếm, Hà Nội";
  console.log(`Geocoding: "${addressToTest}"`);
  const result = await geocodeAddress(addressToTest);
  if (result) {
    console.log("Geocoding Result:", result);
  } else {
    console.log("Geocoding failed or no results.");
  }

  const addressToTest2 = "1600 Amphitheatre Parkway, Mountain View, CA";
   console.log(`Geocoding: "${addressToTest2}"`);
  const result2 = await geocodeAddress(addressToTest2);
  if (result2) {
    console.log("Geocoding Result 2:", result2);
  } else {
    console.log("Geocoding failed or no results for address 2.");
  }
}
// testGeocode();
*/
