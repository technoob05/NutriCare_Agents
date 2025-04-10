'use server';
/**
 * @fileOverview Generates daily/weekly Vietnamese menus, capturing trace information.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { googleSearch, SearchResult } from '@/services/google-search';
import { logger } from 'genkit/logging';

// --- Input Schema ---
const GenerateMenuFromPreferencesInputSchema = z.object({
    preferences: z.string().describe('User preferences.'),
    menuType: z.enum(['daily', 'weekly']).describe('Menu type.'),
});
export type GenerateMenuFromPreferencesInput = z.infer<typeof GenerateMenuFromPreferencesInputSchema>;

// --- Shared Schemas ---
const MenuItemSchema = z.object({
    name: z.string().describe('Dish name.'),
    ingredients: z.array(z.string()).describe('Ingredients.'),
    preparation: z.string().describe('Instructions.'),
    estimatedCost: z.string().describe('Cost.'),
});
// Schema for a single day's meals
const DailyMenuSchema = z.object({
    breakfast: z.array(MenuItemSchema).optional().describe('Breakfast.'),
    lunch: z.array(MenuItemSchema).optional().describe('Lunch.'),
    dinner: z.array(MenuItemSchema).optional().describe('Dinner.'),
    snacks: z.array(MenuItemSchema).optional().describe('Snacks.')
}).describe('Meals for a single day.');
export type DailyMenuData = z.infer<typeof DailyMenuSchema>;

// Schema for a full week's menu
const WeeklyMenuSchema = z.object({
    Monday: DailyMenuSchema.optional(),
    Tuesday: DailyMenuSchema.optional(),
    Wednesday: DailyMenuSchema.optional(),
    Thursday: DailyMenuSchema.optional(),
    Friday: DailyMenuSchema.optional(),
    Saturday: DailyMenuSchema.optional(),
    Sunday: DailyMenuSchema.optional(),
}).describe("Generated weekly menu, organized by day.");
export type WeeklyMenuData = z.infer<typeof WeeklyMenuSchema>;

// Combined Menu Schema (can be daily or weekly)
const AnyMenuSchema = z.union([DailyMenuSchema, WeeklyMenuSchema]);
export type AnyMenuData = z.infer<typeof AnyMenuSchema>;


// --- Trace Schema ---
const StepTraceSchema = z.object({
    stepName: z.string().describe("Name of the processing step/agent."),
    status: z.enum(['success', 'error', 'skipped']).describe("Completion status of the step."),
    inputData: z.any().optional().describe("Data provided as input to the step."),
    outputData: z.any().optional().describe("Data produced by the step."),
    errorDetails: z.string().optional().describe("Details if the step resulted in an error."),
    durationMs: z.number().optional().describe("Approximate duration of the step in milliseconds."),
});
export type StepTrace = z.infer<typeof StepTraceSchema>; // Exporting for frontend use

// --- Output Schema (Includes trace AND menuType) ---
const GenerateMenuFromPreferencesOutputSchema = z.object({
    menu: AnyMenuSchema.optional(),
    feedbackRequest: z.string().optional(),
    trace: z.array(StepTraceSchema).describe("Detailed trace of the generation process steps."),
    menuType: z.enum(['daily', 'weekly']).describe("The type of menu that was generated."),
});
export type GenerateMenuFromPreferencesOutput = z.infer<typeof GenerateMenuFromPreferencesOutputSchema>;

// --- Helper to safely stringify potentially complex objects for trace ---
function safeStringify(data: any, maxLength: number = 1000): string | undefined {
    if (data === undefined || data === null) return undefined;
    try {
        if (typeof data === 'string') {
             return data.length > maxLength ? data.substring(0, maxLength) + '...' : data;
        }
        const str = JSON.stringify(data);
        return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
    } catch (e) {
        return `[Error stringifying data: ${e instanceof Error ? e.message : String(e)}]`;
    }
}

// --- "Planning Agent" Prompt (Enhanced Output) ---
const PlanningOutputSchema = z.object({
    plan: z.string().describe("A concise, high-level plan (2-3 sentences) summarizing the menu structure, key dishes, and considerations."),
    reasoning: z.string().describe("Detailed step-by-step reasoning (bullet points or paragraph) explaining *why* the plan was constructed this way, referencing specific user preferences and relevant search results.")
});

const planMenuStructurePrompt = ai.definePrompt(
    {
        name: 'planMenuStructurePrompt',
        input: {
            schema: z.object({
                preferences: z.string(),
                menuType: z.enum(['daily', 'weekly']),
                searchResults: z.array(z.object({
                    title: z.string(),
                    url: z.string(),
                    snippet: z.string(),
                 })).optional(),
            }),
        },
        output: {
            schema: PlanningOutputSchema,
        },
        prompt: `You are a meticulous Menu Planning Agent. Your goal is to create a plan AND explain your reasoning for a Vietnamese menu based on user preferences and search results.

User Preferences: "{{{preferences}}}"
Menu Type: "{{{menuType}}}"
Search Results:
{{#if searchResults}}
{{#each searchResults}}
- Title: {{{title}}} (URL: {{{url}}}) - Snippet: {{{snippet}}}
{{/each}}
{{else}}
- No relevant search results found.
{{/if}}

**Task:**
1.  **Analyze:** Carefully consider the preferences, menu type, and search results.
2.  **Reason:** Think step-by-step about how to construct the menu. Explain your choices. For example: "Based on the 'vegetarian' preference, I will focus dinner on tofu and vegetable dishes. The search result about 'Pho Chay' provides a good option for lunch. Breakfast should be light as requested..." Mention specific preferences or search results that influence your decisions.
3.  **Plan:** Create a concise, high-level plan summarizing the structure and key elements derived from your reasoning (2-3 sentences).
4.  **Output Format:** Respond ONLY with a valid JSON object matching this schema: { "plan": " concise plan text ", "reasoning": " detailed reasoning text " }. Do NOT include any other text, greetings, or explanations outside the JSON structure.`,
    }
);

// --- Input Schemas for Content Prompts (Defined Separately) ---
const GenerateDailyMenuContentInputSchema = z.object({
    preferences: z.string(),
    menuType: z.literal('daily'),
    searchResults: z.array(z.object({
        title: z.string(), url: z.string(), snippet: z.string(),
    })).optional(),
    menuPlan: z.string(),
});
type GenerateDailyMenuContentInput = z.infer<typeof GenerateDailyMenuContentInputSchema>;

const GenerateWeeklyMenuContentInputSchema = z.object({
    preferences: z.string(),
    menuType: z.literal('weekly'),
    searchResults: z.array(z.object({
        title: z.string(), url: z.string(), snippet: z.string(),
    })).optional(),
    menuPlan: z.string(),
});
type GenerateWeeklyMenuContentInput = z.infer<typeof GenerateWeeklyMenuContentInputSchema>;


// --- "Content Writing Agent" Prompt (For Daily) ---
const generateMenuContentPrompt = ai.definePrompt( // For Daily
    {
        name: 'generateDailyMenuContentPrompt',
        input: { schema: GenerateDailyMenuContentInputSchema }, // Use constant
        output: { schema: DailyMenuSchema }, // Outputs Daily schema
        prompt: `You are a Vietnamese cuisine expert focused *only* on creating detailed menu items for a single day, following a specific plan.
User Preferences: {{{preferences}}}
Menu Type: {{{menuType}}}
High-Level Plan: {{{menuPlan}}} // Follow this plan strictly

Generate the detailed menu items based on the user preferences and the provided plan. Use the provided search results for recipe details and grounding where relevant to the plan.
Search Results:
{{#each searchResults}}
- Title: {{{title}}}
URL: {{{url}}}
Snippet: {{{snippet}}}
{{/each}}

Format the output strictly as a JSON object matching the DailyMenuSchema: { breakfast: [{name, ingredients, preparation, estimatedCost}, ...], lunch: [...], dinner: [...], snacks: [...] }.
The menu must include at least one meal (e.g., breakfast, lunch, dinner) with at least one dish, consistent with the plan.
Do NOT include introductory text, explanations, or feedback requests. Only the JSON menu object.`,
    },
);

// NEW: Prompt for Weekly Menu Generation
const generateWeeklyMenuContentPrompt = ai.definePrompt(
    {
        name: 'generateWeeklyMenuContentPrompt',
        input: { schema: GenerateWeeklyMenuContentInputSchema }, // Use constant
        output: { schema: WeeklyMenuSchema }, // Outputs Weekly schema
        prompt: `You are a Vietnamese cuisine expert creating a detailed *weekly* menu plan, following a specific high-level plan.
User Preferences: {{{preferences}}}
Menu Type: {{{menuType}}}
High-Level Plan: {{{menuPlan}}} // Follow this plan strictly for the week

Generate the detailed menu items for each day (Monday to Sunday) based on the plan and preferences. Use search results for grounding.
Search Results:
{{#each searchResults}}
- Title: {{{title}}} (URL: {{{url}}}) - Snippet: {{{snippet}}}
{{/each}}

Format the output strictly as a JSON object matching the WeeklyMenuSchema: { Monday: { breakfast: [...], lunch: [...] ... }, Tuesday: { ... }, ..., Sunday: { ... } }. You must include entries for Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, and Sunday, even if some days have empty meal arrays (e.g. {} or null for a meal array like breakfast: null). Ensure each planned day has appropriate meals based on the plan. Include at least a few populated days with meals.
Do NOT include introductory text, explanations, or feedback requests. Only the JSON menu object for the week.`,
    },
);


// --- "Feedback Request Agent" Prompt (Stronger Instruction) ---
const generateFeedbackRequestPrompt = ai.definePrompt(
    {
        name: 'generateFeedbackRequestPrompt',
        input: { schema: z.object({ menuType: z.enum(['daily', 'weekly']) }) },
        output: { schema: z.string() }, // Expecting only a string
        prompt: `You are an AI assistant. Your ONLY task is to generate a single, short, friendly question asking for feedback on a generated {{{menuType}}} menu. Encourage suggestions for changes. Respond ONLY with the question text itself. Do NOT add greetings, closings, or any other surrounding text.

Example valid responses:
"What do you think of this {{menuType}} menu? Let me know if you'd like any adjustments!"
"Here's the {{menuType}} plan! Does it look good, or would you like to change anything?"
"How does this {{menuType}} menu suit your preferences? I'm happy to make modifications!"

Output ONLY the question string.`,
    }
);

// --- Main Orchestrator Flow (Updated for Planning Output and Tracing) ---
const generateMenuFromPreferencesFlow = ai.defineFlow<
    typeof GenerateMenuFromPreferencesInputSchema,
    typeof GenerateMenuFromPreferencesOutputSchema
>(
    {
        name: 'generateMenuFromPreferencesFlow',
        inputSchema: GenerateMenuFromPreferencesInputSchema,
        outputSchema: GenerateMenuFromPreferencesOutputSchema,
    },
    async (input) => {
        logger.info('Starting menu generation flow with tracing', input);
        const traceLog: StepTrace[] = [];
        let startTime: number;
        let menuContent: AnyMenuData | undefined = undefined;
        let feedbackRequest: string | undefined;
        let menuPlan: string = `Generate a ${input.menuType} menu based on preferences: ${input.preferences}.`;
        let menuReasoning: string = "Planning step failed or skipped.";
        let searchResult: SearchResult[] = [];

        // --- Step 1: RAG/Search Agent ---
        const searchStepName = "Recipe Search (RAG)";
        startTime = Date.now();
        let searchInput = `Vietnamese recipes ${input.preferences}`;
        try {
             logger.info(`Step 1: Calling googleSearch with query: ${searchInput}`);
             searchResult = await googleSearch(searchInput);
             traceLog.push({ stepName: searchStepName, status: 'success', inputData: { query: searchInput }, outputData: { count: searchResult.length, results: safeStringify(searchResult) }, durationMs: Date.now() - startTime });
             logger.info(`Step 1 Success: Found ${searchResult.length} results.`);
        } catch (error: any) {
             logger.warn('Step 1 Error: Google Search failed.', error);
             traceLog.push({ stepName: searchStepName, status: 'error', inputData: { query: searchInput }, errorDetails: error.message || String(error), durationMs: Date.now() - startTime });
        }


        // --- Step 2: Planning Agent ---
        const planningStepName = "Menu Planning";
        startTime = Date.now();
        let planningInput = { preferences: input.preferences, menuType: input.menuType, searchResults: searchResult };
        try {
            logger.info('Step 2: Calling planMenuStructurePrompt');
            const planResponse = await planMenuStructurePrompt(planningInput);
            const output = planResponse.output;
            if (!output || !output.plan || !output.reasoning) throw new Error("Menu planning output is incomplete or null.");
            menuPlan = output.plan;
            menuReasoning = output.reasoning;
            traceLog.push({
                stepName: planningStepName,
                status: 'success',
                inputData: { preferences: input.preferences, searchResultCount: searchResult.length },
                outputData: { plan: menuPlan, reasoning: safeStringify(menuReasoning, 1500) },
                durationMs: Date.now() - startTime,
            });
            logger.info('Step 2 Success: Menu plan and reasoning generated.');
        } catch (error: any) {
            logger.error('Step 2 Error: Menu planning failed.', error);
            traceLog.push({
                stepName: planningStepName,
                status: 'error',
                inputData: { preferences: input.preferences, searchResultCount: searchResult.length },
                errorDetails: error.message || String(error),
                durationMs: Date.now() - startTime,
            });
            logger.warn('Proceeding with fallback menu plan.');
        }

        // --- Step 3: Content Writing Agent (Conditional based on menuType) ---
        const writingStepName = `Menu Content Generation (${input.menuType})`;
        startTime = Date.now();
        // Define input based on shared fields
        let writingInputBase = {
            preferences: input.preferences,
            searchResults: searchResult,
            menuPlan: menuPlan,
        };
        try {
            logger.info(`Step 3: Calling ${input.menuType} content generation prompt`);
            let menuContentResponse;

            if (input.menuType === 'weekly') {
                // Prepare and cast input specifically for the weekly prompt
                const weeklyInput: GenerateWeeklyMenuContentInput = {
                    ...writingInputBase,
                    menuType: 'weekly', // Explicitly set literal type
                };
                menuContentResponse = await generateWeeklyMenuContentPrompt(weeklyInput);
            } else {
                 // Prepare and cast input specifically for the daily prompt
                 const dailyInput: GenerateDailyMenuContentInput = {
                     ...writingInputBase,
                     menuType: 'daily', // Explicitly set literal type
                 };
                menuContentResponse = await generateMenuContentPrompt(dailyInput);
            }

            const output = menuContentResponse.output;
            if (!output) throw new Error("Menu content generation returned null.");
            menuContent = output; // Assign directly, type matches AnyMenuSchema union
            traceLog.push({
                stepName: writingStepName,
                status: 'success',
                // Log the base input for simplicity in trace
                inputData: { plan: menuPlan, type: input.menuType },
                outputData: { menu: safeStringify(menuContent) },
                durationMs: Date.now() - startTime
            });
            logger.info(`Step 3 Success: ${input.menuType} menu content generated.`);
        } catch (error: any) {
            logger.error(`Step 3 Error: Generating ${input.menuType} menu content failed.`, error);
            traceLog.push({
                stepName: writingStepName,
                status: 'error',
                 // Log the base input for simplicity in trace
                inputData: { plan: menuPlan, type: input.menuType },
                errorDetails: error.message || String(error),
                durationMs: Date.now() - startTime
            });
            return { trace: traceLog, menuType: input.menuType }; // Return partial trace
        }

        // --- Step 4: Feedback Request Agent ---
        const feedbackStepName = "Feedback Request Generation";
        startTime = Date.now();
        feedbackRequest = "Let me know if you'd like any changes."; // Fallback initialized
        let feedbackInput = { menuType: input.menuType };
        try {
            logger.info('Step 4: Calling generateFeedbackRequestPrompt');
            const feedbackResponse = await generateFeedbackRequestPrompt(feedbackInput);
            const output = feedbackResponse.output;
             if (!output) throw new Error("Feedback request generation returned null or undefined.");
            feedbackRequest = output;
            traceLog.push({ stepName: feedbackStepName, status: 'success', inputData: feedbackInput, outputData: { request: feedbackRequest }, durationMs: Date.now() - startTime });
             logger.info('Step 4 Success: Feedback request generated.');
        } catch (error: any) {
            logger.error('Step 4 Error: Generating feedback request failed.', error);
             traceLog.push({ stepName: feedbackStepName, status: 'error', inputData: feedbackInput, errorDetails: error.message || String(error), durationMs: Date.now() - startTime });
             logger.warn('Using fallback feedback request.');
        }


        // --- Step 5: Formatting Agent (Combine Results) ---
        traceLog.push({
             stepName: "Final Formatting",
             status: 'success',
             inputData: { menuGenerated: !!menuContent, feedbackGenerated: !!feedbackRequest },
             outputData: { /* Final structure is the output */ },
         });
        logger.info('Step 5: Final Formatting complete.');


        const finalOutput: GenerateMenuFromPreferencesOutput = {
            menu: menuContent,
            feedbackRequest: feedbackRequest,
            trace: traceLog,
            menuType: input.menuType, // Include menuType
        };
        logger.info('Menu generation flow complete with trace.');
        return finalOutput;
    }
);

// --- Exported Entry Point ---
export async function generateMenuFromPreferences(
    input: GenerateMenuFromPreferencesInput
): Promise<GenerateMenuFromPreferencesOutput> {
    try {
        return await generateMenuFromPreferencesFlow(input);
    } catch (error: any) { // Catch any errors bubble up from the flow
        logger.error('Top-level error executing generateMenuFromPreferencesFlow:', error);
        // Ensure menuType might still be included in a potential partial error response if needed by frontend
        throw new Error(`Menu generation failed: ${error.message || String(error)}`);
    }
}
