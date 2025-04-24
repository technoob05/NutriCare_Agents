'use client'; // Required for useState, useEffect, event handlers

import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils"; // Utility for conditional class names
import { AgentProcessVisualizer, AgentStep } from "@/components/ui/agent-process-visualizer"; // Import the visualizer
import { InteractiveMenu } from "@/components/ui/interactive-menu"; // Import the menu component - Assuming it exists

// Define a type for messages for better structure
type Message = {
  id: string;
  sender: 'user' | 'agent' | 'system';
  content?: string | React.ReactNode; // Text content (optional)
  agentSteps?: AgentStep[]; // Structured data for the visualizer
  menuData?: any; // Structured data for the interactive menu (define more specific type later)
  timestamp?: string; // Optional timestamp
};

// Define suggested actions
const suggestedActions = [
  { id: 'suggest-menu', text: 'Tạo thực đơn tuần', command: '/menu' },
  { id: 'suggest-explain', text: 'Giải thích món ăn?', command: 'Giải thích món phở' },
  { id: 'suggest-recipe', text: 'Công thức nấu ăn?', command: 'Công thức nấu bún chả' },
];


export function ChatInterface() {
  // Placeholder state for messages - replace with actual state management later
  const [messages, setMessages] = React.useState<Message[]>([
    { id: '1', sender: 'system', content: 'Chào bạn! Tôi có thể giúp gì? Bạn có thể yêu cầu tạo thực đơn hoặc hỏi bất cứ điều gì.', timestamp: new Date().toLocaleTimeString() },
  ]);
  const [inputValue, setInputValue] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false); // To show loading state
  const [showSuggestions, setShowSuggestions] = React.useState(true); // Show suggestions initially
  const [showAgentProcess, setShowAgentProcess] = React.useState(false); // State for toggling agent process visibility globally

  // Ref for scrolling to bottom
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  const handleSendMessage = async (messageContent?: string) => {
    const contentToSend = messageContent || inputValue;
    if (!contentToSend.trim() || isLoading) return;

    // Hide suggestions when user starts interacting
    setShowSuggestions(false);

    setInputValue(''); // Clear input immediately
    setIsLoading(true);

    // Add user message optimistically
    const newUserMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: contentToSend, // Use the actual content sent
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, newUserMessage]);

    // --- API Call ---
    try {
      const response = await fetch('/api/chat-mobi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: contentToSend }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const responseData = await response.json();

      // Construct the agent message from API response
      const agentResponse: Message = {
        id: (Date.now() + 1).toString(), // Generate ID on client
        sender: 'agent',
        agentSteps: responseData.agentSteps, // Pass through agent steps
        menuData: responseData.menuData,     // Pass through menu data
        content: responseData.content,       // Pass through text content
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, agentResponse]); // Add the response message

    } catch (error) {
      console.error("Error sending message or processing API response:", error);
      const errorMessage: Message = { // Correctly define errorMessage
        id: (Date.now() + 1).toString(),
        sender: 'system',
        content: 'Xin lỗi, đã có lỗi xảy ra khi xử lý yêu cầu của bạn. Vui lòng thử lại.',
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMessage]); // Add error message
    } finally {
      setIsLoading(false); // Ensure loading state is reset
    }
    // --- End TODO ---
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) { // Send on Enter, allow Shift+Enter for newline
      event.preventDefault(); // Prevent default form submission/newline
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full max-h-full overflow-hidden bg-white dark:bg-black">
      {/* Message display area */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-6 pb-4"> {/* Increased spacing */}
          {messages.map((message, index) => ( // Add index here
            <div
              key={message.id}
              className={cn(
                "flex items-start gap-3",
                message.sender === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.sender !== 'user' && (
                <Avatar className="w-8 h-8 border dark:border-gray-700">
                  {/* Placeholder - Use actual icons/images later */}
                  <AvatarFallback>{message.sender === 'agent' ? 'A' : 'S'}</AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "max-w-[75%] rounded-lg px-4 py-2 text-sm",
                  message.sender === 'user'
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-black dark:text-white",
                  message.sender === 'system' && "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-300 text-center w-full max-w-full"
                )}
              >
                {/* Render main text content first */}
                {message.content}

                {/* --- Render Agent Steps OR Menu if available --- */}

                {/* Global Toggle Button for Agent Steps (only on the LAST agent message with steps) */}
                {index === messages.length - 1 && // Check if it's the last message
                 message.sender === 'agent' &&
                 message.agentSteps &&
                 message.agentSteps.length > 0 && (
                  <div className="mt-2 text-right"> {/* Align button to the right */}
                    <Button
                      variant="link" // Use link variant for less emphasis
                      size="sm"
                      onClick={() => setShowAgentProcess(prev => !prev)} // Control global state
                      className="h-auto p-0 text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {showAgentProcess ? 'Ẩn quá trình AI' : 'Hiện quá trình AI'}
                    </Button>
                  </div>
                )}

                {/* Agent Steps Visualizer - Conditionally rendered based on global state */}
                {message.sender === 'agent' && message.agentSteps && showAgentProcess && (
                  <div className="mt-2 w-full border-t border-border/50 pt-2"> {/* Add separator */}
                    <AgentProcessVisualizer trace={message.agentSteps} isProcessing={false} /> {/* Pass isProcessing based on actual state later */}
                  </div>
                )}

                {/* Interactive Menu */}
                {message.sender === 'agent' && message.menuData && (
                   <div className="mt-2 w-full border-t border-border/50 pt-2"> {/* Add separator */}
                     {/* Pass menuData and potentially interaction handlers */}
                     <InteractiveMenu menuData={message.menuData} />
                   </div>
                )}

                {/* Render Timestamp LAST, outside the conditional blocks above */}
                {message.timestamp && message.sender !== 'system' && (
                  <div className={cn(
                    "text-xs mt-1", // Keep margin-top
                    message.sender === 'user' ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400',
                    'text-right' // Align timestamp right within the bubble
                  )}>
                    {message.timestamp}
                  </div>
                )}
              </div>
              {message.sender === 'user' && (
                 <Avatar className="w-8 h-8 border dark:border-gray-700">
                   <AvatarFallback>U</AvatarFallback>
                 </Avatar>
              )}
            </div>
          ))}
          {/* Invisible div to scroll to */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="p-4 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
        {/* Suggested Actions */}
        {showSuggestions && !isLoading && (
          <div className="flex flex-wrap gap-2 mb-3">
            {suggestedActions.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => handleSendMessage(action.command)}
              >
                {action.text}
              </Button>
            ))}
          </div>
        )}

        {isLoading && <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Agent is thinking...</div>}
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Type your message..."
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="flex-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
          />
          {/* Correct Button usage with proper onClick handler */}
          <Button onClick={() => handleSendMessage()} disabled={isLoading || !inputValue.trim()}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
