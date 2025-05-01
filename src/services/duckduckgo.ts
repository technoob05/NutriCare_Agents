import { search, SafeSearchType } from 'duck-duck-scrape'; // Import SafeSearchType if needed, or just use literals
import logger from '@/lib/logger'; // Use default import

export interface DuckDuckGoSearchResult {
  title: string;
  link: string;
  snippet: string;
}

/**
 * Performs a search using DuckDuckGo.
 * @param query The search query string.
 * @param maxResults The maximum number of results to return. Defaults to 5.
 * @returns A promise that resolves to an array of search results.
 */
export async function searchDuckDuckGo(query: string, maxResults: number = 5): Promise<DuckDuckGoSearchResult[]> {
  logger.info(`[DuckDuckGo Service] Searching for: "${query}" (max ${maxResults} results)`);
  try {
    // Use the correct type or literal for safeSearch
    const searchResults = await search(query, {
      safeSearch: SafeSearchType.MODERATE, // Use the correct uppercase enum value
      // No specific options needed for basic web search results
    });

    if (!searchResults || !searchResults.results) {
      logger.warn('[DuckDuckGo Service] No results found or unexpected format.');
      return [];
    }

    // Map to our desired format and limit results
    const formattedResults = searchResults.results
      .slice(0, maxResults) // Limit the number of results
      .map((result: any) => ({ // Use 'any' for now as the library's types might be complex
        title: result.title || '',
        link: result.url || '', // Library uses 'url'
        snippet: result.description || '', // Library uses 'description'
      }))
      .filter(result => result.link && result.title); // Ensure basic data exists

    logger.info(`[DuckDuckGo Service] Found ${formattedResults.length} results.`);
    return formattedResults;

  } catch (error: any) {
    logger.error('[DuckDuckGo Service] Error during search:', error);
    // Consider re-throwing or returning an empty array based on desired error handling
    return []; // Return empty array on error for now
  }
}
