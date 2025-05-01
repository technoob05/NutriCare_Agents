import * as cheerio from 'cheerio';
import logger from '@/lib/logger'; // Use default import
import { DuckDuckGoSearchResult } from '@/services/duckduckgo'; // Import the interface

// --- Configuration ---
const MAX_CONTEXT_LENGTH = 4000; // Max characters for the combined context
const MAX_SNIPPET_LENGTH = 500; // Max characters per fetched snippet
const FETCH_TIMEOUT = 5000; // 5 seconds timeout for fetching URL content

// --- Prioritized Domains (from user input) ---
const PRIORITIZED_DOMAINS = [
  // WHO
  'who.int',
  // UK FSA
  'food.gov.uk',
  'ratings.food.gov.uk',
  'gov.uk/government/organisations/food-standards-agency',
  // EU Food Safety (Commission, EFSA, RASFF, Portal)
  'food.ec.europa.eu',
  'ec.europa.eu', // Broader EC domain
  'efsa.europa.eu',
  'europa.eu', // Broader EU portal
  'commission.europa.eu',
];

// --- Interfaces ---
export interface Citation {
  source: string; // e.g., "WHO", "FSA", "EU EFSA", or hostname for others
  url: string;
  title: string;
}

export interface RAGResult {
  context: string; // Combined text snippets for the LLM
  citations: Citation[]; // List of sources used
}

// --- Helper Functions ---

/**
 * Extracts the domain name from a URL.
 * @param url The URL string.
 * @returns The domain name (e.g., 'who.int') or null if invalid.
 */
function getDomainName(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    // Remove 'www.' if present
    return parsedUrl.hostname.replace(/^www\./, '');
  } catch (e) {
    return null; // Invalid URL
  }
}

/**
 * Determines the source name based on the domain.
 * @param domain The domain name.
 * @returns A formatted source name (e.g., "WHO", "UK FSA").
 */
function getSourceName(domain: string): string {
  if (domain.includes('who.int')) return 'WHO';
  if (domain.includes('food.gov.uk') || domain.includes('ratings.food.gov.uk') || domain.includes('gov.uk/government/organisations/food-standards-agency')) return 'UK FSA';
  if (domain.includes('efsa.europa.eu')) return 'EU EFSA';
  if (domain.includes('food.ec.europa.eu') || domain.includes('ec.europa.eu') || domain.includes('commission.europa.eu') || domain.includes('europa.eu')) return 'EU Commission/Portal';
  // Fallback to capitalized domain name
  return domain.split('.')[0]?.toUpperCase() || domain;
}

/**
 * Fetches content from a URL and extracts text using Cheerio.
 * @param url The URL to fetch.
 * @returns The extracted text content or null if fetching/parsing fails.
 */
async function fetchAndExtractText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'NutriCareBot/1.0 (+https://your-app-url.com/bot-info)', // Be a good citizen
        'Accept': 'text/html',
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.warn(`[RAG] Failed to fetch ${url}: Status ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/html')) {
      logger.warn(`[RAG] Skipped non-HTML content at ${url}: ${contentType}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Basic text extraction (can be improved)
    // Remove script, style, nav, footer, header tags
    $('script, style, nav, footer, header, noscript, iframe, button, input, select, textarea, aside').remove();
    // Get text from common content tags, prioritizing main, article
    let text = $('main').text() || $('article').text() || $('body').text();

    // Basic cleanup
    text = text.replace(/\s\s+/g, ' ').replace(/\n+/g, '\n').trim();

    logger.info(`[RAG] Successfully extracted text from ${url} (Length: ${text.length})`);
    return text;

  } catch (error: any) {
    if (error.name === 'AbortError') {
      logger.warn(`[RAG] Fetch timed out for ${url}`);
    } else {
      logger.error(`[RAG] Error fetching/extracting ${url}:`, error);
    }
    return null;
  }
}

// --- Main RAG Function ---

/**
 * Performs Retrieval-Augmented Generation process.
 * Fetches content from search results, prioritizes sources, and prepares context for LLM.
 * @param query The original user query (for context).
 * @param searchResults Results from DuckDuckGo search.
 * @param maxResultsToProcess Max number of search results to attempt fetching. Defaults to 3.
 * @returns A promise resolving to the RAG context and citations.
 */
export async function performRAG(
  query: string,
  searchResults: DuckDuckGoSearchResult[],
  maxResultsToProcess: number = 3
): Promise<RAGResult> {
  logger.info(`[RAG] Starting RAG process for query: "${query}"`);
  const citations: Citation[] = [];
  let combinedContext = `Information related to "${query}":\n\n`;

  // Sort results: prioritized domains first
  const sortedResults = [...searchResults].sort((a, b) => {
    const domainA = getDomainName(a.link);
    const domainB = getDomainName(b.link);
    const isAPrioritized = domainA ? PRIORITIZED_DOMAINS.some(pd => domainA.includes(pd)) : false;
    const isBPrioritized = domainB ? PRIORITIZED_DOMAINS.some(pd => domainB.includes(pd)) : false;

    if (isAPrioritized && !isBPrioritized) return -1;
    if (!isAPrioritized && isBPrioritized) return 1;
    return 0; // Keep original order among same priority
  });

  let processedCount = 0;
  for (const result of sortedResults) {
    if (processedCount >= maxResultsToProcess) break;
    if (combinedContext.length >= MAX_CONTEXT_LENGTH) break; // Stop if context is full

    const domain = getDomainName(result.link);
    if (!domain) {
      logger.warn(`[RAG] Skipping invalid URL: ${result.link}`);
      continue;
    }

    logger.info(`[RAG] Processing result: ${result.title} (${result.link})`);
    const extractedText = await fetchAndExtractText(result.link);

    if (extractedText) {
      processedCount++;
      const sourceName = getSourceName(domain);
      const snippet = extractedText.substring(0, MAX_SNIPPET_LENGTH);
      const citation: Citation = {
        source: sourceName,
        url: result.link,
        title: result.title,
      };
      citations.push(citation);

      // Add to context, ensuring not to exceed max length
      const contextToAdd = `Source: ${sourceName} (${result.title})\nURL: ${result.link}\nContent Snippet:\n${snippet}\n\n---\n\n`;
      if (combinedContext.length + contextToAdd.length <= MAX_CONTEXT_LENGTH) {
        combinedContext += contextToAdd;
      } else {
        // Add partial content if possible
        const remainingSpace = MAX_CONTEXT_LENGTH - combinedContext.length;
        if (remainingSpace > 100) { // Only add if there's reasonable space
           combinedContext += contextToAdd.substring(0, remainingSpace - 4) + '...\n';
        }
        logger.warn(`[RAG] Context length limit reached. Stopping context addition.`);
        break; // Stop adding context
      }
    }
  }

  if (citations.length === 0) {
    logger.warn(`[RAG] No content could be fetched or extracted for query: "${query}"`);
    // Return empty context or a message indicating no web info found?
    // For now, return empty context. The LLM should handle this.
  }

  logger.info(`[RAG] Finished RAG process. Context length: ${combinedContext.length}, Citations: ${citations.length}`);
  return {
    context: combinedContext.trim(),
    citations: citations,
  };
}
