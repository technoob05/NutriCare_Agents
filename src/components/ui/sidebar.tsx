'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, Settings, HelpCircle, History, Utensils, Menu, X, Trash2, FileUp, Link } from 'lucide-react'; // Updated icons
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

interface ChatHistoryItem {
    id: number;
    title: string;
    preferences: string;
}

export function Sidebar() {
    const [isOpen, setIsOpen] = useState(true);
    const isMobile = useIsMobile();
    const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
    const [newChatTitle, setNewChatTitle] = useState<string>('New Chat');
    const [preferences, setPreferences] = useState<string>('');
    const { toast } = useToast();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [pastedLink, setPastedLink] = useState<string>('');

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
            title: newChatTitle || 'New Chat',
            preferences: preferences
        };
        saveChatHistory([newChat, ...chatHistory]);
        setNewChatTitle('New Chat');
        setPreferences('');
        // TODO: Navigate to the new chat
    };

    const clearChatHistory = () => {
        localStorage.removeItem('chatHistory');
        setChatHistory([]);
    };

    // File Upload Handlers
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            toast({
                title: "File Selected",
                description: `File ${file.name} selected for RAG.`,
            });
        }
    };

    const handleLinkPaste = () => {
        if (pastedLink) {
            toast({
                title: "Link Added",
                description: `Link ${pastedLink} added for RAG.`,
            });
        }
    };


    return (
        <>
            {/* Mobile Toggle Button */}
            {isMobile && (
                <Button
                    onClick={toggleSidebar}
                    variant="outline"
                    size="icon"
                    className={`md:hidden fixed top-2 left-2 z-50 transition-transform ${isOpen ? 'translate-x-64' : 'translate-x-0'}`}
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
                    <div className="space-y-2">
                        <Input
                            type="text"
                            placeholder="Chat Title"
                            value={newChatTitle}
                            onChange={(e) => setNewChatTitle(e.target.value)}
                            className="w-full text-sm"
                        />
                        <Textarea
                            placeholder="Preferences for new chat"
                            value={preferences}
                            onChange={(e) => setPreferences(e.target.value)}
                            className="w-full text-sm resize-none"
                            rows={2}
                        />
                        <Button className="w-full justify-start gap-2" variant="secondary" onClick={handleNewChat}>
                            <Plus className="h-4 w-4" /> New Chat
                        </Button>
                    </div>
                </div>

                {/* RAG Input Section */}
                <div className="mb-4">
                    <h2 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Add Context</h2>
                    <div className="space-y-2">
                        <div>
                            <Input
                                type="file"
                                accept=".txt,.pdf,.docx"
                                onChange={handleFileSelect}
                                ref={fileInputRef}
                                className="hidden"
                                id="file-upload"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start gap-2"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <FileUp className="h-4 w-4" /> Upload File
                            </Button>
                            {selectedFile && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {selectedFile.name}
                                </p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Input
                                type="url"
                                placeholder="Paste Link"
                                value={pastedLink}
                                onChange={(e) => setPastedLink(e.target.value)}
                                className="flex-grow text-sm"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleLinkPaste}
                                className="shrink-0"
                            >
                                <Link className="h-4 w-4" /> Add
                            </Button>
                        </div>
                    </div>
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
