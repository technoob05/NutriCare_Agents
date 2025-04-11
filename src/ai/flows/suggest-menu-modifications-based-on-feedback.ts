'use server';
/**
 * @fileOverview This file defines a Genkit flow for suggesting menu modifications based on user feedback.
 *
 * - suggestMenuModificationsBasedOnFeedback - A function that takes user feedback and a menu as input and suggests modifications to the menu.
 * - SuggestMenuModificationsBasedOnFeedbackInput - The input type for the suggestMenuModificationsBasedOnFeedback function.
 * - SuggestMenuModificationsBasedOnFeedbackOutput - The return type for the suggestMenuModificationsBasedOnFeedback function.
 */

import { ai } from '@/ai/ai-instance'; // Corrected import path
import { z } from 'genkit';

const SuggestMenuModificationsBasedOnFeedbackInputSchema = z.object({
  menu: z.string().describe('The current menu being suggested.'),
  feedback: z.string().describe('User feedback on the menu.'),
  userPreferences: z.string().optional().describe('Optional user preferences to consider.'),
});

export type SuggestMenuModificationsBasedOnFeedbackInput = z.infer<
  typeof SuggestMenuModificationsBasedOnFeedbackInputSchema
>;

// Update schema descriptions to indicate Markdown content
const SuggestMenuModificationsBasedOnFeedbackOutputSchema = z.object({
  modifiedMenu: z.string().describe('The modified menu based on user feedback, formatted using Markdown.'),
  reasoning: z.string().describe('The reasoning behind the menu modifications, formatted using Markdown.'),
});

export type SuggestMenuModificationsBasedOnFeedbackOutput = z.infer<
  typeof SuggestMenuModificationsBasedOnFeedbackOutputSchema
>;

export async function suggestMenuModificationsBasedOnFeedback(
  input: SuggestMenuModificationsBasedOnFeedbackInput
): Promise<SuggestMenuModificationsBasedOnFeedbackOutput> {
  return suggestMenuModificationsBasedOnFeedbackFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestMenuModificationsBasedOnFeedbackPrompt',
  input: {
    schema: z.object({
      menu: z.string().describe('The current menu being suggested.'),
      feedback: z.string().describe('User feedback on the menu.'),
      userPreferences: z.string().optional().describe('Optional user preferences to consider.'),
    }),
  },
  output: {
    // Use the updated output schema
    schema: SuggestMenuModificationsBasedOnFeedbackOutputSchema,
  },
  // Update prompt to request Markdown output
  prompt: `You are an AI assistant specializing in Vietnamese cuisine. Your task is to suggest modifications to a given menu based on user feedback, presenting the result in a clear, modern, and user-friendly format using Markdown.

  Current Menu:
  {{menu}}

  User Feedback:
  {{feedback}}

  {% if userPreferences %}
  Consider the following user preferences when modifying the menu:
  {{userPreferences}}
  {% endif %}

  Suggest modifications to the menu. Provide the output in two distinct sections:

  **Modified Menu:**
  (Present the full modified menu here using clear Markdown formatting. Use headings for days/meals, bold text for dish names, and bullet points for ingredients or key details. Ensure the structure is easy to read.)

  **Reasoning:**
  (Explain *why* each significant modification was made using Markdown bullet points. Directly reference the user's feedback and preferences where applicable.)

  **IMPORTANT:** Ensure the output strictly follows this two-section Markdown structure. Do not add any introductory or concluding text outside these sections.`,
});

const suggestMenuModificationsBasedOnFeedbackFlow = ai.defineFlow<
  typeof SuggestMenuModificationsBasedOnFeedbackInputSchema,
  typeof SuggestMenuModificationsBasedOnFeedbackOutputSchema
>(
  {
    name: 'suggestMenuModificationsBasedOnFeedbackFlow',
    inputSchema: SuggestMenuModificationsBasedOnFeedbackInputSchema,
    outputSchema: SuggestMenuModificationsBasedOnFeedbackOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
