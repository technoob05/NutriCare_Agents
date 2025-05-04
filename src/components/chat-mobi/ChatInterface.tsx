'use client';

// --- Core React/Next.js Imports ---
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation'; // Import useSearchParams

// --- UI Components ---
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button"; // Keep Button if used elsewhere
import { Badge } from "@/components/ui/badge"; // Keep Badge if used elsewhere
import ThinkingAnimation from "@/components/ui/thinking-animation";
import { UnderstandMealDialog } from "@/components/UnderstandMealDialog";

// --- Icons ---
import {
  AlarmClock, Database, Loader2, MapPin, // Add MapPin back
} from 'lucide-react';

// --- Custom Components ---
import { UserProfileBanner } from './UserProfileBanner';
import { ChatMessage, Message } from './ChatMessage'; // Import Message type from ChatMessage
import { ChatInputArea } from './ChatInputArea';

// --- Hooks & Utils ---
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// --- Services & Types ---
import type { OsmRestaurant } from '@/services/openstreetmap';
import type { AgentInteractionStep } from '@/components/ui/AgentInteractionVisualizer'; // Import if needed by Message type
// Removed: import type { Dispatch, SetStateAction } from 'react';

// --- Define Agent Names (Constants) ---
// Consider moving to a shared constants file if used elsewhere
const AGENT_NAMES = {
  NUTRITION_ANALYSIS: 'Nutrition Analysis',
  HEALTHY_SWAP: 'Healthy Swap Advisor',
  MEAL_SCORING: 'Meal Health Scoring',
  GOAL_ALIGNMENT: 'Goal Alignment',
  MENU_GENERATOR: 'Menu Generator',
  SYNTHESIZER: 'Synthesizer',
  REASONING_PLANNER: 'Reasoning & Planning',
} as const;

// Define AgentName type correctly
type AgentName = typeof AGENT_NAMES[keyof typeof AGENT_NAMES];

// Message type is imported from ChatMessage.tsx

// Removed props interface

export function ChatInterface() {
  // --- Hooks ---
  const searchParams = useSearchParams();
  const chatId = searchParams.get('id'); // Get chat ID from URL
  const { toast } = useToast(); // Keep for notifications

  // --- State Management ---
  // Initialize messages state - will be overwritten by loaded data
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [activeTools, setActiveTools] = useState<{ [tool: string]: boolean }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true); // Keep suggestion logic for now
  const [popoverOpen, setPopoverOpen] = useState(false); // Input area state
  const [isListening, setIsListening] = useState(false); // Input area state
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false); // Input area state
  const [imageDisplayMode, setImageDisplayMode] = useState<'inline' | 'none'>('inline'); // Input/Message state
  const [isUnderstandMealOpen, setIsUnderstandMealOpen] = useState(false); // Dialog state
  const [selectedMealForUnderstanding, setSelectedMealForUnderstanding] = useState<string | null>(null); // Dialog state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null); // Input area state
  const [uploadedFilePreview, setUploadedFilePreview] = useState<string | null>(null); // Input area state
  const [activeTab, setActiveTab] = useState<string>('chat'); // Tab state
  const [userPreferences, setUserPreferences] = useState({ // Keep preferences state
    dietaryRestrictions: [],
    healthGoals: [],
    allergies: [],
    favoriteCuisines: []
  });

  // --- Refs ---
  const scrollAreaRef = useRef<HTMLDivElement>(null); // Keep for scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null); // Keep for scrolling
  const recognitionRef = useRef<SpeechRecognition | null>(null); // Keep for STT
  const synthRef = useRef<SpeechSynthesis | null>(null); // Keep for TTS
  // fileInputRef is now inside ChatInputArea

  // --- Effects ---

  // Load messages from localStorage on mount or when chatId changes
  useEffect(() => {
    if (chatId) {
      const key = `chatMobiMessages_${chatId}`;
      console.log(`ChatInterface: Loading messages for ID ${chatId} from key ${key}`); // Debug log
      const storedMessages = localStorage.getItem(key);
      if (storedMessages) {
        try {
          const parsedMessages = JSON.parse(storedMessages);
          // Basic validation: check if it's an array
          if (Array.isArray(parsedMessages)) {
             setMessages(parsedMessages);
             console.log(`ChatInterface: Loaded ${parsedMessages.length} messages.`); // Debug log
          } else {
             console.error(`ChatInterface: Invalid data found in localStorage for key ${key}. Resetting.`);
             localStorage.removeItem(key);
             setMessages([ // Reset to default if data is invalid
               { id: 'init-system-error', sender: 'system', content: 'Lỗi tải lịch sử chat. Bắt đầu cuộc trò chuyện mới.', timestamp: new Date().toLocaleTimeString() },
             ]);
          }
        } catch (e) {
          console.error(`ChatInterface: Failed to parse messages from localStorage for key ${key}:`, e);
          localStorage.removeItem(key); // Remove corrupted data
          setMessages([ // Reset to default on parse error
             { id: 'init-system-parse-error', sender: 'system', content: 'Lỗi tải lịch sử chat. Bắt đầu cuộc trò chuyện mới.', timestamp: new Date().toLocaleTimeString() },
          ]);
        }
      } else {
        console.log(`ChatInterface: No messages found for key ${key}. Initializing.`); // Debug log
        // Initialize with default message if no history exists for this ID
        setMessages([
          { id: 'init-system-new', sender: 'system', content: 'Chào mừng bạn đến với NutriCare Agents! Tôi là trợ lý dinh dưỡng AI cá nhân hóa...', timestamp: new Date().toLocaleTimeString() },
        ]);
      }
    } else {
       console.log("ChatInterface: No chatId found in URL. Initializing default."); // Debug log
       // Handle case where there's no ID (e.g., navigating directly to /chat-mobi)
       setMessages([
         { id: 'init-system-no-id', sender: 'system', content: 'Chào mừng! Bắt đầu cuộc trò chuyện mới hoặc chọn một từ lịch sử.', timestamp: new Date().toLocaleTimeString() },
       ]);
    }
  }, [chatId]); // Re-run when chatId changes

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (chatId && messages.length > 0) { // Only save if there's an ID and messages exist
      const key = `chatMobiMessages_${chatId}`;
      console.log(`ChatInterface: Saving ${messages.length} messages to key ${key}`); // Debug log
      try {
        localStorage.setItem(key, JSON.stringify(messages));
      } catch (e) {
         console.error(`ChatInterface: Failed to save messages to localStorage for key ${key}:`, e);
         // Maybe show a toast notification to the user?
         toast({
            title: "Lỗi Lưu Trữ",
            description: "Không thể lưu lịch sử trò chuyện vào bộ nhớ cục bộ. Bộ nhớ có thể đã đầy.",
            variant: "destructive",
            duration: 5000
         });
      }
    }
  }, [messages, chatId, toast]); // Re-run when messages or chatId change

  // Scroll to bottom when messages change
  // Keep this effect
  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [messages]);

  // Speech Synthesis and Recognition Setup
  // Keep this effect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis; // Keep TTS setup

      if (!('webkitSpeechRecognition' in window)) {
        console.warn("Speech Recognition Not Supported");
        return;
      }

      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'vi-VN';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[event.results.length - 1]?.[0]?.transcript ?? '';
        if (transcript) {
          setInputValue(prev => prev + transcript);
        }
      };
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Input Speech Recognition Error:", event.error, event.message);
        let errorMessage = "Lỗi nhận diện giọng nói.";
        if (event.error === 'no-speech') errorMessage = "Không nhận diện được giọng nói.";
        else if (event.error === 'not-allowed' || event.error === 'audio-capture') errorMessage = "Không thể truy cập micro.";
        else if (event.error === 'network') errorMessage = "Lỗi mạng khi nhận diện.";
        else if (event.error === 'aborted') return;

        toast({ title: "Lỗi Ghi Âm", description: errorMessage, variant: "destructive" });
        setIsListening(false);
      };
      recognitionRef.current = recognition; // Assign the single instance
    }
    return () => {
      recognitionRef.current?.abort();
      synthRef.current?.cancel();
    };
  }, [toast]); // Keep toast dependency

  // --- Handlers for Special Features (passed down as props) ---
  // Keep these handlers as they contain logic beyond simple state updates
  const handleOpenUnderstandMeal = useCallback((mealName: string) => {
    if (!mealName) {
      console.warn("No meal name provided for understanding");
      return;
    }
    console.log("Opening understand meal dialog for:", mealName);
    setSelectedMealForUnderstanding(mealName);
    setIsUnderstandMealOpen(true);
  }, []); // Keep empty dependency array

  const handleFindNearbyRestaurants = useCallback(async (mealName: string) => {
    if (!mealName) {
      toast({ title: "Lỗi", description: "Không có tên món ăn để tìm kiếm.", variant: "destructive" });
      return;
    }

    if (!navigator.geolocation) {
      toast({ title: "Lỗi", description: "Trình duyệt không hỗ trợ định vị.", variant: "destructive" });
      return;
    }

    const { id: loadingToastId, dismiss: dismissLoadingToast, update: updateLoadingToast } = toast({
      title: "Đang tìm quán ăn...",
      description: `Tìm các quán gần bạn bán "${mealName}"...`,
      duration: 999999,
    });
    setIsLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log(`Location found: ${latitude}, ${longitude}. Searching for ${mealName}`);

        try {
          const apiUrl = `/api/nearby-restaurants?lat=${latitude}&lon=${longitude}&query=${encodeURIComponent(mealName)}&radius=2000`;
          const response = await fetch(apiUrl);

          if (updateLoadingToast) {
            updateLoadingToast({ id: loadingToastId, title: "Đang xử lý...", description: "Đã lấy dữ liệu, đang hiển thị kết quả." });
          } else {
            if (dismissLoadingToast) dismissLoadingToast();
            toast({ title: "Đang xử lý...", description: "Đã lấy dữ liệu, đang hiển thị kết quả." });
          }

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `API error: ${response.status}`);
          }

          const restaurants: OsmRestaurant[] = await response.json();
          console.log(`Found ${restaurants.length} restaurants for "${mealName}"`);

          let resultMessageContent: string | React.ReactNode;
          if (restaurants.length > 0) {
            resultMessageContent = (
              <div className="space-y-2">
                <p>Tìm thấy {restaurants.length} quán ăn gần bạn có thể bán "{mealName}":</p>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  {restaurants.slice(0, 5).map(r => (
                    <li key={r.id} className="pb-2">
                      <strong className="text-emerald-600 dark:text-emerald-400">{r.tags.name || 'Quán không tên'}</strong>
                      {r.tags.cuisine && ` (${r.tags.cuisine})`}
                      {(r.tags.addr_housenumber || r.tags.addr_street) &&
                        <span className="text-muted-foreground ml-1">
                          ({`${r.tags.addr_housenumber || ''} ${r.tags.addr_street || ''}`.trim()})
                        </span>
                      }
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}&query_place_id=osm_node_${r.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-500 hover:underline text-xs inline-flex items-center"
                      >
                        <MapPin className="h-3 w-3 mr-1" /> Xem trên bản đồ
                      </a>
                    </li>
                  ))}
                </ul>
                {restaurants.length > 5 && <p className="text-xs text-muted-foreground">... và {restaurants.length - 5} quán khác.</p>}
              </div>
            );
          } else {
            resultMessageContent = `Không tìm thấy quán ăn nào gần bạn bán "${mealName}" trong bán kính tìm kiếm.`;
          }

          const resultMessage: Message = {
            id: `system-nearby-${Date.now()}`,
            sender: 'system',
            content: resultMessageContent,
            timestamp: new Date().toLocaleTimeString(),
          };
          setMessages(prev => [...prev, resultMessage]);

          if (updateLoadingToast) {
             updateLoadingToast({ 
               id: loadingToastId, 
               title: "Tìm kiếm hoàn tất", 
               description: `Đã tìm thấy ${restaurants.length} quán ăn cho "${mealName}".`, 
               duration: 3000 
             });
          } else {
            if (dismissLoadingToast) dismissLoadingToast();
            toast({ 
              title: "Tìm kiếm hoàn tất", 
              description: `Đã tìm thấy ${restaurants.length} quán ăn cho "${mealName}".`, 
              duration: 3000 
            });
          }
        } catch (error: any) {
          console.error("Error fetching nearby restaurants:", error);
          if (updateLoadingToast) {
            updateLoadingToast({ 
              id: loadingToastId, 
              title: "Lỗi tìm kiếm", 
              description: `Không thể tìm quán ăn: ${error.message}`, 
              variant: "destructive", 
              duration: 5000 
            });
          } else {
            if (dismissLoadingToast) dismissLoadingToast();
            toast({ 
              title: "Lỗi tìm kiếm", 
              description: `Không thể tìm quán ăn: ${error.message}`, 
              variant: "destructive", 
              duration: 5000 
            });
          }
          const errorMessage: Message = {
            id: `error-nearby-${Date.now()}`,
            sender: 'system',
            content: `Đã xảy ra lỗi khi tìm quán ăn gần bạn cho món "${mealName}". Vui lòng thử lại.`,
            timestamp: new Date().toLocaleTimeString(),
          };
          setMessages(prev => [...prev, errorMessage]);
        } finally {
          setIsLoading(false);
        }
      },
      (error: GeolocationPositionError) => {
        console.error("Geolocation error:", error);
        let errorDesc = `Không thể lấy vị trí của bạn (Lỗi ${error.code}).`;
        if (error.code === error.PERMISSION_DENIED) {
          errorDesc = "Bạn đã từ chối quyền truy cập vị trí. Vui lòng kiểm tra cài đặt trình duyệt.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorDesc = "Thông tin vị trí không khả dụng.";
        } else if (error.code === error.TIMEOUT) {
          errorDesc = "Yêu cầu vị trí đã hết hạn.";
        }
        
        const finalErrorTitle = "Lỗi định vị";
        const finalErrorDesc = errorDesc;

        if (updateLoadingToast) {
          updateLoadingToast({ 
            id: loadingToastId, 
            title: finalErrorTitle, 
            description: finalErrorDesc, 
            variant: "destructive", 
            duration: 5000 
          });
        } else {
          if (dismissLoadingToast) dismissLoadingToast();
          toast({ 
            title: finalErrorTitle, 
            description: finalErrorDesc, 
            variant: "destructive", 
            duration: 5000 
          });
        }
        setIsLoading(false);
        const errorMessage: Message = {
          id: `error-location-${Date.now()}`,
          sender: 'system',
          content: finalErrorDesc,
          timestamp: new Date().toLocaleTimeString(),
        };
        setMessages(prev => [...prev, errorMessage]);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      // ... (rest of the find nearby logic remains the same) ...
      }
    );
  }, [toast]); // Keep toast dependency

  // --- Core Send Message Logic ---
  // Keep this handler as it contains the main API call logic
  const handleSendMessage = useCallback(async (messageContent?: string) => {
    const textInput = messageContent || inputValue;
    // Check if any tool is *truly* active (value is true)
    const isAnyToolActive = Object.values(activeTools).some(v => v);
    if (!textInput.trim() && !isAnyToolActive && !uploadedFile) { // Also check for uploadedFile
        console.log("No input, no active tool, and no file.");
        return;
    }
    if (isLoading) return;

    let agentsToActivate: AgentName[] = [];
    let contentToSend = textInput;
    let menuTimeframe: 'daily' | 'weekly' | undefined = undefined;
    let isReasoningRequest = false;

    // Determine active agents based on `activeTools` state
    if (activeTools['menu-daily']) {
      agentsToActivate.push(AGENT_NAMES.MENU_GENERATOR);
      menuTimeframe = 'daily';
      contentToSend = textInput || 'Tạo thực đơn hàng ngày mặc định'; // Keep default text logic
    }
    if (activeTools['menu-weekly']) {
      agentsToActivate.push(AGENT_NAMES.MENU_GENERATOR);
      menuTimeframe = 'weekly';
      contentToSend = textInput || 'Tạo thực đơn hàng tuần mặc định'; // Keep default text logic
    }
    if (activeTools['extended-thinking']) {
      // Ensure only Reasoning Planner runs if selected
      agentsToActivate = [AGENT_NAMES.REASONING_PLANNER];
      isReasoningRequest = true;
      console.log("Activating Reasoning Planner Agent only.");
    }

    // Handle file upload logic (moved slightly, but core logic remains)
    let fileToSend = uploadedFile; // Capture file state before clearing

    if (fileToSend) {
      // Add a user message indicating file upload *attempt*
      // The actual visual preview is handled by ChatInputArea now
      const fileIndicatorMessage: Message = {
        id: `user-file-indicator-${Date.now()}`,
        sender: 'user',
        content: `(Đã gửi file: ${fileToSend.name}) ${textInput || ''}`.trim(), // Combine with text if any
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, fileIndicatorMessage]);

      // Clear file state immediately after capturing it
      setUploadedFile(null);
      setUploadedFilePreview(null);
      // Note: Clearing the actual file input value is handled within ChatInputArea's ref

      // Prepare FormData for API (assuming a separate endpoint or modified main endpoint)
      // THIS PART MIGHT NEED ADJUSTMENT BASED ON API DESIGN
      // Option 1: Send to a dedicated upload endpoint first
      // Option 2: Modify /api/chat-mobi to accept multipart/form-data
      // For now, let's assume we modify /api/chat-mobi and send everything together

      // If sending separately:
      /*
      const formData = new FormData();
      formData.append('file', fileToSend);
      // ... send formData to a specific upload API ...
      // ... potentially get back a file ID or URL to include in the main chat request ...
      */
    } else {
       // Add regular user text message if no file
       if (textInput.trim()) {
         const newUserMessage: Message = {
           id: `user-${Date.now()}`,
           sender: 'user',
           content: textInput,
           timestamp: new Date().toLocaleTimeString()
         };
         setMessages(prev => [...prev, newUserMessage]);
       }
    }


    // Default agent logic (only if no specific tool is active and not a file-only submission)
    if (agentsToActivate.length === 0 && contentToSend.trim() && !isReasoningRequest && !fileToSend) {
        agentsToActivate.push(AGENT_NAMES.SYNTHESIZER);
        console.log("Defaulting to Synthesizer Agent.");
    } else if (agentsToActivate.length === 0 && !contentToSend.trim() && !fileToSend && !isAnyToolActive) {
        console.log("No input, no file, and no active tool selected.");
        return; // Exit if nothing to send
    }


    // --- Prepare for API Call ---
    setShowSuggestions(false); // Hide suggestions after first interaction
    setInputValue(''); // Clear input field
    setIsLoading(true); // Set loading state

    // Add temporary "thinking" message
    const thinkingMessageId = `agent-thinking-${Date.now()}`;
    const thinkingMessage: Message = {
        id: thinkingMessageId,
        sender: 'agent',
        content: <ThinkingAnimation />, // Use the thinking animation component
        isStreaming: true, // Mark as streaming for potential UI hints
        timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, thinkingMessage]);


    // --- API Call ---
    try {
        // Recommendation logic (will be replaced by Firebase fetch later)
        let userRecommendations: any[] | null = null;
        // ... (keep localStorage logic for now, will change in Firebase step) ...
        if (activeTools['menu-daily'] || activeTools['menu-weekly']) {
             const storedRecs = localStorage.getItem('userFoodRecommendations');
             if (storedRecs) {
                 try {
                     userRecommendations = JSON.parse(storedRecs);
                 } catch (parseError) { console.error("Error parsing recommendations:", parseError); }
             }
        }

        // --- Construct Request Body or FormData ---
        let response: Response;
        const apiUrl = '/api/chat-mobi'; // Define API URL

        if (fileToSend) {
            // Send as FormData if file exists
            const formData = new FormData();
            formData.append('file', fileToSend);
            formData.append('input', contentToSend);
            formData.append('activeAgents', JSON.stringify(agentsToActivate)); // Send arrays as JSON strings
            if (menuTimeframe) formData.append('menuTimeframe', menuTimeframe);
            formData.append('enableWebSearch', String(isWebSearchEnabled));
            formData.append('displayImages', (activeTools['menu-daily'] || activeTools['menu-weekly']) ? (imageDisplayMode !== 'none' ? 'menu' : 'none') : imageDisplayMode);
            formData.append('userPreferences', JSON.stringify(userPreferences));
            if (userRecommendations) formData.append('userRecommendations', JSON.stringify(userRecommendations));

            response = await fetch(apiUrl, {
                method: 'POST',
                body: formData,
                // No 'Content-Type' header needed for FormData; browser sets it
            });

        } else {
            // Send as JSON if no file
            const requestBody: any = {
                input: contentToSend,
                activeAgents: agentsToActivate,
                menuTimeframe: menuTimeframe,
                enableWebSearch: isWebSearchEnabled,
                displayImages: (activeTools['menu-daily'] || activeTools['menu-weekly'])
                    ? (imageDisplayMode !== 'none' ? 'menu' : 'none')
                    : imageDisplayMode,
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


        // Reset active tool state after sending
        setActiveTools({});

        // Remove the temporary thinking message regardless of success/failure
        setMessages(prev => prev.filter(msg => msg.id !== thinkingMessageId));

        // Check response status
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})); // Try to parse error JSON
            throw new Error(`API error: ${response.status} ${response.statusText} - ${errorData.error || 'Unknown error'}`);
        }

        // --- Handle Response (Streaming or JSON) ---
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('text/plain') && isReasoningRequest) {
            // --- Handle Reasoning Stream ---
            console.log("Handling text/plain stream for Reasoning Planner...");
            const reader = response.body?.getReader();
            if (!reader) throw new Error("Failed to get reader for stream.");

            const decoder = new TextDecoder();
            let reasoningContent = '';
            const streamMessageId = `agent-stream-${Date.now()}`;

            // Add placeholder message for the stream
            setMessages(prev => [...prev, {
                id: streamMessageId,
                sender: 'agent',
                agentName: AGENT_NAMES.REASONING_PLANNER,
                content: '', // Start empty
                isStreaming: true,
                isReasoningStream: true,
                timestamp: new Date().toLocaleTimeString(),
            }]);

            // Process the stream
            // Use a loop to read the stream
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true }); // Decode chunk
                reasoningContent += chunk; // Append to content

                // Update the streaming message in state
                setMessages(prev => prev.map(msg =>
                    msg.id === streamMessageId ? { ...msg, content: reasoningContent } : msg
                ));
            }

            // Final update to mark streaming as done
            setMessages(prev => prev.map(msg =>
                msg.id === streamMessageId ? { ...msg, isStreaming: false, timestamp: new Date().toLocaleTimeString() } : msg
            ));
            console.log("Reasoning stream finished.");

        } else if (contentType && contentType.includes('application/json')) {
            // --- Handle Standard JSON Response ---
            console.log("Handling application/json response...");
            const resultData = await response.json();
            console.log('API JSON Response Data:', resultData);

            let agentMessage: Message | null = null;

            if (resultData && resultData.status === 'success') {
                 // Determine message content based on the agent that responded (Restore this logic)
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
                         agentName: "Trợ lý dinh dưỡng NutriCare", // Use a generic name for synthesizer
                         content: resultData.content,
                         citations: resultData.citations,
                         images: resultData.images,
                         timestamp: new Date().toLocaleTimeString(),
                         rawResult: resultData,
                     };
                 } else if (resultData.traceData || resultData.reasoningSteps) { // Handle other agents with trace/reasoning
                     agentMessage = {
                         id: `agent-${Date.now()}`,
                         sender: 'agent',
                         agentName: resultData.agent, // Use the agent name from response
                         content: resultData.content,
                         interactionSteps: resultData.traceData || resultData.reasoningSteps,
                         timestamp: new Date().toLocaleTimeString(),
                         rawResult: resultData,
                     };
                 } else {
                     // Fallback for unexpected successful response structure
                     console.warn('Unexpected successful JSON agent response structure:', resultData);
                     agentMessage = {
                         id: `system-warn-${Date.now()}`,
                         sender: 'system',
                         content: `Nhận được phản hồi thành công nhưng cấu trúc không rõ ràng từ agent: ${resultData.agent || 'Unknown'}`,
                         timestamp: new Date().toLocaleTimeString(),
                     };
                 }
            } else {
                 // Handle cases where API call was ok (2xx) but agent reported failure
                 console.error("API call successful but agent reported error in JSON:", resultData?.error);
                 agentMessage = {
                     id: `error-agent-${Date.now()}`,
                     sender: 'system',
                     content: `Lỗi xử lý yêu cầu từ agent: ${resultData?.error || 'Lỗi không xác định từ máy chủ.'}`,
                     timestamp: new Date().toLocaleTimeString(),
                 };
            }

            // Add the constructed agent message (or error message) to state
            if (agentMessage) {
                setMessages(prev => [...prev, agentMessage]);
            }

        } else {
             // Handle Unexpected Content-Type
             console.error("Unexpected Content-Type received:", contentType);
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
        // Add error message to chat
        const networkErrorMessage: Message = {
            id: `error-network-${Date.now()}`,
            sender: 'system',
            content: `Lỗi mạng hoặc máy chủ: ${error.message || 'Không thể kết nối.'}`,
            timestamp: new Date().toLocaleTimeString()
        };
        setMessages(prev => [...prev, networkErrorMessage]);
    } finally {
        setIsLoading(false); // Ensure loading is always set to false
    }
  }, [
    inputValue, isLoading, activeTools, toast, isWebSearchEnabled,
    imageDisplayMode, uploadedFile, userPreferences // Removed uploadedFilePreview dependency
  ]); // Keep dependencies

  // --- Action Handlers (passed down as props) ---
  // Keep these handlers
  const handleSpeak = useCallback((textToSpeak: string | undefined) => {
    if (!textToSpeak || !synthRef.current) {
      toast({ title: "Lỗi TTS", description: "Không có nội dung để đọc.", variant: "destructive" });
      return;
    }
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'vi-VN';
    // Optional: Find specific voice
    const voices = synthRef.current.getVoices();
    const vietnameseVoice = voices.find(voice => voice.lang === 'vi-VN');
    if (vietnameseVoice) utterance.voice = vietnameseVoice;
    synthRef.current.speak(utterance);
  }, [toast]);

  const handleCopy = useCallback((textToCopy: string | undefined) => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy)
      .then(() => toast({ title: "Đã sao chép!" }))
      .catch(err => {
        console.error('Failed to copy: ', err);
        toast({ title: "Lỗi sao chép", variant: "destructive" });
      });
  }, [toast]);

  const handleFeedbackAction = useCallback((action: 'like' | 'dislike', messageId: string) => {
    console.log(`Feedback: ${action}, Message ID: ${messageId}`); // Log feedback
    toast({ title: `Cảm ơn phản hồi!` });
    // TODO: Send feedback to backend/analytics if needed
  }, [toast]);

  // --- Input Area State Handlers (passed down as props) ---
  // Keep these handlers as they directly modify state used by ChatInputArea
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
        console.error("STT start error:", error);
        toast({ title: "Lỗi", description: "Không thể bắt đầu nhận diện.", variant: "destructive" });
        setIsListening(false); // Ensure state is correct on error
      }
    }
  }, [isListening, toast]);

  const toggleTool = (tool: string) => {
    setActiveTools(prev => {
      const newState = { ...prev };
      // Exclusive logic for menu tools
      if (tool === 'menu-daily') {
        newState['menu-daily'] = !prev['menu-daily'];
        newState['menu-weekly'] = false; // Deselect weekly
      } else if (tool === 'menu-weekly') {
        newState['menu-weekly'] = !prev['menu-weekly'];
        newState['menu-daily'] = false; // Deselect daily
      } else {
        // Toggle other tools normally
        newState[tool] = !prev[tool];
      }
      // Ensure extended thinking is exclusive if activated
      if (newState['extended-thinking']) {
          newState['menu-daily'] = false;
          newState['menu-weekly'] = false;
      } else if (tool === 'menu-daily' || tool === 'menu-weekly') {
          newState['extended-thinking'] = false;
      }

      return newState;
    });
    setPopoverOpen(false); // Close popover after selection
  };

  const removeActiveTool = (toolToRemove: string) => {
      setActiveTools(prev => ({ ...prev, [toolToRemove]: false }));
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage(); // Trigger send on Enter
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      // Generate preview only for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => setUploadedFilePreview(ev.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setUploadedFilePreview(null); // No preview for non-images
      }
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setUploadedFilePreview(null);
    // Clearing the input value is handled by ChatInputArea's ref now
  };

  const handleWebSearchToggle = (checked: boolean) => {
      setIsWebSearchEnabled(checked);
  };

  const handleImageDisplayToggle = (checked: boolean) => {
      setImageDisplayMode(checked ? 'inline' : 'none');
  };

  const handleSuggestedActionClick = (command: string) => {
      handleSendMessage(command); // Send the command as a message
  };


  // --- Render Functions Removed ---
  // renderUserMessage and renderAgentMessage are now handled by ChatMessage component


  // --- Main Render ---
  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden bg-background">
      {/* Use UserProfileBanner Component */}
      <UserProfileBanner />

      {/* Message display area with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsContent value="chat" className="flex-1 overflow-hidden m-0 data-[state=active]:flex data-[state=active]:flex-col">
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-6 pb-4 max-w-3xl mx-auto">
              {/* Map messages using ChatMessage Component */}
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  imageDisplayMode={imageDisplayMode}
                  onCopy={handleCopy}
                  onSpeak={handleSpeak}
                  onFeedback={handleFeedbackAction}
                  onOpenUnderstandMeal={handleOpenUnderstandMeal}
                  onFindNearbyRestaurants={handleFindNearbyRestaurants}
                />
              ))}
              <div ref={messagesEndRef} /> {/* For scrolling */}
            </div>
          </ScrollArea>

          {/* Use ChatInputArea Component */}
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
            onRemoveTool={removeActiveTool} // Pass the remove handler
            onFileChange={handleFileChange}
            onRemoveFile={handleRemoveFile}
            onWebSearchToggle={handleWebSearchToggle}
            onImageDisplayToggle={handleImageDisplayToggle}
            onPopoverOpenChange={setPopoverOpen}
            onSuggestedActionClick={handleSuggestedActionClick} // Pass suggestion handler
          />
        </TabsContent>

        {/* Other Tabs (History, Pantry) - Keep as placeholders */}
        <TabsContent value="history" className="flex-1 overflow-hidden m-0 data-[state=active]:flex data-[state=active]:flex-col">
           <div className="flex-1 flex items-center justify-center">
             <div className="text-center p-8 max-w-md">
               <AlarmClock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
               <h3 className="text-lg font-medium mb-2">Nhật ký dinh dưỡng</h3>
               <p className="text-muted-foreground mb-4">
                 Tính năng đang được phát triển.
               </p>
               {/* <Button className="bg-emerald-600 hover:bg-emerald-700">Bắt đầu theo dõi</Button> */}
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
               {/* <Button className="bg-emerald-600 hover:bg-emerald-700">Cập nhật tủ đồ</Button> */}
             </div>
           </div>
        </TabsContent>
      </Tabs>

      {/* UnderstandMealDialog popup - Keep */}
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
    </div>
  );
}
