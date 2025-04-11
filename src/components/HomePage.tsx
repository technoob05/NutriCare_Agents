'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';

// --- UI Components ---
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
// *** QUAN TRỌNG: Import InteractiveMenu ***
import { InteractiveMenu } from '@/components/ui/interactive-menu';
import { AgentProcessVisualizer } from '@/components/ui/agent-process-visualizer';
import { ScrollArea } from '@/components/ui/scroll-area'; // Vẫn cần cho khu vực chat chính
import { Sidebar } from '@/components/ui/sidebar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';

// --- Icons ---
import {
    SendHorizontal,
    ChefHat,
    Mic,
    Volume2,
    StopCircle,
    ChevronDown,
    ChevronUp,
    CheckCircle,
    Info,
    AlertCircle,
    Loader2
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
import { useIsMobile } from '@/hooks/use-mobile';

// --- Utils ---
import { cn } from "@/lib/utils";

// --- Constants ---
const MAX_PREFERENCE_LENGTH = 250;
const INITIAL_SYSTEM_MESSAGE = "Chào bạn! Tôi sẽ giúp bạn tạo thực đơn ăn uống lành mạnh. Hãy nhập sở thích hoặc chọn gợi ý bên dưới để bắt đầu.";
const QUICK_REPLIES = ["Gợi ý bữa sáng", "Thực phẩm ít calo", "Món chay", "Tăng cơ giảm mỡ"];

// --- Types ---
// Cập nhật interface ChatMessage để có thể chứa suggestion data nếu cần
interface SuggestMenuModificationsOutput {
    reasoning?: string;
    modifiedMenu?: string;
}
interface ChatMessage {
    id: number;
    text?: string; // Text có thể optional cho loại component
    type: 'user' | 'bot' | 'component' | 'error' | 'system' | 'trace_display' | 'suggestion_display'; // Thêm type mới nếu dùng component suggestion riêng
    traceData?: StepTrace[];
    suggestionData?: SuggestMenuModificationsOutput; // Thêm data cho suggestion nếu cần
}


// --- Component ---
const HomePage = () => {
    // --- State Hooks ---
    const [preferences, setPreferences] = useState<string>('');
    const [menuType, setMenuType] = useState<'daily' | 'weekly'>('daily');
    const [menuResponseData, setMenuResponseData] = useState<GenerateMenuFromPreferencesOutput | null>(null);
    const [feedback, setFeedback] = useState<string>('');
    const [menuModifications, setMenuModifications] = useState<SuggestMenuModificationsOutput | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        { id: Date.now(), text: INITIAL_SYSTEM_MESSAGE, type: "system" }
    ]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isListeningPreferences, setIsListeningPreferences] = useState(false);
    const [isListeningFeedback, setIsListeningFeedback] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPreferenceMenuOpen, setIsPreferenceMenuOpen] = useState(true);

    // --- Refs ---
    const chatEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const feedbackRecognitionRef = useRef<SpeechRecognition | null>(null);
    const synthRef = useRef<SpeechSynthesis | null>(null);

    // --- Custom Hooks ---
    const { toast } = useToast();
    const isMobile = useIsMobile();

    // --- Effects (Giữ nguyên logic khởi tạo và cleanup) ---
    useEffect(() => {
        // ... (Logic khởi tạo Speech Recognition/Synthesis) ...
        if (typeof window === 'undefined') return;

        synthRef.current = window.speechSynthesis;

        const setupSpeechRecognitionInstance = (
            ref: React.MutableRefObject<SpeechRecognition | null>,
            onResult: (transcript: string) => void,
            setIsListeningState: React.Dispatch<React.SetStateAction<boolean>>,
            instanceName: string
        ): SpeechRecognition | null => {
             if (!('webkitSpeechRecognition' in window)) {
                console.warn(`${instanceName} Speech Recognition Not Supported`);
                return null;
            }
            const recognition = new (window as any).webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'vi-VN';
            recognition.onstart = () => { setIsListeningState(true); /* toast */ };
            recognition.onresult = (event: SpeechRecognitionEvent) => { onResult(event.results[0]?.[0]?.transcript ?? ''); };
            recognition.onend = () => { setIsListeningState(false); };
            recognition.onerror = (event: SpeechRecognitionErrorEvent) => { setIsListeningState(false); /* toast error */ };
            ref.current = recognition;
            return recognition;
        };

        setupSpeechRecognitionInstance(recognitionRef, setPreferences, setIsListeningPreferences, "Sở thích");
        setupSpeechRecognitionInstance(feedbackRecognitionRef, setFeedback, setIsListeningFeedback, "Phản hồi");

        return () => {
            recognitionRef.current?.abort();
            feedbackRecognitionRef.current?.abort();
            synthRef.current?.cancel();
            // Gỡ listeners (quan trọng)
             if (recognitionRef.current) { /* gỡ listeners */ }
             if (feedbackRecognitionRef.current) { /* gỡ listeners */ }
        };
    }, [toast]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

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

    // --- Event Handlers (Giữ nguyên) ---
    const handlePreferenceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setPreferences(e.target.value);
    const handleFeedbackChange = (e: React.ChangeEvent<HTMLInputElement>) => setFeedback(e.target.value);
    const togglePreferenceSpeech = () => { /* ... */ };
    const toggleFeedbackSpeech = () => { /* ... */ };
    const handleTextToSpeech = useCallback((text: string) => { /* ... */ }, [isSpeaking, toast]);

    // --- Core Logic Functions (Giữ nguyên) ---
    const addMessage = useCallback((text: string, type: ChatMessage['type'], traceData?: StepTrace[]) => {
        const newMessage: ChatMessage = { id: Date.now(), text, type, traceData };
        setChatHistory((prev) => [...prev, newMessage]);
        return newMessage.id;
    }, []);

    // Hàm thêm message hiển thị component suggestion (nếu bạn dùng cách này)
    const addSuggestionDisplayMessage = useCallback((data: SuggestMenuModificationsOutput) => {
        const newMessage: ChatMessage = { id: Date.now(), type: 'suggestion_display', suggestionData: data };
        setChatHistory((prev) => [...prev, newMessage]);
    }, []);


    const generateMenu = useCallback(async () => {
        // ... (Logic gọi API generateMenuFromPreferences) ...
        const trimmedPreferences = preferences.trim();
        if (!trimmedPreferences) { /* handle error */ return; }
        setIsLoading(true);
        setMenuResponseData(null);
        setMenuModifications(null);
        setFeedback('');
        addMessage(`Đang tạo thực đơn ${menuType === 'daily' ? 'hàng ngày' : 'hàng tuần'} cho: ${trimmedPreferences}`, 'user');
        let response: GenerateMenuFromPreferencesOutput | null = null;
        try {
            response = await generateMenuFromPreferences({ preferences: trimmedPreferences, menuType });
            setMenuResponseData(response);
            if (response?.trace) addMessage('', 'trace_display', response.trace); // Text rỗng cho trace
            if (response?.menu) addMessage('', 'component'); // Text rỗng cho component menu
            else addMessage('Không thể tạo thực đơn...', 'system');
        } catch (error: any) { /* handle error */ }
        finally { setIsLoading(false); }

    }, [preferences, menuType, addMessage, toast]);

    const suggestModifications = useCallback(async () => {
        // ... (Logic gọi API suggestMenuModificationsBasedOnFeedback) ...
        const trimmedFeedback = feedback.trim();
        if (!trimmedFeedback || !menuResponseData?.menu) { /* handle error */ return; }
        setIsLoading(true);
        addMessage(`Phản hồi của bạn: ${trimmedFeedback}`, 'user');
        try {
            const menuString = JSON.stringify(menuResponseData.menu);
            const modificationsResult = await suggestMenuModificationsBasedOnFeedback({ menu: menuString, feedback: trimmedFeedback });
            setMenuModifications(modificationsResult);

            // Thay vì addMessage text, gọi hàm addSuggestionDisplayMessage
            if (modificationsResult) {
                 addSuggestionDisplayMessage(modificationsResult);
                 toast({ title: "Đã có gợi ý chỉnh sửa", description: "Xem chi tiết trong khung chat." });
            } else {
                 addMessage("Không nhận được gợi ý chỉnh sửa.", 'system');
            }
            // setFeedback(''); // Optional
        } catch (error: any) { /* handle error */ }
        finally { setIsLoading(false); }

    }, [feedback, menuResponseData, addMessage, toast, addSuggestionDisplayMessage]); // Thêm addSuggestionDisplayMessage

    const handleQuickReply = useCallback((reply: string) => {
        setPreferences(reply);
        setTimeout(() => { generateMenu(); }, 0);
    }, [generateMenu]);

    // --- Render Logic ---

    const renderMessageContent = (message: ChatMessage) => {
        switch (message.type) {
            case 'trace_display':
                return message.traceData ? (
                    <AgentProcessVisualizer trace={message.traceData} isProcessing={isLoading} />
                ) : null;

            case 'component':
                // *** THAY ĐỔI CHÍNH Ở ĐÂY ***
                // Render InteractiveMenu trực tiếp, không bọc trong ScrollArea
              // Trong HomePage.tsx -> renderMessageContent -> case 'component'

            if (message.text === '' && menuResponseData?.menu) {
                // Lời chào/giới thiệu
                const greetingText = `Tuyệt vời! Dựa trên yêu cầu của bạn, tôi đã chuẩn bị xong thực đơn ${menuType === 'daily' ? 'hàng ngày' : 'hàng tuần'} rồi đây. Mời bạn tham khảo nhé:`;

                return (
                    <div className="w-full my-2 space-y-3"> {/* Thêm space-y */}
                        {/* Hiển thị lời chào */}
                        <div className="max-w-full sm:max-w-md lg:max-w-2xl p-3 rounded-lg shadow-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm">
                            <p>{greetingText}</p>
                        </div>

                        {/* Container cho InteractiveMenu */}
                        <div className="bg-card p-0 rounded-lg shadow-sm border border-border/50 overflow-hidden">
                            <InteractiveMenu
                                menuData={{
                                    menu: menuResponseData.menu,
                                    menuType: menuType,
                                    // Không cần truyền feedbackRequest ở đây nữa nếu đã hiển thị riêng
                                    // feedbackRequest: menuResponseData.feedbackRequest
                                }}
                            />
                        </div>

                        {/* Hiển thị feedbackRequest (câu hỏi) riêng biệt sau menu */}
                        {menuResponseData.feedbackRequest && (
                            <div className="max-w-full sm:max-w-md lg:max-w-2xl p-3 rounded-lg shadow-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm italic">
                                <p>{menuResponseData.feedbackRequest}</p>
                            </div>
                        )}
                    </div>
                );
            }
                return null;

            // Case để render component suggestion (nếu bạn đã tạo)
            case 'suggestion_display':
                 // Giả sử bạn có component SuggestedModificationsDisplay
                 // import { SuggestedModificationsDisplay } from '@/components/ui/suggested-modifications-display';
                 return message.suggestionData ? (
                     // <SuggestedModificationsDisplay
                     //     suggestionData={message.suggestionData}
                     //     menuType={menuType}
                     // />
                     // Tạm thời hiển thị text nếu chưa có component
                     <div className="max-w-full sm:max-w-md lg:max-w-2xl p-3 rounded-lg shadow-sm bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                         <pre className="whitespace-pre-wrap font-sans text-sm">
                             {`Gợi ý chỉnh sửa:\nLý do: ${message.suggestionData.reasoning}\nThực đơn mới (JSON): ${message.suggestionData.modifiedMenu}`}
                         </pre>
                     </div>

                 ) : null;


            case 'error':
                return (
                    <Alert variant="destructive" className="max-w-full sm:max-w-md lg:max-w-2xl">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Lỗi</AlertTitle>
                        <AlertDescription>{message.text}</AlertDescription>
                    </Alert>
                );

            case 'system':
                return (
                    <Alert variant="default" className="max-w-full sm:max-w-md lg:max-w-2xl">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Thông báo</AlertTitle>
                        <AlertDescription>{message.text}</AlertDescription>
                    </Alert>
                );

            case 'user':
            case 'bot':
                // Chỉ render nếu có text
                return message.text ? (
                    <div
                        className={cn(
                            "max-w-full sm:max-w-md lg:max-w-2xl p-3 rounded-lg shadow-sm text-sm",
                            message.type === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                        )}
                    >
                        <pre className="whitespace-pre-wrap font-sans">
                            {message.text}
                        </pre>
                    </div>
                ) : null; // Không render gì nếu không có text

            default:
                return null;
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
            <Sidebar />
            <div className="flex flex-col overflow-hidden h-screen"> {/* Đảm bảo chiều cao tối đa */}
                {/* --- Phần Preferences Card (Giữ nguyên) --- */}
                <Card className={cn(
                    "m-2 md:m-4 rounded-lg shadow-md bg-white dark:bg-gray-800 overflow-hidden shrink-0",
                    isMobile && !isPreferenceMenuOpen && "hidden"
                )}>
                   {/* ... Nội dung Card Preferences ... */}
                   <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-lg font-semibold flex items-center">
                            <ChefHat className="mr-2 h-5 w-5" /> Yêu Cầu Thực Đơn
                        </CardTitle>
                        <CardDescription>Nhập yêu cầu dinh dưỡng, sở thích món ăn của bạn.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                        <div className="flex gap-2">
                            <Button size="sm" variant={menuType === 'daily' ? 'default' : 'outline'} onClick={() => setMenuType('daily')}>Hàng ngày</Button>
                            <Button size="sm" variant={menuType === 'weekly' ? 'default' : 'outline'} onClick={() => setMenuType('weekly')}>Hàng tuần</Button>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <div className="relative flex-grow w-full">
                                <Textarea
                                    className="w-full resize-none text-sm pr-12 py-2"
                                    placeholder="VD: ăn chay, thích đồ cay, ít tinh bột, dị ứng hải sản..."
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
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                                    aria-label={isListeningPreferences ? "Dừng nhận diện giọng nói" : "Bắt đầu nhận diện giọng nói (Sở thích)"}
                                >
                                    {isListeningPreferences ? <StopCircle className="h-5 w-5 text-red-500 animate-pulse" /> : <Mic className="h-5 w-5" />}
                                </Button>
                            </div>
                            <Button onClick={generateMenu} disabled={isLoading || !preferences.trim()} size="sm" className="w-full sm:w-auto shrink-0">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isLoading ? 'Đang tạo...' : 'Tạo Thực Đơn'}
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">Gợi ý:</span>
                            {QUICK_REPLIES.map((reply) => (
                                <Badge
                                    key={reply}
                                    variant="secondary"
                                    className="text-xs cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                                    onClick={() => !isLoading && handleQuickReply(reply)}
                                    aria-disabled={isLoading}
                                >
                                    {reply}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Nút ẩn/hiện preferences trên mobile (Giữ nguyên) */}
                {isMobile && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="mx-4 mb-2 md:hidden"
                        onClick={() => setIsPreferenceMenuOpen(!isPreferenceMenuOpen)}
                    >
                        {isPreferenceMenuOpen ? (
                            <>Ẩn Yêu Cầu <ChevronUp className="ml-2 h-4 w-4" /></>
                        ) : (
                            <>Hiện Yêu Cầu <ChevronDown className="ml-2 h-4 w-4" /></>
                        )}
                    </Button>
                )}

                {/* --- KHU VỰC CHAT CHÍNH VỚI SCROLL --- */}
                <ScrollArea className="flex-grow p-4 overflow-y-auto"> {/* Đảm bảo flex-grow và overflow-y-auto */}
                    <div className="space-y-4 max-w-4xl mx-auto pb-4"> {/* Thêm pb để không bị che bởi input */}
                        {/* Thông báo loading chung (Giữ nguyên) */}
                        {isLoading && chatHistory.length > 1 && (
                            <Alert variant="default" className="mt-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <AlertTitle>Đang xử lý...</AlertTitle>
                                <AlertDescription>AI đang làm việc, vui lòng chờ trong giây lát.</AlertDescription>
                            </Alert>
                        )}

                        {/* Lịch sử chat */}
                        {chatHistory.map((message) => (
                            <div
                                key={message.id}
                                className={cn(
                                    "flex w-full",
                                    // Căn chỉnh dựa trên type
                                    ['user'].includes(message.type) ? 'justify-end' : 'justify-start',
                                    // Component menu/trace/suggestion chiếm full width
                                    ['component', 'trace_display', 'suggestion_display'].includes(message.type) && 'w-full'
                                )}
                            >
                                {renderMessageContent(message)}
                            </div>
                        ))}
                        {/* Element để cuộn tới */}
                        <div ref={chatEndRef} />
                    </div>
                </ScrollArea>

                {/* --- Phần Nhập Feedback (Sticky - Giữ nguyên) --- */}
                {menuResponseData?.menu && (
                    <div className="p-3 md:p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700 shrink-0 sticky bottom-0 z-10"> {/* Thêm z-index */}
                        <div className="max-w-4xl mx-auto flex items-center gap-2">
                            <div className="relative flex-grow">
                                <Input
                                    placeholder={menuModifications ? "Đã có gợi ý chỉnh sửa. Tạo lại menu nếu muốn thay đổi khác." : "Nhập phản hồi của bạn về thực đơn..."}
                                    value={feedback}
                                    onChange={handleFeedbackChange}
                                    className="flex-grow resize-none rounded-full px-4 py-2 border text-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 pr-12"
                                    disabled={isLoading || !!menuModifications}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey && !isLoading && feedback.trim() && !menuModifications) {
                                            e.preventDefault();
                                            suggestModifications();
                                        }
                                    }}
                                />
                                <Button
                                    onClick={toggleFeedbackSpeech}
                                    disabled={isLoading || !!menuModifications}
                                    size="icon"
                                    variant="ghost"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                                    aria-label={isListeningFeedback ? "Dừng nhận diện giọng nói" : "Bắt đầu nhận diện giọng nói (Phản hồi)"}
                                >
                                    {isListeningFeedback ? <StopCircle className="h-5 w-5 text-red-500 animate-pulse" /> : <Mic className="h-5 w-5" />}
                                </Button>
                            </div>
                            <Button
                                onClick={suggestModifications}
                                disabled={isLoading || !feedback.trim() || !!menuModifications}
                                size="icon"
                                className="rounded-full shrink-0"
                                aria-label="Gửi phản hồi"
                            >
                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizontal className="h-5 w-5" />}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomePage;