
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
import { SendHorizontal, Lightbulb, ChefHat } from 'lucide-react'; // Updated icons
import { Sidebar } from '@/components/ui/sidebar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, Info, AlertCircle } from 'lucide-react'; // More icons

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
        { id: 0, text: "Welcome! Share your preferences and let's plan your meal.", type: "system" }
    ]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

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

    const handleFeedbackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
                `Suggested modifications:
${JSON.stringify(modifications, null, 2)}`,
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


    return (
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
            <Sidebar />

            <div className="flex flex-col flex-grow overflow-hidden">
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
                            <Textarea
                                className="flex-grow resize-none text-sm"
                                placeholder="e.g., vegetarian, loves spicy food, low carb..."
                                value={preferences}
                                onChange={handlePreferenceChange}
                                rows={1} />
                            <Button onClick={generateMenu} disabled={isLoading} size="sm">
                                {isLoading ? 'Generating...' : 'Generate Menu' }
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
                                        className={`max-w-xl lg:max-w-2xl p-3 rounded-lg shadow-sm ${message.type === 'user'
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
                      <div className="max-w-4xl mx-auto">
                           {menuResponseData?.menu && (
                               <div className="flex items-center gap-2">
                                    <Textarea
                                         placeholder={menuModifications ? "Menu modified. Generate new or clear..." : "Share your feedback..."}
                                         value={feedback}
                                         onChange={handleFeedbackChange}
                                         rows={1}
                                         className="flex-grow resize-none rounded-full px-4 py-2 border text-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                                         disabled={isLoading || !!menuModifications}
                                         onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isLoading && feedback.trim() && !menuModifications) { e.preventDefault(); suggestModifications(); } }} />
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
