
'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react'; // Import Suspense
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, StopCircle, Volume2, Loader2, Bot, User, BrainCircuit, MessageSquare, Waves } from 'lucide-react'; // Added MessageSquare, Waves
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from '@/components/ui/sidebar';
import { motion, AnimatePresence } from 'framer-motion'; // Import framer-motion

// --- Types ---
interface VoiceChatMessage {
    id: number;
    text: string;
    type: 'user' | 'bot' | 'error' | 'system';
    audioSrc?: string;
}

type VoiceMode = 'stt' | 'audio_understanding';
type TtsPreference = 'google' | 'browser';
type ViewMode = 'text' | 'voice'; // Add ViewMode type

// --- Component: VoiceAnimationView (Tách ra để dễ quản lý) ---
interface VoiceAnimationViewProps {
    isListening: boolean;
    isProcessing: boolean;
    isSpeaking: boolean;
    currentMode: VoiceMode;
    lastBotMessage?: VoiceChatMessage;
    lastUserMessage?: VoiceChatMessage;
    onToggleListening: () => void;
    // Thêm các props điều khiển khác nếu cần (ví dụ: mode, tts preference)
    currentTtsPreference: TtsPreference;
    onTtsPreferenceChange: (checked: boolean) => void;
    onModeChange: (checked: boolean) => void;
    disabledControls: boolean;
}

const VoiceAnimationView: React.FC<VoiceAnimationViewProps> = ({
    isListening,
    isProcessing,
    isSpeaking,
    currentMode,
    lastBotMessage,
    lastUserMessage,
    onToggleListening,
    currentTtsPreference,
    onTtsPreferenceChange,
    onModeChange,
    disabledControls
}) => {
    let displayText = "Nhấn nút micro để bắt đầu";
    let displayIcon = <Bot size={64} />; // Default icon

    if (isSpeaking && lastBotMessage) {
        displayText = lastBotMessage.text;
        // Có thể thêm hiệu ứng cho icon Bot khi nói
        displayIcon = <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1, repeat: Infinity }}><Bot size={64} /></motion.div>;
    } else if (isProcessing) {
        displayText = "Đang xử lý...";
        displayIcon = <Loader2 size={64} className="animate-spin" />; // Spinner thay cho Bot
    } else if (isListening) {
        displayText = currentMode === 'stt' ? "Đang nghe..." : "Đang ghi âm...";
        // Icon có thể thay đổi hoặc thêm hiệu ứng sóng
        displayIcon = <Mic size={64} />;
    } else if (!isListening && !isProcessing && !isSpeaking && lastUserMessage) {
        // Hiển thị lại lời user một chút
        displayText = `Bạn: "${lastUserMessage.text}"`;
        displayIcon = <User size={64} />; // Hiển thị icon User
    }

    return (
        <div className="flex flex-col flex-1 items-center justify-center w-full h-full text-center p-4">
            {/* --- Vùng Animation Chính (Orb) --- */}
            <motion.div
                className="w-48 h-48 md:w-60 md:h-60 mb-6 relative flex items-center justify-center"
                animate={{ scale: isListening ? 1.05 : 1 }}
                transition={{ duration: 0.4, repeat: isListening ? Infinity : 0, repeatType: "reverse", ease: "easeInOut" }}
            >
                {/* Lớp nền Gradient Blur */}
                <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 dark:from-blue-600 dark:to-purple-700 rounded-full opacity-40 dark:opacity-30 blur-2xl"
                    animate={{
                        scale: isSpeaking ? [1, 1.1, 1] : 1, // Hiệu ứng nhẹ khi nói
                        opacity: isSpeaking ? [0.4, 0.6, 0.4] : 0.4,
                    }}
                    transition={{ duration: 1.5, repeat: isSpeaking ? Infinity : 0, ease: "easeInOut" }}
                />

                {/* Hiệu ứng Sóng khi Nghe */}
                <AnimatePresence>
                    {isListening && (
                        <>
                            <motion.div
                                key="wave-1"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1.5, opacity: [0.5, 0.8, 0] }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0 }}
                                className="absolute w-full h-full border-2 border-blue-500/70 rounded-full"
                            />
                            <motion.div
                                key="wave-2"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1.8, opacity: [0.3, 0.6, 0] }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                                className="absolute w-full h-full border-2 border-blue-400/50 rounded-full"
                            />
                        </>
                    )}
                </AnimatePresence>

                {/* Icon trung tâm (Bot/User/Loader/Mic) */}
                <motion.div
                    className="z-10 text-gray-800 dark:text-gray-200"
                    key={isProcessing ? 'loader' : isListening ? 'mic' : isSpeaking ? 'bot-speaking' : 'idle'} // Key để trigger animation khi icon thay đổi
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                    {displayIcon}
                </motion.div>
            </motion.div>

            {/* --- Hiển thị Text Tóm tắt --- */}
            <motion.p
                key={displayText} // Key thay đổi để trigger animation
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="text-base md:text-lg text-gray-700 dark:text-gray-300 mb-8 px-4 h-12 line-clamp-2" // Giới hạn 2 dòng
            >
                {displayText}
            </motion.p>

            {/* --- Nút Microphone --- */}
            <motion.div // Thêm motion để có thể scale cả nút
                 whileTap={{ scale: 0.95 }}
            >
                <Button
                    onClick={onToggleListening}
                    disabled={isProcessing || isSpeaking}
                    size="lg"
                    className={cn(
                        "rounded-full w-20 h-20 p-0 flex items-center justify-center shadow-xl transition-colors duration-300 ease-in-out", // Tăng kích thước
                        isListening
                            ? "bg-red-500 hover:bg-red-600 text-white scale-105" // Phóng to nhẹ khi nghe
                            : "bg-blue-600 hover:bg-blue-700 text-white",
                        (isProcessing || isSpeaking) && "bg-gray-400 cursor-not-allowed opacity-70"
                    )}
                    aria-label={isListening ? "Dừng" : "Bắt đầu"}
                >
                    {/* Icon thay đổi mượt mà hơn */}
                    <AnimatePresence mode="wait">
                        {isProcessing ? (
                            <motion.div key="loader-icon" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 90 }} transition={{ duration: 0.2 }}>
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </motion.div>
                        ) : isListening ? (
                            <motion.div key="stop-icon" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.2 }}>
                                <StopCircle className="h-9 w-9" />
                            </motion.div>
                        ) : (
                            <motion.div key="mic-icon" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.2 }}>
                                <Mic className="h-9 w-9" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Button>
            </motion.div>

             {/* --- Các nút điều khiển phụ (Mode, TTS) --- */}
             <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                 {/* Mode Toggle */}
                 <div className="flex items-center space-x-2">
                     <Label htmlFor="mode-switch-voice" className={cn("text-xs", currentMode === 'stt' ? 'text-blue-600 font-semibold' : 'text-gray-500 dark:text-gray-400')}>
                         STT
                     </Label>
                     <Switch
                         id="mode-switch-voice"
                         checked={currentMode === 'audio_understanding'}
                         onCheckedChange={onModeChange}
                         disabled={disabledControls}
                         className="scale-90" // Thu nhỏ chút
                     />
                     <Label htmlFor="mode-switch-voice" className={cn("text-xs", currentMode === 'audio_understanding' ? 'text-purple-600 font-semibold' : 'text-gray-500 dark:text-gray-400')}>
                         <BrainCircuit className="inline h-3 w-3 mr-0.5" /> Audio
                     </Label>
                 </div>

                 {/* TTS Preference Toggle */}
                 <div className="flex items-center space-x-2">
                     <Label htmlFor="tts-switch-voice" className={cn("text-xs", currentTtsPreference === 'browser' ? 'text-blue-600 font-semibold' : 'text-gray-500 dark:text-gray-400')}>
                         Browser TTS
                     </Label>
                     <Switch
                         id="tts-switch-voice"
                         checked={currentTtsPreference === 'google'}
                         onCheckedChange={onTtsPreferenceChange}
                         disabled={disabledControls}
                         className="scale-90" // Thu nhỏ chút
                     />
                     <Label htmlFor="tts-switch-voice" className={cn("text-xs", currentTtsPreference === 'google' ? 'text-green-600 font-semibold' : 'text-gray-500 dark:text-gray-400')}>
                         Google TTS
                     </Label>
                 </div>
             </div>
        </div>
    );
};


// --- Component Chính: VoiceChatPage ---
export default function VoiceChatPage() {
    const [conversation, setConversation] = useState<VoiceChatMessage[]>([]);
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [currentMode, setCurrentMode] = useState<VoiceMode>('stt');
    const [ttsPreference, setTtsPreference] = useState<TtsPreference>('browser'); // Default to Browser TTS for speed
    const [viewMode, setViewMode] = useState<ViewMode>('text'); // State cho chế độ xem

    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const synthRef = useRef<SpeechSynthesis | null>(null);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const { toast } = useToast();

    // --- Add Message Helper ---
    const addMessage = useCallback((type: VoiceChatMessage['type'], text: string, audioSrc?: string) => {
        setConversation((prev) => [...prev, { id: Date.now(), type, text, audioSrc }]);
    }, [setConversation]);

    // --- Media & Speech Setup ---
    useEffect(() => {
        // --- Speech Synthesis Setup (TTS) ---
        if ('speechSynthesis' in window) {
            synthRef.current = window.speechSynthesis;
            // Load voices initially if needed, though often lazy-loaded
            synthRef.current.getVoices();
            // Handle voices changing
            synthRef.current.onvoiceschanged = () => {
                console.log("Voices changed");
            };
        } else {
            console.warn("Speech Synthesis Not Supported");
        }

        // --- Speech Recognition Setup (STT Mode) ---
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) {
                 console.warn("Speech Recognition constructor not found.");
                 return;
            }
            const recognition = new SpeechRecognition();
            recognition.continuous = false; // Nghe từng câu
            recognition.interimResults = false; // Chỉ lấy kết quả cuối cùng
            recognition.lang = 'vi-VN';

            recognition.onstart = () => {
                console.log("STT: Recognition started");
                // Đặt isListening ngay lập tức khi bắt đầu, thay vì chờ API
                // setIsListening(true); // Cân nhắc: có thể đặt ở toggleListening để phản hồi nhanh hơn
            };

            recognition.onresult = async (event: SpeechRecognitionEvent) => {
                console.log("STT: Result received");
                if (currentMode !== 'stt') return; // Kiểm tra lại mode khi có kết quả

                const transcript = event.results[event.results.length - 1]?.[0]?.transcript ?? '';
                console.log("STT Transcript:", transcript);
                if (transcript) {
                    // Đặt isListening false ngay khi có kết quả hợp lệ
                    setIsListening(false);
                    addMessage('user', transcript); // Bỏ (STT): cho gọn
                    setIsProcessing(true);
                    await sendTextToBackend(transcript);
                    // setIsProcessing(false); // Đã chuyển vào finally của sendTextToBackend
                } else {
                    // Nếu không có transcript, có thể kết thúc sớm
                     setIsListening(false);
                }
            };

            recognition.onend = () => {
                console.log("STT: Recognition ended");
                // Chỉ đặt false nếu nó chưa bị đặt bởi onresult hoặc stop()
                // if (isListening) { // Kiểm tra state hiện tại
                    setIsListening(false);
                // }
            };

            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                console.error("STT Error:", event.error, event.message);
                 if (currentMode !== 'stt') return; // Kiểm tra lại mode khi có lỗi

                let errorMessage = "Lỗi nhận diện giọng nói.";
                if (event.error === 'no-speech') {
                    errorMessage = "Không nhận diện được giọng nói. Vui lòng thử lại.";
                    // Không cần toast ở đây, chỉ cần dừng nghe
                } else if (event.error === 'not-allowed') {
                    errorMessage = "Không được phép truy cập micro. Vui lòng cấp quyền.";
                    toast({ title: "Lỗi Micro", description: errorMessage, variant: "destructive" });
                } else if (event.error === 'audio-capture') {
                    errorMessage = "Lỗi thu âm thanh từ micro.";
                     toast({ title: "Lỗi Micro", description: errorMessage, variant: "destructive" });
                } else if (event.error === 'network') {
                    errorMessage = "Lỗi mạng trong quá trình nhận diện.";
                     toast({ title: "Lỗi Mạng", description: errorMessage, variant: "destructive" });
                } else if (event.error === 'aborted') {
                    console.log("STT: Recognition aborted (likely intentional stop)");
                    errorMessage = ""; // Không hiển thị lỗi khi tự dừng
                } else {
                     toast({ title: "Lỗi STT", description: errorMessage, variant: "destructive" });
                }

                setIsListening(false);
                setIsProcessing(false); // Đảm bảo dừng xử lý nếu có lỗi STT
            };
            recognitionRef.current = recognition;
        } else {
            console.warn("Speech Recognition Not Supported");
            // Có thể hiển thị thông báo cho người dùng ở đây
        }

        // --- Media Recorder Setup (Audio Mode) ---
        // Sẽ khởi tạo khi cần trong toggleListening

        // --- Audio Player Setup ---
        audioPlayerRef.current = new Audio();
        audioPlayerRef.current.onplay = () => setIsSpeaking(true); // Đặt true khi bắt đầu phát
        audioPlayerRef.current.onended = () => setIsSpeaking(false);
        audioPlayerRef.current.onpause = () => { // Xử lý cả khi pause đột ngột
             if (audioPlayerRef.current && audioPlayerRef.current.currentTime !== audioPlayerRef.current.duration) {
                 setIsSpeaking(false);
             }
        };
        audioPlayerRef.current.onerror = (e) => {
            console.error("HTML Audio Element Error:", e);
            setIsSpeaking(false);
            toast({ title: "Lỗi phát âm thanh", description: "Không thể phát tệp âm thanh.", variant: "destructive" });
        };

        // --- Cleanup ---
        return () => {
            console.log("Cleanup: Stopping recognition, recorder, synth, audio");
            recognitionRef.current?.abort();
            // Kiểm tra state trước khi stop để tránh lỗi nếu chưa khởi tạo
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                mediaRecorderRef.current.stop();
            }
            synthRef.current?.cancel();
            if (audioPlayerRef.current) {
                audioPlayerRef.current.pause();
                // Không cần revoke ở đây nếu URL được quản lý bởi state hoặc message list
                // URL.revokeObjectURL(audioPlayerRef.current.src);
                audioPlayerRef.current = null; // Giúp garbage collection
            }
        };
    // Chạy một lần khi mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toast]); // Bỏ addMessage, currentMode ra khỏi deps của setup chính

    // --- Helper: Send Text to Backend (STT Mode) ---
    const sendTextToBackend = async (text: string) => {
        setIsProcessing(true); // Đảm bảo set processing
        try {
            const response = await fetch('/api/voice-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text, mode: 'stt' }),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
                throw new Error(errorData.error || `HTTP error ${response.status}`);
            }
            const data = await response.json();
            if (data.response) {
                await handleBotResponse(data.response);
            } else {
                addMessage('error', 'Không nhận được phản hồi hợp lệ từ bot.');
            }
        } catch (error: any) {
            console.error("Error sending text to backend:", error);
            addMessage('error', `Lỗi khi gửi yêu cầu (STT): ${error.message}`);
            setIsSpeaking(false); // Dừng trạng thái nói nếu có lỗi
        } finally {
             setIsProcessing(false); // Luôn tắt processing sau khi hoàn tất hoặc lỗi
        }
    };

    // --- Helper: Send Audio to Backend (Audio Mode) ---
    const sendAudioToBackend = async (audioBlob: Blob) => {
        setIsProcessing(true);
        // Không add message ở đây nữa, để VoiceAnimationView hiển thị processing
        // addMessage('user', `[Đang gửi ${Math.round(audioBlob.size / 1024)} KB âm thanh...]`);

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            const base64Data = base64Audio.split(',')[1];

            if (!base64Data) {
                 addMessage('error', 'Lỗi chuyển đổi âm thanh sang Base64.');
                 setIsProcessing(false);
                 return;
            }

            try {
                const response = await fetch('/api/voice-chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        audioData: base64Data,
                        mimeType: audioBlob.type || 'audio/webm',
                        mode: 'audio_understanding',
                        prompt: "Phân tích đoạn âm thanh này và phản hồi." // Prompt rõ ràng hơn
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
                    throw new Error(errorData.error || `HTTP error ${response.status}`);
                }
                const data = await response.json();
                 // Thêm message user sau khi gửi thành công (hoặc có thể bỏ qua)
                addMessage('user', `[Đã gửi âm thanh ${currentMode === 'audio_understanding' ? 'phân tích' : 'ghi âm'}]`);
                if (data.response) {
                    await handleBotResponse(data.response);
                } else {
                    addMessage('error', 'Không nhận được phản hồi hợp lệ từ bot (Audio Mode).');
                }
            } catch (error: any) {
                console.error("Error sending audio to backend:", error);
                addMessage('error', `Lỗi khi gửi yêu cầu (Audio): ${error.message}`);
                 setIsSpeaking(false); // Dừng trạng thái nói nếu có lỗi
            } finally {
                setIsProcessing(false); // Luôn tắt processing
            }
        };
        reader.onerror = (error) => {
             console.error("FileReader error:", error);
             addMessage('error', 'Lỗi đọc tệp âm thanh.');
             setIsProcessing(false);
        };
    };


    // --- Helper: Handle Bot Response (TTS) ---
    const handleBotResponse = async (responseText: string) => {
        // Thêm tin nhắn text của bot trước
        addMessage('bot', responseText);

        // Quyết định TTS
        if (ttsPreference === 'google') {
            try {
                setIsSpeaking(true); // Bắt đầu trạng thái nói ngay khi gọi API
                const ttsResponse = await fetch('/api/tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: responseText }),
                });

                if (ttsResponse.ok) {
                    const audioBlob = await ttsResponse.blob();
                    const audioUrl = URL.createObjectURL(audioBlob);
                    // Cập nhật audioSrc cho tin nhắn cuối cùng (là tin nhắn bot vừa thêm)
                    setConversation(prev => prev.map((msg, index) =>
                        index === prev.length - 1 ? { ...msg, audioSrc: audioUrl } : msg
                    ));
                    if (audioPlayerRef.current) {
                        audioPlayerRef.current.src = audioUrl;
                        // Không cần play ở đây nữa vì đã có onplay handler
                        audioPlayerRef.current.play().catch(e => {
                             console.error("Audio playback error (Google TTS):", e);
                             setIsSpeaking(false); // Tắt speaking nếu không play được
                             // Có thể fallback về browser TTS ở đây nếu muốn
                             // speakText(responseText);
                        });
                        // setIsSpeaking(true); // Đã chuyển lên trước fetch
                    } else {
                         setIsSpeaking(false); // Không có audio player thì không thể nói
                    }
                } else {
                    setIsSpeaking(false); // Tắt speaking nếu API lỗi
                    const errorData = await ttsResponse.json().catch(() => ({ error: 'Unknown TTS API error' }));
                    console.warn(`Google TTS failed (${ttsResponse.status}), falling back to browser TTS. Error: ${errorData.error}`);
                    toast({ title: "Lỗi Google TTS", description: `Lỗi ${ttsResponse.status}. Sử dụng giọng nói trình duyệt.`, variant: "default", duration: 3000 });
                    speakText(responseText); // Fallback
                }
            } catch (ttsError: any) {
                setIsSpeaking(false); // Tắt speaking nếu fetch lỗi
                console.error("Error fetching/playing Google TTS:", ttsError);
                toast({ title: "Lỗi Google TTS", description: `Lỗi kết nối API. Sử dụng giọng nói trình duyệt.`, variant: "default", duration: 3000 });
                speakText(responseText); // Fallback
            }
        } else {
            // Sử dụng Browser TTS
            speakText(responseText);
        }
    };

    // --- Browser TTS Fallback ---
    const speakText = useCallback((text: string) => {
        if (!synthRef.current || !text) {
            console.warn("Browser TTS not available or text is empty.");
            setIsSpeaking(false); // Đảm bảo tắt speaking nếu không thể nói
            return;
        }

        // Đảm bảo synth đã sẵn sàng và có voices
        const synth = synthRef.current;
        const voices = synth.getVoices();

        if (voices.length === 0) {
             console.warn("Browser TTS voices not loaded yet. Retrying...");
             // Cố gắng gọi lại sau một khoảng thời gian ngắn
             setTimeout(() => speakText(text), 100);
             return;
        }


        synth.cancel(); // Hủy bỏ lần nói trước (nếu có)
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';

        const vietnameseVoice = voices.find(voice => voice.lang === 'vi-VN' && voice.localService); // Ưu tiên local voice
        const googleVietnameseVoice = voices.find(voice => voice.lang === 'vi-VN' && voice.name.includes('Google')); // Tìm Google voice nếu có

        if (vietnameseVoice) {
            utterance.voice = vietnameseVoice;
             console.log("Using local Vietnamese voice:", vietnameseVoice.name);
        } else if (googleVietnameseVoice) {
             utterance.voice = googleVietnameseVoice;
             console.log("Using Google Vietnamese voice:", googleVietnameseVoice.name);
        } else {
             console.warn("No specific Vietnamese voice found, using default.");
             // Không set voice, trình duyệt sẽ dùng giọng mặc định cho 'vi-VN' nếu có
        }

        utterance.onstart = () => {
            console.log("Browser TTS started");
            setIsSpeaking(true);
        }
        utterance.onend = () => {
            console.log("Browser TTS ended");
            setIsSpeaking(false);
        }
        utterance.onerror = (e) => {
            console.error("Browser TTS Error:", e);
            setIsSpeaking(false);
            // Chỉ toast lỗi nếu không phải do người dùng hủy
            if (e.error !== 'canceled') {
                toast({ title: "Lỗi phát âm", description: "Không thể phát phản hồi bằng giọng trình duyệt.", variant: "destructive" });
            }
        };

        // Bắt đầu nói
        console.log("Attempting to speak with browser TTS:", text.substring(0, 50) + "...");
        synth.speak(utterance);

    }, [toast]); // Bỏ addMessage

    // --- Toggle Listening / Recording ---
    const toggleListening = useCallback(async () => {
        console.log("Toggle Listening Called. Current state:", { isListening, isProcessing, isSpeaking, currentMode });

        // --- Logic Dừng ---
        if (isListening) {
            console.log("Stopping...");
            if (currentMode === 'stt' && recognitionRef.current) {
                console.log("Stopping STT recognition...");
                recognitionRef.current.stop(); // Trigger onend/onerror
            } else if (currentMode === 'audio_understanding' && mediaRecorderRef.current) {
                if (mediaRecorderRef.current.state === "recording") {
                    console.log("Stopping audio recording...");
                    mediaRecorderRef.current.stop(); // Trigger onstop
                    // isListening sẽ được set false trong onstop
                } else {
                     console.log("Audio recorder was not recording.");
                     setIsListening(false); // Set false nếu không ở state recording
                }
            } else {
                 console.log("No active recognition/recorder to stop.");
                 setIsListening(false); // Đảm bảo set false nếu không có gì đang chạy
            }
            // Không set isListening(false) ở đây nữa, để các event handler tự xử lý
            return;
        }

        // --- Logic Bắt đầu ---
        if (isProcessing || isSpeaking) {
            console.log("Cannot start: Busy processing or speaking.");
            return; // Không bắt đầu nếu đang bận
        }

        console.log("Starting...");
        // Hủy bỏ TTS đang nói (nếu có)
        synthRef.current?.cancel();
        if (audioPlayerRef.current && !audioPlayerRef.current.paused) {
            audioPlayerRef.current.pause();
            // setIsSpeaking(false); // onpause handler sẽ xử lý
        }
        // setIsSpeaking(false); // Đảm bảo trạng thái nói tắt

        // --- Bắt đầu STT Mode ---
        if (currentMode === 'stt') {
            if (!recognitionRef.current) {
                toast({ title: "Lỗi STT", description: "Chức năng nhận diện giọng nói chưa sẵn sàng.", variant: "destructive" });
                console.error("STT Error: recognitionRef is null.");
                return;
            }
            try {
                console.log("Starting STT recognition...");
                setIsListening(true); // *** Đặt isListening true NGAY LẬP TỨC cho phản hồi UI ***
                recognitionRef.current.start();
            } catch (error: any) {
                 setIsListening(false); // Tắt lại nếu có lỗi khi start
                console.error("Error starting STT recognition:", error);
                 // Kiểm tra lỗi cụ thể
                 if (error.name === 'InvalidStateError') {
                     toast({ title: "Lỗi STT", description: "Đang có lỗi xảy ra, vui lòng thử lại sau.", variant: "destructive" });
                     // Có thể thử reset recognition object ở đây nếu cần
                 } else {
                    toast({ title: "Lỗi STT", description: "Không thể bắt đầu nhận diện.", variant: "destructive" });
                 }
            }
        }
        // --- Bắt đầu Audio Understanding Mode ---
        else if (currentMode === 'audio_understanding') {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                 toast({ title: "Lỗi Ghi Âm", description: "Trình duyệt không hỗ trợ ghi âm.", variant: "destructive" });
                 console.error("Audio Error: getUserMedia not supported.");
                 return;
            }
            try {
                console.log("Requesting microphone access...");
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                console.log("Microphone access granted.");

                let recorderOptions: MediaRecorderOptions = {};
                const supportedTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4'];
                const supportedType = supportedTypes.find(type => MediaRecorder.isTypeSupported(type));

                if (supportedType) {
                    recorderOptions.mimeType = supportedType;
                    console.log("Using MIME type:", supportedType);
                } else {
                    console.warn('No preferred MIME type supported, using browser default.');
                }

                mediaRecorderRef.current = new MediaRecorder(stream, recorderOptions);
                audioChunksRef.current = [];

                mediaRecorderRef.current.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        console.log("Audio data available, size:", event.data.size);
                        audioChunksRef.current.push(event.data);
                    }
                };

                mediaRecorderRef.current.onstop = () => {
                    console.log("Audio recording stopped (onstop event).");
                    setIsListening(false); // *** Đặt isListening false KHI DỪNG THỰC SỰ ***
                    const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
                    console.log("Audio blob created, size:", audioBlob.size, "type:", audioBlob.type);

                    // Dừng track micro để tắt chỉ báo trên trình duyệt
                    stream.getTracks().forEach(track => track.stop());
                    console.log("Microphone tracks stopped.");

                    if (audioBlob.size > 500) { // Chỉ gửi nếu có dữ liệu đáng kể
                       sendAudioToBackend(audioBlob);
                    } else {
                       console.warn("No significant audio data recorded.");
                       addMessage('system', 'Không ghi được đủ âm thanh.');
                       setIsProcessing(false); // Đảm bảo tắt processing nếu không gửi
                    }
                    mediaRecorderRef.current = null; // Reset ref
                };

                 mediaRecorderRef.current.onerror = (event: Event) => {
                    console.error("MediaRecorder Error:", event);
                    setIsListening(false); // Tắt listening khi có lỗi
                    stream.getTracks().forEach(track => track.stop()); // Dừng track micro
                    toast({ title: "Lỗi Ghi Âm", description: `Đã xảy ra lỗi trong quá trình ghi âm.`, variant: "destructive" });
                    mediaRecorderRef.current = null; // Reset ref
                };

                mediaRecorderRef.current.start(1000); // Bắt đầu ghi, có thể cắt chunk mỗi giây nếu cần
                setIsListening(true); // *** Đặt isListening true NGAY LẬP TỨC cho phản hồi UI ***
                console.log("Started audio recording with type:", mediaRecorderRef.current.mimeType);

            } catch (err) {
                setIsListening(false); // Tắt listening nếu có lỗi
                console.error("Error starting audio recording:", err);
                let errorMsg = "Không thể bắt đầu ghi âm.";
                if (err instanceof Error) {
                    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                        errorMsg = "Bạn cần cấp quyền truy cập micro để ghi âm.";
                    } else if (err.name === 'NotFoundError') {
                        errorMsg = "Không tìm thấy thiết bị micro.";
                    } else if (err.name === 'NotReadableError') {
                         errorMsg = "Không thể đọc dữ liệu từ micro (có thể đang được dùng bởi ứng dụng khác?).";
                    }
                }
                toast({ title: "Lỗi Ghi Âm", description: errorMsg, variant: "destructive" });
            }
        }
    // Bỏ addMessage ra khỏi deps vì nó ổn định
    }, [currentMode, isListening, isProcessing, isSpeaking, toast, sendAudioToBackend, sendTextToBackend, speakText]); // Thêm các hàm helper vào deps

    // --- Scroll to Bottom ---
    useEffect(() => {
        if (viewMode === 'text') { // Chỉ scroll ở chế độ text
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [conversation, viewMode]); // Thêm viewMode vào dependency

    // --- Render Message (Cho Text View) ---
    const renderMessage = (msg: VoiceChatMessage) => {
        const isBot = msg.type === 'bot';
        const isUser = msg.type === 'user';
        const isError = msg.type === 'error';
        const isSystem = msg.type === 'system';

        return (
            <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={cn(
                    "flex mb-4",
                    isUser ? "justify-end" : "justify-start"
                )}
            >
                <div className={cn(
                    "flex items-start gap-2.5 max-w-[80%] sm:max-w-[70%]", // Giảm max-width chút
                    isUser ? "flex-row-reverse" : "flex-row"
                )}>
                    {/* Icons */}
                    <div className="flex-shrink-0 mt-1">
                         {isBot && <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
                         {isUser && <User className="w-6 h-6 text-gray-400 dark:text-gray-500" />}
                         {(isError || isSystem) && <Bot className="w-6 h-6 text-yellow-500 dark:text-yellow-400" />} {/* Dùng Bot cho system/error */}
                    </div>

                    {/* Bubble */}
                    <div className={cn(
                        "p-3 rounded-lg shadow-md", // Tăng shadow nhẹ
                        isUser && "bg-blue-600 text-white rounded-br-none",
                        isBot && "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none",
                        (isError || isSystem) && "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-700 rounded-bl-none"
                    )}>
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p> {/* Cho phép xuống dòng */}
                        {/* Nút nghe lại */}
                        {isBot && msg.audioSrc && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    if (audioPlayerRef.current && msg.audioSrc) {
                                        // Dừng cái đang phát (nếu có)
                                        if (!audioPlayerRef.current.paused) {
                                            audioPlayerRef.current.pause();
                                        }
                                        // Phát cái mới
                                        audioPlayerRef.current.src = msg.audioSrc;
                                        audioPlayerRef.current.play().catch(e => console.error("Audio playback error (replay):", e));
                                        // setIsSpeaking(true); // onplay handler sẽ xử lý
                                    }
                                }}
                                className="mt-2 h-7 px-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                                disabled={isSpeaking && audioPlayerRef.current?.src === msg.audioSrc} // Disable nếu đang nói chính nó
                            >
                                <Volume2 className="h-3.5 w-3.5 mr-1" /> Nghe lại
                            </Button>
                        )}
                    </div>
                </div>
            </motion.div>
        );
    };

    // --- Tính toán props cho VoiceAnimationView ---
    const lastBotMessage = conversation.filter(m => m.type === 'bot').pop();
    const lastUserMessage = conversation.filter(m => m.type === 'user').pop();
    const disabledControls = isListening || isProcessing || isSpeaking;

    // --- Main JSX ---
    return (
        // Wrap the entire page content in Suspense
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-900"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>}>
            <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden"> {/* Thêm overflow-hidden */}
                <Sidebar />
                <div className="flex flex-col flex-1 items-center justify-between relative"> {/* Bỏ padding ở đây */}

                    {/* Nút chuyển đổi View Mode */}
                <div className="absolute top-3 right-3 z-20">
                     <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewMode(prev => prev === 'text' ? 'voice' : 'text')}
                        className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                        aria-label={viewMode === 'text' ? "Chuyển sang chế độ Voice" : "Chuyển sang chế độ Text"}
                        title={viewMode === 'text' ? "Chuyển sang chế độ Voice" : "Chuyển sang chế độ Text"} // Thêm title
                    >
                        <AnimatePresence mode="wait">
                            {viewMode === 'text' ? (
                                <motion.div key="waves" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                    <Waves className="h-5 w-5" />
                                </motion.div>
                            ) : (
                                <motion.div key="text" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                    <MessageSquare className="h-5 w-5" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Button>
                </div>


                {/* --- Render View dựa trên viewMode --- */}
                <AnimatePresence mode="wait">
                    {viewMode === 'text' ? (
                        <motion.div
                            key="text-view"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col flex-1 w-full h-full items-center justify-between p-4 md:p-6" // Đưa padding vào đây
                        >
                            {/* --- Text Chat Area --- */}
                            <ScrollArea className="w-full max-w-3xl flex-1 mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                                {conversation.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 px-4">
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}>
                                            <Mic className="w-16 h-16 mb-4 text-gray-400" />
                                        </motion.div>
                                        <p className="text-lg font-medium">Bắt đầu trò chuyện</p>
                                        <p className="text-sm mt-1">Nhấn nút micro bên dưới hoặc chuyển sang chế độ Voice.</p>
                                    </div>
                                )}
                                {conversation.map(renderMessage)}
                                <div ref={chatEndRef} />
                            </ScrollArea>

                            {/* --- Control Area (Text Mode) --- */}
                            <div className="flex flex-col items-center w-full max-w-md">
                                {/* Mode Toggle */}
                                <div className="flex items-center space-x-2 mb-3">
                                    <Label htmlFor="mode-switch-text" className={cn("text-sm", currentMode === 'stt' ? 'text-blue-600 font-semibold' : 'text-gray-500 dark:text-gray-400')}>
                                        STT Mode
                                    </Label>
                                    <Switch
                                        id="mode-switch-text"
                                        checked={currentMode === 'audio_understanding'}
                                        onCheckedChange={(checked) => setCurrentMode(checked ? 'audio_understanding' : 'stt')}
                                        disabled={disabledControls}
                                    />
                                    <Label htmlFor="mode-switch-text" className={cn("text-sm", currentMode === 'audio_understanding' ? 'text-purple-600 font-semibold' : 'text-gray-500 dark:text-gray-400')}>
                                        <BrainCircuit className="inline h-4 w-4 mr-1" /> Audio Mode
                                    </Label>
                                </div>

                                {/* TTS Preference Toggle */}
                                <div className="flex items-center space-x-2 mb-4">
                                    <Label htmlFor="tts-switch-text" className={cn("text-xs", ttsPreference === 'browser' ? 'text-blue-600 font-semibold' : 'text-gray-500 dark:text-gray-400')}>
                                        Browser TTS
                                    </Label>
                                    <Switch
                                        id="tts-switch-text"
                                        checked={ttsPreference === 'google'}
                                        onCheckedChange={(checked) => setTtsPreference(checked ? 'google' : 'browser')}
                                        disabled={disabledControls}
                                    />
                                    <Label htmlFor="tts-switch-text" className={cn("text-xs", ttsPreference === 'google' ? 'text-green-600 font-semibold' : 'text-gray-500 dark:text-gray-400')}>
                                        Google Cloud TTS
                                    </Label>
                                </div>

                                {/* Status Indicator */}
                                <div className="h-6 mb-2 text-sm text-gray-600 dark:text-gray-400 transition-opacity duration-300" style={{ opacity: (isListening || isProcessing || isSpeaking) ? 1 : 0.7 }}>
                                    {isListening && (currentMode === 'stt' ? "Đang nghe..." : "Đang ghi âm...")}
                                    {isProcessing && "Đang xử lý..."}
                                    {isSpeaking && "Bot đang nói..."}
                                    {!isListening && !isProcessing && !isSpeaking && (currentMode === 'stt' ? "Nhấn để nói" : "Nhấn để ghi âm")}
                                </div>

                                {/* Microphone Button (Text Mode) */}
                                <motion.div whileTap={{ scale: 0.9 }}>
                                    <Button
                                        onClick={toggleListening}
                                        disabled={isProcessing || isSpeaking}
                                        size="lg"
                                        className={cn(
                                            "rounded-full w-16 h-16 p-0 flex items-center justify-center shadow-lg transition-all duration-200",
                                            isListening
                                                ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                                                : "bg-blue-600 hover:bg-blue-700 text-white",
                                            (isProcessing || isSpeaking) && "bg-gray-400 cursor-not-allowed opacity-60"
                                        )}
                                        aria-label={isListening ? "Dừng" : (currentMode === 'stt' ? "Bắt đầu nói" : "Bắt đầu ghi âm")}
                                    >
                                        <AnimatePresence mode="wait">
                                            {isProcessing ? (
                                                <motion.div key="loader-text" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Loader2 className="h-6 w-6 animate-spin" /></motion.div>
                                            ) : isListening ? (
                                                <motion.div key="stop-text" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><StopCircle className="h-7 w-7" /></motion.div>
                                            ) : (
                                                <motion.div key="mic-text" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Mic className="h-7 w-7" /></motion.div>
                                            )}
                                        </AnimatePresence>
                                    </Button>
                                </motion.div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="voice-view"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col flex-1 w-full h-full items-center justify-center" // Voice view chiếm toàn bộ không gian
                        >
                            {/* --- Voice Animation View --- */}
                            <VoiceAnimationView
                                isListening={isListening}
                                isProcessing={isProcessing}
                                isSpeaking={isSpeaking}
                                currentMode={currentMode}
                                lastBotMessage={lastBotMessage}
                                lastUserMessage={lastUserMessage}
                                onToggleListening={toggleListening}
                                currentTtsPreference={ttsPreference}
                                onTtsPreferenceChange={(checked) => setTtsPreference(checked ? 'google' : 'browser')}
                                onModeChange={(checked) => setCurrentMode(checked ? 'audio_understanding' : 'stt')}
                                disabledControls={disabledControls}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
      </Suspense> // Close Suspense
    );
}
