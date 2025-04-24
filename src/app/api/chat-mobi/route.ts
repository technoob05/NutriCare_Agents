import { NextResponse } from 'next/server';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AgentExecutor, createReactAgent } from "langchain/agents";
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";
import { pull } from "langchain/hub";
import type { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { PromptTemplate } from "@langchain/core/prompts";
import { BytesOutputParser } from "@langchain/core/output_parsers"; // For streaming
import { WikipediaQueryRun } from "@langchain/community/tools/wikipedia_query_run";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from 'zod';
// --- Import the actual menu generation flow ---
import {
  generateMenuFromPreferences,
  type GenerateMenuFromPreferencesInput,
  type GenerateMenuFromPreferencesOutput,
  type StepTrace, // Use StepTrace from the flow directly
  type AnyMenuData
} from '@/ai/flows/generate-menu-from-preferences';

// --- Environment Variable Checks ---
if (!process.env.GOOGLE_API_KEY) {
  throw new Error("Missing GOOGLE_API_KEY environment variable");
}
// Optional: Check for Tavily API key if using the tool
// if (!process.env.TAVILY_API_KEY) {
//   console.warn("Missing TAVILY_API_KEY, Tavily search tool will be disabled.");
// }

// --- AI Component Initialization ---
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash-latest",
  temperature: 0.7,
  apiKey: process.env.GOOGLE_API_KEY,
});

// --- Agent Setup ---
let agentExecutor: AgentExecutor | null = null;
let agentSetupPromise: Promise<void> | null = null;

const initializeAgent = async () => {
  try {
    console.log("Setting up Langchain agent...");
    const prompt = await pull<ChatPromptTemplate>("hwchase17/react-chat");
    const agent = await createReactAgent({ llm, tools, prompt });
    agentExecutor = new AgentExecutor({
      agent,
      tools,
      handleParsingErrors: true,
      // verbose: process.env.NODE_ENV === 'development',
    });
    console.log("Langchain agent setup complete.");
  } catch (error) {
    console.error("Failed to setup Langchain agent:", error);
    agentExecutor = null;
  }
};

agentSetupPromise = initializeAgent();

// --- API Route Handler ---
export async function POST(req: Request) {
  try {
    // Ensure agent is initialized
    if (!agentExecutor) {
      if (agentSetupPromise) await agentSetupPromise;
      if (!agentExecutor) {
        console.error("Agent executor failed to initialize.");
        return NextResponse.json({ error: 'Agent initialization failed.' }, { status: 503 });
      }
    }

    const body = await req.json();
    const messageContent = body.message as string;
    // TODO: Extract user preferences and context properly from body or session
    const userPreferences = body.preferences || "Không có sở thích cụ thể"; // Placeholder
    const menuType = body.menuType || 'daily'; // Placeholder, default to daily
    const userContext = body.userContext || {}; // Placeholder

    if (!messageContent) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // --- Intent Detection & Routing ---
    const isMenuRequest = messageContent.trim().toLowerCase() === '/menu';

    if (isMenuRequest) {
      // --- Menu Generation Flow ---
      console.log("Handling /menu request...");

      // Prepare input for the menu flow
      const menuInput: GenerateMenuFromPreferencesInput = {
        preferences: userPreferences,
        menuType: menuType,
        userContext: userContext,
      };

      try {
        // Call the actual menu generation flow
        const menuResult: GenerateMenuFromPreferencesOutput = await generateMenuFromPreferences(menuInput);

        const data = new StreamData();
        // Append actual trace from the flow result
        if (menuResult.trace) {
          data.append(JSON.stringify({ type: 'agent_steps', steps: menuResult.trace }));
        }
        // Append menu data with a separate title field
        if (menuResult.menu) {
           const menuPayload = {
             title: `Thực đơn ${menuResult.menuType === 'weekly' ? 'Tuần' : 'Hôm Nay'} Gợi ý`,
             menu: menuResult.menu // The actual menu object
           };
          data.append(JSON.stringify({ type: 'menu_data', data: menuPayload })); // Send the payload under 'data' key
        }
        // Append feedback request as a text message
        if (menuResult.feedbackRequest) {
           data.append(JSON.stringify({ type: 'text_message', content: menuResult.feedbackRequest }));
        } else {
           data.append(JSON.stringify({ type: 'text_message', content: "Đây là thực đơn gợi ý cho bạn:" }));
        }
        // TODO: Handle citations and searchSuggestionHtml

        data.close();

        // Return empty stream with StreamData
        const stream = new ReadableStream({ start(controller) { controller.close(); } });
        return new StreamingTextResponse(stream, {}, data);

      } catch (menuError: any) {
        console.error("[MENU_FLOW_ERROR]", menuError);
        const errorTrace = menuError.trace || [{ stepName: "Menu Generation Failed", status: 'error', errorDetails: menuError.message }];
        const data = new StreamData();
        data.append(JSON.stringify({ type: 'agent_steps', steps: errorTrace }));
        data.append(JSON.stringify({ type: 'error_message', content: `Lỗi tạo thực đơn: ${menuError.message}` }));
        data.close();
        const stream = new ReadableStream({ start(controller) { controller.close(); } });
        return new StreamingTextResponse(stream, { status: 200 }, data); // Send error via data stream
      }

    } else {
      // --- General Chat Flow (Langchain Agent) ---
      console.log("Handling general chat request:", messageContent);
      const { stream, handlers } = LangChainStream();

      const chain = RunnableSequence.from([
        { input: (i: { input: string }) => i.input },
        agentExecutor,
      ]);

      // Invoke asynchronously
      chain.invoke({ input: messageContent }, { callbacks: [handlers] })
         .catch(console.error);

      return new StreamingTextResponse(stream);
    }

  } catch (error: any) { // General catch block for the whole POST handler
    console.error("[CHAT_MOBI_API_ERROR]", error);
    const errorMessage = error.message || 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
