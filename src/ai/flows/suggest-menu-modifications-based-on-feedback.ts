'use server';
/**
 * @fileOverview This file defines a Genkit flow for suggesting menu modifications based on user feedback.
 *
 * - suggestMenuModificationsBasedOnFeedback - A function that takes user feedback and a menu as input and suggests modifications to the menu.
 * - SuggestMenuModificationsBasedOnFeedbackInput - The input type for the suggestMenuModificationsBasedOnFeedback function.
 * - SuggestMenuModificationsBasedOnFeedbackOutput - The return type for the suggestMenuModificationsBasedOnFeedback function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const SuggestMenuModificationsBasedOnFeedbackInputSchema = z.object({
  menu: z.string().describe('The current menu being suggested.'),
  feedback: z.string().describe('User feedback on the menu.'),
  userPreferences: z.string().optional().describe('Optional user preferences to consider.'),
});

export type SuggestMenuModificationsBasedOnFeedbackInput = z.infer<
  typeof SuggestMenuModificationsBasedOnFeedbackInputSchema
>;

const SuggestMenuModificationsBasedOnFeedbackOutputSchema = z.object({
  modifiedMenu: z.string().describe('The modified menu based on user feedback.'),
  reasoning: z.string().describe('The reasoning behind the menu modifications.'),
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
    schema: z.object({
      modifiedMenu: z.string().describe('The modified menu based on user feedback.'),
      reasoning: z.string().describe('The reasoning behind the menu modifications.'),
    }),
  },
  prompt: `You are an AI assistant that suggests modifications to a menu based on user feedback.

  Current Menu:
  {{menu}}

  User Feedback:
  {{feedback}}

  {% if userPreferences %}
  Consider the following user preferences when modifying the menu:
  {{userPreferences}}
  {% endif %}

  Suggest modifications to the menu, providing a modified menu and a reasoning for the changes.
  Modified Menu: 
  Reasoning: `,
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
