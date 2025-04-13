'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';

// --- UI Components ---
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { InteractiveMenu } from '@/components/ui/interactive-menu';
import { AgentProcessVisualizer } from '@/components/ui/agent-process-visualizer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sidebar } from '@/components/ui/sidebar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import ThinkingAnimation from '@/components/ui/thinking-animation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Added for Copy button tooltip

// --- Icons ---
import {
    SendHorizontal,
    ChefHat,
    Mic,
    StopCircle,
    // ChevronDown, // Removed
    // ChevronUp, // Removed
    X, // Added for Close
    PlusCircle, // Added for New/Open
    Info,
    AlertCircle,
    Loader2,
    User,
    Bot,
    Search,
    ClipboardCopy, // Added for Copy button
    Download // Added for Download button
} from 'lucide-react';

// --- AI Flows ---
import {
    generateMenuFromPreferences,
    GenerateMenuFromPreferencesOutput,
    StepTrace,
} from '@/ai/flows/generate-menu-from-preferences';
// import { suggestMenuModificationsBasedOnFeedback } from '@/ai/flows/suggest-menu-modifications-based-on-feedback'; // Will be replaced by handleMenuFollowup
import {
    handleMenuFollowup,
    HandleMenuFollowupInput,
    HandleMenuFollowupOutput
} from '@/ai/flows/handle-menu-followup'; // <-- Import the new flow

// --- Hooks ---
import { useToast } from "@/hooks/use-toast";
// TODO: Import your authentication hook/context here
// import { useAuth } from '@/hooks/use-auth'; // Example
// import { useIsMobile } from '@/hooks/use-mobile'; // No longer strictly needed for this specific toggle logic

// --- Utils ---
import { cn } from "@/lib/utils";

// --- Constants ---
const MAX_PREFERENCE_LENGTH = 250;
const REGENERATE_ACTION_PREFIX = "Regenerate menu"; // Prefix to identify regeneration actions
// Removed static initial message, will be set dynamically
const QUICK_REPLIES = ["Bữa sáng nhanh gọn", "Thực đơn ít calo", "Món chay dễ làm", "Tăng cơ giảm mỡ", "Tiệc cuối tuần"];

// --- Types ---
interface SuggestMenuModificationsOutput {
    reasoning?: string;
    modifiedMenu?: string;
}
interface ChatMessage {
    id: number;
    text?: string;
    // Added 'action_chips', removed 'suggestion_display'
    type: 'user' | 'bot' | 'component' | 'error' | 'system' | 'trace_display' | 'suggestion_chip' | 'export_display' | 'action_chips';
    traceData?: StepTrace[];
    // suggestionData?: SuggestMenuModificationsOutput; // Replaced by reasoning/actions
    reasoning?: string; // Added for the new flow's reasoning output
    suggestedActions?: string[]; // Added for the new flow's suggested actions
    searchSuggestionHtml?: string;
    exportMarkdown?: string;
    menuData?: GenerateMenuFromPreferencesOutput | null; // Add field to store menu data
}

// --- Props Interface ---
interface HomePageProps {
    chatId?: string | null; // Optional chat ID from URL
}


// --- Component ---
const HomePage: React.FC<HomePageProps> = ({ chatId }) => { // Accept chatId prop
    // --- State Hooks ---
    const [preferences, setPreferences] = useState<string>('');
    const [menuType, setMenuType] = useState<'daily' | 'weekly'>('daily');
    const [menuResponseData, setMenuResponseData] = useState<GenerateMenuFromPreferencesOutput | null>(null);
    const [feedback, setFeedback] = useState<string>('');
    // const [menuModifications, setMenuModifications] = useState<SuggestMenuModificationsOutput | null>(null); // Removed, handled by new flow
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]); // Initialize empty, will set initial message in useEffect
    const [isLoading, setIsLoading] = useState<boolean>(false); // For initial generation
    const [isProcessingFeedback, setIsProcessingFeedback] = useState<boolean>(false); // Separate loading state for feedback
    const [isListeningPreferences, setIsListeningPreferences] = useState(false);
    const [isListeningFeedback, setIsListeningFeedback] = useState(false);
    const [isPreferenceSectionOpen, setIsPreferenceSectionOpen] = useState(true); // Start open

    // --- Refs ---
    const chatEndRef = useRef<HTMLDivElement>(null); // Keep for potential fallback or other uses
    const chatScrollAreaRef = useRef<HTMLDivElement>(null); // Ref for the ScrollArea viewport
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const feedbackRecognitionRef = useRef<SpeechRecognition | null>(null);
    const synthRef = useRef<SpeechSynthesis | null>(null);

    // --- Custom Hooks ---
    const { toast } = useToast();
    // const { user } = useAuth(); // Example: Get user data from auth hook
    const user = { username: "Khách" }; // Placeholder: Replace with actual user data fetching
    // const isMobile = useIsMobile(); // Keep if needed for other responsive logic


    // --- Effects ---

    // Effect to set initial message based on user
    useEffect(() => {
        const initialMessageText = `Chào ${user?.username || 'bạn'}! Tôi là NutriCare Agent, trợ lý thực đơn AI của bạn. Hãy cho tôi biết sở thích ăn uống, mục tiêu dinh dưỡng hoặc chọn gợi ý để bắt đầu nhé.`;
        // Set initial message only if chat history is empty (prevents overriding loaded history)
        if (chatHistory.length === 0 && !chatId) { // Also check for chatId to avoid resetting loaded chats
             setChatHistory([{ id: Date.now(), text: initialMessageText, type: "system" }]);
        }
    }, [user, chatHistory.length, chatId, setChatHistory]); // Rerun if user changes or history length becomes 0, Added setChatHistory

    // Speech Recognition Setup Effect (Optimized - Unchanged from previous optimization)
    useEffect(() => {
        // ... (speech recognition setup code remains the same)
        if (typeof window === 'undefined' || !('webkitSpeechRecognition' in window)) {
            console.warn("Speech Recognition Not Supported");
            return;
        }

        synthRef.current = window.speechSynthesis;

        const setupSpeechRecognition = (
            ref: React.MutableRefObject<SpeechRecognition | null>,
            onResult: (transcript: string) => void,
            setIsListening: React.Dispatch<React.SetStateAction<boolean>>,
            instanceName: string
        ) => {
            const recognition = new (window as any).webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'vi-VN';

            recognition.onstart = () => setIsListening(true);
            recognition.onresult = (event: SpeechRecognitionEvent) => {
                const transcript = event.results[event.results.length - 1]?.[0]?.transcript ?? '';
                if (transcript) onResult(transcript);
            };
            recognition.onend = () => setIsListening(false);
            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                console.error(`${instanceName} Speech Recognition Error:`, event.error, event.message);
                let errorMessage = "Lỗi nhận diện giọng nói.";
                if (event.error === 'no-speech') errorMessage = "Không nhận diện được giọng nói.";
                else if (event.error === 'not-allowed' || event.error === 'audio-capture') errorMessage = "Không thể truy cập micro.";
                else if (event.error === 'network') errorMessage = "Lỗi mạng khi nhận diện.";
                else if (event.error === 'aborted') return;

                toast({ title: `Lỗi (${instanceName})`, description: errorMessage, variant: "destructive" });
                setIsListening(false);
            };
            ref.current = recognition;
        };

        setupSpeechRecognition(recognitionRef, setPreferences, setIsListeningPreferences, "Sở thích");
        setupSpeechRecognition(feedbackRecognitionRef, setFeedback, setIsListeningFeedback, "Phản hồi");

        return () => {
            recognitionRef.current?.abort();
            feedbackRecognitionRef.current?.abort();
            recognitionRef.current?.abort(); // Corrected method name
            feedbackRecognitionRef.current?.abort(); // Corrected method name
            synthRef.current?.cancel();
        };
        // Dependencies: toast, setPreferences, setIsListeningPreferences, setFeedback, setIsListeningFeedback
    }, [toast, setPreferences, setIsListeningPreferences, setFeedback, setIsListeningFeedback]);

    // Scroll to Bottom Effect (MODIFIED)
    useEffect(() => {
        const scrollAreaViewport = chatScrollAreaRef.current?.querySelector<HTMLDivElement>(':scope > div'); // Get the direct child div which is the viewport
        if (scrollAreaViewport) {
            // Use setTimeout to ensure DOM update completes before scrolling
            setTimeout(() => {
                scrollAreaViewport.scrollTop = scrollAreaViewport.scrollHeight;
            }, 150); // Slightly increased delay might be more reliable than 100ms
        }
        // Fallback or keep chatEndRef scrollIntoView if needed for specific cases?
        // For now, prioritize direct scrollTop manipulation.
        // setTimeout(() => {
        //     chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        // }, 100);
    }, [chatHistory]); // Dependency remains chatHistory

    // Local Storage Effects (Unchanged)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedPreferences = localStorage.getItem('userPreferences');
            if (storedPreferences) setPreferences(storedPreferences);
        }
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('userPreferences', preferences);
        }
    }, [preferences]);

    // --- Event Handlers ---
    const handlePreferenceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setPreferences(e.target.value);
    const handleFeedbackChange = (e: React.ChangeEvent<HTMLInputElement>) => setFeedback(e.target.value);

    // Toggle Speech Input (Refactored - Unchanged)
    const toggleSpeech = useCallback((
        recognitionInstance: SpeechRecognition | null,
        isListening: boolean,
        setIsListening: React.Dispatch<React.SetStateAction<boolean>>,
        instanceName: string
    ) => {
        // ... (toggle speech logic remains the same)
        if (!recognitionInstance) {
            toast({ title: "Lỗi", description: `Chưa khởi tạo nhận diện giọng nói (${instanceName}).`, variant: "destructive" });
            return;
        }
        if (isListening) {
            recognitionInstance.stop();
        } else {
            try {
                recognitionInstance.start();
            } catch (error) {
                console.error(`Lỗi khi bắt đầu nhận diện (${instanceName}):`, error);
                toast({ title: "Lỗi", description: "Không thể bắt đầu nhận diện giọng nói.", variant: "destructive" });
                setIsListening(false);
            }
        }
    }, [toast]);

    const togglePreferenceSpeech = useCallback(() => {
        toggleSpeech(recognitionRef.current, isListeningPreferences, setIsListeningPreferences, "Sở thích");
    }, [isListeningPreferences, toggleSpeech, recognitionRef, setIsListeningPreferences]); // Added recognitionRef, setIsListeningPreferences

    const toggleFeedbackSpeech = useCallback(() => {
        toggleSpeech(feedbackRecognitionRef.current, isListeningFeedback, setIsListeningFeedback, "Phản hồi");
    }, [isListeningFeedback, toggleSpeech, feedbackRecognitionRef, setIsListeningFeedback]); // Added feedbackRecognitionRef, setIsListeningFeedback

    // --- Core Logic Functions ---

    // Add Message (Updated for new flow)
    const addMessage = useCallback((
        type: ChatMessage['type'],
        text?: string,
        traceData?: StepTrace[],
        // suggestionData?: SuggestMenuModificationsOutput, // Removed
        reasoning?: string, // Added
        suggestedActions?: string[], // Added
        searchSuggestionHtml?: string,
        exportMarkdown?: string,
        menuData?: GenerateMenuFromPreferencesOutput | null
    ) => {
        const newMessage: ChatMessage = {
            id: Date.now() + Math.random(),
            type,
            text,
            traceData,
            // suggestionData, // Removed
            reasoning, // Added
            suggestedActions, // Added
            searchSuggestionHtml,
            exportMarkdown,
            menuData,
        };

        // --- Dynamic Title Logic ---
        // Check if this is the first 'user' message being added to the current chat
        if (chatId && type === 'user') {
            const isFirstUserMessage = !chatHistory.some(msg => msg.type === 'user');
            if (isFirstUserMessage && text) {
                // Generate a concise title (e.g., first 30 chars)
                const newTitle = text.substring(0, 30) + (text.length > 30 ? '...' : '');
                console.log(`Updating title for chat ${chatId} to: "${newTitle}"`);

                // Update the title in the localStorage list
                const storedListRaw = localStorage.getItem('chatHistoryList');
                if (storedListRaw) {
                    try {
                        let storedList: any[] = JSON.parse(storedListRaw);
                        const chatIndex = storedList.findIndex(c => c.id.toString() === chatId);
                        if (chatIndex !== -1) {
                            storedList[chatIndex].title = newTitle;
                            localStorage.setItem('chatHistoryList', JSON.stringify(storedList));
                            // Note: Sidebar won't update immediately without a refresh or shared state.
                        }
                    } catch (e) {
                        console.error("Failed to update chat title in localStorage list:", e);
                    }
                }
            }
        }
        // --- End Dynamic Title Logic ---

        setChatHistory((prev) => [...prev, newMessage]);
        return newMessage.id;
    }, [chatId, chatHistory]); // Add chatId and chatHistory as dependencies

    // Generate Menu Function (Refined - Added Auto-Hide Logic)
    const generateMenu = useCallback(async () => {
        const trimmedPreferences = preferences.trim();
        if (!trimmedPreferences) {
            toast({ title: "Yêu cầu bị thiếu", description: "Vui lòng nhập sở thích hoặc yêu cầu của bạn.", variant: "destructive" });
            return;
        }

        setIsLoading(true); // Still use general isLoading for initial generation
        setMenuResponseData(null);
        // setMenuModifications(null); // Removed
        setFeedback('');
        addMessage('user', `Tạo thực đơn ${menuType === 'daily' ? 'hàng ngày' : 'hàng tuần'}: ${trimmedPreferences}`);

        let response: GenerateMenuFromPreferencesOutput | null = null;
        try {
            // Pass user information to the AI flow
            response = await generateMenuFromPreferences({
                preferences: trimmedPreferences,
                menuType,
                userContext: { // Add user context object
                    username: user?.username,
                    // TODO: Add other relevant user data here (e.g., from settings)
                    // dietaryRestrictions: user?.settings?.dietaryRestrictions,
                    // healthGoals: user?.settings?.healthGoals,
                }
            });
            setMenuResponseData(response);

            if (response?.trace) {
                addMessage('trace_display', undefined, response.trace);
            }

            if (response?.menu) {
                // Pass the response data when adding the component message
                // Corrected addMessage call for 'component' type
                addMessage('component', undefined, undefined, undefined, undefined, undefined, undefined, response);
                // *** NEW: Auto-hide preference section on successful generation ***
                setIsPreferenceSectionOpen(false);
            } else {
                const errorMessage = 'Không thể tạo thực đơn. Kết quả trả về không hợp lệ.';
                addMessage('error', errorMessage);
            }
            if (response?.searchSuggestionHtml) {
                 // Corrected addMessage call for 'suggestion_chip' type
                 addMessage('suggestion_chip', undefined, undefined, undefined, undefined, response.searchSuggestionHtml);
            }

        } catch (error: any) {
            console.error("Generate Menu Error:", error);
            addMessage('error', `Lỗi hệ thống khi tạo thực đơn: ${error.message || 'Vui lòng thử lại.'}`);
            // Don't hide the preference section on error, user might want to retry/edit
        } finally {
            setIsLoading(false); // Stop general loading indicator
        }
        // Removed setMenuModifications from dependencies
    }, [preferences, menuType, addMessage, toast, user, setIsLoading, setMenuResponseData, setFeedback, setIsPreferenceSectionOpen]);


    // --- Handle Feedback Submission (Replaces suggestModifications) ---
    const handleFeedbackSubmit = useCallback(async () => {
        const userMessage = feedback.trim();
        if (!userMessage) {
            toast({ title: "Thiếu nội dung", description: "Vui lòng nhập câu hỏi hoặc phản hồi của bạn.", variant: "destructive" });
            return;
        }
        if (!menuResponseData?.menu) {
            // This shouldn't happen if the feedback box is only shown when there's a menu, but good to check.
            toast({ title: "Thiếu thực đơn", description: "Chưa có thực đơn để trò chuyện.", variant: "destructive" });
            return;
        }

        setIsProcessingFeedback(true); // Use separate loading state
        addMessage('user', userMessage); // Add user message immediately
        setFeedback(''); // Clear input immediately

        try {
            // Prepare chat history for the flow (limit length if needed)
            const historyForFlow = chatHistory
                .filter(msg => ['user', 'bot', 'system'].includes(msg.type) && msg.text) // Filter relevant types with text
                .slice(-10) // Limit to last 10 messages for context window
                .map(msg => ({
                    // Ensure role is explicitly 'user' or 'model' for type safety
                    role: (msg.type === 'user' ? 'user' : 'model') as 'user' | 'model',
                    content: msg.text!,
                }));

            const flowInput: HandleMenuFollowupInput = {
                currentMenu: JSON.stringify(menuResponseData.menu), // Pass current menu
                chatHistory: historyForFlow,
                userMessage: userMessage,
                userPreferences: preferences, // Pass general preferences
                userContext: {
                    username: user?.username,
                    // Add other context if available
                }
            };

            const result = await handleMenuFollowup(flowInput);

            // Add the AI's response, reasoning, and actions
            addMessage(
                'bot', // Use 'bot' type for the main response
                result.responseMessage,
                undefined, // No trace data for this flow yet
                result.reasoning,
                result.suggestedActions
                // No searchSuggestionHtml, exportMarkdown, or menuData here
            );

        } catch (error: any) {
            console.error("Handle Feedback Error:", error);
            addMessage('error', `Lỗi khi xử lý yêu cầu: ${error.message || 'Vui lòng thử lại.'}`);
        } finally {
            setIsProcessingFeedback(false); // Stop feedback processing indicator
        }
    }, [
        feedback,
        menuResponseData,
        chatHistory,
        preferences,
        user,
        addMessage,
        toast,
        setFeedback,
        setIsProcessingFeedback // Added dependencies
    ]);

    // Handle Quick Reply (Updated for new loading state)
    const handleQuickReply = useCallback((reply: string) => {
        if (isLoading || isProcessingFeedback) return; // Check both loading states
        setPreferences(reply);
        setTimeout(() => {
            generateMenu();
        }, 0);
    }, [isLoading, isProcessingFeedback, generateMenu, setPreferences]); // Added isProcessingFeedback

    // --- Callback for Ingredient Export ---
    const handleExportIngredientsCallback = useCallback((markdown: string) => {
        addMessage('export_display', undefined, undefined, undefined, undefined, markdown);
        toast({ title: "Đã xuất Checklist", description: "Danh sách nguyên liệu đã được thêm vào khung chat." });
    }, [addMessage, toast]);

    // --- Handle Clicking Suggested Action ---
    const handleActionClick = useCallback(async (actionText: string) => {
        if (isLoading || isProcessingFeedback) return; // Prevent clicks while processing

        console.log("Action clicked:", actionText);
        addMessage('user', `(Đã chọn: ${actionText})`); // Add user action to history

        if (actionText.startsWith(REGENERATE_ACTION_PREFIX)) {
            // --- Trigger Regeneration ---
            setIsProcessingFeedback(true); // Use feedback loader for regeneration too
            toast({ title: "Đang tạo lại thực đơn...", description: "Vui lòng chờ trong giây lát." });

            // TODO: Implement actual regeneration logic
            // This might involve calling a dedicated regeneration flow
            // or adapting the 'generateMenuFromPreferences' flow, passing
            // the current menu and the full chat history as context.
            // For now, simulate a delay and show a message.
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay

            // Example: Call a hypothetical regeneration flow
            /*
            try {
                const historyForFlow = chatHistory.map(...) // Prepare history
                const regenInput = {
                    currentMenu: JSON.stringify(menuResponseData?.menu),
                    chatHistory: historyForFlow,
                    userPreferences: preferences,
                    userContext: { username: user?.username }
                };
                const regeneratedMenuData = await regenerateMenuFlow(regenInput); // Hypothetical flow
                setMenuResponseData(regeneratedMenuData); // Update state
                addMessage('component', undefined, undefined, undefined, undefined, undefined, undefined, undefined, regeneratedMenuData); // Display new menu
            } catch (error: any) {
                console.error("Regeneration Error:", error);
                addMessage('error', `Lỗi khi tạo lại thực đơn: ${error.message}`);
            } finally {
                setIsProcessingFeedback(false);
            }
            */

            // Placeholder message for now:
            addMessage('system', `Đã ghi nhận yêu cầu tạo lại thực đơn với thay đổi "${actionText}". Tính năng này đang được phát triển.`);
            setIsProcessingFeedback(false);

        } else {
            // Handle other actions (e.g., pre-fill input, ask specific question)
            // For now, just allow user to continue typing.
            // You could potentially pre-fill the feedback input:
            // setFeedback(actionText);
            toast({ title: "Tiếp tục trò chuyện", description: "Bạn có thể hỏi thêm hoặc nhập yêu cầu mới." });
        }

    }, [isLoading, isProcessingFeedback, addMessage, toast, chatHistory, menuResponseData, preferences, user]); // Added dependencies


    // --- Helper for Copy Button ---
    const handleCopy = useCallback((textToCopy: string | undefined) => {
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                toast({ title: "Đã sao chép!", description: "Nội dung đã được sao chép vào clipboard." });
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
                toast({ title: "Lỗi sao chép", description: "Không thể sao chép nội dung.", variant: "destructive" });
            });
    }, [toast]); // Depends only on toast

    // --- Download Chat Handler ---
    const handleDownloadChat = useCallback(() => {
        if (!chatHistory || chatHistory.length === 0) {
            toast({ title: "Không có gì để tải", description: "Lịch sử trò chuyện hiện tại đang trống.", variant: "destructive" });
            return;
        }

        let chatContent = `Chat History (ID: ${chatId || 'new'})\n=====================================\n\n`;

        chatHistory.forEach(message => {
            const timestamp = new Date(message.id).toLocaleString('vi-VN'); // Use message ID as timestamp approx.
            switch (message.type) {
                case 'user':
                    chatContent += `[${timestamp}] User:\n${message.text}\n\n`;
                    break;
                case 'bot':
                    chatContent += `[${timestamp}] Bot:\n${message.text}\n\n`;
                    break;
                case 'system':
                    chatContent += `[${timestamp}] System:\n${message.text}\n\n`;
                    break;
                case 'error':
                    chatContent += `[${timestamp}] Error:\n${message.text}\n\n`;
                    break;
                case 'component':
                    if (message.menuData?.menu) {
                        chatContent += `[${timestamp}] Bot (Generated Menu - ${message.menuData.menuType}):\n\`\`\`json\n${JSON.stringify(message.menuData.menu, null, 2)}\n\`\`\`\n\n`;
                        if (message.menuData.feedbackRequest) {
                             chatContent += `[${timestamp}] Bot (Feedback Request):\n${message.menuData.feedbackRequest}\n\n`;
                        }
                    }
                    break;
                 case 'export_display':
                     if (message.exportMarkdown) {
                        chatContent += `[${timestamp}] Bot (Exported Checklist):\n${message.exportMarkdown}\n\n`;
                     }
                     break;
                // Add other types if needed (trace, suggestion, etc.) - keeping simple for now
                default:
                    break;
            }
        });

        try {
            const blob = new Blob([chatContent], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const fileName = `chat_${chatId || Date.now()}.md`;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast({ title: "Đã tải xuống", description: `Lịch sử trò chuyện đã được lưu vào ${fileName}` });
        } catch (error) {
            console.error("Failed to download chat:", error);
            toast({ title: "Lỗi tải xuống", description: "Không thể tạo tệp tải xuống.", variant: "destructive" });
        }

    }, [chatHistory, chatId, toast]);
    // --- End Download Chat Handler ---


    // --- Effect to Load/Initialize Chat History based on chatId ---
    useEffect(() => {
        const loadChat = () => {
            if (chatId) {
                console.log("Attempting to load chat session with ID:", chatId);
                const storageKey = `chatMessages_${chatId}`;
                const storedMessages = localStorage.getItem(storageKey);

                if (storedMessages) {
                    try {
                        const parsedMessages: ChatMessage[] = JSON.parse(storedMessages);
                        // Basic validation: check if it's an array
                        if (Array.isArray(parsedMessages)) {
                            console.log(`Loaded ${parsedMessages.length} messages for chat ${chatId}`);
                            setChatHistory(parsedMessages);
                            // Find and restore menu data if present in loaded history
                            const menuMessage = parsedMessages.find(msg => msg.type === 'component' && msg.menuData);
                            if (menuMessage) {
                                setMenuResponseData(menuMessage.menuData || null);
                                console.log("Restored menu data from loaded chat.");
                            } else {
                                setMenuResponseData(null); // Ensure menu data is cleared if not found
                            }
                        } else {
                            console.warn(`Invalid data found for ${storageKey}, starting fresh.`);
                            setChatHistory([{ id: Date.now(), type: 'system', text: `Không thể tải lịch sử cho cuộc trò chuyện ${chatId}. Bắt đầu mới.` }]);
                            setMenuResponseData(null); // Clear menu data
                            localStorage.removeItem(storageKey); // Remove invalid data
                        }
                    } catch (error) {
                        console.error(`Error parsing messages for chat ${chatId}:`, error);
                        setChatHistory([{ id: Date.now(), type: 'system', text: `Lỗi khi tải lịch sử cho cuộc trò chuyện ${chatId}. Bắt đầu mới.` }]);
                        localStorage.removeItem(storageKey); // Remove corrupted data
                        setMenuResponseData(null); // Clear menu data
                    }
                } else {
                    // No history found for this ID, start a new chat state but indicate it's for this ID
                    console.log(`No stored messages found for chat ${chatId}, initializing.`);
                    const chatTitle = localStorage.getItem('chatHistoryList') // Read title from the metadata list
                        ? JSON.parse(localStorage.getItem('chatHistoryList')!).find((c: any) => c.id.toString() === chatId)?.title
                        : `Chat ${chatId}`;
                    // Use a generic loading message here, initial message is set by the other useEffect
                    setChatHistory([{ id: Date.now(), type: 'system', text: `Đang xem lại cuộc trò chuyện: "${chatTitle || chatId}"...` }]);
                    setMenuResponseData(null); // Clear menu data for new chat
                }
                // Reset other states when loading a chat
                // setMenuResponseData(null); // Redundant now
                // setMenuModifications(null); // Removed
                setFeedback('');
                setIsPreferenceSectionOpen(false); // Usually hide preferences when loading old chat

            } else {
                // No chatId in URL, treat as a completely new session
                console.log("No chatId in URL, starting a new chat session.");
                // Initial message is now handled by the dedicated useEffect based on user
                // setChatHistory([{ id: Date.now(), text: INITIAL_SYSTEM_MESSAGE, type: "system" }]); // Removed
                setMenuResponseData(null);
                // setMenuModifications(null); // Removed
                setFeedback('');
                setIsPreferenceSectionOpen(true); // Show preferences for a new chat
            }
        };

        loadChat();
        // Dependency: chatId. Re-run when the user clicks a different chat link.
        // Added setChatHistory back as it's needed if the load fails and we set a new history. The initial message effect guards against loops.
        // Removed setMenuModifications from dependencies
    }, [chatId, setMenuResponseData, setFeedback, setIsPreferenceSectionOpen, setChatHistory]);
    // --- End Load/Initialize Chat History Effect ---

    // --- Effect to Save Chat History to localStorage on Change ---
    useEffect(() => {
        // Only save if there's an active chatId and the history isn't empty
        // (prevents saving the initial "loading" state over potentially valid data)
        if (chatId && chatHistory.length > 0) {
            // Avoid saving if the history only contains the initial system message for a loaded chat
            const initialSystemMessagePattern = /^Đang xem lại cuộc trò chuyện:|^Bắt đầu cuộc trò chuyện mới:|^Không thể tải lịch sử|^Lỗi khi tải lịch sử/;
            if (chatHistory.length === 1 && chatHistory[0].type === 'system' && initialSystemMessagePattern.test(chatHistory[0].text || '')) {
               // Don't save the initial placeholder message
            } else {
                console.log(`Saving ${chatHistory.length} messages for chat ${chatId}`);
                const storageKey = `chatMessages_${chatId}`;
                localStorage.setItem(storageKey, JSON.stringify(chatHistory));
            }
        }
        // Dependency: chatHistory and chatId. Save whenever the history changes for the current chat.
    }, [chatHistory, chatId]);
    // --- End Save Chat History Effect ---


    // --- Render Logic ---

    // Define style constants outside the render function for broader scope
    const botMessageContainerClass = "flex items-start gap-2.5";
    const botMessageBubbleClass = "max-w-full sm:max-w-md lg:max-w-xl xl:max-w-2xl p-3 rounded-lg shadow-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-tl-none";
    const userMessageContainerClass = "flex items-start gap-2.5 justify-end";
    const userMessageBubbleClass = "max-w-full sm:max-w-md lg:max-w-xl xl:max-w-2xl p-3 rounded-lg shadow-sm bg-blue-600 text-white rounded-tr-none";

    // Refined Message Rendering Function (Updated for new flow)
    const renderMessageContent = (message: ChatMessage) => {
        // Corrected isBotOrSystem check - includes 'bot' and other relevant types
        const isBotOrSystem = ['bot', 'system', 'component', 'trace_display', 'suggestion_chip', 'error', 'export_display', 'action_chips'].includes(message.type);
        // Style constants are now defined outside this function

        // Removed handleCopy definition from here

        switch (message.type) {
            case 'user':
                return message.text ? ( <div className={userMessageContainerClass}><div className={userMessageBubbleClass}><pre className="whitespace-pre-wrap font-sans text-sm">{message.text}</pre></div><User className="w-6 h-6 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-1" /></div> ) : null;
            case 'bot': // Updated 'bot' case to handle reasoning
                 return message.text ? (
                     <div className={botMessageContainerClass}>
                         <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                         <div className={cn(botMessageBubbleClass, "space-y-3")}>
                             {/* Main Response */}
                             <pre className="whitespace-pre-wrap font-sans text-sm">{message.text}</pre>
                             {/* Reasoning Section (Optional) */}
                             {message.reasoning && (
                                 <details className="text-xs text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                                     <summary className="cursor-pointer font-medium hover:text-gray-800 dark:hover:text-gray-200">Xem quá trình xử lý</summary>
                                     <pre className="whitespace-pre-wrap font-sans text-xs mt-1 pl-2">{message.reasoning}</pre>
                                 </details>
                             )}
                             {/* Suggested Actions are now rendered separately below */}
                         </div>
                     </div>
                 ) : null;
            case 'system':
                return message.text ? ( <div className={botMessageContainerClass}><Bot className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" /><Alert variant="default" className="max-w-full sm:max-w-md lg:max-w-xl xl:max-w-2xl p-3 rounded-lg rounded-tl-none shadow-sm"><Info className="h-4 w-4" /><AlertTitle className="text-sm font-medium">Thông báo</AlertTitle><AlertDescription className="text-sm">{message.text}</AlertDescription></Alert></div> ) : null;
            case 'error':
                 return message.text ? ( <div className={botMessageContainerClass}><Bot className="w-6 h-6 text-red-500 dark:text-red-400 flex-shrink-0 mt-1" /><Alert variant="destructive" className="max-w-full sm:max-w-md lg:max-w-xl xl:max-w-2xl p-3 rounded-lg rounded-tl-none shadow-sm"><AlertCircle className="h-4 w-4" /><AlertTitle className="text-sm font-medium">Lỗi</AlertTitle><AlertDescription className="text-sm">{message.text}</AlertDescription></Alert></div> ) : null;
            case 'trace_display':
                // Pass isLoading (initial generation) to AgentProcessVisualizer
                return message.traceData ? ( <div className={botMessageContainerClass}><Bot className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1 opacity-50" /><div className={cn(botMessageBubbleClass, "bg-gray-50 dark:bg-gray-700/50 border border-border/50")}><AgentProcessVisualizer trace={message.traceData} isProcessing={isLoading} /></div></div> ) : null;
            case 'component':
                // Use message.menuData here instead of menuResponseData state
                // Pass handleExportIngredientsCallback to InteractiveMenu
                if (message.menuData?.menu) {
                    const greetingText = `Tuyệt vời! Dựa trên yêu cầu của bạn, tôi đã chuẩn bị xong thực đơn ${message.menuData.menuType === 'daily' ? 'hàng ngày' : 'hàng tuần'} rồi đây:`; // Use menuType from message data
                    return ( <div className={botMessageContainerClass}><Bot className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" /><div className={cn(botMessageBubbleClass, "space-y-3")}><p className="text-sm">{greetingText}</p><div className="bg-card dark:bg-gray-800 p-0 rounded-md shadow-sm border border-border/50 overflow-hidden mt-2"><InteractiveMenu menuData={{ menu: message.menuData.menu, menuType: message.menuData.menuType, }} onExportIngredients={handleExportIngredientsCallback} /></div>{message.menuData.feedbackRequest && ( <p className="text-sm italic mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">{message.menuData.feedbackRequest}</p> )}</div></div> );
                } return null; // Added explicit return null
            // case 'suggestion_display': // This case is fully removed as it's handled by 'bot' type now
            //     return null;
            case 'suggestion_chip':
                 return message.searchSuggestionHtml ? ( <div className={botMessageContainerClass}><Search className="w-6 h-6 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-1 opacity-80" /><div className="max-w-full sm:max-w-md lg:max-w-xl xl:max-w-2xl" dangerouslySetInnerHTML={{ __html: message.searchSuggestionHtml }} /></div> ) : null;
            // case 'action_chips': // This case is also removed as chips are rendered below bot messages
            //      return null;
            case 'export_display':
                return message.exportMarkdown ? (
                    <div className={botMessageContainerClass}>
                        <Bot className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
                        <div className={cn(botMessageBubbleClass, "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 relative group")}>
                            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 dark:text-gray-200">
                                {message.exportMarkdown}
                            </pre>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-1 right-1 h-6 w-6 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleCopy(message.exportMarkdown)} // Pass handleCopy
                                        >
                                            <ClipboardCopy className="h-3.5 w-3.5" />
                                            <span className="sr-only">Sao chép</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left"><p>Sao chép</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>
                ) : null;
            default: return null;
        }
    };

    // --- Main JSX ---
    return (
        <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 overflow-hidden">

                {/* --- Top Action Buttons --- */}
                <div className="px-2 md:px-4 pt-2 md:pt-4 pb-1 flex justify-end gap-2 shrink-0">
                     {/* Download Button */}
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDownloadChat}
                                    disabled={!chatHistory || chatHistory.length === 0}
                                    className="gap-1.5"
                                >
                                    <Download className="h-4 w-4" />
                                    <span className="hidden sm:inline">Tải xuống</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Tải lịch sử trò chuyện này</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    {/* Preferences Toggle Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsPreferenceSectionOpen(!isPreferenceSectionOpen)}
                        disabled={isLoading} // Disable toggle during generation
                        className="gap-1.5"
                    >
                        {isPreferenceSectionOpen ? (
                            <X className="h-4 w-4" />
                        ) : (
                            <PlusCircle className="h-4 w-4" />
                        )}
                        {isPreferenceSectionOpen ? 'Đóng' : 'Tạo Mới'}
                    </Button>
                </div>

                {/* --- Preferences Card (Collapsible Section) --- */}
                {/* Apply transition and conditional max-height/opacity */}
                <div className={cn(
                    "transition-all duration-300 ease-in-out overflow-hidden",
                    isPreferenceSectionOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0" // Adjust max-h if needed
                )}>
                    <Card className={cn(
                        "mx-2 md:mx-4 mb-2 md:mb-4 rounded-lg shadow-lg bg-white dark:bg-gray-800 shrink-0 border dark:border-gray-700",
                        // Remove mobile-specific hiding classes here
                    )}>
                        <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-center justify-between border-b dark:border-gray-700/50">
                            <div className="flex items-center gap-2">
                                <ChefHat className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                <CardTitle className="text-base font-semibold">Tạo Thực Đơn Mới</CardTitle>
                            </div>
                            {/* Removed the mobile toggle button from here */}
                        </CardHeader>

                        {/* Content is always rendered but hidden by parent div's max-h/opacity */}
                        <CardContent className="p-4 space-y-4">
                            {/* Menu Type Selection */}
                            <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'>
                                <CardDescription className="text-sm shrink-0">Chọn loại thực đơn và nhập yêu cầu:</CardDescription>
                                <div className="flex gap-2 shrink-0">
                                    <Button size="sm" variant={menuType === 'daily' ? 'default' : 'outline'} onClick={() => setMenuType('daily')}>Hàng ngày</Button>
                                    <Button size="sm" variant={menuType === 'weekly' ? 'default' : 'outline'} onClick={() => setMenuType('weekly')}>Hàng tuần</Button>
                                </div>
                            </div>

                            {/* Preference Input Area */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2">
                                <div className="relative flex-grow w-full">
                                    <label htmlFor="preferences-input" className="sr-only">Yêu cầu và sở thích</label>
                                    <Textarea
                                        id="preferences-input"
                                        className="w-full resize-none text-sm pr-10 py-2 border rounded-md dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0"
                                        placeholder="VD: eat clean, nhiều rau xanh, không ăn hành tây, cần 1800 kcal/ngày..."
                                        value={preferences}
                                        onChange={handlePreferenceChange}
                                        rows={2}
                                        maxLength={MAX_PREFERENCE_LENGTH}
                                        disabled={isLoading}
                                    />
                                    <Button
                                        onClick={togglePreferenceSpeech}
                                        disabled={isLoading}
                                        size="icon"
                                        variant="ghost"
                                        className={cn(
                                            "absolute right-1.5 bottom-1.5 h-7 w-7 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400",
                                            isListeningPreferences && "text-red-500 dark:text-red-400 animate-pulse"
                                        )}
                                        aria-label={isListeningPreferences ? "Dừng ghi âm" : "Ghi âm yêu cầu"}
                                    >
                                        {isListeningPreferences ? <StopCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                    </Button>
                                </div>
                                <Button onClick={generateMenu} disabled={isLoading || !preferences.trim()} size="default" className="w-full sm:w-auto shrink-0 h-10">
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SendHorizontal className="mr-0 sm:mr-2 h-4 w-4" />}
                                    <span className={cn(isLoading ? "ml-2" : "", "hidden sm:inline")}>{isLoading ? 'Đang xử lý...' : 'Tạo Thực Đơn'}</span>
                                     <span className="sm:hidden">{isLoading ? 'Đang tạo...' : 'Tạo'}</span>
                                </Button>
                            </div>

                            {/* Quick Replies */}
                            <div className="flex flex-wrap gap-2 pt-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400 mr-1 mt-1">Gợi ý nhanh:</span>
                                {QUICK_REPLIES.map((reply) => (
                                    <Badge
                                        key={reply}
                                        variant="outline"
                                        className={cn(
                                            "text-xs cursor-pointer transition-colors duration-200 border",
                                            "hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500",
                                            "dark:border-gray-600",
                                            isLoading && "opacity-50 cursor-not-allowed"
                                        )}
                                        onClick={() => !isLoading && handleQuickReply(reply)} // Prevent click when loading
                                        aria-disabled={isLoading}
                                    >
                                        {reply}
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div> {/* End Collapsible Wrapper */}

                {/* --- Chat History Area --- */}
                <ScrollArea ref={chatScrollAreaRef} className="flex-1 p-4 pt-0 bg-white dark:bg-gray-800/50">
                    {/* Show thinking animation for initial generation OR feedback processing */}
                    {(isLoading && !menuResponseData) || isProcessingFeedback ? (
                         <div className="flex justify-center py-4">
                            <ThinkingAnimation />
                         </div>
                    ) : null}
                    <div className="space-y-5 max-w-4xl mx-auto pb-4">
                        {chatHistory.map((message) => (
                            <div key={message.id} className="flex w-full flex-col"> {/* Wrap in flex-col */}
                                {renderMessageContent(message)}
                                {/* Render action chips immediately after the bot message they belong to */}
                                {message.type === 'bot' && message.suggestedActions && message.suggestedActions.length > 0 && (
                                    <div className={cn(botMessageContainerClass, "ml-8 mt-2")}> {/* Indent slightly & add margin */}
                                        <div className="flex flex-wrap gap-2">
                                            {message.suggestedActions.map((action, index) => (
                                                <Button
                                                    key={index}
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-xs h-7"
                                                    onClick={() => handleActionClick(action)}
                                                    disabled={isLoading || isProcessingFeedback} // Disable when any loading is active
                                                >
                                                    {action}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        <div ref={chatEndRef} className="h-1" />
                    </div>
                </ScrollArea>

                {/* --- Feedback Input Area (Sticky Bottom) --- */}
                <div className={cn(
                    "p-3 md:p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700 shrink-0 sticky bottom-0 z-10 shadow- ऊपर-md transition-opacity duration-300 ease-in-out",
                    menuResponseData?.menu ? "opacity-100" : "opacity-0 pointer-events-none h-0 p-0 border-0" // Show only if menu exists
                )}>
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-grow">
                                <label htmlFor="feedback-input" className="sr-only">Nhập phản hồi hoặc câu hỏi</label>
                                <Input
                                    id="feedback-input"
                                    placeholder={isProcessingFeedback ? "Đang xử lý..." : "Nhập phản hồi hoặc câu hỏi..."} // Updated placeholder
                                    value={feedback}
                                    onChange={handleFeedbackChange}
                                    className="flex-grow resize-none rounded-full px-4 py-2 border text-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 pr-10"
                                    disabled={isLoading || isProcessingFeedback} // Disable if any loading
                                    onKeyDown={(e) => {
                                        // Trigger on Enter, check loading states
                                        if (e.key === 'Enter' && !e.shiftKey && !isLoading && !isProcessingFeedback && feedback.trim()) {
                                            e.preventDefault();
                                            handleFeedbackSubmit(); // Call the new handler
                                        }
                                    }}
                                />
                                <Button
                                    onClick={toggleFeedbackSpeech}
                                    disabled={isLoading || isProcessingFeedback} // Disable if any loading
                                    size="icon"
                                    variant="ghost"
                                    className={cn(
                                        "absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400",
                                         isListeningFeedback && "text-red-500 dark:text-red-400 animate-pulse"
                                    )}
                                    aria-label={isListeningFeedback ? "Dừng ghi âm" : "Ghi âm phản hồi"}
                                >
                                    {isListeningFeedback ? <StopCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                </Button>
                            </div>
                            <Button
                                onClick={handleFeedbackSubmit} // Call the new handler
                                disabled={isLoading || isProcessingFeedback || !feedback.trim()} // Disable if loading or no text
                                size="icon"
                                className="rounded-full shrink-0 w-9 h-9"
                                aria-label="Gửi" // Updated label
                            >
                                {/* Show loader only when processing feedback */}
                                {isProcessingFeedback ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                            </Button>
                        </div>
                        {/* Removed the message about suggestions */}
                    </div>
                </div>
            </div> {/* End Main Content Area */}
        </div>
    );
};

export default HomePage;
