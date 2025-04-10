'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, Settings, HelpCircle, History, Utensils, Menu, X, Trash2 } from 'lucide-react'; // Updated icons
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useIsMobile } from '@/hooks/use-mobile';

interface ChatHistoryItem {
    id: number;
    title: string;
}

export function Sidebar() {
    const [isOpen, setIsOpen] = useState(true);
    const isMobile = useIsMobile();
    const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);

    useEffect(() => {
        if (isMobile) {
            setIsOpen(false); // Initially close on mobile
        } else {
            setIsOpen(true); // Initially open on desktop
        }
    }, [isMobile]);

    useEffect(() => {
        const storedHistory = localStorage.getItem('chatHistory');
        if (storedHistory) {
            setChatHistory(JSON.parse(storedHistory));
        }
    }, []);

    const saveChatHistory = (newHistory: ChatHistoryItem[]) => {
        localStorage.setItem('chatHistory', JSON.stringify(newHistory));
        setChatHistory(newHistory);
    };


    const toggleSidebar = useCallback(() => {
        setIsOpen((prev) => !prev);
    }, []);

    const handleNewChat = () => {
        const newChat: ChatHistoryItem = {
            id: Date.now(),
            title: 'New Chat'
        };
        saveChatHistory([newChat, ...chatHistory]);
        // TODO: Navigate to the new chat
    };

    const clearChatHistory = () => {
        localStorage.removeItem('chatHistory');
        setChatHistory([]);
    };

    return (
        <>
            {/* Mobile Toggle Button */}
            {isMobile && (
                <Button
                    onClick={toggleSidebar}
                    variant="outline"
                    size="icon"
                    className={`md:hidden fixed top-2 left-2 z-30 ${isOpen ? '' : ''} transition-transform`}
                    aria-label="Toggle Sidebar"
                >
                    {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
            )}

            {/* Sidebar */}
            <div
                className={`flex flex-col h-full w-64 bg-gray-50 dark:bg-gray-800 p-4 border-r dark:border-gray-700 fixed top-0 left-0 z-40 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:flex md:w-64 md:static`}
            >
                <div className="mb-6">
                    <h1 className="text-xl font-semibold mb-4 dark:text-white flex items-center">
                        <Utensils className="h-6 w-6 mr-2 text-primary" /> Viet Menu AI
                    </h1>
                    <Button className="w-full justify-start gap-2" variant="secondary" onClick={handleNewChat}>
                        <Plus className="h-4 w-4" /> New Chat
                    </Button>
                </div>

                <div className="mb-6 flex-grow overflow-y-auto">
                    <h2 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Recent Chats</h2>
                    <ul className="space-y-1">
                        {chatHistory.map((chat) => (
                            <li key={chat.id}>
                                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sm truncate hover:bg-gray-200 dark:hover:bg-gray-700">
                                    <MessageSquare className="h-4 w-4" /> {chat.title}
                                </Button>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="mt-auto space-y-1">
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sm hover:bg-gray-200 dark:hover:bg-gray-700">
                        <History className="h-4 w-4" /> Activity
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sm hover:bg-gray-200 dark:hover:bg-gray-700">
                        <Settings className="h-4 w-4" /> Settings
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sm hover:bg-gray-200 dark:hover:bg-gray-700">
                        <HelpCircle className="h-4 w-4" /> Help &amp; Support
                    </Button>
                    <ThemeToggle />
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sm hover:bg-red-200 dark:hover:bg-red-700 text-red-600 dark:text-red-400" onClick={clearChatHistory}>
                        <Trash2 className="h-4 w-4" /> Clear Chat History
                    </Button>
                </div>
            </div>
        </>
    );
}
