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
    StopCircle, // Keep for Stop button
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
    Download, // Added for Download button
    Wand2, // Added for Enhance button
    Volume2, // Added for TTS
    ThumbsUp, // Added for Like
    ThumbsDown, // Added for Dislike
} from 'lucide-react';

// --- AI Flows ---
import {
    generateMenuFromPreferences,
    GenerateMenuFromPreferencesOutput,
    StepTrace,
} from '@/ai/flows/generate-menu-from-preferences';
import { suggestMenuModificationsBasedOnFeedback } from '@/ai/flows/suggest-menu-modifications-based-on-feedback';

// --- Hooks ---
import { useToast } from "@/hooks/use-toast";
// TODO: Import your authentication hook/context here
// import { useAuth } from '@/hooks/use-auth'; // Example
// import { useIsMobile } from '@/hooks/use-mobile'; // No longer strictly needed for this specific toggle logic

// --- Utils ---
import { cn } from "@/lib/utils";

// --- Constants ---
const MAX_PREFERENCE_LENGTH = 250;
// Removed static initial message, will be set dynamically
const QUICK_REPLIES = ["Bữa sáng nhanh gọn", "Thực đơn ít calo", "Món chay dễ làm", "Tăng cơ giảm mỡ", "Tiệc cuối tuần"];
const ANIMATION_VARIANTS: ChatMessage['animationVariant'][] = ['sequential', 'nodes', 'cycle', 'promptBot', 'stepsWithText'];

// --- Types ---
// Type for health information stored in localStorage
interface HealthInfo {
    name?: string;
    age?: number | null;
    gender?: string;
    height?: number | null;
    weight?: number | null;
    activityLevel?: string;
    allergies?: string;
    dietaryRestrictions?: string;
    preferences?: string; // User's general food preferences (from health form)
    medicalConditions?: string;
    goals?: string;
}

// Removed SuggestMenuModificationsOutput interface as we'll use the flow's output type directly

interface ChatMessage {
    // id can be number (timestamp) or string (temporary thinking ID)
    id: number | string;
    text?: string;
    type: 'user' | 'bot' | 'component' | 'error' | 'system' | 'trace_display' | 'suggestion_display' | 'suggestion_chip' | 'export_display' | 'bot_thinking'; // Added 'export_display' and 'bot_thinking'
    traceData?: StepTrace[];
    suggestionData?: Awaited<ReturnType<typeof suggestMenuModificationsBasedOnFeedback>>; // Store raw suggestion if needed (includes reasoning/analysis/menu string)
    searchSuggestionHtml?: string;
    exportMarkdown?: string;
    menuData?: GenerateMenuFromPreferencesOutput | null; // For initial menu
    modifiedMenuData?: any; // Parsed JSON object for modified menu suggestion
    modificationReasoning?: string; // Reasoning for the modification (extracted)
    modificationAnalysis?: string; // Analysis for the modification (extracted)
    animationVariant?: 'sequential' | 'nodes' | 'cycle' | 'promptBot' | 'stepsWithText'; // Optional variant for thinking animation
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
    // Removed menuModifications state as we render directly now
    // const [menuModifications, setMenuModifications] = useState<SuggestMenuModificationsOutput | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]); // Initialize empty, will set initial message in useEffect
    // Split isLoading into more specific states
    const [isGeneratingMenu, setIsGeneratingMenu] = useState<boolean>(false);
    const [isSuggestingModifications, setIsSuggestingModifications] = useState<boolean>(false);
    const [isEnhancingPreferences, setIsEnhancingPreferences] = useState<boolean>(false);
    const [isEnhancingFeedback, setIsEnhancingFeedback] = useState<boolean>(false); // <-- New state
    const [isListeningPreferences, setIsListeningPreferences] = useState(false);
    const [isListeningFeedback, setIsListeningFeedback] = useState(false);
    const [isPreferenceSectionOpen, setIsPreferenceSectionOpen] = useState(true); // Start open
    const [healthInfo, setHealthInfo] = useState<HealthInfo | null>(null); // <-- State for health info

    // --- Refs ---
    const chatEndRef = useRef<HTMLDivElement>(null); // Keep for potential fallback or other uses
    const chatScrollAreaRef = useRef<HTMLDivElement>(null); // Ref for the ScrollArea viewport
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const feedbackRecognitionRef = useRef<SpeechRecognition | null>(null);
    const synthRef = useRef<SpeechSynthesis | null>(null);
    const suggestionAbortControllerRef = useRef<AbortController | null>(null); // Ref for suggestion cancellation
    const generationAbortControllerRef = useRef<AbortController | null>(null); // Ref for generation cancellation

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

    // Effect to load health information from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedHealthInfo = localStorage.getItem('healthInformation');
            if (storedHealthInfo) {
                try {
                    const parsedInfo: HealthInfo = JSON.parse(storedHealthInfo);
                    setHealthInfo(parsedInfo);
                    console.log("Loaded health information:", parsedInfo);
                } catch (error) {
                    console.error("Failed to parse health information from localStorage:", error);
                    setHealthInfo(null); // Reset or handle error state
                }
            } else {
                console.log("No health information found in localStorage.");
                setHealthInfo(null);
            }
        }
    }, []); // Runs once on mount

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

    // Add Message (Updated with new fields)
    const addMessage = useCallback((
        type: ChatMessage['type'],
        text?: string,
        traceData?: StepTrace[],
        suggestionData?: ChatMessage['suggestionData'], // Keep for potential raw display if needed? Or remove? Let's keep for now.
        searchSuggestionHtml?: string,
        exportMarkdown?: string,
        menuData?: GenerateMenuFromPreferencesOutput | null, // For initial menu
        modifiedMenuData?: any, // Add parameter for modified menu object
        modificationReasoning?: string, // Add parameter for reasoning
        modificationAnalysis?: string, // Add parameter for analysis
        explicitId?: number | string, // Optional explicit ID for temporary messages
        animationVariant?: ChatMessage['animationVariant'] // Add animation variant parameter
    ) => {
        const newMessage: ChatMessage = {
            id: explicitId ?? Date.now() + Math.random(),
            type,
            text,
            traceData,
            suggestionData, // Store raw suggestion if needed
            searchSuggestionHtml,
            exportMarkdown,
            menuData, // Store initial menu data
            modifiedMenuData, // Store modified menu object
            modificationReasoning, // Store reasoning
            modificationAnalysis, // Store analysis
            animationVariant,
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

        setIsGeneratingMenu(true); // Use specific state
        setMenuResponseData(null);
        // setMenuModifications(null); // State removed
        setFeedback('');
        addMessage('user', `Tạo thực đơn ${menuType === 'daily' ? 'hàng ngày' : 'hàng tuần'}: ${trimmedPreferences}`);

        // --- Cancellation Setup ---
        const controller = new AbortController();
        generationAbortControllerRef.current = controller;
        // --- End Cancellation Setup ---

        let response: GenerateMenuFromPreferencesOutput | null = null;
        try {
            // Pass user information and signal to the AI flow
            // *** IMPORTANT: Assumes generateMenuFromPreferences accepts a signal ***
            response = await generateMenuFromPreferences({
                preferences: trimmedPreferences,
                menuType,
                userContext: { // Add user context object including health info
                    username: user?.username,
                    // Include health info if available
                    age: healthInfo?.age,
                    gender: healthInfo?.gender,
                    height: healthInfo?.height,
                    weight: healthInfo?.weight,
                    activityLevel: healthInfo?.activityLevel,
                    allergies: healthInfo?.allergies,
                    dietaryRestrictions: healthInfo?.dietaryRestrictions,
                    medicalConditions: healthInfo?.medicalConditions,
                    healthGoals: healthInfo?.goals,
                    // Note: healthInfo?.preferences is the general preference from the form,
                    // 'preferences' variable holds the specific request for *this* menu generation.
                    // We might want to pass both or decide which is more relevant.
                    // Let's pass the specific request as 'currentRequest' and form prefs as 'generalPreferences'
                    currentRequestPreferences: trimmedPreferences, // The specific request for this menu
                    generalFoodPreferences: healthInfo?.preferences, // General prefs from form
                },
                // signal: controller.signal // Pass signal here (adjust if needed)
            }); // REMOVED signal passing
            setMenuResponseData(response); // Store the full response including menu, trace etc.

            if (response?.trace) {
                addMessage('trace_display', undefined, response.trace);
            }

            if (response?.menu) {
                // Pass the response data when adding the component message for initial menu
                addMessage(
                    'component',
                    undefined, // text
                    undefined, // traceData
                    undefined, // suggestionData
                    undefined, // searchSuggestionHtml
                    undefined, // exportMarkdown
                    response, // menuData (initial)
                    undefined, // modifiedMenuData
                    undefined, // modificationReasoning
                    undefined, // modificationAnalysis
                );
                // *** NEW: Auto-hide preference section on successful generation ***
                setIsPreferenceSectionOpen(false);
            } else {
                const errorMessage = 'Không thể tạo thực đơn. Kết quả trả về không hợp lệ.';
                addMessage('error', errorMessage);
            }
            if (response?.searchSuggestionHtml) {
                 addMessage('suggestion_chip', undefined, undefined, undefined, response.searchSuggestionHtml);
            }

        } catch (error: any) {
            // Check if the error is due to abortion
            if (error.name === 'AbortError') {
                console.log("Generation request aborted by user.");
                addMessage('system', "Yêu cầu tạo thực đơn đã bị hủy.");
                // State is reset in finally block
            } else {
                console.error("Generate Menu Error:", error);
                addMessage('error', `Lỗi hệ thống khi tạo thực đơn: ${error.message || 'Vui lòng thử lại.'}`);
                // Don't hide the preference section on error, user might want to retry/edit
            }
        } finally {
            setIsGeneratingMenu(false); // Use specific state
            generationAbortControllerRef.current = null; // Clear the controller ref
        }
        // Added dependencies: user, setIsGeneratingMenu, setMenuResponseData, setFeedback, setIsPreferenceSectionOpen
    }, [preferences, menuType, addMessage, toast, user, setIsGeneratingMenu, setMenuResponseData, setFeedback, setIsPreferenceSectionOpen]); // generationAbortControllerRef not needed

    // NEW: Enhance Preferences Handler
    const handleEnhancePreferences = useCallback(async () => {
        const trimmedPreferences = preferences.trim();
        if (!trimmedPreferences) {
            toast({ title: "Thiếu yêu cầu", description: "Vui lòng nhập yêu cầu trước khi cải thiện.", variant: "destructive" });
            return;
        }

        setIsEnhancingPreferences(true);
        try {
            const response = await fetch('/api/enhance-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'menu_preferences',
                    preferences: trimmedPreferences,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.enhancedPrompt) {
                setPreferences(data.enhancedPrompt); // Update the textarea
                toast({ title: "Đã cải thiện yêu cầu", description: "Yêu cầu của bạn đã được làm rõ hơn." });
            } else {
                throw new Error("Không nhận được yêu cầu đã cải thiện.");
            }
        } catch (error: any) {
            console.error("Enhance Preferences Error:", error);
            toast({ title: "Lỗi cải thiện yêu cầu", description: error.message || 'Vui lòng thử lại.', variant: "destructive" });
        } finally {
            setIsEnhancingPreferences(false);
        }
    }, [preferences, toast, setPreferences]); // Dependencies: preferences, toast, setPreferences

    // NEW: Enhance Feedback Handler
    const handleEnhanceFeedback = useCallback(async () => {
        const trimmedFeedback = feedback.trim();
        const originalMenu = menuResponseData?.menu;
        const originalPrefs = preferences; // Use the current preferences state as the original

        if (!trimmedFeedback) {
            toast({ title: "Thiếu phản hồi", description: "Vui lòng nhập phản hồi trước khi cải thiện.", variant: "destructive" });
            return;
        }
        if (!originalMenu) {
            toast({ title: "Thiếu thực đơn gốc", description: "Không tìm thấy thực đơn để cải thiện phản hồi.", variant: "destructive" });
            return;
        }
         if (!originalPrefs) {
            // Although unlikely if a menu exists, good to check
            toast({ title: "Thiếu yêu cầu gốc", description: "Không tìm thấy yêu cầu gốc để cải thiện phản hồi.", variant: "destructive" });
            return;
        }


        setIsEnhancingFeedback(true);
        try {
            const response = await fetch('/api/enhance-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'menu_feedback',
                    originalPreferences: originalPrefs,
                    generatedMenu: JSON.stringify(originalMenu), // Send the menu object as string
                    userFeedback: trimmedFeedback,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            // The enhanced prompt here is meant to be used *by the AI* for regeneration,
            // but the user asked for a button. We can update the *feedback* input
            // with this enhanced prompt, assuming the user might want to see/edit it
            // before sending it for regeneration.
            if (data.enhancedPrompt) {
                setFeedback(data.enhancedPrompt); // Update the feedback input
                toast({ title: "Đã cải thiện phản hồi", description: "Phản hồi của bạn đã được làm rõ hơn cho AI." });
            } else {
                throw new Error("Không nhận được phản hồi đã cải thiện.");
            }
        } catch (error: any) {
            console.error("Enhance Feedback Error:", error);
            toast({ title: "Lỗi cải thiện phản hồi", description: error.message || 'Vui lòng thử lại.', variant: "destructive" });
        } finally {
            setIsEnhancingFeedback(false);
        }
    }, [feedback, menuResponseData, preferences, toast, setFeedback]); // Dependencies updated


    // Suggest Modifications Function (MODIFIED to render component)
    const suggestModifications = useCallback(async () => {
        const trimmedFeedback = feedback.trim();
        if (!trimmedFeedback) {
            toast({ title: "Thiếu phản hồi", description: "Vui lòng nhập phản hồi của bạn về thực đơn.", variant: "destructive" });
            return;
        }
        // Use menuResponseData.menu as the source of truth for the *current* menu
        if (!menuResponseData?.menu) {
            toast({ title: "Thiếu thực đơn", description: "Chưa có thực đơn gốc để đưa ra phản hồi.", variant: "destructive" });
            return;
        }

        // No need to clear menuModifications state anymore
        // setMenuModifications(null);

        setIsSuggestingModifications(true); // Use specific state
        addMessage('user', `Phản hồi: ${trimmedFeedback}`);

        // Add temporary thinking message
        const thinkingMessageId = `thinking-${Date.now()}`;
        const randomVariant = ANIMATION_VARIANTS[Math.floor(Math.random() * ANIMATION_VARIANTS.length)];
        addMessage('bot_thinking', undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, thinkingMessageId, randomVariant);

        // --- Cancellation Setup ---
        const controller = new AbortController();
        suggestionAbortControllerRef.current = controller;
        // --- End Cancellation Setup ---

        // --- Type definition for the structured error from the server action ---
        // Define locally within the function scope
        type ErrorOutput = {
            error: true;
            message: string;
        };

        // --- Type guard function ---
        // Define locally within the function scope
        function isErrorOutput(response: any): response is ErrorOutput {
            return response && typeof response === 'object' && response.error === true && typeof response.message === 'string';
        }

        try {
            // Use the menu object from the current state
            const baseMenuString = JSON.stringify(menuResponseData.menu);

            // Call the server action, passing the signal
            // *** IMPORTANT: Assumes suggestMenuModificationsBasedOnFeedback or its underlying fetch mechanism accepts a signal ***
            const modificationsResult = await suggestMenuModificationsBasedOnFeedback({
                menu: baseMenuString,
                feedback: trimmedFeedback,
                userContext: { // Pass context matching the schema
                    username: user?.username,
                    // Convert null to undefined for numeric fields
                    age: healthInfo?.age ?? undefined,
                    gender: healthInfo?.gender,
                    height: healthInfo?.height ?? undefined,
                    weight: healthInfo?.weight ?? undefined,
                    activityLevel: healthInfo?.activityLevel,
                    // Convert string to string array for medicalConditions
                    medicalConditions: healthInfo?.medicalConditions ? [healthInfo.medicalConditions] : undefined,
                    // healthGoals, generalFoodPreferences, originalMenuPreferences are not part of this flow's userContext schema
                },
                 userPreferences: { // Pass preferences matching the schema
                    // Convert string to string array
                    allergies: healthInfo?.allergies ? [healthInfo.allergies] : undefined,
                    dietaryRestrictions: healthInfo?.dietaryRestrictions ? [healthInfo.dietaryRestrictions] : undefined,
                    // Other fields from schema are not currently stored in healthInfo state
                 },
                // signal: controller.signal // Pass the signal here (adjust if the function signature is different)
            }); // REMOVED signal passing


            // --- Use the type guard to check if the result is an error object ---
            if (isErrorOutput(modificationsResult)) {
                // Handle the structured error returned by the server action
                console.error("Server action returned a structured error:", modificationsResult.message);
                addMessage('error', `Lỗi khi xử lý phản hồi: ${modificationsResult.message}`);
            }
            // --- If not an error, handle the successful response types ---
            else if (modificationsResult) {
                // Now TypeScript knows modificationsResult is not ErrorOutput here
                if (modificationsResult.responseType === 'menu_modification') {
                    // Handle successful 'menu_modification'
                    if (modificationsResult.modifiedMenu) {
                        try {
                            const updatedMenuObject = JSON.parse(modificationsResult.modifiedMenu);

                            // Add a 'component' message to render the modified menu interactively
                            addMessage(
                                'component',
                                undefined, // text
                                undefined, // traceData
                                modificationsResult, // suggestionData (raw response)
                                undefined, // searchSuggestionHtml
                                undefined, // exportMarkdown
                                undefined, // menuData (initial)
                                updatedMenuObject, // modifiedMenuData (parsed object)
                                modificationsResult.reasoning, // modificationReasoning
                                modificationsResult.nutritionalAnalysis // modificationAnalysis
                            );
                            toast({ title: "Đã cập nhật thực đơn", description: "Thực đơn đã được cập nhật với gợi ý mới." });

                            // Update the underlying menuResponseData state so subsequent feedback uses this latest version
                            setMenuResponseData(prevData => ({
                                ...(prevData ?? { menu: null, menuType: menuType, feedbackRequest: '' }), // Keep existing data structure
                                menu: updatedMenuObject, // Update the menu object
                                // Keep other fields like trace, searchSuggestionHtml, menuType, feedbackRequest
                                trace: prevData?.trace ?? [],
                                searchSuggestionHtml: prevData?.searchSuggestionHtml,
                                menuType: prevData?.menuType ?? menuType,
                                feedbackRequest: prevData?.feedbackRequest ?? '',
                            }));
                            console.log("Updated main menuResponseData with modified menu.");
                            setFeedback(''); // Clear feedback only on successful parse/update
                        } catch (parseError) {
                            console.error("Failed to parse modifiedMenu JSON:", parseError);
                            addMessage('error', "Lỗi: Không thể cập nhật thực đơn từ gợi ý mới (lỗi định dạng JSON).");
                            // Don't clear feedback if parsing fails
                        }
                    } else {
                        // AI said modification but didn't provide menu - should be handled by flow now, but fallback just in case
                         addMessage('system', "Rất tiếc, tôi chưa thể đưa ra gợi ý chỉnh sửa mới dựa trên phản hồi này.");
                         setFeedback(''); // Clear feedback as we processed the attempt
                    }
                } else if (modificationsResult.responseType === 'answer') {
                    // Handle successful 'answer'
                    if (modificationsResult.answerText) {
                        addMessage('bot', modificationsResult.answerText);
                        setFeedback(''); // Clear feedback after showing answer
                    } else {
                        // Handle case where AI returned 'answer' but no text
                        console.warn("Received 'answer' response with no answerText.");
                        addMessage('system', "Tôi đã nhận được yêu cầu, nhưng không có nội dung trả lời cụ thể.");
                        setFeedback(''); // Clear feedback even here
                    }
                } else {
                    // Handle unexpected responseType within the success object
                    console.warn("Received unexpected responseType in success object:", modificationsResult);
                    addMessage('system', "Đã nhận được phản hồi không mong muốn từ hệ thống.");
                }
            }
            // --- Handle null/undefined response ---
            else {
                 console.warn("Received null or undefined response from suggestMenuModificationsBasedOnFeedback");
                 addMessage('system', "Không nhận được phản hồi từ hệ thống.");
            }
        } catch (error: any) {
             // Check if the error is due to abortion
            if (error.name === 'AbortError') {
                console.log("Suggestion request aborted by user.");
                addMessage('system', "Yêu cầu đã bị hủy.");
                // State is reset in finally block
            } else {
                console.error("Suggest Modifications Error:", error);
                addMessage('error', `Lỗi khi xử lý phản hồi: ${error.message || 'Vui lòng thử lại.'}`);
            }
        } finally {
            setIsSuggestingModifications(false); // Use specific state
            suggestionAbortControllerRef.current = null; // Clear the controller ref
            // Remove temporary thinking message (ensure this happens even on abort)
            setChatHistory(prev => prev.filter(msg => msg.id !== thinkingMessageId));
        }
        // Dependencies updated
    }, [feedback, menuResponseData, addMessage, toast, user, setIsSuggestingModifications, setFeedback, setChatHistory, setMenuResponseData, menuType]); // suggestionAbortControllerRef is not needed as dependency

    // Handle Quick Reply (Optimized - Unchanged)
    const handleQuickReply = useCallback((reply: string) => {
        // ... (quick reply logic remains the same)
        // Use specific loading states
        if (isGeneratingMenu || isSuggestingModifications) return;
        setPreferences(reply);
        // Set timeout ensures state update is processed before triggering async call.
        setTimeout(() => {
            generateMenu();
        }, 0);
    }, [isGeneratingMenu, isSuggestingModifications, generateMenu, setPreferences]); // Use specific states, Added setPreferences

    // --- Callback for Ingredient Export ---
    const handleExportIngredientsCallback = useCallback((markdown: string) => {
        addMessage('export_display', undefined, undefined, undefined, undefined, markdown);
        toast({ title: "Đã xuất Checklist", description: "Danh sách nguyên liệu đã được thêm vào khung chat." });
    }, [addMessage, toast]);

    // --- NEW: Handler for Suggested Prompt Clicks ---
    const handlePromptClick = useCallback((prompt: string) => {
        // Set the feedback input with the prompt text
        setFeedback(prompt);
        // Immediately trigger the modification suggestion flow
        // Use setTimeout to ensure state update is processed before triggering async call
        setTimeout(() => {
            suggestModifications();
        }, 0);
    }, [setFeedback, suggestModifications]); // Dependencies: setFeedback, suggestModifications

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

    // --- TTS Handler ---
    const handleSpeak = useCallback((textToSpeak: string | undefined) => {
        if (!textToSpeak || !synthRef.current) {
            toast({ title: "Lỗi TTS", description: "Không có nội dung để đọc hoặc TTS chưa sẵn sàng.", variant: "destructive" });
            return;
        }
        // Cancel any ongoing speech before starting new
        synthRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'vi-VN'; // Set language to Vietnamese
        // Optional: Find a Vietnamese voice if available
        const voices = synthRef.current.getVoices();
        const vietnameseVoice = voices.find(voice => voice.lang === 'vi-VN');
        if (vietnameseVoice) {
            utterance.voice = vietnameseVoice;
        } else {
            console.warn("Không tìm thấy giọng đọc tiếng Việt. Sử dụng giọng mặc định.");
        }
        // Optional: Adjust rate and pitch if desired
        // utterance.rate = 1;
        // utterance.pitch = 1;

        synthRef.current.speak(utterance);
    }, [toast]); // Depends on toast

    // --- Placeholder Like/Dislike Handler ---
    const handleFeedbackAction = useCallback((action: 'like' | 'dislike', messageId: string | number) => {
        // In a real app, you'd send this feedback to your backend
        console.log(`Action: ${action}, Message ID: ${messageId}`);
        toast({
            title: `Đã ${action === 'like' ? 'thích' : 'không thích'}`,
            description: `Cảm ơn phản hồi của bạn về tin nhắn ${messageId}!`,
        });
    }, [toast]); // Depends on toast


    // --- Download Chat Handler ---
    const handleDownloadChat = useCallback(() => {
        if (!chatHistory || chatHistory.length === 0) {
            toast({ title: "Không có gì để tải", description: "Lịch sử trò chuyện hiện tại đang trống.", variant: "destructive" });
            return;
        }

        let chatContent = `Chat History (ID: ${chatId || 'new'})\n=====================================\n\n`;

        chatHistory.forEach(message => {
            const timestamp = typeof message.id === 'number' ? new Date(message.id).toLocaleString('vi-VN') : 'temp'; // Handle temp IDs
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
                    // Handle both initial and modified menus
                    if (message.menuData?.menu) { // Initial Menu
                        chatContent += `[${timestamp}] Bot (Generated Menu - ${message.menuData.menuType}):\n\`\`\`json\n${JSON.stringify(message.menuData.menu, null, 2)}\n\`\`\`\n\n`;
                        if (message.menuData.feedbackRequest) {
                             chatContent += `[${timestamp}] Bot (Feedback Request):\n${message.menuData.feedbackRequest}\n\n`;
                        }
                    } else if (message.modifiedMenuData) { // Modified Menu
                         chatContent += `[${timestamp}] Bot (Modified Menu Suggestion):\n`;
                         if(message.modificationReasoning) chatContent += `Reasoning: ${message.modificationReasoning}\n`;
                         if(message.modificationAnalysis) chatContent += `Analysis: ${message.modificationAnalysis}\n`;
                         chatContent += `\`\`\`json\n${JSON.stringify(message.modifiedMenuData, null, 2)}\n\`\`\`\n\n`;
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
                        // Basic validation: check if it's an array and ensure IDs are numbers for persisted data
                        if (Array.isArray(parsedMessages) && parsedMessages.every(msg => typeof msg.id === 'number')) {
                            console.log(`Loaded ${parsedMessages.length} messages for chat ${chatId}`);
                            setChatHistory(parsedMessages);
                            // Find and restore the *last* menu data (initial or modified) if present
                            const lastMenuMessage = [...parsedMessages].reverse().find(msg => msg.type === 'component' && (msg.menuData || msg.modifiedMenuData));
                            if (lastMenuMessage) {
                                if (lastMenuMessage.modifiedMenuData) {
                                     // If the last one was a modification, restore that menu to state
                                     // We need menuType as well, find the original menu message or use current state
                                     const originalMenuMessage = parsedMessages.find(msg => msg.type === 'component' && msg.menuData);
                                     setMenuResponseData({
                                         menu: lastMenuMessage.modifiedMenuData,
                                         menuType: originalMenuMessage?.menuData?.menuType || menuType, // Fallback to current state menuType
                                         // Restore other fields if needed, or set defaults
                                         trace: originalMenuMessage?.menuData?.trace ?? [],
                                         feedbackRequest: originalMenuMessage?.menuData?.feedbackRequest ?? '',
                                         searchSuggestionHtml: originalMenuMessage?.menuData?.searchSuggestionHtml,
                                     });
                                     console.log("Restored *modified* menu data from loaded chat.");
                                } else if (lastMenuMessage.menuData) {
                                    // If the last one was the initial menu
                                    setMenuResponseData(lastMenuMessage.menuData);
                                    console.log("Restored *initial* menu data from loaded chat.");
                                }
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
                        setChatHistory([{ id: Date.now(), type: 'system', text: `Lỗi khi tải lịch sử cho cuộc trò chuyện ${chatId}. Bắt đầu mới.` }]); // Ensure ID is number
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
                    setChatHistory([{ id: Date.now(), type: 'system', text: `Đang xem lại cuộc trò chuyện: "${chatTitle || chatId}"...` }]); // Ensure ID is number
                    setMenuResponseData(null); // Clear menu data for new chat
                }
                // Reset other states when loading a chat
                // setMenuModifications(null); // State removed
                setFeedback('');
                setIsPreferenceSectionOpen(false); // Usually hide preferences when loading old chat

            } else {
                // No chatId in URL, treat as a completely new session
                console.log("No chatId in URL, starting a new chat session.");
                // Initial message is now handled by the dedicated useEffect based on user
                // setChatHistory([{ id: Date.now(), text: INITIAL_SYSTEM_MESSAGE, type: "system" }]); // Removed
                setMenuResponseData(null);
                // setMenuModifications(null); // State removed
                setFeedback('');
                setIsPreferenceSectionOpen(true); // Show preferences for a new chat
            }
        };

        loadChat();
        // Dependency: chatId. Re-run when the user clicks a different chat link.
    }, [chatId, setMenuResponseData, setFeedback, setIsPreferenceSectionOpen, menuType]); // Removed setChatHistory, setMenuModifications dependency

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
                // Filter out any temporary 'bot_thinking' messages before saving
                const historyToSave = chatHistory.filter(msg => msg.type !== 'bot_thinking');
                console.log(`Saving ${historyToSave.length} messages for chat ${chatId}`);
                const storageKey = `chatMessages_${chatId}`;
                localStorage.setItem(storageKey, JSON.stringify(historyToSave));
            }
        }
        // Dependency: chatHistory and chatId. Save whenever the history changes for the current chat.
    }, [chatHistory, chatId]);
    // --- End Save Chat History Effect ---


    // --- Render Logic ---

    // Refined Message Rendering Function (Fixing TS Errors and Hover - Attempt 5)
    const renderMessageContent = (message: ChatMessage) => {
        const isBotOrSystem = message.type === 'bot' || message.type === 'system' || message.type === 'component' || message.type === 'trace_display' || message.type === 'suggestion_display' || message.type === 'suggestion_chip' || message.type === 'error' || message.type === 'export_display' || message.type === 'bot_thinking';
        const botMessageContainerClass = "group flex items-start gap-2.5"; // Group class on the main container - REVERTED justify-center
        const botMessageBubbleClass = "max-w-full sm:max-w-md lg:max-w-xl xl:max-w-2xl p-3 rounded-lg shadow-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-tl-none";
        const userMessageContainerClass = "flex items-start gap-2.5 justify-end"; // REVERTED justify-center to justify-end
        const userMessageBubbleClass = "max-w-full sm:max-w-md lg:max-w-xl xl:max-w-2xl p-3 rounded-lg shadow-sm bg-blue-600 text-white rounded-tr-none";
        // Buttons positioned absolutely at the bottom of the inner wrapper (within padding), appear on group hover
        const actionButtonContainerClass = "absolute bottom-1 left-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"; // Positioned within pb-8 padding
        const actionButtonClass = "h-6 w-6 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-white dark:bg-gray-800 rounded p-0.5"; // Added bg for visibility

        switch (message.type) {
            case 'user':
                return message.text ? ( <div className={userMessageContainerClass}><div className={userMessageBubbleClass}><pre className="whitespace-pre-wrap font-sans text-sm">{message.text}</pre></div><User className="w-6 h-6 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-1" /></div> ) : null;
            case 'bot':
                 return message.text ? (
                    <div className={botMessageContainerClass}>
                        <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                        <div className="flex flex-col items-start relative pb-8"> {/* Added relative and padding-bottom */}
                            {/* Bubble */}
                            <div className={botMessageBubbleClass}>
                                <pre className="whitespace-pre-wrap font-sans text-sm">{message.text}</pre>
                            </div>
                            {/* Action Buttons - Positioned absolutely within the padded space */}
                            <div className={actionButtonContainerClass}>
                                <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleSpeak(message.text)}><Volume2 className="h-3.5 w-3.5" /><span className="sr-only">Đọc</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Đọc</p></TooltipContent></Tooltip></TooltipProvider>
                                <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleFeedbackAction('like', message.id)}><ThumbsUp className="h-3.5 w-3.5" /><span className="sr-only">Thích</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Thích</p></TooltipContent></Tooltip></TooltipProvider>
                                <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleFeedbackAction('dislike', message.id)}><ThumbsDown className="h-3.5 w-3.5" /><span className="sr-only">Không thích</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Không thích</p></TooltipContent></Tooltip></TooltipProvider>
                                <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleCopy(message.text)}><ClipboardCopy className="h-3.5 w-3.5" /><span className="sr-only">Sao chép</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Sao chép</p></TooltipContent></Tooltip></TooltipProvider>
                            </div>
                        </div>
                    </div>
                 ) : null;
            case 'system':
                return message.text ? (
                    <div className={botMessageContainerClass}>
                        <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                        <div className="flex flex-col items-start relative pb-8"> {/* Added relative and padding-bottom */}
                            <Alert variant="default" className="max-w-full sm:max-w-md lg:max-w-xl xl:max-w-2xl p-3 rounded-lg rounded-tl-none shadow-sm">
                                <Info className="h-4 w-4" />
                                <AlertTitle className="text-sm font-medium">Thông báo</AlertTitle>
                                <AlertDescription className="text-sm">{message.text}</AlertDescription>
                            </Alert>
                             {/* Action Buttons - Positioned absolutely within the padded space */}
                             <div className={actionButtonContainerClass}>
                                <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleSpeak(message.text)}><Volume2 className="h-3.5 w-3.5" /><span className="sr-only">Đọc</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Đọc</p></TooltipContent></Tooltip></TooltipProvider>
                                <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleFeedbackAction('like', message.id)}><ThumbsUp className="h-3.5 w-3.5" /><span className="sr-only">Thích</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Thích</p></TooltipContent></Tooltip></TooltipProvider>
                                <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleFeedbackAction('dislike', message.id)}><ThumbsDown className="h-3.5 w-3.5" /><span className="sr-only">Không thích</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Không thích</p></TooltipContent></Tooltip></TooltipProvider>
                                <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleCopy(message.text)}><ClipboardCopy className="h-3.5 w-3.5" /><span className="sr-only">Sao chép</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Sao chép</p></TooltipContent></Tooltip></TooltipProvider>
                            </div>
                        </div>
                    </div>
                 ) : null;
            case 'error':
                 return message.text ? (
                    <div className={botMessageContainerClass}>
                        <Bot className="w-6 h-6 text-red-500 dark:text-red-400 flex-shrink-0 mt-1" />
                         <div className="flex flex-col items-start relative pb-8"> {/* Added relative and padding-bottom */}
                            <Alert variant="destructive" className="max-w-full sm:max-w-md lg:max-w-xl xl:max-w-2xl p-3 rounded-lg rounded-tl-none shadow-sm">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle className="text-sm font-medium">Lỗi</AlertTitle>
                                <AlertDescription className="text-sm">{message.text}</AlertDescription>
                            </Alert>
                             {/* Action Buttons - Positioned absolutely within the padded space */}
                             <div className={actionButtonContainerClass}>
                                <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleSpeak(message.text)}><Volume2 className="h-3.5 w-3.5" /><span className="sr-only">Đọc</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Đọc</p></TooltipContent></Tooltip></TooltipProvider>
                                <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleFeedbackAction('like', message.id)}><ThumbsUp className="h-3.5 w-3.5" /><span className="sr-only">Thích</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Thích</p></TooltipContent></Tooltip></TooltipProvider>
                                <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleFeedbackAction('dislike', message.id)}><ThumbsDown className="h-3.5 w-3.5" /><span className="sr-only">Không thích</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Không thích</p></TooltipContent></Tooltip></TooltipProvider>
                                <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleCopy(message.text)}><ClipboardCopy className="h-3.5 w-3.5" /><span className="sr-only">Sao chép</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Sao chép</p></TooltipContent></Tooltip></TooltipProvider>
                            </div>
                         </div>
                    </div>
                 ) : null;
            case 'trace_display':
                 // Pass isGeneratingMenu to AgentProcessVisualizer
                 // Add action buttons (Like/Dislike only for now)
                 return message.traceData ? (
                    <div className={botMessageContainerClass}>
                        <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1 opacity-50" />
                        <div className="flex flex-col items-start relative pb-8"> {/* Added relative and padding-bottom */}
                            <div className={cn(botMessageBubbleClass, "bg-gray-50 dark:bg-gray-700/50 border border-border/50 overflow-x-auto")}>
                                <AgentProcessVisualizer trace={message.traceData ?? []} isProcessing={isGeneratingMenu} />
                            </div>
                            {/* Action Buttons - Positioned absolutely within the padded space */}
                            <div className={actionButtonContainerClass}>
                                {/* <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} disabled><Volume2 className="h-3.5 w-3.5" /><span className="sr-only">Đọc (Vô hiệu hóa)</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Đọc (Vô hiệu hóa)</p></TooltipContent></Tooltip></TooltipProvider> */}
                                <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleFeedbackAction('like', message.id)}><ThumbsUp className="h-3.5 w-3.5" /><span className="sr-only">Thích</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Thích</p></TooltipContent></Tooltip></TooltipProvider>
                                <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleFeedbackAction('dislike', message.id)}><ThumbsDown className="h-3.5 w-3.5" /><span className="sr-only">Không thích</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Không thích</p></TooltipContent></Tooltip></TooltipProvider>
                                {/* <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} disabled><ClipboardCopy className="h-3.5 w-3.5" /><span className="sr-only">Sao chép (Vô hiệu hóa)</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Sao chép (Vô hiệu hóa)</p></TooltipContent></Tooltip></TooltipProvider> */}
                            </div>
                        </div>
                    </div>
                 ) : null; // Added ?? [] for trace
            case 'component':
                // Check if it's a modified menu first
                if (message.modifiedMenuData) {
                    // Define menuType relying only on state or default (Removed suggestionData check)
                    let currentMenuType: 'daily' | 'weekly' = menuResponseData?.menuType || 'daily';
                    // Prepare text for speak/copy
                    const textToSpeak = message.modificationReasoning || message.modificationAnalysis || "Thực đơn đã được cập nhật.";
                    const textToCopy = JSON.stringify(message.modifiedMenuData, null, 2);
                    return (
                        <div className={botMessageContainerClass}>
                            <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                            <div className="flex flex-col items-start relative pb-8"> {/* Added relative and padding-bottom */}
                                <div className={cn(botMessageBubbleClass, "space-y-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700")}>
                                    <div className="flex items-center text-sm font-medium text-blue-800 dark:text-blue-200">
                                        <Info className="h-4 w-4 mr-2 flex-shrink-0" />
                                        <span>Thực đơn đã cập nhật theo gợi ý:</span>
                                    </div>
                                    {message.modificationReasoning && (
                                        <div className="text-sm text-gray-700 dark:text-gray-300">
                                            <p className="font-semibold">Lý do:</p>
                                            <p>{message.modificationReasoning}</p>
                                        </div>
                                    )}
                                    {message.modificationAnalysis && (
                                         <div className="text-sm text-gray-700 dark:text-gray-300 pt-2 border-t border-blue-200 dark:border-blue-700/50">
                                            <p className="font-semibold">Phân tích:</p>
                                            <p>{message.modificationAnalysis}</p>
                                        </div>
                                    )}
                                    {/* Removed overflow-hidden */}
                                    <div className="bg-card dark:bg-gray-800 p-0 rounded-md shadow-sm border border-border/50 mt-2 overflow-x-auto">
                                        <InteractiveMenu
                                            menuData={{ menu: message.modifiedMenuData, menuType: currentMenuType }}
                                            onExportIngredients={handleExportIngredientsCallback}
                                            onPromptClick={handlePromptClick} // Pass the handler here
                                        />
                                    </div>
                                </div>
                                {/* Action Buttons */}
                                <div className={actionButtonContainerClass}>
                                    <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleSpeak(textToSpeak)}><Volume2 className="h-3.5 w-3.5" /><span className="sr-only">Đọc</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Đọc Lý do/Phân tích</p></TooltipContent></Tooltip></TooltipProvider>
                                    <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleFeedbackAction('like', message.id)}><ThumbsUp className="h-3.5 w-3.5" /><span className="sr-only">Thích</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Thích</p></TooltipContent></Tooltip></TooltipProvider>
                                    <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleFeedbackAction('dislike', message.id)}><ThumbsDown className="h-3.5 w-3.5" /><span className="sr-only">Không thích</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Không thích</p></TooltipContent></Tooltip></TooltipProvider>
                                    <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleCopy(textToCopy)}><ClipboardCopy className="h-3.5 w-3.5" /><span className="sr-only">Sao chép</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Sao chép JSON Thực đơn</p></TooltipContent></Tooltip></TooltipProvider>
                                </div>
                            </div>
                        </div>
                    );
                }
                // Otherwise, render the initial menu
                else if (message.menuData?.menu) {
                    // Define greetingText and prepare text for speak/copy
                    const greetingText = `Tuyệt vời! Dựa trên yêu cầu của bạn, tôi đã chuẩn bị xong thực đơn ${message.menuData.menuType === 'daily' ? 'hàng ngày' : 'hàng tuần'} rồi đây:`;
                    const textToSpeak = greetingText + (message.menuData.feedbackRequest ? ` ${message.menuData.feedbackRequest}` : '');
                    const textToCopy = JSON.stringify(message.menuData.menu, null, 2);
                    return (
                         <div className={botMessageContainerClass}>
                            <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                            <div className="flex flex-col items-start relative pb-8"> {/* Added relative and padding-bottom */}
                                <div className={cn(botMessageBubbleClass, "space-y-3")}>
                                    <p className="text-sm">{greetingText}</p>
                                     {/* Removed overflow-hidden */}
                                    <div className="bg-card dark:bg-gray-800 p-0 rounded-md shadow-sm border border-border/50 mt-2 overflow-x-auto">
                                    {/* Added null check for menuData */}
                                    <InteractiveMenu
                                        menuData={{ menu: message.menuData?.menu ?? {}, menuType: message.menuData?.menuType ?? 'daily' }} // Added null checks
                                        onExportIngredients={handleExportIngredientsCallback}
                                        onPromptClick={handlePromptClick}
                                    />
                                </div>
                                {message.menuData?.feedbackRequest && ( // Added optional chaining
                                    <p className="text-sm italic mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                        {message.menuData.feedbackRequest}
                                    </p>
                                    )}
                                </div>
                                {/* Action Buttons */}
                                <div className={actionButtonContainerClass}>
                                    <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleSpeak(textToSpeak)}><Volume2 className="h-3.5 w-3.5" /><span className="sr-only">Đọc</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Đọc Lời chào/Yêu cầu</p></TooltipContent></Tooltip></TooltipProvider>
                                    <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleFeedbackAction('like', message.id)}><ThumbsUp className="h-3.5 w-3.5" /><span className="sr-only">Thích</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Thích</p></TooltipContent></Tooltip></TooltipProvider>
                                    <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleFeedbackAction('dislike', message.id)}><ThumbsDown className="h-3.5 w-3.5" /><span className="sr-only">Không thích</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Không thích</p></TooltipContent></Tooltip></TooltipProvider>
                                    <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleCopy(textToCopy)}><ClipboardCopy className="h-3.5 w-3.5" /><span className="sr-only">Sao chép</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Sao chép JSON Thực đơn</p></TooltipContent></Tooltip></TooltipProvider>
                                </div>
                            </div>
                        </div>
                     );
                }
                return null; // Should not happen if type is 'component'
            case 'suggestion_display': // Keep this case for potential fallback or if we decide to show raw JSON sometimes
                    // Define suggestion variable outside the return statement
            case 'suggestion_display': // Keep this case for potential fallback or if we decide to show raw JSON sometimes
                    // Define suggestion variable outside the return statement
                    const suggestion = message.suggestionData;
                    // Type guard to ensure suggestion is the correct type *before* accessing properties
                    if (suggestion && 'responseType' in suggestion && suggestion.responseType === 'menu_modification' && suggestion.modifiedMenu) {
                        // Prepare text for speak/copy *inside* the valid block
                        const suggestionTextToSpeak = suggestion.reasoning || "Gợi ý chỉnh sửa.";
                        const suggestionTextToCopy = suggestion.modifiedMenu;
                        return (
                            <div className={botMessageContainerClass}>
                                <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                                <div className="flex flex-col items-start relative pb-8"> {/* Added relative and padding-bottom */}
                                    <div className={cn(botMessageBubbleClass, "bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700")}>
                                        <div className="flex items-center text-sm font-medium mb-2">
                                            <Info className="h-4 w-4 mr-2 flex-shrink-0" />
                                            <span>Gợi ý chỉnh sửa từ AI (Raw JSON)</span>
                                        </div>
                                        {suggestion.reasoning && (
                                            <div className="mb-2">
                                                <p className="text-sm font-semibold">Lý do:</p>
                                                <p className="text-sm">{suggestion.reasoning}</p>
                                            </div>
                                        )}
                                        {/* No need to check suggestion.modifiedMenu again here, already checked in the if */}
                                        <div>
                                            <p className="text-sm font-semibold mb-1">Thực đơn đề xuất (JSON):</p>
                                            <ScrollArea className="w-full rounded-md border border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-800 p-2">
                                                <pre className="whitespace-pre-wrap font-mono text-xs text-gray-700 dark:text-gray-300 break-all">{suggestion.modifiedMenu}</pre>
                                            </ScrollArea>
                                        </div>
                                    </div>
                                    {/* Action Buttons */}
                                    <div className={actionButtonContainerClass}>
                                        <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleSpeak(suggestionTextToSpeak)}><Volume2 className="h-3.5 w-3.5" /><span className="sr-only">Đọc</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Đọc Lý do</p></TooltipContent></Tooltip></TooltipProvider>
                                        <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleFeedbackAction('like', message.id)}><ThumbsUp className="h-3.5 w-3.5" /><span className="sr-only">Thích</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Thích</p></TooltipContent></Tooltip></TooltipProvider>
                                        <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleFeedbackAction('dislike', message.id)}><ThumbsDown className="h-3.5 w-3.5" /><span className="sr-only">Không thích</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Không thích</p></TooltipContent></Tooltip></TooltipProvider>
                                        <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleCopy(suggestionTextToCopy)}><ClipboardCopy className="h-3.5 w-3.5" /><span className="sr-only">Sao chép</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Sao chép JSON Gợi ý</p></TooltipContent></Tooltip></TooltipProvider>
                                    </div>
                                </div>
                            </div>
                        );
                    }
                    // If suggestion is not valid for display, return null
                    return null;
            case 'suggestion_chip':
                 // Add check for searchSuggestionHtml and fallback for dangerouslySetInnerHTML
                 return message.searchSuggestionHtml ? ( <div className={botMessageContainerClass}><Search className="w-6 h-6 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-1 opacity-80" /><div className="max-w-full sm:max-w-md lg:max-w-xl xl:max-w-2xl" dangerouslySetInnerHTML={{ __html: message.searchSuggestionHtml || '' }} /></div> ) : null;
            case 'export_display': // <-- New case for exported markdown
                 return message.exportMarkdown ? (
                    <div className={botMessageContainerClass}>
                        <Bot className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
                        <div className="flex flex-col items-start relative pb-8"> {/* Added relative and padding-bottom */}
                            <div className={cn(botMessageBubbleClass, "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700")}>
                                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 dark:text-gray-200">
                                    {message.exportMarkdown}
                                </pre>
                            </div>
                             {/* Action Buttons - Positioned absolutely within the padded space */}
                             <div className={actionButtonContainerClass}>
                                <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleSpeak(message.exportMarkdown)}><Volume2 className="h-3.5 w-3.5" /><span className="sr-only">Đọc</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Đọc</p></TooltipContent></Tooltip></TooltipProvider>
                                <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleFeedbackAction('like', message.id)}><ThumbsUp className="h-3.5 w-3.5" /><span className="sr-only">Thích</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Thích</p></TooltipContent></Tooltip></TooltipProvider>
                                <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleFeedbackAction('dislike', message.id)}><ThumbsDown className="h-3.5 w-3.5" /><span className="sr-only">Không thích</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Không thích</p></TooltipContent></Tooltip></TooltipProvider>
                                {/* Existing Copy Button */}
                                <TooltipProvider delayDuration={300}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={actionButtonClass} onClick={() => handleCopy(message.exportMarkdown)}><ClipboardCopy className="h-3.5 w-3.5" /><span className="sr-only">Sao chép</span></Button></TooltipTrigger><TooltipContent side="bottom"><p>Sao chép</p></TooltipContent></Tooltip></TooltipProvider>
                            </div>
                        </div>
                    </div>
                ) : null;
            case 'bot_thinking': // <-- New case for feedback thinking animation
                // No action buttons for thinking animation
                return (
                    <div className={botMessageContainerClass}>
                        <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1 opacity-50" />
                        {/* Use transparent background and no padding for the bubble */}
                        <div className={cn(botMessageBubbleClass, "bg-transparent dark:bg-transparent shadow-none p-0")}>
                            {/* Pass the selected variant, default to 'cycle' if undefined */}
                            <ThinkingAnimation variant={message.animationVariant || 'cycle'} />
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    // --- Main JSX ---
    return (
        // Removed overflow-hidden from outermost div
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-x-auto ">
            <Sidebar />

            {/* Main Content Area - Removed items-center */}
            <div className="flex flex-col flex-1 min-w-0 overflow-x-auto"> {/* Added min-w-0 */}

                {/* --- Top Action Buttons - Removed max-w-4xl and mx-auto --- */}
                <div className="px-2 md:px-4 pt-2 md:pt-4 pb-1 flex justify-end gap-2 shrink-0 w-full">
                     {/* Download Button */}
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDownloadChat}
                                    // Disable if generating or suggesting, or if history is empty
                                    disabled={isGeneratingMenu || isSuggestingModifications || !chatHistory || chatHistory.length === 0}
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
                        disabled={isGeneratingMenu || isSuggestingModifications} // Disable toggle during any processing
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

                {/* --- Preferences Card (Collapsible Section) - Removed max-w-4xl and mx-auto --- */}
                {/* Apply transition and conditional max-height/opacity */}
                <div className={cn(
                    "transition-all duration-300 ease-in-out overflow-x-auto w-full px-2 md:px-4", // Use padding instead of px-0, removed max-w and mx-auto
                    isPreferenceSectionOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0" // Adjust max-h if needed
                )}>
                    <Card className={cn(
                        "mb-2 md:mb-4 rounded-lg shadow-lg bg-white dark:bg-gray-800 shrink-0 border dark:border-gray-700", // Keep card styles
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
                                        disabled={isGeneratingMenu || isSuggestingModifications} // Disable during any processing
                                    />
                                    <Button
                                        onClick={togglePreferenceSpeech}
                                        disabled={isGeneratingMenu || isSuggestingModifications} // Disable during any processing
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

                                {/* --- Action Buttons Group --- */}
                                <div className="flex w-full sm:w-auto gap-2 shrink-0">
                                    {/* Enhance Preferences Button */}
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    onClick={handleEnhancePreferences}
                                                    disabled={isGeneratingMenu || isSuggestingModifications || isEnhancingPreferences || !preferences.trim()}
                                                    size="icon" // Make it an icon button
                                                    variant="outline"
                                                    className="h-10 w-10" // Square size
                                                >
                                                    {isEnhancingPreferences ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Wand2 className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Cải thiện yêu cầu (AI)</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>

                                    {/* Generate/Stop Button */}
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    onClick={() => {
                                                        if (isGeneratingMenu) {
                                                            generationAbortControllerRef.current?.abort();
                                                            console.log("Attempting to abort generation request...");
                                                        } else {
                                                            generateMenu();
                                                        }
                                                    }}
                                                    // Disable if suggesting modifications OR if preferences are empty and not currently generating OR enhancing
                                                    disabled={isSuggestingModifications || isEnhancingPreferences || (!isGeneratingMenu && !preferences.trim())}
                                                    size="default"
                                                    className="flex-grow sm:flex-grow-0 h-10" // Allow button to grow on small screens if needed
                                                >
                                                    {isGeneratingMenu ? (
                                                        <>
                                                            <StopCircle className="mr-2 h-4 w-4" /> {/* Show Stop icon */}
                                                            <span className="hidden sm:inline">Dừng Tạo</span>
                                                            <span className="sm:hidden">Dừng</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <SendHorizontal className="mr-0 sm:mr-2 h-4 w-4" />
                                                            <span className="hidden sm:inline">Tạo Thực Đơn</span>
                                                            <span className="sm:hidden">Tạo</span>
                                                        </>
                                                    )}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{isGeneratingMenu ? 'Dừng tạo thực đơn' : 'Tạo thực đơn mới'}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                {/* --- End Action Buttons Group --- */}
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
                                            (isGeneratingMenu || isSuggestingModifications) && "opacity-50 cursor-not-allowed" // Disable during any processing
                                        )}
                                        onClick={() => !(isGeneratingMenu || isSuggestingModifications) && handleQuickReply(reply)} // Prevent click when loading
                                        aria-disabled={isGeneratingMenu || isSuggestingModifications}
                                    >
                                        {reply}
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div> {/* End Collapsible Wrapper */}

                {/* --- Chat History Area --- */}
                {/* flex-1 ensures it takes remaining space. Added pt-0 to remove gap when preferences are hidden */}
                {/* Assign the ref to the ScrollArea - Removed max-w-4xl and mx-auto */}
                <ScrollArea ref={chatScrollAreaRef} className="flex-1 bg-white dark:bg-gray-800/50 w-full overflow-x-auto"> {/* Removed padding */}
                    {isGeneratingMenu && ( // Show thinking only during initial generation, using specific state
                         <div className="flex justify-center py-4">
                            <ThinkingAnimation />
                         </div>
                    )}
                    {/* Removed max-w-4xl and mx-auto to allow full width */}
                    <div className="space-y-5 p-4 pt-0 pb-4 min-w-full "> {/* Added padding here */}
                        {chatHistory.map((message) => (
                            <div key={message.id} className="flex w-full">
                                {renderMessageContent(message)}
                            </div>
                        ))}
                        <div ref={chatEndRef} className="h-1" />
                    </div>
                </ScrollArea>

                {/* --- Feedback Input Area (Sticky Bottom) --- */}
                {/* Logic for hiding/showing based on menu data remains - Removed max-w-4xl and mx-auto */}
                <div className={cn(
                    "p-3 md:p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700 shrink-0 sticky bottom-0 z-10 shadow- ऊपर-md transition-opacity duration-300 ease-in-out w-full",
                    menuResponseData?.menu ? "opacity-100" : "opacity-0 pointer-events-none h-0 p-0 border-0"
                )}>
                    {/* Container takes full width */}
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-grow">
                                <label htmlFor="feedback-input" className="sr-only">Nhập phản hồi</label>
                                <Input
    id="feedback-input"
    placeholder="Nhập phản hồi hoặc yêu cầu chỉnh sửa..."
    value={feedback}
    onChange={handleFeedbackChange}
    className="resize-none rounded-full px-4 py-2 border text-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 pr-10"
    disabled={isGeneratingMenu || isSuggestingModifications} // Allow input even if modifications exist
    onKeyDown={(e) => {
        // Remove !menuModifications check to allow Enter submission multiple times
        if (e.key === 'Enter' && !e.shiftKey && !(isGeneratingMenu || isSuggestingModifications) && feedback.trim()) {
            e.preventDefault();
            suggestModifications();
        }
    }}
/>
                                <Button
                                    onClick={toggleFeedbackSpeech}
                                    disabled={isGeneratingMenu || isSuggestingModifications} // Allow mic even if modifications exist
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

                            {/* --- Feedback Action Buttons Group --- */}
                            <div className="flex gap-2 shrink-0">
                                 {/* Enhance Feedback Button */}
                                 <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                onClick={handleEnhanceFeedback}
                                                disabled={isGeneratingMenu || isSuggestingModifications || isEnhancingFeedback || !feedback.trim() || !menuResponseData?.menu}
                                                size="icon"
                                                variant="outline"
                                                className="h-9 w-9 rounded-full" // Match send button style
                                            >
                                                {isEnhancingFeedback ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Wand2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Cải thiện phản hồi (AI)</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>

                                {/* Send/Stop Button */}
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                onClick={() => {
                                                    if (isSuggestingModifications) {
                                                        // If loading, abort the request
                                                        suggestionAbortControllerRef.current?.abort();
                                                        console.log("Attempting to abort suggestion request...");
                                                    } else {
                                                        // Otherwise, send the feedback
                                                        suggestModifications();
                                                    }
                                                }}
                                                // Disable button only if generating the *initial* menu OR if feedback is empty and not loading OR enhancing feedback
                                                disabled={isGeneratingMenu || isEnhancingFeedback || (!isSuggestingModifications && !feedback.trim())}
                                                size="icon"
                                                className="rounded-full shrink-0 w-9 h-9"
                                                aria-label={isSuggestingModifications ? "Dừng tạo gợi ý" : "Gửi phản hồi"}
                                            >
                                                {isSuggestingModifications
                                                    ? <StopCircle className="h-4 w-4" /> // Show Stop icon when loading
                                                    : <SendHorizontal className="h-4 w-4" /> // Show Send icon otherwise
                                                }
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{isSuggestingModifications ? "Dừng tạo gợi ý" : "Gửi phản hồi"}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                             {/* --- End Feedback Action Buttons Group --- */}
                        </div>
                        {/* Remove the helper text that disables further feedback */}
                        {/* {menuModifications && (
                            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-1.5">
                                Đã nhận được gợi ý. Để yêu cầu khác, vui lòng tạo lại thực đơn.
                            </p>
                        )} */}
                    </div>
                </div>
            </div> {/* End Main Content Area */}
        </div> // End Flex Container - Closing tag added
    );
};

export default HomePage;
