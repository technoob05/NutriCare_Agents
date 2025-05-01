import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AgentInteractionVisualizer, AgentInteractionStep } from '@/components/ui/AgentInteractionVisualizer';
import { MenuAgentSystem } from '@/components/chat-mobi/MenuAgentSystem';
import { ReasoningStreamVisualizer } from '@/components/ui/ReasoningStreamVisualizer';
import {
  Info, Image as ImageIconLucide, MapPin, Bot, User,
  ThumbsUp, ThumbsDown, Copy, Volume2, Brain, Search, Share2
} from 'lucide-react';

// --- Define Agent Names (Constants) ---
// Duplicated here for self-containment, consider moving to a shared constants file
const AGENT_NAMES = {
  NUTRITION_ANALYSIS: 'Nutrition Analysis',
  HEALTHY_SWAP: 'Healthy Swap Advisor',
  MEAL_SCORING: 'Meal Health Scoring',
  GOAL_ALIGNMENT: 'Goal Alignment',
  MENU_GENERATOR: 'Menu Generator',
  SYNTHESIZER: 'Synthesizer',
  REASONING_PLANNER: 'Reasoning & Planning',
} as const;

// --- Types (Copied/Adapted from ChatInterface) ---
interface Citation {
  source: string;
  url: string;
  title: string;
}

export type Message = {
  id: string;
  sender: 'user' | 'agent' | 'system';
  content?: string | React.ReactNode;
  interactionSteps?: AgentInteractionStep[];
  menuData?: any;
  menuType?: 'daily' | 'weekly';
  agentFeedbacks?: any[];
  timestamp?: string;
  isStreaming?: boolean;
  agentName?: string;
  citations?: Citation[];
  images?: { name: string; url: string }[];
  rawResult?: any; // Keep rawResult for actions like "Understand Meal"
  isReasoningStream?: boolean;
};

// --- Props for ChatMessage Component ---
interface ChatMessageProps {
  message: Message;
  imageDisplayMode: 'inline' | 'none';
  onCopy: (text: string | undefined) => void;
  onSpeak: (text: string | undefined) => void;
  onFeedback: (action: 'like' | 'dislike', messageId: string) => void;
  onOpenUnderstandMeal: (mealName: string) => void;
  onFindNearbyRestaurants: (mealName: string) => void;
  // Add onShare later if needed
}

export function ChatMessage({
  message,
  imageDisplayMode,
  onCopy,
  onSpeak,
  onFeedback,
  onOpenUnderstandMeal,
  onFindNearbyRestaurants
}: ChatMessageProps) {

  // --- Helper function to extract text content ---
  const getTextContent = (content: string | React.ReactNode): string | undefined => {
    if (typeof content === 'string') {
      return content;
    }
    // Basic attempt to get text from simple React nodes, might need refinement
    if (React.isValidElement(content) && typeof content.props.children === 'string') {
      return content.props.children;
    }
    return undefined;
  };

  const textToCopy = getTextContent(message.content);
  const textToSpeak = getTextContent(message.content);
  // Determine meal name for actions, prioritizing rawResult if available
  const mealNameForActions = message.rawResult?.mealName || (typeof message.content === 'string' ? message.content.split(' ')[0] : '');


  // --- Render User Message ---
  const renderUserMessage = () => (
    <div className="flex items-end gap-2 group justify-end">
      <div className="flex items-center gap-1 mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary"
                onClick={() => onCopy(textToCopy)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom"><p>Sao chép</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="bg-primary text-primary-foreground rounded-lg p-3 px-4 max-w-[85%] shadow-sm rounded-br-none">
        <div className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
      <Avatar className="w-8 h-8 border dark:border-gray-700 flex-shrink-0">
        {/* Replace with actual user avatar if available */}
        <AvatarImage src="/avatar-placeholder.png" alt="User" />
        <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
      </Avatar>
    </div>
  );

  // --- Render Agent or System Message ---
  const renderAgentOrSystemMessage = () => (
    <div className="flex items-start gap-3 group"> {/* Added group here for hover effects */}
      <Avatar className="w-8 h-8 border dark:border-gray-700 flex-shrink-0 mt-1">
        <AvatarImage src="/nutricare-logo.png" alt="NutriCare AI" />
        <AvatarFallback>
          {message.sender === 'agent' ? <Bot className="w-4 h-4" /> : 'S'}
        </AvatarFallback>
      </Avatar>

      <Card className={cn(
        "max-w-[85%] rounded-lg shadow-sm",
        message.sender === 'system' ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800" : "bg-card",
        message.isStreaming && !message.isReasoningStream ? "bg-transparent border-none shadow-none p-0" : "",
        message.isReasoningStream ? "border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20" : ""
      )}>
        {/* Card Header */}
        {!(message.isStreaming && !message.isReasoningStream) && (
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-medium flex items-center">
              <span className={message.isReasoningStream ? "text-purple-600 dark:text-purple-400" : "text-emerald-600 dark:text-emerald-400"}>
                {message.sender === 'agent' ? (message.agentName || 'NutriCare AI') : 'Hệ thống'}
              </span>
              {message.isReasoningStream &&
                <Badge variant="outline" className="ml-2 text-xs border-purple-400 text-purple-600">
                  Suy luận
                </Badge>
              }
            </CardTitle>
          </CardHeader>
        )}

        {/* Card Content */}
        <CardContent className={cn(
          "text-sm px-4",
          message.isStreaming && !message.isReasoningStream ? "p-0" : "pb-3"
        )}>
          {/* Render MenuAgentSystem if menuData exists */}
          {message.menuData && message.menuType ? (
            <MenuAgentSystem
              menuType={message.menuType}
              menuData={message.menuData}
              agentFeedbacks={message.agentFeedbacks}
              interactionSteps={message.interactionSteps}
              citations={message.citations}
              onOpenUnderstandMeal={onOpenUnderstandMeal}
              onFindNearbyRestaurants={onFindNearbyRestaurants}
            />
          ) : message.isReasoningStream ? (
            // Render ReasoningStreamVisualizer for reasoning stream
            <ReasoningStreamVisualizer streamContent={message.content as string || ''} />
          ) : (
            // Otherwise, render normal content
            <div className="space-y-2">
              {/* Render content or thinking animation */}
              {message.content && typeof message.content === 'string' ? (
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              ) : (
                message.content // Render React node (e.g., thinking indicator)
              )}

              {/* Render Inline Images */}
              {message.sender === 'agent' && message.images && message.images.length > 0 && imageDisplayMode === 'inline' && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {message.images.map((img, idx) => (
                    <div key={idx} className="rounded-md overflow-hidden border shadow-sm border-border/30 group relative">
                      <img src={img.url} alt={img.name} className="w-full h-32 object-cover" />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1.5 truncate opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {img.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Render Citations */}
              {message.citations && message.citations.length > 0 && (
                <div className="mt-3 pt-2 border-t border-border/50">
                  <h4 className="text-xs font-semibold mb-1.5 text-muted-foreground">Nguồn tham khảo:</h4>
                  <ul className="space-y-1.5 text-xs">
                    {message.citations.map((cite, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-muted-foreground">{idx + 1}.</span>
                        <a
                          href={cite.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline break-all"
                          title={cite.url}
                        >
                          {cite.title} ({cite.source})
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* "Learn more about dish" & "Find Nearby" buttons */}
              {message.sender === 'agent' && !message.menuData && !message.isStreaming && !message.isReasoningStream && mealNameForActions && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
                    onClick={() => onOpenUnderstandMeal(mealNameForActions)}
                  >
                    <Info className="h-4 w-4 mr-1" /> Tìm hiểu giá trị dinh dưỡng
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                    onClick={() => onFindNearbyRestaurants(mealNameForActions)}
                  >
                    <MapPin className="h-4 w-4 mr-1" /> Tìm quán gần đây
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>

        {/* Card Footer: Timestamp and Web Search Badge */}
        {message.timestamp && !(message.isStreaming && !message.isReasoningStream) && !message.menuData && (
          <CardFooter className="text-xs text-muted-foreground pt-1 pb-2 px-4 justify-between items-center">
            {message.citations && message.citations.length > 0 && (
              <Badge variant="outline" className="text-xs py-0 px-1.5 h-5 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400">
                <Search className="h-3 w-3 mr-1"/> Web
              </Badge>
            )}
            <span className={cn(message.citations && message.citations.length > 0 ? "" : "ml-auto")}>
              {message.timestamp}
            </span>
          </CardFooter>
        )}

        {/* Action Buttons (Like/Dislike/Copy/Speak/Share) */}
        {!message.isStreaming && !message.isReasoningStream && (message.sender === 'agent' || message.sender === 'system') && !message.menuData && (
          <div className="flex items-center gap-1 px-3 pb-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-emerald-500"
                    onClick={() => onFeedback('like', message.id)}
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Thích</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-red-500"
                    onClick={() => onFeedback('dislike', message.id)}
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Không thích</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-blue-500"
                    onClick={() => onCopy(textToCopy)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Sao chép</p></TooltipContent>
              </Tooltip>
              {message.sender === 'agent' && textToSpeak && ( // Only show speak for agent messages with text
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-purple-500"
                      onClick={() => onSpeak(textToSpeak)}
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><p>Đọc</p></TooltipContent>
                </Tooltip>
              )}
              {/* Share Button Placeholder */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-green-500"
                    // onClick={() => onShare(message.id)} // Add share handler later
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Chia sẻ</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Display interaction steps */}
        {message.interactionSteps && !message.menuData && message.agentName !== AGENT_NAMES.REASONING_PLANNER && (
          <div className="mt-2 mx-4 mb-4 p-3 border rounded-lg bg-muted/30">
            <h4 className="text-xs font-semibold mb-2 text-muted-foreground flex items-center">
              <Brain className="h-3.5 w-3.5 mr-1.5" /> Phân tích AI:
            </h4>
            <AgentInteractionVisualizer interactionSteps={message.interactionSteps} />
          </div>
        )}
      </Card>
    </div>
  );

  // --- Main Render Logic ---
  return (
    <div
      className={cn(
        "flex items-end gap-3 w-full",
        message.sender === 'user' ? 'justify-end' : 'justify-start',
        message.isStreaming && !message.isReasoningStream ? 'opacity-70' : '' // Dim streaming messages slightly
      )}
    >
      {message.sender === 'user'
        ? renderUserMessage()
        : renderAgentOrSystemMessage()}
    </div>
  );
}
