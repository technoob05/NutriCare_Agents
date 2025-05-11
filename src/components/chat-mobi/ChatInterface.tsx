'use client';

// --- Core React/Next.js Imports ---
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios'; // Import axios

// --- Health Chat Flow ---
import { HealthChatFlow, CHAT_STEPS, MENU_TYPE_OPTIONS } from '@/lib/health-chat-flow'; // Import CHAT_STEPS and MENU_TYPE_OPTIONS

// --- UI Components ---
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ThinkingAnimation from "@/components/ui/thinking-animation";
import { UnderstandMealDialog } from "@/components/UnderstandMealDialog";
import RecommendationDetailsDialog from './RecommendationDetailsDialog'; // Added

// --- Icons ---
import {
  AlarmClock, Database, Loader2, MapPin,
  CalendarDays, CloudSun, Sparkles, Smile
} from 'lucide-react';

// --- Custom Components ---
import { UserProfileBanner } from './UserProfileBanner';
import { ChatMessage, Message } from './ChatMessage';
import { ChatInputArea } from './ChatInputArea';
import { InlineChatInput } from './InlineChatInput';
import RecommendationList from './RecommendationList'; // Added
import { FollowUpActionCard } from './FollowUpActionCard';
import LocationSelector from './LocationSelector'; // Added LocationSelector import
import { EmotionCameraCapture } from './EmotionCameraCapture'; // Added EmotionCameraCapture
import { ApiRecommendationItem } from './RecommendedFoodItem'; // Added

// --- Hooks & Utils ---
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import logger from '@/lib/logger'; // Added logger import

// --- Services & Types ---
import type { OsmRestaurant } from '@/services/openstreetmap';
import type { AgentInteractionStep } from '@/components/ui/AgentInteractionVisualizer';

// --- Define Agent Names (Constants) ---
const AGENT_NAMES = {
  NUTRITION_ANALYSIS: 'Nutrition Analysis',
  HEALTHY_SWAP: 'Healthy Swap Advisor',
  MEAL_SCORING: 'Meal Health Scoring',
  GOAL_ALIGNMENT: 'Goal Alignment',
  MENU_GENERATOR: 'Menu Generator',
  SYNTHESIZER: 'Synthesizer',
  REASONING_PLANNER: 'Reasoning & Planning',
} as const;

type AgentName = typeof AGENT_NAMES[keyof typeof AGENT_NAMES];

export function ChatInterface() {
  // --- Hooks ---
  const searchParams = useSearchParams();
  const chatId = searchParams.get('id');
  const { toast } = useToast();

  // --- State Management ---
  const healthChatFlow = useRef(new HealthChatFlow());
  const [isCollectingInfo, setIsCollectingInfo] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [activeTools, setActiveTools] = useState<{ [tool: string]: boolean }>({});
  const [showOptions, setShowOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const [imageDisplayMode, setImageDisplayMode] = useState<'inline' | 'none'>('inline');
  const [isUnderstandMealOpen, setIsUnderstandMealOpen] = useState(false);
  const [selectedMealForUnderstanding, setSelectedMealForUnderstanding] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFilePreview, setUploadedFilePreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('chat');
  const [apiRecommendations, setApiRecommendations] = useState<{ recommendations: ApiRecommendationItem[], health_info?: any, is_vegan?: boolean } | null>(null);
  const [selectedRecommendationForDetails, setSelectedRecommendationForDetails] = useState<ApiRecommendationItem | null>(null); // State for details dialog
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false); // State for dialog visibility
  const [userPreferences, setUserPreferences] = useState({
    dietaryRestrictions: [],
    healthGoals: [],
    allergies: [],
    favoriteCuisines: []
  });
  const [awaitingLocationInputForWeather, setAwaitingLocationInputForWeather] = useState(false); // This state might be redundant if LocationSelector handles all its logic
  const [isEmotionCameraOpen, setIsEmotionCameraOpen] = useState(false); // State for emotion camera

  // --- Refs ---
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // --- Message Content Creation ---
  // Function to create message content with inline actions based on the *message's* context, not global state
  const createMessageWithActions = (message: Message) => {
    const currentFlowStep = healthChatFlow.current.getCurrentStep();
    const currentFlowMessage = healthChatFlow.current.getCurrentMessage();

    // Determine if the current message is the one that should display interactive elements.
    // It must be an agent message part of the health flow AND the latest one in the messages array
    // that requires user interaction for the health flow.
    const isLatestActiveHealthStepMessage = messages.length > 0 &&
      message.id === messages[messages.length - 1]?.id &&
      messages[messages.length - 1]?.sender === 'agent' &&
      isCollectingInfo; // Check if we are in the info collection phase

    if (isLatestActiveHealthStepMessage) {
      const isMenuSelectionStep = healthChatFlow.current.menuSelectionActive &&
        (currentFlowStep === 'ask_menu_type' ||
         currentFlowStep === 'confirm_menu_type_day' ||
         currentFlowStep === 'confirm_menu_type_emotion' ||
         currentFlowStep === 'confirm_menu_type_weather');

      if (currentFlowStep === 'greeting') {
        return (
          <div className="space-y-2">
            <div>{message.content}</div>
            <InlineChatInput
              onSubmit={handleHealthInfoResponse}
              placeholder="Nhập tên của bạn..."
            />
          </div>
        );
      } else if (currentFlowMessage && currentFlowMessage.options && currentFlowMessage.options.length > 0) {
        // This covers regular health info steps with options AND the new menu selection steps
        const showCustomInput = currentFlowMessage.allowCustomInput && !isMenuSelectionStep; // No custom input for menu selection buttons

        return (
          <div className="space-y-2">
            <div>{message.content}</div>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {currentFlowMessage.options.map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleHealthInfoResponse(option)}
                    className="text-xs"
                  >
                    {option}
                  </Button>
                ))}
              </div>
              {showCustomInput && (
                <InlineChatInput
                  onSubmit={handleHealthInfoResponse}
                  placeholder={
                    currentFlowStep === 'diet'
                      ? "Nhập chế độ ăn của bạn (ví dụ: Keto, ăn chay,...)"
                      : currentFlowStep === 'health_issues'
                        ? "Nhập vấn đề sức khỏe của bạn (ví dụ: tiểu đường, dị ứng,...)"
                        : "Nhập câu trả lời của bạn..."
                  }
                />
              )}
            </div>
          </div>
        );
      }
    }
    // Default: return original content
    return message.content;
  };

  // --- Effects ---
  useEffect(() => {
    const hasRecommendations = !!localStorage.getItem('userFoodRecommendations');
    
    if (!hasRecommendations) {
      setIsCollectingInfo(true);
      const initialMessage = healthChatFlow.current.getCurrentMessage();
      if (initialMessage) {
        setMessages([{
          id: 'init-health-chat',
          sender: 'agent',
          content: initialMessage.message,
          agentName: "Trợ lý dinh dưỡng NutriCare",
          timestamp: new Date().toLocaleTimeString()
        }]);
        if (initialMessage.options) {
          setShowOptions(initialMessage.options);
        }
      }
    } else {
      // Add welcome message for returning users
      setMessages([{
        id: 'init-chat',
        sender: 'agent',
        agentName: "Trợ lý dinh dưỡng NutriCare",
        content: "Chào mừng bạn quay lại! Bạn muốn hỏi gì về dinh dưỡng nhé?",
        timestamp: new Date().toLocaleTimeString()
      }]);
    }
  }, []); // Only run once on mount

  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [messages]);

  // --- Handlers ---
  // Memoize handleViewRecommendationDetails first as it's used by handleHealthInfoResponse
  const handleViewRecommendationDetails = useCallback((item: ApiRecommendationItem) => {
    setSelectedRecommendationForDetails(item);
    setIsDetailsDialogOpen(true);
  }, [setSelectedRecommendationForDetails, setIsDetailsDialogOpen]);

  const handleHealthInfoResponse = useCallback(async (response: string) => {
    if (!response.trim()) return;

    const result = healthChatFlow.current.processUserResponse(response);

    const userMessage: Message = {
      id: `user-health-${Date.now()}`,
      sender: 'user',
      content: response,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, userMessage]);

    // --- Thực thi tool tương ứng khi chọn menu sau health info ---
    const MENU_TYPE_OPTIONS = {
      DAY: "Tạo thực đơn theo ngày",
      EMOTION: "Tạo thực đơn theo cảm xúc",
      WEATHER: "Tạo thực đơn theo thời tiết",
    };
    if (Object.values(MENU_TYPE_OPTIONS).includes(response)) {
      // Nếu chọn "Tạo thực đơn theo ngày" thì bật tool menu-daily (hiện UI nhập preferences)
      if (response === MENU_TYPE_OPTIONS.DAY) {
        setActiveTools({ 'menu-daily': true });
        setShowSuggestions(false);
        setIsCollectingInfo(false);
        setShowOptions([]);
        return; // Chờ user nhập preferences xong mới follow up
      }
      // Nếu chọn "Tạo thực đơn theo cảm xúc" thì bật tool emotion-food (mở camera)
      if (response === MENU_TYPE_OPTIONS.EMOTION) {
        setActiveTools({ 'emotion-food': true });
        setShowSuggestions(false);
        setIsCollectingInfo(false);
        setShowOptions([]);
        setIsEmotionCameraOpen(true);
        return;
      }
      // Nếu chọn "Tạo thực đơn theo thời tiết" thì bật tool weather-food (mở location selector)
      if (response === MENU_TYPE_OPTIONS.WEATHER) {
        setActiveTools({ 'weather-food': true });
        setShowSuggestions(false);
        setIsCollectingInfo(false);
        setShowOptions([]);
        // Có thể mở LocationSelector nếu muốn
        return;
      }
    }

    const currentStepAfterResponse = healthChatFlow.current.getCurrentStep();
    const currentMessageDetails = healthChatFlow.current.getCurrentMessage();

    if (currentStepAfterResponse === 'show_recommendations' && apiRecommendations) {
      const validRecommendations = apiRecommendations.recommendations?.filter(item => item.name !== null) || [];
      if (validRecommendations.length > 0) {
        const recsMessage: Message = {
          id: `agent-show-recs-${Date.now()}`,
          sender: 'agent',
          agentName: "Trợ lý dinh dưỡng NutriCare",
          content: <RecommendationList
                      recommendations={validRecommendations}
                      title="Đây là một vài gợi ý cho bạn:"
                      onViewDetails={handleViewRecommendationDetails}
                   />,
          timestamp: new Date().toLocaleTimeString(),
        };
        setMessages(prev => [...prev, recsMessage]);
      } else {
         const noValidRecsMessage: Message = {
           id: `agent-no-valid-recs-${Date.now()}`,
           sender: 'agent',
           agentName: "Trợ lý dinh dưỡng NutriCare",
           content: "Rất tiếc, hiện tại chưa có gợi ý phù hợp nào dành cho bạn.",
           timestamp: new Date().toLocaleTimeString(),
         };
         setMessages(prev => [...prev, noValidRecsMessage]);
      }
      // Transition to asking for menu type selection
      healthChatFlow.current.setCurrentStep('ask_menu_type');
      const menuTypeMessageDetails = healthChatFlow.current.getCurrentMessage();
      if (menuTypeMessageDetails && menuTypeMessageDetails.message) {
        const agentMenuTypeMessage: Message = {
          id: `agent-ask-menu-type-${Date.now()}`,
          sender: 'agent',
          agentName: "Trợ lý dinh dưỡng NutriCare",
          content: menuTypeMessageDetails.message,
          timestamp: new Date().toLocaleTimeString()
        };
        setMessages(prev => [...prev, agentMenuTypeMessage]);
        setShowOptions(menuTypeMessageDetails.options || []);
      }
      // No return here, let the generic message handling below add the next agent message if any
    } else if (currentMessageDetails && currentMessageDetails.message) {
        const agentMessage: Message = {
            id: `agent-health-${currentStepAfterResponse}-${Date.now()}`,
            sender: 'agent',
            agentName: "Trợ lý dinh dưỡng NutriCare",
            content: currentMessageDetails.message,
            timestamp: new Date().toLocaleTimeString()
        };
        setMessages(prev => [...prev, agentMessage]);
        setShowOptions(currentMessageDetails.options || []);
    }
    
    if (healthChatFlow.current.isFlowTrulyFinished()) {
        setIsCollectingInfo(false);
        setShowOptions([]);
        // If it's truly finished and the last message was from the agent (e.g. final_complete message)
        // we don't need to add another message.
        // If it became finished due to user input (e.g. "Bỏ qua" or "Hoàn tất" in menu selection),
        // the final_complete message should have been added by the logic above.
    }


    // API Call logic when initial data collection is complete
    if (healthChatFlow.current.isComplete() && currentStepAfterResponse === 'complete') {
      console.log("Initial health chat flow is complete. Preparing to call API for recommendations.");
      const userData = healthChatFlow.current.formatUserDataForAPI();
      if (!userData) {
        console.error('Could not format user data for API');
        // Add a system message to inform the user
        const errorFormatMessage: Message = {
          id: `error-format-${Date.now()}`,
          sender: 'system',
          content: "Xin lỗi, có lỗi khi chuẩn bị dữ liệu để gửi. Vui lòng thử lại.",
          timestamp: new Date().toLocaleTimeString()
        };
        setMessages(prev => [...prev, errorFormatMessage]);
        setIsCollectingInfo(false); 
        setShowOptions([]);
        return;
      }
      
      const payload = userData; 
      console.log("Payload to send for recommendations (cleaned):", payload);
      setIsLoading(true);

      try {
        console.log("Calling recommend_for_new_user API...");
        const apiUrl = "https://huynhtrungkiet09032005-food-recommend-api.hf.space/recommend_for_new_user";
        const apiResponse = await axios.post(apiUrl, payload, { headers: { "Content-Type": "application/json" } });

        console.log("API Response Status:", apiResponse.status);
        console.log("API Response Data:", apiResponse.data);

        if (apiResponse.status === 200 && apiResponse.data) {
          setApiRecommendations(apiResponse.data); // Store the whole response
          if (Array.isArray(apiResponse.data.recommendations)) {
            localStorage.setItem('userFoodRecommendations', JSON.stringify(apiResponse.data.recommendations));
            console.log("Recommendations saved to localStorage.");
          }
          
          // Now, advance flow to ask_recommendations
          healthChatFlow.current.setCurrentStep('ask_recommendations');
          const askRecsMessageDetails = healthChatFlow.current.getCurrentMessage();
          if (askRecsMessageDetails) {
            const agentAskRecsMessage: Message = {
              id: `agent-ask-recs-${Date.now()}`,
              sender: 'agent',
              agentName: "Trợ lý dinh dưỡng NutriCare",
              content: askRecsMessageDetails.message,
              timestamp: new Date().toLocaleTimeString()
            };
            setMessages(prev => [...prev, agentAskRecsMessage]);
            setShowOptions(askRecsMessageDetails.options || []);
          }
        } else {
          console.warn("API response OK, but data structure might be unexpected or no recommendations found.");
          // Proceed to final_complete step with a generic message
          healthChatFlow.current.setCurrentStep('final_complete');
          const finalMessageDetails = healthChatFlow.current.getCurrentMessage();
           if (finalMessageDetails) {
             const noRecsAgentMessage: Message = {
               id: `agent-no-recs-fallback-${Date.now()}`,
               sender: 'agent',
               agentName: "Trợ lý dinh dưỡng NutriCare",
               content: finalMessageDetails.message, // Fallback to final complete message
               timestamp: new Date().toLocaleTimeString()
             };
             setMessages(prev => [...prev, noRecsAgentMessage]);
           }
           setIsCollectingInfo(false); 
        }
      } catch (error: any) {
        console.error('Error calling recommend_for_new_user API:', error);
        let errorContent = "Xin lỗi, đã có lỗi xảy ra khi lấy gợi ý món ăn. Vui lòng thử lại sau.";
        // ... (error handling as before)
        const errorMessage: Message = {
          id: `error-api-recs-${Date.now()}`,
          sender: 'system',
          content: errorContent,
          timestamp: new Date().toLocaleTimeString()
        };
        setMessages(prev => [...prev, errorMessage]);
        healthChatFlow.current.setCurrentStep('final_complete'); // Move to a final state on error
        setIsCollectingInfo(false);
      } finally {
        setIsLoading(false);
        // setShowOptions will be set by the ask_recommendations step or cleared if error
      }
    } else if (healthChatFlow.current.isFlowTrulyFinished() && currentStepAfterResponse === 'final_complete') {
        setIsCollectingInfo(false);
        setShowOptions([]);
    }
  }, [
    setMessages, setActiveTools, setShowSuggestions, setIsCollectingInfo, setShowOptions,
    setIsEmotionCameraOpen, apiRecommendations, handleViewRecommendationDetails, setIsLoading,
    healthChatFlow, // healthChatFlow.current is stable, but healthChatFlow itself is a ref object, stable.
    // MENU_TYPE_OPTIONS is a constant, stable.
]);

  const handleSendMessage = useCallback(async (messageContent?: string) => {
    const textInput = messageContent || inputValue;

    // --- Tool-based Actions (Triggered without text input sometimes) ---
    if (activeTools['weather-food']) {
      handleSuggestWeatherFood(); // Now handleSuggestWeatherFood will manage its own follow-up message
      setActiveTools({});
      setInputValue('');
      return;
    }
    if (activeTools['emotion-food']) {
      // Emotion food is handled by handleEmotionCapture which adds its own follow-up
      setIsEmotionCameraOpen(true);
      setActiveTools({});
      setInputValue('');
      // setTimeout(() => setShowFollowUpCard(true), 1200); // Old: Show follow up after camera (delay for UX)
      return;
    }
    // Add similar checks here if other tools can be triggered without text input

    // --- Regular Message / Health Info / Tool with Text Input ---

    // Check for health info collection first
    // If menu selection is active, and user types something, it means they want to exit the flow.
    if (isCollectingInfo && healthChatFlow.current.menuSelectionActive && textInput.trim()) {
        healthChatFlow.current.exitMenuSelectionFlow();
        setIsCollectingInfo(false); // Stop health info collection
        setShowOptions([]);
        // The typed message will be handled by the regular message sending logic below
    } else if (isCollectingInfo && textInput.trim() && !healthChatFlow.current.isFlowTrulyFinished()) {
        // This handles regular health info steps (name, gender, etc.) if user types instead of clicking buttons
        handleHealthInfoResponse(textInput);
        setInputValue('');
        return; // Return early as health info response handles adding messages
    }


    if (awaitingLocationInputForWeather && textInput.trim()) {
      // Don't call handleSuggestWeatherFood directly here anymore
      // The LocationSelector component will handle the submission via its onSubmit prop
      // We just need to clear the input if the user typed something unintended while the selector was shown
      // However, the input area might be disabled or hidden when the selector is active.
      // For now, just clear the input value state.
      setInputValue('');
      // We might want to add a message here like "Please use the location selector above."
      return;
    }

    // Check if sending is possible (covers text input, file upload, or tools requiring text)
    const isAnyToolActiveRequiringText = activeTools['menu-daily'] || activeTools['menu-weekly'] || activeTools['extended-thinking']; // Add other tools here if they need text
    if (!textInput.trim() && !uploadedFile && !isAnyToolActiveRequiringText) {
      console.log("No input, no active tool, and no file.");
      return;
    }
    if (isLoading) return;

    let agentsToActivate: AgentName[] = [];
    let contentToSend = textInput;
    let menuTimeframe: 'daily' | 'weekly' | undefined = undefined;
    let isReasoningRequest = false;

    if (activeTools['menu-daily']) {
      agentsToActivate.push(AGENT_NAMES.MENU_GENERATOR);
      menuTimeframe = 'daily';
      contentToSend = textInput || 'Tạo thực đơn hàng ngày mặc định';
    }
    if (activeTools['menu-weekly']) {
      agentsToActivate.push(AGENT_NAMES.MENU_GENERATOR);
      menuTimeframe = 'weekly';
      contentToSend = textInput || 'Tạo thực đơn hàng tuần mặc định';
    }
    if (activeTools['extended-thinking']) {
      agentsToActivate = [AGENT_NAMES.REASONING_PLANNER];
      isReasoningRequest = true;
    }

    let fileToSend = uploadedFile;
    if (fileToSend) {
      const fileIndicatorMessage: Message = {
        id: `user-file-indicator-${Date.now()}`,
        sender: 'user',
        content: `(Đã gửi file: ${fileToSend.name}) ${textInput || ''}`.trim(),
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, fileIndicatorMessage]);

      setUploadedFile(null);
      setUploadedFilePreview(null);
    } else if (textInput.trim()) {
      const newUserMessage: Message = {
        id: `user-${Date.now()}`,
        sender: 'user',
        content: textInput,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, newUserMessage]);
    }

    if (agentsToActivate.length === 0 && contentToSend.trim() && !isReasoningRequest && !fileToSend) {
      agentsToActivate.push(AGENT_NAMES.SYNTHESIZER);
    }
    
    setShowSuggestions(false);
    setInputValue('');
    setIsLoading(true);

    const thinkingMessageId = `agent-thinking-${Date.now()}`;
    const thinkingMessage: Message = {
      id: thinkingMessageId,
      sender: 'agent',
      content: <ThinkingAnimation />,
      isStreaming: true,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, thinkingMessage]);

    try {
      let userRecommendations: any[] | null = null;
      if (activeTools['menu-daily'] || activeTools['menu-weekly']) {
        const storedRecs = localStorage.getItem('userFoodRecommendations');
        if (storedRecs) {
          try {
            userRecommendations = JSON.parse(storedRecs);
          } catch (parseError) { console.error("Error parsing recommendations:", parseError); }
        }
      }

      let response: Response;
      const apiUrl = '/api/chat-mobi';

      if (fileToSend) {
        const formData = new FormData();
        formData.append('file', fileToSend);
        formData.append('input', contentToSend);
        formData.append('activeAgents', JSON.stringify(agentsToActivate));
        if (menuTimeframe) formData.append('menuTimeframe', menuTimeframe);
        formData.append('enableWebSearch', String(isWebSearchEnabled));
        formData.append('displayImages', imageDisplayMode);
        formData.append('userPreferences', JSON.stringify(userPreferences));
        if (userRecommendations) formData.append('userRecommendations', JSON.stringify(userRecommendations));

        response = await fetch(apiUrl, {
          method: 'POST',
          body: formData,
        });

      } else {
        const requestBody: any = {
          input: contentToSend,
          activeAgents: agentsToActivate,
          menuTimeframe: menuTimeframe,
          enableWebSearch: isWebSearchEnabled,
          displayImages: imageDisplayMode,
          userPreferences: userPreferences,
        };
        if (userRecommendations && Array.isArray(userRecommendations)) {
          requestBody.userRecommendations = userRecommendations;
        }

        response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      }

      setActiveTools({});
      setMessages(prev => prev.filter(msg => msg.id !== thinkingMessageId));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API error: ${response.status} ${response.statusText} - ${errorData.error || 'Unknown error'}`);
      }

      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('text/plain') && isReasoningRequest) {
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Failed to get reader for stream.");

        const decoder = new TextDecoder();
        let reasoningContent = '';
        const streamMessageId = `agent-stream-${Date.now()}`;

        setMessages(prev => [...prev, {
          id: streamMessageId,
          sender: 'agent',
          agentName: AGENT_NAMES.REASONING_PLANNER,
          content: '',
          isStreaming: true,
          isReasoningStream: true,
          timestamp: new Date().toLocaleTimeString(),
        }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          reasoningContent += chunk;

          setMessages(prev => prev.map(msg =>
            msg.id === streamMessageId ? { ...msg, content: reasoningContent } : msg
          ));
        }

        setMessages(prev => prev.map(msg =>
          msg.id === streamMessageId ? { ...msg, isStreaming: false } : msg
        ));

      } else if (contentType && contentType.includes('application/json')) {
        const resultData = await response.json();

        let agentMessage: Message | null = null;

        if (resultData && resultData.status === 'success') {
          if (resultData.agent === AGENT_NAMES.MENU_GENERATOR) {
            agentMessage = {
              id: `agent-${Date.now()}`,
              sender: 'agent',
              agentName: resultData.agent,
              menuData: resultData.menuData,
              menuType: resultData.menuType,
              agentFeedbacks: resultData.agentFeedbacks,
              interactionSteps: resultData.interactionSteps,
              citations: resultData.citations,
              timestamp: new Date().toLocaleTimeString(),
              rawResult: resultData,
            };
          } else if (resultData.agent === AGENT_NAMES.SYNTHESIZER) {
            agentMessage = {
              id: `agent-${Date.now()}`,
              sender: 'agent',
              agentName: "Trợ lý dinh dưỡng NutriCare",
              content: resultData.content,
              citations: resultData.citations,
              images: resultData.images,
              timestamp: new Date().toLocaleTimeString(),
              rawResult: resultData,
            };
          } else if (resultData.traceData || resultData.reasoningSteps) {
            agentMessage = {
              id: `agent-${Date.now()}`,
              sender: 'agent',
              agentName: resultData.agent,
              content: resultData.content,
              interactionSteps: resultData.traceData || resultData.reasoningSteps,
              timestamp: new Date().toLocaleTimeString(),
              rawResult: resultData,
            };
          } else {
            agentMessage = {
              id: `system-warn-${Date.now()}`,
              sender: 'system',
              content: `Nhận được phản hồi thành công nhưng cấu trúc không rõ ràng từ agent: ${resultData.agent || 'Unknown'}`,
              timestamp: new Date().toLocaleTimeString(),
            };
          }
        } else {
          agentMessage = {
            id: `error-agent-${Date.now()}`,
            sender: 'system',
            content: `Lỗi xử lý yêu cầu từ agent: ${resultData?.error || 'Lỗi không xác định từ máy chủ.'}`,
            timestamp: new Date().toLocaleTimeString(),
          };
        }

      if (agentMessage) {
        setMessages(prev => [...prev, agentMessage]);
        // Sau khi trả kết quả menu, hiện follow up action as a message
        if (activeTools['menu-daily'] || activeTools['menu-weekly']) {
          const followUpMenuMessage: Message = {
            id: `followup-action-menu-${Date.now()}`,
            sender: 'agent',
            agentName: "Trợ lý NutriCare",
            content: (
              <FollowUpActionCard
                options={[
                  // { key: "menu-daily", label: "Tạo thực đơn theo ngày", icon: <CalendarDays size={20} /> }, // Already did this or weekly
                  { key: "emotion-food", label: "Tạo thực đơn theo cảm xúc", icon: <Smile size={20} /> },
                  { key: "weather-food", label: "Tạo thực đơn theo thời tiết", icon: <CloudSun size={20} /> },
                  { key: "end", label: "Kết thúc", icon: <Sparkles size={20} /> }
                ]}
                onSelect={(key) => {
                  if (key === "end") {
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: `end-followup-menu-${Date.now()}`,
                        sender: 'agent',
                        agentName: "Trợ lý dinh dưỡng NutriCare",
                        content: "Cảm ơn bạn đã sử dụng các chức năng! Nếu cần hỗ trợ thêm, hãy hỏi mình nhé.",
                        timestamp: new Date().toLocaleTimeString()
                      }
                    ]);
                    return;
                  }
                  // if (key === "menu-daily") handleHealthInfoResponse("Tạo thực đơn theo ngày"); // Avoid re-triggering same menu
                  if (key === "emotion-food") handleHealthInfoResponse("Tạo thực đơn theo cảm xúc");
                  if (key === "weather-food") handleHealthInfoResponse("Tạo thực đơn theo thời tiết");
                }}
              />
            ),
            timestamp: new Date().toLocaleTimeString()
          };
          setMessages(prev => [...prev, followUpMenuMessage]);
        }
      }
      } else {
        const unexpectedResponseMessage: Message = {
          id: `error-contenttype-${Date.now()}`,
          sender: 'system',
          content: `Lỗi: Nhận được loại phản hồi không mong đợi từ máy chủ (${contentType || 'không xác định'}).`,
          timestamp: new Date().toLocaleTimeString()
        };
        setMessages(prev => [...prev, unexpectedResponseMessage]);
      }

    } catch (error: any) {
      console.error("Error sending message or processing response:", error);
      const networkErrorMessage: Message = {
        id: `error-network-${Date.now()}`,
        sender: 'system',
        content: `Lỗi mạng hoặc máy chủ: ${error.message || 'Không thể kết nối.'}`,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, networkErrorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [
    inputValue,
    isLoading,
    activeTools,
    isWebSearchEnabled,
    imageDisplayMode,
    uploadedFile,
    userPreferences,
    isCollectingInfo,
    inputValue,
    isLoading,
    activeTools,
    isWebSearchEnabled,
    imageDisplayMode,
    uploadedFile,
    userPreferences,
    isCollectingInfo,
    // handleSuggestWeatherFood,
    toast,
    handleHealthInfoResponse, // Added as it's used in onSelect of new FollowUpActionCard
    setMessages // Added as it's used in onSelect of new FollowUpActionCard
    // Ensure all functions called within handleSendMessage that are component methods or depend on state/props are stable or listed here.
  ]);

  const handleSpeak = useCallback((textToSpeak: string | undefined) => {
    if (!textToSpeak || !synthRef.current) {
      toast({ title: "Lỗi TTS", description: "Không có nội dung để đọc.", variant: "destructive" });
      return;
    }
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'vi-VN';
    synthRef.current.speak(utterance);
  }, [toast]);

  const handleCopy = useCallback((textToCopy: string | undefined) => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy)
      .then(() => toast({ title: "Đã sao chép!" }))
      .catch(() => toast({ title: "Lỗi sao chép", variant: "destructive" }));
  }, [toast]);

  const handleFeedbackAction = useCallback((action: 'like' | 'dislike', messageId: string) => {
    toast({ title: `Cảm ơn phản hồi!` });
  }, [toast]);

  const handleOpenUnderstandMeal = useCallback((mealName: string) => {
    if (!mealName) return;
    setSelectedMealForUnderstanding(mealName);
    setIsUnderstandMealOpen(true);
  }, []);

  const handleFindNearbyRestaurants = useCallback(async (mealName: string) => {
    // Keep existing implementation...
  }, [toast]);

  // handleViewRecommendationDetails is now defined earlier

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (isCollectingInfo && healthChatFlow.current.getCurrentStep() === 'greeting') { // Only for greeting, other steps use buttons or exit flow
        handleHealthInfoResponse(inputValue);
        setInputValue('');
      } else if (isCollectingInfo && healthChatFlow.current.menuSelectionActive) {
        // If in menu selection and user presses Enter, it means they want to exit the flow with their typed message
        healthChatFlow.current.exitMenuSelectionFlow();
        setIsCollectingInfo(false);
        setShowOptions([]);
        handleSendMessage(); // Send the typed message as a regular query
      }
       else {
        handleSendMessage();
      }
    }
  };

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      toast({ title: "Lỗi", description: "Chưa khởi tạo nhận diện giọng nói.", variant: "destructive" });
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (error) {
        toast({ title: "Lỗi", description: "Không thể bắt đầu nhận diện.", variant: "destructive" });
        setIsListening(false);
      }
    }
  }, [isListening, toast]);

  const toggleTool = (tool: string) => {
    setActiveTools(prev => {
      const newState = { ...prev };
      if (tool === 'menu-daily') {
        newState['menu-daily'] = !prev['menu-daily'];
        newState['menu-weekly'] = false;
        newState['extended-thinking'] = false;
        newState['weather-food'] = false;
        newState['emotion-food'] = false;
      } else if (tool === 'menu-weekly') {
        newState['menu-weekly'] = !prev['menu-weekly'];
        newState['menu-daily'] = false;
        newState['extended-thinking'] = false;
        newState['weather-food'] = false;
        newState['emotion-food'] = false;
      } else if (tool === 'extended-thinking') {
        newState['extended-thinking'] = !prev['extended-thinking'];
        newState['menu-daily'] = false;
        newState['menu-weekly'] = false;
        newState['weather-food'] = false;
        newState['emotion-food'] = false;
      } else if (tool === 'weather-food') {
        newState['weather-food'] = !prev['weather-food'];
        newState['menu-daily'] = false;
        newState['menu-weekly'] = false;
        newState['extended-thinking'] = false;
        newState['emotion-food'] = false;
      } else if (tool === 'emotion-food') {
        newState['emotion-food'] = !prev['emotion-food'];
        if (!prev['emotion-food']) {
          setIsEmotionCameraOpen(true);
        }
        newState['menu-daily'] = false;
        newState['menu-weekly'] = false;
        newState['extended-thinking'] = false;
        newState['weather-food'] = false;
      } else {
        newState[tool] = !prev[tool];
      }
      return newState;
    });
    setPopoverOpen(false);
  };

  const removeActiveTool = (toolToRemove: string) => {
    setActiveTools(prev => ({ ...prev, [toolToRemove]: false }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => setUploadedFilePreview(ev.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setUploadedFilePreview(null);
      }
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setUploadedFilePreview(null);
  };

  const handleWebSearchToggle = (checked: boolean) => {
    setIsWebSearchEnabled(checked);
  };

  const handleImageDisplayToggle = (checked: boolean) => {
    setImageDisplayMode(checked ? 'inline' : 'none');
  };

  const handleSuggestedActionClick = (command: string, actionId?: string) => {
    if (actionId === 'suggest-food-emotion') {
      logger.info("Emotion food suggestion action clicked.");
      setIsEmotionCameraOpen(true);
      setShowSuggestions(false); // Hide suggested actions when camera opens
    } else if (command === 'TRIGGER_WEATHER_FOOD_SUGGESTION' || actionId === 'suggest-weather-food') {
      // This will now trigger handleSuggestWeatherFood which then adds its own follow-up message
      toggleTool('weather-food'); // This will trigger the logic in handleSendMessage
      // handleSuggestWeatherFood(); // Directly call if it's a dedicated action - NO, use toggleTool
    } else {
      handleSendMessage(command);
    }
  };

  const handleEmotionCapture = useCallback(async (imageBase64: string) => {
    setIsEmotionCameraOpen(false); // Close camera
    // Don't set global isLoading, manage steps with messages
    // setIsLoading(true); 

    // Step 1: Add "Detecting emotion..." message
    const detectingEmotionMessageId = `agent-detecting-emotion-${Date.now()}`;
    const detectingEmotionMessage: Message = {
      id: detectingEmotionMessageId,
      sender: 'agent',
      agentName: "Trợ lý NutriCare",
      content: "Đã chụp ảnh. Đang nhận diện cảm xúc...", // Updated message
      timestamp: new Date().toLocaleTimeString(),
      // Optionally add a loading indicator within the message content
      // content: <div className="flex items-center gap-2"><span>Đã chụp ảnh. Đang nhận diện cảm xúc...</span><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>,
    };
    setMessages((prevMessages: Message[]) => [...prevMessages, detectingEmotionMessage]);

    let findingFoodMessageId = ''; // Keep track of the next message ID

    try {
      const storedRecsString: string | null = localStorage.getItem('userFoodRecommendations');
      const foodItemsFromLocalStorage: ApiRecommendationItem[] = storedRecsString ? JSON.parse(storedRecsString) : [];

      if (foodItemsFromLocalStorage.length === 0) {
        // Consider adding a user-facing message here via setMessages
        logger.warn("EmotionCapture: No food items in local storage.");
        setMessages((prevMessages: Message[]) => [...prevMessages, {
          id: `error-no-local-recs-${Date.now()}`,
          sender: 'system',
          content: "Không tìm thấy danh sách món ăn đã lưu. Vui lòng hoàn tất thông tin sức khỏe ban đầu hoặc thêm món ăn.",
          timestamp: new Date().toLocaleTimeString()
        }]);
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/emotion-food-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, foodItemsFromLocalStorage }),
      });

      // Remove the "Detecting emotion..." message immediately after fetch starts
      setMessages((prevMessages: Message[]) => prevMessages.filter(msg => msg.id !== detectingEmotionMessageId));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Lỗi không xác định từ máy chủ" }));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const result = await response.json();
      const detectedEmotion = result.detectedEmotion || "không xác định"; // Get detected emotion from response

      // Step 2: Add "Emotion detected, finding food..." message
      findingFoodMessageId = `agent-finding-food-${Date.now()}`; // Assign ID here
      const findingFoodMessage: Message = {
          id: findingFoodMessageId,
          sender: 'agent',
          agentName: "Trợ lý NutriCare",
          // Capitalize the first letter of the emotion for display
          content: `Cảm xúc được nhận diện: **${detectedEmotion.charAt(0).toUpperCase() + detectedEmotion.slice(1)}**. Đang tìm món ăn phù hợp...`,
          timestamp: new Date().toLocaleTimeString(),
          // Optionally add a loader here too
          // content: <div className="flex items-center gap-2"><span>Cảm xúc được nhận diện: **${detectedEmotion.charAt(0).toUpperCase() + detectedEmotion.slice(1)}**. Đang tìm món ăn phù hợp...</span><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>,
      };
      setMessages((prevMessages: Message[]) => [...prevMessages, findingFoodMessage]);

      // Simulate a small delay before showing results for better UX perception
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay

      // Step 3: Remove "Finding food..." message and display Explanation and Recommendations
      setMessages((prevMessages: Message[]) => prevMessages.filter(msg => msg.id !== findingFoodMessageId));

      const finalMessages: Message[] = [];
      if (result.explanation) {
        const explanationMessage: Message = {
          id: `agent-emotion-explanation-${Date.now()}`,
          sender: 'agent',
          agentName: "Trợ lý NutriCare",
          content: result.explanation,
          timestamp: new Date().toLocaleTimeString(),
        };
        finalMessages.push(explanationMessage);
      }

      if (result.suggestions && result.suggestions.length > 0) {
        const recsMessage: Message = {
          id: `agent-emotion-recs-${Date.now()}`,
          sender: 'agent',
          agentName: "Trợ lý NutriCare",
          content: <RecommendationList
                      recommendations={result.suggestions}
                      title="Dựa trên cảm xúc của bạn, đây là một vài gợi ý:"
                      onViewDetails={handleViewRecommendationDetails}
                   />,
          timestamp: new Date().toLocaleTimeString(),
        };
        finalMessages.push(recsMessage);
      } else if (!result.explanation && finalMessages.length === 0) { // Only show "no suggestions" if nothing else was added
        const noRecsMessage: Message = {
          id: `agent-no-emotion-recs-${Date.now()}`,
          sender: 'agent',
          agentName: "Trợ lý NutriCare",
          content: "Không tìm thấy gợi ý món ăn phù hợp với cảm xúc của bạn lúc này.",
          timestamp: new Date().toLocaleTimeString(),
        };
        finalMessages.push(noRecsMessage);
      }

      // Add final messages together
      if (finalMessages.length > 0) {
        setMessages((prevMessages: Message[]) => [...prevMessages, ...finalMessages]);
      }

      // Sau khi trả kết quả, hỏi tiếp follow up action
      setTimeout(() => {
        setMessages((prevMessages: Message[]) => [
          ...prevMessages,
          {
            id: `followup-action-${Date.now()}`,
            sender: 'agent',
            agentName: "Trợ lý NutriCare",
            content: (
              <FollowUpActionCard
                options={[
                  { key: "menu-daily", label: "Tạo thực đơn theo ngày", icon: <CalendarDays size={20} /> },
                  { key: "weather-food", label: "Tạo thực đơn theo thời tiết", icon: <CloudSun size={20} /> },
                  { key: "end", label: "Kết thúc", icon: <Sparkles size={20} /> }
                ]}
                onSelect={(key) => {
                  if (key === "menu-daily") {
                    setActiveTools({ 'menu-daily': true });
                    setShowSuggestions(false);
                  } else if (key === "weather-food") {
                    setActiveTools({ 'weather-food': true });
                    setShowSuggestions(false);
                  } else if (key === "end") {
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: `end-chat-${Date.now()}`,
                        sender: 'agent',
                        agentName: "Trợ lý NutriCare",
                        content: "Cảm ơn bạn đã sử dụng các chức năng! Nếu cần hỗ trợ thêm, hãy nhắn cho mình nhé.",
                        timestamp: new Date().toLocaleTimeString()
                      }
                    ]);
                  }
                }}
              />
            ),
            timestamp: new Date().toLocaleTimeString()
          }
        ]);
      }, 500);

    } catch (error: any) {
      logger.error("Error in handleEmotionCapture:", error);
      // Remove intermediate messages on error
      setMessages((prevMessages: Message[]) => prevMessages.filter(msg =>
          msg.id !== detectingEmotionMessageId && msg.id !== findingFoodMessageId
      ));
      const errorMessage: Message = {
        id: `error-emotion-food-${Date.now()}`,
        sender: 'system', // Keep as system message
        content: `Lỗi khi lấy gợi ý món ăn theo cảm xúc: ${error.message}`,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages((prevMessages: Message[]) => [...prevMessages, errorMessage]);
    } finally {
      // Ensure global loading is off if it was ever set (though we removed the initial setIsLoading(true))
      setIsLoading(false);
    }
  }, [setIsEmotionCameraOpen, setIsLoading, setMessages, handleViewRecommendationDetails, logger, handleHealthInfoResponse]); // Added handleHealthInfoResponse

  const handleEmotionCameraClose = useCallback(() => {
    setIsEmotionCameraOpen(false);
  }, [setIsEmotionCameraOpen]);

  // Forward declaration for handleSuggestWeatherFood to satisfy handleManualLocationSubmit's dependency.
  // This is a common pattern for mutually recursive useCallback hooks.
  const handleSuggestWeatherFoodRef = useRef<((manualAddress?: string) => Promise<void>) | null>(null);

  const handleManualLocationSubmit = useCallback((locationString: string) => {
    setMessages((prevMessages: Message[]) => prevMessages.filter((msg: Message) => !msg.id.startsWith('agent-location-selector-')));
    if (handleSuggestWeatherFoodRef.current) {
      handleSuggestWeatherFoodRef.current(locationString);
    } else {
      console.error("handleSuggestWeatherFoodRef.current is not yet defined in handleManualLocationSubmit");
      // Fallback or error message to user might be needed here if this state is reachable
    }
  }, [setMessages]); // handleSuggestWeatherFoodRef.current is stable as ref itself is stable

  const handleSuggestWeatherFood = useCallback(async (manualAddress?: string) => {
    setShowSuggestions(false);
    setIsLoading(true);
    let suggestionProcessCompleted = false;

    let locationPayload: { lat?: number; lng?: number; address?: string } = {};

    if (manualAddress) {
      locationPayload = { address: manualAddress };
      const userMessage: Message = {
        id: `user-manual-address-${Date.now()}`,
        sender: 'user',
        content: `Tìm món ăn cho khu vực: ${manualAddress}`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prevMessages: Message[]) => [...prevMessages, userMessage]);
    } else {
      if (navigator.geolocation) {
        const loadingMessage: Message = {
          id: `agent-getting-location-${Date.now()}`,
          sender: 'agent',
          agentName: "Trợ lý NutriCare",
          content: "Đang xác định vị trí của bạn...",
          timestamp: new Date().toLocaleTimeString(),
        };
        setMessages((prevMessages: Message[]) => [...prevMessages, loadingMessage]);
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true, timeout: 10000, maximumAge: 0
            });
          });
          locationPayload = { lat: position.coords.latitude, lng: position.coords.longitude };
          const locationResponseMessage: Message = {
            id: `agent-location-success-${Date.now()}`,
            sender: 'agent',
            agentName: "Trợ lý NutriCare",
            content: `Đã xác định vị trí của bạn. Đang tìm món ăn...`,
            timestamp: new Date().toLocaleTimeString(),
          };
          setMessages((prevMessages: Message[]) => prevMessages.map((m: Message) => m.id === loadingMessage.id ? locationResponseMessage : m));
        } catch (geoError: any) {
          logger.error("Geolocation error:", geoError);
          setMessages((prevMessages: Message[]) => prevMessages.filter((m: Message) => m.id !== loadingMessage.id));
          const locationSelectorMessage: Message = {
            id: `agent-location-selector-${Date.now()}`,
            sender: 'agent',
            agentName: "Trợ lý NutriCare",
            content: <LocationSelector onSubmit={handleManualLocationSubmit} />,
            timestamp: new Date().toLocaleTimeString(),
          };
          setMessages((prevMessages: Message[]) => [...prevMessages, locationSelectorMessage]);
          setIsLoading(false);
          return;
        }
      } else {
        const noGeoMessage: Message = {
          id: `agent-location-selector-${Date.now()}`,
          sender: 'agent',
          agentName: "Trợ lý NutriCare",
          content: <LocationSelector onSubmit={handleManualLocationSubmit} />,
          timestamp: new Date().toLocaleTimeString(),
        };
        setMessages((prevMessages: Message[]) => [...prevMessages, noGeoMessage]);
        setIsLoading(false);
        return;
      }
    }

    const storedRecsString: string | null = localStorage.getItem('userFoodRecommendations');
    const foodList: ApiRecommendationItem[] = storedRecsString ? JSON.parse(storedRecsString) : [];

    if (foodList.length === 0) {
      const noFoodDataMessage: Message = {
        id: `agent-no-food-data-${Date.now()}`,
        sender: 'agent',
        agentName: "Trợ lý NutriCare",
        content: "Không tìm thấy danh sách món ăn đã lưu của bạn. Vui lòng hoàn tất thông tin sức khỏe ban đầu để nhận gợi ý.",
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prevMessages: Message[]) => [...prevMessages, noFoodDataMessage]);
      setIsLoading(false);
      suggestionProcessCompleted = true; // Still show follow-up options
      // No, if no food data, don't show follow-up for weather suggestions. User needs to complete profile.
      // Let's reconsider this. If the process ends here, a follow-up might still be valid.
      // For now, let's keep suggestionProcessCompleted = true to show follow-up.
      // The user might want to try another tool.
    }
    
    if (!suggestionProcessCompleted) { // Only proceed if not already returned due to no food list
        const thinkingMessageId = `agent-thinking-weather-food-${Date.now()}`;
        const thinkingMessage: Message = {
          id: thinkingMessageId,
          sender: 'agent',
          content: <ThinkingAnimation />,
          isStreaming: true,
          timestamp: new Date().toLocaleTimeString()
        };
        setMessages((prevMessages: Message[]) => [...prevMessages, thinkingMessage]);

        try {
          const response = await fetch('/api/weather-food-suggestions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location: locationPayload, foodItems: foodList }),
          });
          setMessages((prevMessages: Message[]) => prevMessages.filter((msg: Message) => msg.id !== thinkingMessageId));
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "Lỗi không xác định từ máy chủ" }));
            throw new Error(errorData.error || `API error: ${response.status}`);
          }
          const result = await response.json();
          if (result.weatherData && result.explanation) {
            const weatherText = result.weatherData.description || 'Không rõ';
            const locationName = manualAddress || 'vị trí hiện tại của bạn';
            const explanationMessageContent = `Thời tiết tại ${locationName}: ${result.weatherData.temperature}°C, ${weatherText}. ${result.explanation}`;
            const explanationMessage: Message = {
              id: `agent-weather-explanation-${Date.now()}`,
              sender: 'agent',
              agentName: "Trợ lý NutriCare",
              content: explanationMessageContent,
              timestamp: new Date().toLocaleTimeString(),
            };
            setMessages((prevMessages: Message[]) => [...prevMessages, explanationMessage]);
          }
          if (result.recommendations && result.recommendations.length > 0) {
            const recsMessage: Message = {
              id: `agent-weather-recs-${Date.now()}`,
              sender: 'agent',
              agentName: "Trợ lý NutriCare",
              content: <RecommendationList
                          recommendations={result.recommendations}
                          title="Dưới đây là một vài gợi ý:"
                          onViewDetails={handleViewRecommendationDetails}
                       />,
              timestamp: new Date().toLocaleTimeString(),
            };
            setMessages((prevMessages: Message[]) => [...prevMessages, recsMessage]);
          } else {
             const noRecsMessage: Message = {
              id: `agent-no-weather-recs-${Date.now()}`,
              sender: 'agent',
              agentName: "Trợ lý NutriCare",
              content: result.message || "Không tìm thấy gợi ý món ăn phù hợp với thời tiết hiện tại.",
              timestamp: new Date().toLocaleTimeString(),
            };
            setMessages((prevMessages: Message[]) => [...prevMessages, noRecsMessage]);
          }
          suggestionProcessCompleted = true;
        } catch (error: any) {
          logger.error("Error in handleSuggestWeatherFood:", error);
          setMessages((prevMessages: Message[]) => prevMessages.filter((msg: Message) => msg.id !== thinkingMessageId));
          const errorMessage: Message = {
            id: `error-weather-food-${Date.now()}`,
            sender: 'system',
            content: `Lỗi khi lấy gợi ý món ăn theo thời tiết: ${error.message}`,
            timestamp: new Date().toLocaleTimeString()
          };
          setMessages((prevMessages: Message[]) => [...prevMessages, errorMessage]);
          suggestionProcessCompleted = true;
        }
    }
    // Common finally block for all paths that reach this point
    setIsLoading(false);
    if (suggestionProcessCompleted) {
      const followUpMessage: Message = {
        id: `followup-weather-${Date.now()}`,
        sender: 'agent',
        agentName: "Trợ lý NutriCare",
        content: (
          <FollowUpActionCard
            options={[
              { key: "menu-daily", label: "Tạo thực đơn theo ngày", icon: <CalendarDays size={20} /> },
              { key: "emotion-food", label: "Tạo thực đơn theo cảm xúc", icon: <Smile size={20} /> },
              { key: "end", label: "Kết thúc", icon: <Sparkles size={20} /> }
            ]}
            onSelect={(key) => {
              if (key === "end") {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `end-followup-weather-${Date.now()}`,
                    sender: 'agent',
                    agentName: "Trợ lý dinh dưỡng NutriCare",
                    content: "Cảm ơn bạn đã sử dụng các chức năng! Nếu cần hỗ trợ thêm, hãy hỏi mình nhé.",
                    timestamp: new Date().toLocaleTimeString()
                  }
                ]);
                return;
              }
              if (key === "menu-daily") handleHealthInfoResponse("Tạo thực đơn theo ngày");
              if (key === "emotion-food") handleHealthInfoResponse("Tạo thực đơn theo cảm xúc");
            }}
          />
        ),
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, followUpMessage]);
    }
  }, [
    setMessages,
    setIsLoading,
    setShowSuggestions,
    logger,
    handleViewRecommendationDetails,
    handleHealthInfoResponse,
    handleManualLocationSubmit // Now handleManualLocationSubmit is a stable ref from its own useCallback
  ]);

  // Assign the memoized function to the ref after it's defined.
  useEffect(() => {
    handleSuggestWeatherFoodRef.current = handleSuggestWeatherFood;
  }, [handleSuggestWeatherFood]);


  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden bg-background">
      <UserProfileBanner />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsContent value="chat" className="flex-1 overflow-hidden m-0 data-[state=active]:flex data-[state=active]:flex-col">
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-6 pb-4 max-w-3xl mx-auto">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={{
                    ...message,
                    content: createMessageWithActions(message)
                  }}
                  imageDisplayMode={imageDisplayMode}
                  onCopy={handleCopy}
                  onSpeak={handleSpeak}
                  onFeedback={handleFeedbackAction}
              onOpenUnderstandMeal={handleOpenUnderstandMeal}
              onFindNearbyRestaurants={handleFindNearbyRestaurants}
              // Note: onViewDetails is passed down within the RecommendationList component content
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <ChatInputArea
              inputValue={inputValue}
              isLoading={isLoading}
              isListening={isListening}
              activeTools={activeTools}
              popoverOpen={popoverOpen}
              isWebSearchEnabled={isWebSearchEnabled}
              imageDisplayMode={imageDisplayMode}
              uploadedFile={uploadedFile}
              uploadedFilePreview={uploadedFilePreview}
              showSuggestions={showSuggestions}
              messagesLength={messages.length}
              onInputChange={handleInputChange}
              onSendMessage={handleSendMessage}
              onKeyPress={handleKeyPress}
              onToggleListening={toggleListening}
              onToggleTool={toggleTool}
              onRemoveTool={removeActiveTool}
              onFileChange={handleFileChange}
              onRemoveFile={handleRemoveFile}
              onWebSearchToggle={handleWebSearchToggle}
              onImageDisplayToggle={handleImageDisplayToggle}
              onPopoverOpenChange={setPopoverOpen}
              onSuggestedActionClick={handleSuggestedActionClick}
            />
        </TabsContent>

        <TabsContent value="history" className="flex-1 overflow-hidden m-0 data-[state=active]:flex data-[state=active]:flex-col">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-8 max-w-md">
              <AlarmClock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nhật ký dinh dưỡng</h3>
              <p className="text-muted-foreground mb-4">
                Tính năng đang được phát triển.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pantry" className="flex-1 overflow-hidden m-0 data-[state=active]:flex data-[state=active]:flex-col">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-8 max-w-md">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Quản lý tủ đồ</h3>
              <p className="text-muted-foreground mb-4">
                Tính năng đang được phát triển.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {selectedMealForUnderstanding && (
        <UnderstandMealDialog
          mealName={selectedMealForUnderstanding}
          open={isUnderstandMealOpen}
          onOpenChange={(open: boolean) => {
            setIsUnderstandMealOpen(open);
            if (!open) setSelectedMealForUnderstanding(null);
          }}
        />
      )}

      {/* Render the Details Dialog */}
      {selectedRecommendationForDetails && (
        <RecommendationDetailsDialog
          item={selectedRecommendationForDetails}
          open={isDetailsDialogOpen}
          onOpenChange={(open: boolean) => {
            setIsDetailsDialogOpen(open);
            if (!open) {
              setSelectedRecommendationForDetails(null);
            }
          }}
        />
      )}

      <EmotionCameraCapture
        isOpen={isEmotionCameraOpen}
        onCapture={handleEmotionCapture}
        onClose={handleEmotionCameraClose}
      />

      {/* Follow Up Action Card is now rendered as part of messages */}
    </div>
  );
}
