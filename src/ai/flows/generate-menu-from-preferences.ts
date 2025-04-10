// src/ai/flows/generate-menu-from-preferences.ts
'use server';
/**
 * @fileOverview Generates a personalized Vietnamese menu based on user preferences.
 *
 * - generateMenuFromPreferences - A function that generates a menu based on preferences.
 * - GenerateMenuFromPreferencesInput - The input type for the generateMenuFromPreferences function.
 * - GenerateMenuFromPreferencesOutput - The return type for the generateMenuFromPreferences function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import {googleSearch, SearchResult} from '@/services/google-search';

const GenerateMenuFromPreferencesInputSchema = z.object({
  preferences: z
    .string()
    .describe(
      'The user preferences for the menu, including dietary restrictions, preferred dishes, and meal frequency.'
    ),
  menuType: z.enum(['daily', 'weekly']).describe('The type of menu to generate (daily or weekly).'),
});
export type GenerateMenuFromPreferencesInput = z.infer<typeof GenerateMenuFromPreferencesInputSchema>;

const MenuItemSchema = z.object({
  name: z.string().describe('The name of the dish.'),
  ingredients: z.array(z.string()).describe('The list of ingredients for the dish.'),
  preparation: z.string().describe('The preparation instructions for the dish.'),
  estimatedCost: z.string().describe('The estimated cost of the dish.'),
});

const GenerateMenuFromPreferencesOutputSchema = z.object({
  menu: z.record(z.string(), z.array(MenuItemSchema)).describe('The generated menu.'),
  feedbackRequest: z
    .string()
    .optional()
    .describe('A request for feedback on the generated menu.'),
});
export type GenerateMenuFromPreferencesOutput = z.infer<typeof GenerateMenuFromPreferencesOutputSchema>;

export async function generateMenuFromPreferences(
  input: GenerateMenuFromPreferencesInput
): Promise<GenerateMenuFromPreferencesOutput> {
  return generateMenuFromPreferencesFlow(input);
}

const searchRecipes = ai.defineTool({
  name: 'searchRecipes',
  description: 'Searches for Vietnamese recipes based on dietary preferences.',
  inputSchema: z.object({
    query: z.string().describe('The search query for Vietnamese recipes.'),
  }),
  outputSchema: z.array(z.object({
    title: z.string(),
    url: z.string(),
    snippet: z.string(),
  })),
  async fn(input) {
    return await googleSearch(input.query);
  },
});

const prompt = ai.definePrompt({
  name: 'generateMenuFromPreferencesPrompt',
  input: {
    schema: z.object({
      preferences: z
        .string()
        .describe(
          'The user preferences for the menu, including dietary restrictions, preferred dishes, and meal frequency.'
        ),
      menuType: z.enum(['daily', 'weekly']).describe('The type of menu to generate (daily or weekly).'),
      searchResults: z.array(z.object({
        title: z.string(),
        url: z.string(),
        snippet: z.string(),
      })).optional().describe('Search results for recipes based on user preferences.'),
    }),
  },
  output: {
    schema: z.object({
      menu: z.record(z.string(), z.array(MenuItemSchema)).describe('The generated menu.'),
      feedbackRequest: z
        .string()
        .optional()
        .describe('A request for feedback on the generated menu.'),
    }),
  },
  prompt: `You are a Vietnamese cuisine expert.  Generate a {{{menuType}}} menu based on the following preferences: {{{preferences}}}.

Include the following search results to provide grounding for your recommendations:
{{#each searchResults}}
Title: {{{title}}}
URL: {{{url}}}
Snippet: {{{snippet}}}
{{/each}}

Format the menu as a JSON object.  For each meal (breakfast, lunch, dinner, etc), include a list of dishes with their names, ingredients, preparation instructions, and estimated cost.
Also include a request for feedback on the generated menu.
`,
  tools: [searchRecipes],
});

const generateMenuFromPreferencesFlow = ai.defineFlow<
  typeof GenerateMenuFromPreferencesInputSchema,
  typeof GenerateMenuFromPreferencesOutputSchema
>(
  {
    name: 'generateMenuFromPreferencesFlow',
    inputSchema: GenerateMenuFromPreferencesInputSchema,
    outputSchema: GenerateMenuFromPreferencesOutputSchema,
  },
  async input => {
    const searchResult = await searchRecipes({
      query: `Vietnamese recipes ${input.preferences}`,
    });

    const {output} = await prompt({
      ...input,
      searchResults: searchResult,
    });
    return output!;
  }
);
