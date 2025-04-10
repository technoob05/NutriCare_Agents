'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    generateMenuFromPreferences,
    GenerateMenuFromPreferencesOutput,
    StepTrace,
} from '@/ai/flows/generate-menu-from-preferences';
import { suggestMenuModificationsBasedOnFeedback } from '@/ai/flows/suggest-menu-modifications-based-on-feedback';
import { InteractiveMenu } from '@/components/ui/interactive-menu';
import { AgentProcessVisualizer } from '@/components/ui/agent-process-visualizer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SendHorizontal, Lightbulb, ChefHat, Mic, Volume2, StopCircle } from 'lucide-react'; // Updated icons
import { Sidebar } from '@/components/ui/sidebar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, Info, AlertCircle } from 'lucide-react'; // More icons
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input"
import {motion} from 'framer-motion'; // animation
import { useIsMobile } from '@/hooks/use-mobile'; //Check Mobile

interface ChatMessage {
    id: number;
    text: string;
    type: 'user' | 'bot' | 'component' | 'error' | 'system' | 'trace_display';
    traceData?: StepTrace[];
}

const HomePage = () => {
    const [preferences, setPreferences] = useState<string>('');
    const [menuType, setMenuType] = useState<'daily' | 'weekly'>('daily');
    const [menuResponseData, setMenuResponseData] =
        useState<GenerateMenuFromPreferencesOutput | null>(null);
    const [feedback, setFeedback] = useState<string>('');
    const [menuModifications, setMenuModifications] = useState<any>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        { id: 0, text: "Chào bạn! Tôi sẽ giúp bạn tạo thực đơn ăn uống lành mạnh. Bạn muốn bắt đầu bằng cách nào?", type: "system" }
    ]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isFeedbackListening, setIsFeedbackListening] = useState(false);
    const isMobile = useIsMobile();
    const recognition = useRef<SpeechRecognition | null>(null);
    const feedbackRecognition = useRef<SpeechRecognition | null>(null);
    const synth = useRef(window.speechSynthesis);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            //Initialize Preferences Speech Recognition
            if ('webkitSpeechRecognition' in window) {
                recognition.current = new (window as any).webkitSpeechRecognition();
                recognition.current.continuous = false;
                recognition.current.interimResults = false;

                recognition.current.onstart = () => {
                    setIsListening(true);
                    toast({
                        title: "Voice Input Started",
                        description: "Speak now to input your preferences."
                    });
                };

                recognition.current.onresult = (event: SpeechRecognitionEvent) => {
                    const transcript = Array.from(event.results)
                        .map(result => result[0])
                        .map(result => result.transcript)
                        .join('');
                    setPreferences(transcript);
                    setIsListening(false);
                };

                recognition.current.onend = () => {
                    setIsListening(false);
                    toast({
                        title: "Voice Input Ended",
                        description: "Your preferences have been recorded."
                    });
                };

                recognition.current.onerror = (event: SpeechRecognitionErrorEvent) => {
                    setIsListening(false);
                    toast({
                        variant: "destructive",
                        title: "Speech Recognition Error",
                        description: `Error: ${event.error}`
                    });
                };
            } else {
                toast({
                    variant: "destructive",
                    title: "Speech Recognition Not Supported",
                    description: "Your browser does not support speech recognition."
                });
            }

            // Initialize Feedback Speech Recognition
            if ('webkitSpeechRecognition' in window) {
                feedbackRecognition.current = new (window as any).webkitSpeechRecognition();
                feedbackRecognition.current.continuous = false;
                feedbackRecognition.current.interimResults = false;

                feedbackRecognition.current.onstart = () => {
                    setIsFeedbackListening(true);
                    toast({
                        title: "Feedback Voice Input Started",
                        description: "Speak now to input your feedback."
                    });
                };

                feedbackRecognition.current.onresult = (event: SpeechRecognitionEvent) => {
                    const transcript = Array.from(event.results)
                        .map(result => result[0])
                        .map(result => result.transcript)
                        .join('');
                    setFeedback(transcript);
                    setIsFeedbackListening(false);
                };

                feedbackRecognition.current.onend = () => {
                    setIsFeedbackListening(false);
                    toast({
                        title: "Feedback Voice Input Ended",
                        description: "Your feedback has been recorded."
                    });
                };

                feedbackRecognition.current.onerror = (event: SpeechRecognitionErrorEvent) => {
                    setIsFeedbackListening(false);
                    toast({
                        variant: "destructive",
                        title: "Feedback Speech Recognition Error",
                        description: `Error: ${event.error}`
                    });
                };
            } else {
                toast({
                    variant: "destructive",
                    title: "Speech Recognition Not Supported",
                    description: "Your browser does not support speech recognition."
                });
            }


            return () => {
                if (recognition.current) {
                    recognition.current.onstart = null;
                    recognition.current.onresult = null;
                    recognition.current.onend = null;
                    recognition.current.onerror = null;
                }
                if (feedbackRecognition.current) {
                     feedbackRecognition.current.onstart = null;
                     feedbackRecognition.current.onresult = null;
                     feedbackRecognition.current.onend = null;
                     feedbackRecognition.current.onerror = null;
                 }
                if (synth.current) {
                    synth.current.cancel();
                }
            };
        }
    }, [toast]);

    const handleSpeechRecognition = () => {
        if (recognition.current) {
            if (isListening) {
                recognition.current.stop();
                setIsListening(false);
                toast({
                    title: "Voice Input Stopped",
                    description: "Speech recognition stopped manually."
                });
            } else {
                recognition.current.start();
            }
        }
    };

     const handleFeedbackSpeechRecognition = () => {
           if (feedbackRecognition.current) {
               if (isFeedbackListening) {
                   feedbackRecognition.current.stop();
                   setIsFeedbackListening(false);
                   toast({
                       title: "Feedback Voice Input Stopped",
                       description: "Feedback speech recognition stopped manually."
                   });
               } else {
                   feedbackRecognition.current.start();
               }
           }
       };

    const handleTextToSpeech = useCallback((text: string) => {
        if (typeof window !== 'undefined') {
            if (synth.current) {
                synth.current.cancel(); // Stop any ongoing speech
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.onstart = () => setIsSpeaking(true);
                utterance.onend = () => setIsSpeaking(false);
                utterance.onerror = () => setIsSpeaking(false);
                synth.current.speak(utterance);
            }
        }
    }, [toast]);

    const stopTextToSpeech = () => {
        if (synth.current && isSpeaking) {
            synth.current.cancel();
            setIsSpeaking(false);
            toast({
                title: "Speech Synthesis Stopped",
                description: "Text-to-speech has been stopped."
            });
        }
    };

    const addMessage = (text: string, type: ChatMessage['type'], traceData?: StepTrace[]) => {
        const newMessage: ChatMessage = { id: Date.now(), text, type, traceData };
        setChatHistory((prev) => [...prev, newMessage]);
        return newMessage.id;
    };

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

    const handlePreferenceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setPreferences(e.target.value);
    };

    const handleFeedbackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFeedback(e.target.value);
    };

    const generateMenu = useCallback(async () => {
        if (!preferences.trim()) {
            addMessage('Preferences cannot be empty.', 'error');
            return;
        }
        setIsLoading(true);
        setMenuResponseData(null);
        setMenuModifications(null);
        setFeedback('');
        addMessage(`Generating a ${menuType} menu for: ${preferences}`, 'user');

        let response: GenerateMenuFromPreferencesOutput | null = null;
        try {
            response = await generateMenuFromPreferences({
                preferences: preferences,
                menuType: menuType,
            });
            setMenuResponseData(response);

            if (response?.trace) {
                addMessage('trace_display', 'trace_display', response.trace);
            }

            if (response?.menu) {
                addMessage('menu_component', 'component');
            } else {
                addMessage('No menu was generated.', 'system');
            }

        } catch (error: any) {
            console.error('Error generating menu:', error);
            addMessage(
                `Error generating menu: ${error.message || 'Unknown error'}`,
                'error'
            );
            if (response?.trace) {
                addMessage('trace_display_error', 'trace_display', response.trace);
            }
        } finally {
            setIsLoading(false);
        }
    }, [preferences, menuType]);

     const suggestModifications = useCallback(async () => {
        if (!feedback.trim()) {
            addMessage('Feedback is required.', 'error');
            return;
        }
        setIsLoading(true);
        addMessage(`Feedback: ${feedback}`, 'user');

        if (!menuResponseData?.menu) {
            addMessage('Cannot modify without a generated menu.', 'error');
            setIsLoading(false);
            return;
        }

        try {
            const modifications = await suggestMenuModificationsBasedOnFeedback({
                menu: JSON.stringify(menuResponseData.menu),
                feedback: feedback,
            });
            setMenuModifications(modifications);
            addMessage(
                `Suggested modifications:\n${JSON.stringify(modifications, null, 2)}`,
                'bot'
            );
            setFeedback('');
        } catch (error: any) {
            console.error('Error suggesting modifications:', error);
            addMessage(
                `Error suggesting modifications: ${error.message || 'Unknown error'}`,
                'error'
            );
        } finally {
            setIsLoading(false);
        }
    }, [menuResponseData, feedback]);

    const handleQuickReply = (reply: string) => {
        setPreferences(reply);
        generateMenu();
    };


    return (
        <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
            <Sidebar />

            <div className="flex flex-col overflow-hidden">
               {/* Top Section - Streamlined Input */}
               <Card className="m-4 rounded-lg shadow-md bg-white dark:bg-gray-800 overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-semibold"><ChefHat className="mr-2 inline-block h-5 w-5"/> Menu Preferences</CardTitle>
                        <CardDescription>Specify your dietary requirements and cuisine preferences.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <div className="flex gap-2">
                                <Button size="sm" variant={menuType === 'daily' ? 'default' : 'outline'} onClick={() => setMenuType('daily')}>Daily</Button>
                                <Button size="sm" variant={menuType === 'weekly' ? 'default' : 'outline'} onClick={() => setMenuType('weekly')}>Weekly</Button>
                            </div>
                            <div className="relative flex-grow">
                                <Textarea
                                    className="flex-grow resize-none text-sm pr-10"
                                    placeholder="e.g., vegetarian, loves spicy food, low carb..."
                                    value={preferences}
                                    onChange={handlePreferenceChange}
                                    rows={1} />
                                <Button
                                    onClick={handleSpeechRecognition}
                                    disabled={isLoading}
                                    size="icon"
                                    variant="ghost"
                                    className="absolute right-1 top-1/2 -translate-y-1/2"
                                    aria-label="Toggle Voice Input"
                                >
                                    {isListening ? <StopCircle className="h-5 w-5 text-red-500" /> : <Mic className="h-5 w-5" />}
                                </Button>
                            </div>
                            <Button onClick={generateMenu} disabled={isLoading} size="sm">
                                {isLoading ? 'Generating...' : 'Generate Menu' }
                            </Button>
                        </div>
                         {/* Quick Reply Buttons */}
                         <div className="flex flex-wrap gap-2 mt-2">
                              <Button size="xs" variant="outline" onClick={() => handleQuickReply("Gợi ý bữa sáng")}>
                                   Gợi ý bữa sáng
                              </Button>
                              <Button size="xs" variant="outline" onClick={() => handleQuickReply("Thực phẩm ít calo")}>
                                   Thực phẩm ít calo
                              </Button>
                              <Button size="xs" variant="outline" onClick={() => handleQuickReply("Món chay")}>
                                   Món chay
                              </Button>
                         </div>
                    </CardContent>
                </Card>

                <ScrollArea className="flex-grow p-4">
                    <div className="space-y-4 max-w-4xl mx-auto">
                        {isLoading && (
                            <Alert variant="default">
                                <Info className="h-4 w-4" />
                                <AlertTitle>Generating Menu</AlertTitle>
                                <AlertDescription>The AI is crafting your perfect menu. Please wait...</AlertDescription>
                            </Alert>
                        )}

                        {chatHistory.map((message) => (
                            <div
                                key={message.id}
                                className={`flex w-full ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {message.type === 'trace_display' && message.traceData ? (
                                    <AgentProcessVisualizer trace={message.traceData} />

                                ) : message.type === 'component' && message.text === 'menu_component' && menuResponseData?.menu ? (
                                    <div className="w-full">
                                        <InteractiveMenu menuData={{ menu: menuResponseData.menu, menuType: menuType, feedbackRequest: menuResponseData.feedbackRequest }} />
                                         <Button
                                              variant="outline"
                                              size="sm"
                                              className="mt-2"
                                              onClick={() => {
                                                if (menuResponseData?.menu) {
                                                  const menuText = JSON.stringify(menuResponseData.menu);
                                                  handleTextToSpeech(menuText);
                                                } else {
                                                  toast({
                                                    variant: "destructive",
                                                    title: "No Menu to Speak",
                                                    description: "Generate a menu first to enable text-to-speech."
                                                  });
                                                }
                                              }}
                                              disabled={isSpeaking}
                                            >
                                              {isSpeaking ? <StopCircle className="mr-2 h-4 w-4 animate-pulse" /> : <Volume2 className="mr-2 h-4 w-4" />}
                                              {isSpeaking ? "Stop Speaking" : "Read Menu"}
                                            </Button>
                                    </div>

                                ) : message.type === 'error' ? (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Error</AlertTitle>
                                        <AlertDescription>{message.text}</AlertDescription>
                                    </Alert>

                                ) : message.type === 'system' ? (
                                    <Alert variant="default">
                                        <CheckCircle className="h-4 w-4" />
                                        <AlertTitle>System Message</AlertTitle>
                                        <AlertDescription>{message.text}</AlertDescription>
                                    </Alert>
                                ) : (
                                    <div
                                        className={`max-w-full sm:max-w-md lg:max-w-2xl p-3 rounded-lg shadow-sm ${message.type === 'user'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                                            }`}
                                    >
                                        <pre className="whitespace-pre-wrap font-sans text-sm">
                                            {message.text}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                </ScrollArea>

                 {/* Input Area - More Aesthetically Pleasing */}
                 <div className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700 shrink-0">
                      <div className="max-w-full mx-auto flex flex-col md:flex-row gap-2 items-center">
                           {menuResponseData?.menu && (
                               <div className="flex items-center gap-2 w-full">
                                    <div className="relative flex-grow">
                                         <Input
                                              placeholder={menuModifications ? "Menu modified. Generate new or clear..." : "Share your feedback..."}
                                              value={feedback}
                                              onChange={handleFeedbackChange}
                                              className="flex-grow resize-none rounded-full px-4 py-2 border text-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 pr-10"
                                              disabled={isLoading || !!menuModifications}
                                              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isLoading && feedback.trim() && !menuModifications) { e.preventDefault(); suggestModifications(); } }} />
                                         <Button
                                              onClick={handleFeedbackSpeechRecognition}
                                              disabled={isLoading}
                                              size="icon"
                                              variant="ghost"
                                              className="absolute right-1 top-1/2 -translate-y-1/2"
                                              aria-label="Toggle Feedback Voice Input"
                                         >
                                              {isFeedbackListening ? <StopCircle className="h-5 w-5 text-red-500" /> : <Mic className="h-5 w-5" />}
                                         </Button>
                                    </div>
                                    <Button onClick={suggestModifications} disabled={isLoading || !feedback.trim() || !!menuModifications} size="icon" className="rounded-full" aria-label="Send Feedback">
                                         <SendHorizontal className="h-5 w-5" />
                                    </Button>
                               </div>
                           )}
                      </div>
                 </div>
            </div>
        </div>
    );
};

export default HomePage;
