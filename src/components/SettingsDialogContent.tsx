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
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Save, Info, Loader2, Mic } from "lucide-react"; // Thêm Loader2, Mic
import { cn } from '@/lib/utils'; // Import cn nếu cần
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormDescription,
    FormMessage,
} from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

// Placeholder for actual model fetching logic
// import { GoogleGenerativeAI } from "@google/genai";

// Define agent identifiers
const AGENT_KEYS = {
    MENU_GENERATION: 'menuGenerationModel',
    FEEDBACK_SUGGESTION: 'feedbackSuggestionModel',
    // Add other agents here if needed
} as const; // Use 'as const' for better type safety

type AgentKey = typeof AGENT_KEYS[keyof typeof AGENT_KEYS];

const AGENT_LABELS: Record<AgentKey, string> = {
    [AGENT_KEYS.MENU_GENERATION]: 'Tạo Thực Đơn (Menu Generation)',
    [AGENT_KEYS.FEEDBACK_SUGGESTION]: 'Gợi Ý Phản Hồi (Feedback Suggestion)',
};

// Dummy models - replace with actual fetched models
const DUMMY_MODELS = [
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro-latest",
    "gemini-1.0-pro",
    "models/gemini-pro-vision",
];

// *** Giá trị đặc biệt cho lựa chọn mặc định ***
const DEFAULT_MODEL_VALUE = "default";

export function SettingsDialogContent() {
    const { toast } = useToast();
    const [apiKey, setApiKey] = useState<string>('');
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    // Khởi tạo state với giá trị 'default'
    const [selectedModels, setSelectedModels] = useState<Record<AgentKey, string>>(
        () => Object.values(AGENT_KEYS).reduce((acc, key) => {
            acc[key] = DEFAULT_MODEL_VALUE; // Mặc định là 'default'
            return acc;
        }, {} as Record<AgentKey, string>)
    );
    const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);
    const [apiKeyError, setApiKeyError] = useState<string | null>(null);
    // Speech Settings
    const [speechEnabled, setSpeechEnabled] = useState<boolean>(true);
    const [speechRate, setSpeechRate] = useState<number>(1); // Normal speed
    const [speechVolume, setSpeechVolume] = useState<number>(1); // Max volume

    // Load saved settings from localStorage on mount
    useEffect(() => {
        const savedApiKey = localStorage.getItem('userGeminiApiKey') || '';
        setApiKey(savedApiKey);

        const savedSelections: Record<AgentKey, string> = { ...selectedModels }; // Copy state hiện tại
        Object.values(AGENT_KEYS).forEach(agentKey => {
            const storedValue = localStorage.getItem(agentKey);
            // Nếu có giá trị lưu trữ (khác null/undefined), sử dụng nó.
            // Nếu không, giữ nguyên giá trị 'default' đã khởi tạo.
            if (storedValue !== null) {
                 // Nếu giá trị lưu là rỗng (từ phiên bản cũ), coi như là default
                 savedSelections[agentKey] = storedValue === "" ? DEFAULT_MODEL_VALUE : storedValue;
            }
        });
        setSelectedModels(savedSelections);

        // Fetch models based on the loaded API key
        if (savedApiKey) { // Chỉ fetch nếu có key đã lưu
             fetchModels(savedApiKey);
        }

        // Load speech settings
        const storedSpeechEnabled = localStorage.getItem('speechEnabled');
        if (storedSpeechEnabled !== null) {
            setSpeechEnabled(storedSpeechEnabled === 'true');
        }
        const storedSpeechRate = localStorage.getItem('speechRate');
        if (storedSpeechRate !== null) {
            setSpeechRate(parseFloat(storedSpeechRate));
        }
        const storedSpeechVolume = localStorage.getItem('speechVolume');
        if (storedSpeechVolume !== null) {
            setSpeechVolume(parseFloat(storedSpeechVolume));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Chạy 1 lần khi mount

    const fetchModels = useCallback(async (currentApiKey: string) => {
        if (!currentApiKey) {
            setAvailableModels([]); // Xóa model nếu không có key
            setApiKeyError("Vui lòng nhập API Key để tải danh sách model.");
            return;
        }
        setIsLoadingModels(true);
        setApiKeyError(null);
        setAvailableModels([]); // Xóa danh sách cũ trước khi fetch

        // *** Placeholder Logic - Thay thế bằng SDK thật ***
        console.log("Simulating model fetch with key:", currentApiKey);
        try {
            await new Promise(resolve => setTimeout(resolve, 700)); // Simulate delay
            // Giả sử fetch thành công
            setAvailableModels(DUMMY_MODELS);
            toast({ title: "Thành công", description: "Đã tải danh sách model." });
        } catch (error) {
             console.error("Error fetching models (simulation):", error);
             setApiKeyError("Không thể tải danh sách model. Vui lòng kiểm tra lại API Key.");
             toast({ title: "Lỗi", description: "Không thể tải danh sách model.", variant: "destructive" });
        } finally {
            setIsLoadingModels(false);
        }
        // *** End Placeholder Logic ***

    }, [toast]); // Dependency

    const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setApiKey(e.target.value);
        // Xóa lỗi khi người dùng bắt đầu nhập lại
        if (apiKeyError) {
            setApiKeyError(null);
        }
    };

    const handleApiKeySave = () => {
        const trimmedApiKey = apiKey.trim();
        // Validation cơ bản
        if (trimmedApiKey && !trimmedApiKey.startsWith('AIza')) {
             toast({
                title: "Định dạng API Key không hợp lệ",
                description: "Gemini API Key thường bắt đầu bằng 'AIza'.",
                variant: "destructive",
            });
            setApiKeyError("Định dạng API Key không hợp lệ.");
            return;
        }
        localStorage.setItem('userGeminiApiKey', trimmedApiKey);
        toast({
            title: "Đã lưu API Key",
            description: trimmedApiKey ? "API Key đã được lưu." : "Đã xóa API Key đã lưu.",
        });
        setApiKeyError(null); // Xóa lỗi nếu lưu thành công
        // Fetch lại models với key mới (hoặc không fetch nếu key rỗng)
        fetchModels(trimmedApiKey);
    };

    const handleModelChange = (agentKey: AgentKey, modelValue: string) => {
        // modelValue giờ sẽ là tên model hoặc "default"
        const newSelections = { ...selectedModels, [agentKey]: modelValue };
        setSelectedModels(newSelections);
        // Lưu giá trị đã chọn vào localStorage
        localStorage.setItem(agentKey, modelValue);
         toast({
            title: "Đã lưu lựa chọn Model",
            description: `Đã chọn ${modelValue === DEFAULT_MODEL_VALUE ? 'Mặc định' : modelValue} cho ${AGENT_LABELS[agentKey]}.`,
        });
    };

    // --- Speech Settings Handlers ---
    const handleSpeechEnabledChange = (checked: boolean) => {
        setSpeechEnabled(checked);
        localStorage.setItem('speechEnabled', String(checked));
        toast({ title: "Đã lưu", description: `Chức năng đọc văn bản ${checked ? 'bật' : 'tắt'}.` });
    };

    const handleSpeechRateChange = (rate: number) => {
        setSpeechRate(rate);
        localStorage.setItem('speechRate', String(rate));
        toast({ title: "Đã lưu", description: `Tốc độ đọc văn bản đã được đặt thành ${rate.toFixed(1)}.` });
    };

    const handleSpeechVolumeChange = (volume: number) => {
        setSpeechVolume(volume);
        localStorage.setItem('speechVolume', String(volume));
        toast({ title: "Đã lưu", description: `Âm lượng đọc văn bản đã được đặt thành ${volume.toFixed(1)}.` });
    };

    return (
        
            {/* API Key Section */}
            

                
                    Gemini API Key (Tùy chọn)
                    <Alert variant="default" className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-700/50 text-yellow-700 dark:text-yellow-300 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-400">
                        <Info className="h-4 w-4" />
                        
                            Cảnh báo bảo mật
                        
                        
                            Lưu API key trong trình duyệt (localStorage) không an toàn cho môi trường production. Chỉ sử dụng cho mục đích phát triển hoặc demo cá nhân.
                        
                    </Alert>
                    
                        
                            <Input
                                id="apiKey"
                                type="password"
                                value={apiKey}
                                onChange={handleApiKeyChange} // Sử dụng handler mới
                                placeholder="Nhập API Key Gemini của bạn..."
                                className={cn("flex-grow", apiKeyError && "border-destructive focus-visible:ring-destructive")} // Highlight lỗi
                            />
                            <Button onClick={handleApiKeySave} size="icon" aria-label="Lưu API Key">
                                <Save className="h-4 w-4" />
                            </Button>
                        
                        
                            Nếu để trống, hệ thống sẽ sử dụng API key mặc định (nếu có).
                            Lấy API Key tại <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">Google AI Studio</a>.
                        
                         {apiKeyError && (
                            
                                {apiKeyError}
                            
                         )}
                    
                

            {/* Model Selection Section */}
            

                 
                    Chọn Model cho Agents
                 
                 {isLoadingModels && (
                    
                        
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Đang tải danh sách models...
                        
                    
                 )}
                 {!isLoadingModels && availableModels.length === 0 && !apiKeyError && (
                     
                         {apiKey ? "Không tìm thấy model nào với API Key này." : "Nhập API Key để tải danh sách model."}
                     
                 )}
                 {/* Chỉ hiển thị Select khi có model hoặc không có lỗi key */}
                 {!isLoadingModels && (availableModels.length > 0 || !apiKeyError) && Object.values(AGENT_KEYS).map((agentKey) => {
                     const agentLabel = AGENT_LABELS[agentKey];
                     return (
                         
                             
                                 
                                     {agentLabel}
                                 
                                 
                                     {/* *** SỬA LỖI: Sử dụng giá trị "default" ***/}
                                     
                                         Mặc định (Default)
                                     
                                     {/* Render các model khả dụng */}
                                     {availableModels.map((modelName) => (
                                         
                                             {modelName}
                                         
                                     ))}
                                 
                             
                         
                     );
                 })}
                 
                    Chọn model cụ thể cho từng tác vụ AI. Nếu chọn "Mặc định", hệ thống sẽ tự động chọn model phù hợp nhất (thường là phiên bản mới nhất).
                 
            

             
                
                    <Terminal className="h-4 w-4" />
                    
                        Lưu ý cho nhà phát triển
                    
                    
                        Việc áp dụng API Key và Model đã chọn yêu cầu sửa đổi logic khởi tạo AI (ví dụ: trong `ai-instance.ts` hoặc các flow) để đọc các giá trị này từ localStorage (`"default"` hoặc tên model cụ thể) và sử dụng chúng khi gọi API Gemini.
                    
                
            
        
    );
}

export function SpeechSettings() {
    const { toast } = useToast();
    const [speechEnabled, setSpeechEnabled] = useState<boolean>(true);
    const [speechRate, setSpeechRate] = useState<number>(1); // Normal speed
    const [speechVolume, setSpeechVolume] = useState<number>(1); // Max volume

     useEffect(() => {
        // Load speech settings
        const storedSpeechEnabled = localStorage.getItem('speechEnabled');
        if (storedSpeechEnabled !== null) {
            setSpeechEnabled(storedSpeechEnabled === 'true');
        }
        const storedSpeechRate = localStorage.getItem('speechRate');
        if (storedSpeechRate !== null) {
            setSpeechRate(parseFloat(storedSpeechRate));
        }
        const storedSpeechVolume = localStorage.getItem('speechVolume');
        if (storedSpeechVolume !== null) {
            setSpeechVolume(parseFloat(storedSpeechVolume));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- Speech Settings Handlers ---
    const handleSpeechEnabledChange = (checked: boolean) => {
        setSpeechEnabled(checked);
        localStorage.setItem('speechEnabled', String(checked));
        toast({ title: "Đã lưu", description: `Chức năng đọc văn bản ${checked ? 'bật' : 'tắt'}.` });
    };

    const handleSpeechRateChange = (rate: number) => {
        setSpeechRate(rate);
        localStorage.setItem('speechRate', String(rate));
        toast({ title: "Đã lưu", description: `Tốc độ đọc văn bản đã được đặt thành ${rate.toFixed(1)}.` });
    };

    const handleSpeechVolumeChange = (volume: number) => {
        setSpeechVolume(volume);
        localStorage.setItem('speechVolume', String(volume));
        toast({ title: "Đã lưu", description: `Âm lượng đọc văn bản đã được đặt thành ${volume.toFixed(1)}.` });
    };

     return (
        
            
                
                    Chức năng Đọc Văn bản
                 
                
                    Bật/Tắt chức năng đọc văn bản tự động.
                 
                <Switch id="speechEnabled" checked={speechEnabled} onCheckedChange={handleSpeechEnabledChange} />
            

            
                
                    Tốc độ Đọc
                 
                
                    Điều chỉnh tốc độ đọc văn bản.
                 
                 
                    
                        <Slider
                            defaultValue={[speechRate]}
                            max={2}
                            min={0.5}
                            step={0.1}
                            onValueChange={(value) => handleSpeechRateChange(value[0])}
                        />
                    
                    
                        <Input type="number" value={speechRate.toFixed(1)} readOnly className="w-16 bg-muted" />
                    
                
            

            
                
                    Âm lượng Đọc
                 
                
                    Điều chỉnh âm lượng đọc văn bản.
                 
                 
                    
                        <Slider
                            defaultValue={[speechVolume]}
                            max={1}
                            min={0}
                            step={0.1}
                            onValueChange={(value) => handleSpeechVolumeChange(value[0])}
                        />
                    
                    
                        <Input type="number" value={speechVolume.toFixed(1)} readOnly className="w-16 bg-muted" />
                    
                
            
        
    );
}
