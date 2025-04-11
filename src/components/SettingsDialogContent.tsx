"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Save, Info, Loader2, Settings, Mic, Bot, KeyRound } from "lucide-react";
import { cn } from '@/lib/utils';
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

// --- Constants ---
const AGENT_KEYS = {
    MENU_GENERATION: 'menuGenerationModel',
    FEEDBACK_SUGGESTION: 'feedbackSuggestionModel',
} as const;

type AgentKey = typeof AGENT_KEYS[keyof typeof AGENT_KEYS];

const AGENT_LABELS: Record<AgentKey, string> = {
    [AGENT_KEYS.MENU_GENERATION]: 'Tạo Thực Đơn (Menu Generation)',
    [AGENT_KEYS.FEEDBACK_SUGGESTION]: 'Gợi Ý Phản Hồi (Feedback Suggestion)',
};

const DUMMY_MODELS = [
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro-latest",
    "gemini-1.0-pro",
    "models/gemini-pro-vision", // Example vision model
];

const DEFAULT_MODEL_VALUE = "default";

const initialSelectedModelsState = Object.values(AGENT_KEYS).reduce((acc, key) => {
    acc[key] = DEFAULT_MODEL_VALUE;
    return acc;
}, {} as Record<AgentKey, string>);

// --- SettingsDialogContent Component ---
export function SettingsDialogContent() {
    const { toast } = useToast();
    const [apiKey, setApiKey] = useState<string>('');
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [selectedModels, setSelectedModels] = useState<Record<AgentKey, string>>(initialSelectedModelsState);
    const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);
    const [apiKeyError, setApiKeyError] = useState<string | null>(null);
    const [defaultAccordionValue, setDefaultAccordionValue] = useState<string[]>([]);

    // Load initial state & fetch models if API key exists
    useEffect(() => {
        const savedApiKey = localStorage.getItem('userGeminiApiKey') || '';
        setApiKey(savedApiKey);

        if (!savedApiKey) {
            setDefaultAccordionValue(["apiKeySection"]);
        } else {
             fetchModels(savedApiKey);
        }

        const loadedSelections = Object.values(AGENT_KEYS).reduce((acc, key) => {
            const storedValue = localStorage.getItem(key);
            acc[key] = storedValue || DEFAULT_MODEL_VALUE;
            return acc;
        }, {} as Record<AgentKey, string>);
        setSelectedModels(loadedSelections);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch models (Simulated)
    const fetchModels = useCallback(async (currentApiKey: string) => {
        if (!currentApiKey) {
            setAvailableModels([]);
            return;
        }
        setIsLoadingModels(true);
        setApiKeyError(null);
        setAvailableModels([]);
        console.log("Simulating model fetch with key:", currentApiKey);
        try {
            await new Promise(resolve => setTimeout(resolve, 700));
            // TODO: Replace with actual API call using currentApiKey
            // Example: const models = await listGeminiModels(currentApiKey);
            setAvailableModels(DUMMY_MODELS); // Use fetched models
            toast({ title: "Thành công", description: "Đã tải danh sách model." });
        } catch (error) {
            console.error("Error fetching models (simulation):", error);
            const errorMsg = "Không thể tải danh sách model. Vui lòng kiểm tra lại API Key.";
            setApiKeyError(errorMsg);
            setAvailableModels([]);
            toast({ title: "Lỗi", description: errorMsg, variant: "destructive" });
            setDefaultAccordionValue(["apiKeySection"]);
        } finally {
            setIsLoadingModels(false);
        }
    }, [toast]);

    // Handle API Key input change
    const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newApiKey = e.target.value;
        setApiKey(newApiKey);
        if (apiKeyError) setApiKeyError(null); // Clear error on typing
    };

    // Handle API Key save button click
    const handleApiKeySave = () => {
        const trimmedApiKey = apiKey.trim();
        // Basic validation (Gemini keys usually start with 'AIza')
        if (trimmedApiKey && !trimmedApiKey.startsWith('AIza')) {
            const errorMsg = "Định dạng API Key không hợp lệ. Gemini API Key thường bắt đầu bằng 'AIza'.";
            setApiKeyError(errorMsg);
            toast({ title: "Lỗi API Key", description: errorMsg, variant: "destructive" });
            setDefaultAccordionValue(["apiKeySection"]);
            return;
        }

        localStorage.setItem('userGeminiApiKey', trimmedApiKey);
        toast({ title: "Đã lưu API Key", description: trimmedApiKey ? "API Key đã được lưu." : "Đã xóa API Key đã lưu." });
        setApiKeyError(null); // Clear error on successful save
        fetchModels(trimmedApiKey); // Fetch models with the new key
    };

    // Handle Model selection change
    const handleModelChange = (agentKey: AgentKey, modelValue: string) => {
        const valueToSave = modelValue || DEFAULT_MODEL_VALUE;
        const newSelections = { ...selectedModels, [agentKey]: valueToSave };
        setSelectedModels(newSelections);
        localStorage.setItem(agentKey, valueToSave);
        toast({
            title: "Đã lưu lựa chọn Model",
            description: `Đã chọn ${valueToSave === DEFAULT_MODEL_VALUE ? 'Mặc định' : valueToSave} cho ${AGENT_LABELS[agentKey]}.`
        });
    };

    return (
        <Accordion
            type="multiple"
            defaultValue={defaultAccordionValue} // Let Accordion manage its state based on default
            className="w-full space-y-1"
        >

            {/* --- API Key Section --- */}
            <AccordionItem value="apiKeySection">
                <AccordionTrigger className="text-base font-semibold hover:no-underline px-1">
                    <div className="flex items-center space-x-2">
                         <KeyRound className="h-5 w-5 text-muted-foreground" />
                         <span>Gemini API Key</span>
                         {apiKeyError && <span className="text-destructive ml-2 text-xs">(Có lỗi)</span>}
                         {!apiKey && !apiKeyError && <span className="text-muted-foreground ml-2 text-xs">(Chưa cấu hình)</span>}
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4 px-1">
                    <Alert variant="default" className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-700/50 text-yellow-700 dark:text-yellow-300 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-400">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Cảnh báo bảo mật</AlertTitle>
                        <AlertDescription>
                            Lưu API key trong trình duyệt không an toàn cho production. Chỉ dùng cho phát triển/demo cá nhân.
                        </AlertDescription>
                    </Alert>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-2">
                        <Input
                            id="apiKey"
                            type="password"
                            value={apiKey}
                            onChange={handleApiKeyChange}
                            placeholder="Nhập API Key Gemini của bạn..."
                            className={cn("flex-grow", apiKeyError && "border-destructive focus-visible:ring-destructive")}
                            aria-describedby={apiKeyError ? "apiKey-error" : "apiKey-description"}
                            aria-invalid={!!apiKeyError}
                        />
                        <Button onClick={handleApiKeySave} size="icon" aria-label="Lưu API Key" className="w-full sm:w-auto flex-shrink-0">
                            <Save className="h-4 w-4" />
                        </Button>
                    </div>
                    <p id="apiKey-description" className="text-sm text-muted-foreground">
                        Nếu để trống, hệ thống sẽ dùng key mặc định (nếu có). Lấy key tại <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">Google AI Studio</a>.
                    </p>
                    {apiKeyError && (
                        <p id="apiKey-error" className="text-sm font-medium text-destructive" role="alert">
                            {apiKeyError}
                        </p>
                    )}
                </AccordionContent>
            </AccordionItem>

            {/* --- Model Selection Section --- */}
            <AccordionItem value="modelSelectionSection">
                <AccordionTrigger className="text-base font-semibold hover:no-underline px-1">
                     <div className="flex items-center space-x-2">
                         <Bot className="h-5 w-5 text-muted-foreground" />
                         <span>Chọn Model cho Agents</span>
                         {isLoadingModels && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4 px-1">
                    {isLoadingModels && (
                         <div className="flex items-center space-x-2 text-muted-foreground text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Đang tải danh sách models...</span>
                        </div>
                    )}
                    {!isLoadingModels && availableModels.length === 0 && apiKey && !apiKeyError && (
                        <p className="text-sm text-muted-foreground">
                            Không tìm thấy model nào với API Key này hoặc API Key không hợp lệ.
                        </p>
                    )}
                    {!isLoadingModels && !apiKey && (
                         <p className="text-sm text-muted-foreground">
                             Nhập API Key và Lưu ở mục trên để tải danh sách model.
                         </p>
                     )}

                    {/* Chỉ hiển thị phần chọn model nếu không loading VÀ (có key VÀ có model) */}
                    {(!isLoadingModels && apiKey && availableModels.length > 0) && Object.values(AGENT_KEYS).map((agentKey) => {
                        const agentLabel = AGENT_LABELS[agentKey];
                        const selectedValue = selectedModels[agentKey] ?? DEFAULT_MODEL_VALUE;
                        // *** ĐÃ SỬA LỖI: Đảm bảo isDisabled luôn là boolean ***
                        const isDisabled = !!(isLoadingModels || !apiKey || (apiKey && availableModels.length === 0));

                        return (
                            <div key={agentKey} className="space-y-1.5">
                                <Label htmlFor={`model-${agentKey}`} className="text-sm font-medium">{agentLabel}</Label>
                                <Select
                                    value={selectedValue}
                                    onValueChange={(value) => handleModelChange(agentKey, value)}
                                    // Truyền giá trị boolean đã được ép kiểu
                                    disabled={isDisabled}
                                >
                                    <SelectTrigger id={`model-${agentKey}`} className={cn(isDisabled && "opacity-70 cursor-not-allowed")}>
                                        {/* Cập nhật placeholder dựa trên trạng thái disabled */}
                                        <SelectValue placeholder={isDisabled ? "Không thể chọn" : "Chọn model..."} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={DEFAULT_MODEL_VALUE}>Mặc định (Default)</SelectItem>
                                        {/* Chỉ map qua availableModels nếu nó không rỗng */}
                                        {availableModels.map((modelName) => (
                                            <SelectItem key={modelName} value={modelName}>{modelName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        );
                    })}
                    {/* Hiển thị ghi chú này nếu có model để chọn */}
                     {(!isLoadingModels && apiKey && availableModels.length > 0) && (
                        <p className="mt-2 text-sm text-muted-foreground">
                            Chọn model cụ thể cho từng tác vụ AI. "Mặc định" sẽ dùng cài đặt chung hoặc model mới nhất phù hợp.
                        </p>
                     )}
                </AccordionContent>
            </AccordionItem>

            {/* --- Developer Note Section --- */}
            <AccordionItem value="developerNoteSection">
                <AccordionTrigger className="text-base font-semibold hover:no-underline px-1">
                     <div className="flex items-center space-x-2">
                         <Terminal className="h-5 w-5 text-muted-foreground" />
                         <span>Lưu ý cho nhà phát triển</span>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 px-1">
                     <p className="text-sm text-muted-foreground">
                        Việc áp dụng API Key và Model đã chọn yêu cầu sửa đổi logic khởi tạo AI (ví dụ: trong `ai-instance.ts` hoặc các flow) để đọc các giá trị này từ localStorage (`"default"` hoặc tên model cụ thể) và sử dụng chúng khi gọi API Gemini.
                    </p>
                </AccordionContent>
            </AccordionItem>

        </Accordion>
    );
}
// ... (các import khác giữ nguyên)
import { Volume2 } from "lucide-react"; // Thêm icon Volume2

// --- SpeechSettings Component (với nút Test Voice) ---
export function SpeechSettings() {
    const { toast } = useToast();
    const [speechEnabled, setSpeechEnabled] = useState<boolean>(() => {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('speechEnabled') : null;
        return stored !== null ? stored === 'true' : true;
    });
    const [speechRate, setSpeechRate] = useState<number>(() => {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('speechRate') : null;
        return stored !== null ? parseFloat(stored) : 1;
    });
    const [speechVolume, setSpeechVolume] = useState<number>(() => {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('speechVolume') : null;
        return stored !== null ? parseFloat(stored) : 1;
    });
    // +++ State để theo dõi trạng thái đang đọc +++
    const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

    // Re-sync state on mount (giữ nguyên)
    useEffect(() => {
        const storedSpeechEnabled = localStorage.getItem('speechEnabled');
        if (storedSpeechEnabled !== null) setSpeechEnabled(storedSpeechEnabled === 'true');
        const storedSpeechRate = localStorage.getItem('speechRate');
        if (storedSpeechRate !== null) setSpeechRate(parseFloat(storedSpeechRate));
        const storedSpeechVolume = localStorage.getItem('speechVolume');
        if (storedSpeechVolume !== null) setSpeechVolume(parseFloat(storedSpeechVolume));
    }, []);

    // +++ useEffect để dọn dẹp khi component unmount +++
    useEffect(() => {
        // Hàm cleanup sẽ chạy khi component unmount
        return () => {
            if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
                console.log("SpeechSettings unmounting, cancelling speech.");
                window.speechSynthesis.cancel(); // Hủy đọc nếu đang đọc
                setIsSpeaking(false); // Reset state phòng trường hợp
            }
        };
    }, []); // Chạy một lần khi mount và cleanup khi unmount

    // Các hàm handle khác (giữ nguyên)
    const handleSpeechEnabledChange = (checked: boolean) => {
        setSpeechEnabled(checked);
        localStorage.setItem('speechEnabled', String(checked));
        toast({ title: "Đã lưu", description: `Chức năng đọc văn bản ${checked ? 'bật' : 'tắt'}.` });
        // Nếu tắt chức năng đọc, hủy luôn việc đọc đang diễn ra (nếu có)
        if (!checked && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    };
    const handleSpeechRateChange = useCallback((rate: number) => { /* ... giữ nguyên ... */
        const newRate = parseFloat(rate.toFixed(1));
        setSpeechRate(newRate);
        localStorage.setItem('speechRate', String(newRate));
    }, []);
    const handleSpeechRateCommit = useCallback((rate: number) => { /* ... giữ nguyên ... */
        const newRate = parseFloat(rate.toFixed(1));
        toast({ title: "Đã lưu", description: `Tốc độ đọc đã được đặt thành ${newRate}.` });
    }, [toast]);
    const handleSpeechVolumeChange = useCallback((volume: number) => { /* ... giữ nguyên ... */
        const newVolume = parseFloat(volume.toFixed(1));
        setSpeechVolume(newVolume);
        localStorage.setItem('speechVolume', String(newVolume));
    }, []);
    const handleSpeechVolumeCommit = useCallback((volume: number) => { /* ... giữ nguyên ... */
        const newVolume = parseFloat(volume.toFixed(1));
        toast({ title: "Đã lưu", description: `Âm lượng đọc đã được đặt thành ${newVolume}.` });
    }, [toast]);


    // +++ Hàm xử lý cho nút Nghe Thử +++
    const handleTestVoice = useCallback(() => {
        if (!('speechSynthesis' in window)) {
            toast({ title: "Lỗi", description: "Trình duyệt của bạn không hỗ trợ chức năng đọc văn bản.", variant: "destructive" });
            return;
        }
        // Không cho nhấn nút nếu đang đọc hoặc chức năng đọc bị tắt
        if (isSpeaking || !speechEnabled) {
            return;
        }

        // Hủy các lần đọc trước đó (nếu có) để tránh chồng chéo
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance("Đây là giọng nói thử nghiệm."); // Câu mẫu
        utterance.lang = 'vi-VN'; // Chỉ định ngôn ngữ tiếng Việt
        utterance.rate = speechRate;
        utterance.volume = speechVolume;

        // Xử lý khi bắt đầu đọc
        utterance.onstart = () => {
            setIsSpeaking(true);
            console.log("Speech started.");
        };

        // Xử lý khi đọc xong
        utterance.onend = () => {
            setIsSpeaking(false);
            console.log("Speech ended.");
        };

        // Xử lý khi có lỗi đọc
        utterance.onerror = (event) => {
            console.error("Speech synthesis error:", event.error);
            toast({ title: "Lỗi đọc", description: `Không thể đọc thử: ${event.error}`, variant: "destructive" });
            setIsSpeaking(false); // Reset trạng thái khi có lỗi
        };

        // Bắt đầu đọc
        try {
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error("Error calling speechSynthesis.speak:", error);
            toast({ title: "Lỗi", description: "Có lỗi xảy ra khi bắt đầu đọc.", variant: "destructive" });
            setIsSpeaking(false); // Đảm bảo reset state nếu có lỗi ngay lập tức
        }

    }, [speechRate, speechVolume, toast, isSpeaking, speechEnabled]); // Thêm isSpeaking và speechEnabled vào dependencies

    return (
        <div className="space-y-1">
            {/* Enable/Disable Speech */}
            <div className="flex items-center justify-between space-x-2 py-4 border-b">
                {/* ... (Phần bật/tắt giữ nguyên) ... */}
                 <div className="space-y-1">
                    <Label htmlFor="speechEnabled" className="text-base font-medium flex items-center space-x-2">
                         <Mic className="h-5 w-5 text-muted-foreground" />
                         <span>Chức năng Đọc Văn bản</span>
                    </Label>
                    <p id="speechEnabled-description" className="text-sm text-muted-foreground pl-7">
                        Bật/Tắt chức năng đọc văn bản tự động cho các phản hồi.
                    </p>
                </div>
                <Switch
                    id="speechEnabled"
                    checked={speechEnabled}
                    onCheckedChange={handleSpeechEnabledChange}
                    aria-describedby="speechEnabled-description"
                    className="flex-shrink-0"
                />
            </div>

            {/* Speech Rate */}
            <div className={cn("py-4 border-b", !speechEnabled && "opacity-60 pointer-events-none")}> {/* Thêm pointer-events-none */}
                {/* ... (Phần tốc độ đọc giữ nguyên) ... */}
                 <div className="mb-2 space-y-1">
                    <Label htmlFor="speechRate" className="text-base font-medium">Tốc độ Đọc</Label>
                    <p id="speechRate-description" className="text-sm text-muted-foreground">
                        Điều chỉnh tốc độ đọc (0.5 là chậm, 2 là nhanh).
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <Slider
                        id="speechRate"
                        value={[speechRate]}
                        max={2} min={0.5} step={0.1}
                        onValueChange={(value) => handleSpeechRateChange(value[0])}
                        onValueCommit={(value) => handleSpeechRateCommit(value[0])}
                        className="flex-grow"
                        aria-label="Tốc độ đọc"
                        aria-describedby="speechRate-description speechRate-value"
                        disabled={!speechEnabled} // Vẫn giữ disabled ở đây
                    />
                    <Input
                        id="speechRate-value" type="number" value={speechRate.toFixed(1)} readOnly
                        className="w-16 bg-muted text-center" aria-live="polite"
                        disabled={!speechEnabled} tabIndex={-1}
                    />
                </div>
            </div>

            {/* Speech Volume */}
            <div className={cn("py-4 border-b", !speechEnabled && "opacity-60 pointer-events-none")}> {/* Thêm pointer-events-none */}
                 {/* ... (Phần âm lượng đọc giữ nguyên) ... */}
                 <div className="mb-2 space-y-1">
                    <Label htmlFor="speechVolume" className="text-base font-medium">Âm lượng Đọc</Label>
                    <p id="speechVolume-description" className="text-sm text-muted-foreground">
                        Điều chỉnh âm lượng đọc (0 là tắt tiếng, 1 là tối đa).
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <Slider
                        id="speechVolume" value={[speechVolume]} max={1} min={0} step={0.1}
                        onValueChange={(value) => handleSpeechVolumeChange(value[0])}
                        onValueCommit={(value) => handleSpeechVolumeCommit(value[0])}
                        className="flex-grow" aria-label="Âm lượng đọc"
                        aria-describedby="speechVolume-description speechVolume-value"
                        disabled={!speechEnabled} // Vẫn giữ disabled ở đây
                    />
                    <Input
                        id="speechVolume-value" type="number" value={speechVolume.toFixed(1)} readOnly
                        className="w-16 bg-muted text-center" aria-live="polite"
                        disabled={!speechEnabled} tabIndex={-1}
                    />
                </div>
            </div>

            {/* +++ Nút Nghe Thử +++ */}
            <div className="pt-4 flex justify-end"> {/* Căn phải nút */}
                <Button
                    onClick={handleTestVoice}
                    variant="outline"
                    size="sm"
                    // Vô hiệu hóa nút nếu chức năng đọc bị tắt HOẶC đang đọc
                    disabled={!speechEnabled || isSpeaking}
                    aria-label="Nghe thử giọng nói với cài đặt hiện tại"
                >
                    {isSpeaking ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> // Icon loading khi đang đọc
                    ) : (
                        <Volume2 className="mr-2 h-4 w-4" /> // Icon bình thường
                    )}
                    {isSpeaking ? "Đang đọc..." : "Nghe Thử"}
                </Button>
            </div>
        </div>
    );
}