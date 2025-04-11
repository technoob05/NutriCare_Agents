
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link'; // Import Link
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, Settings, HelpCircle, History, Utensils, Menu, X, Trash2, FileUp, Link as LinkIcon, Home, Mic } from 'lucide-react'; // Added Home, renamed Link to LinkIcon
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs components
import { HealthInformationForm } from '@/components/HealthInformationForm'; // Re-import HealthInformationForm
import { SettingsDialogContent ,SpeechSettings} from '@/components/SettingsDialogContent'; // Import the new component

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
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
                
                    {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                
            )}

            {/* Sidebar */}
            
                
                    
                        
                            Viet Menu AI
                        
                        
                            
                                
                                    Chat Title
                                
                                
                                    
                                
                                
                                    Preferences for new chat
                                
                                
                                    
                                
                                
                                    New Chat
                                
                            
                            
                                <Link href="/" passHref>
                                   
                                       Trang chủ
                                   
                                </Link>
                            
                        
                    

                    {/* RAG Input Section */}
                    
                        
                            Add Context
                        
                        
                            
                                
                                    
                                        Upload File
                                    
                                    {selectedFile && (
                                        
                                            {selectedFile.name}
                                        
                                    )}
                                
                                
                                    
                                    
                                        Paste Link
                                    
                                    
                                        
                                        
                                            Add
                                        
                                    
                                
                            
                        
                    

                    
                        
                            Recent Chats
                        
                        
                            {chatHistory.map((chat) => (
                                
                                    
                                        
                                            
                                                {chat.title}
                                            
                                        
                                    
                                
                            ))}
                        
                    

                    
                        
                            Activity
                        
                        
                            
                                Settings
                            
                            
                                
                                    
                                        Cài đặt (Settings)
                                    
                                    
                                        Quản lý thông tin sức khỏe và cấu hình AI của bạn.
                                    
                                
                                <Tabs defaultValue="ai-config" className="mt-4">
                                    
                                        
                                            Cấu hình AI
                                        
                                        
                                            Thông tin sức khỏe
                                        
                                         
                                             
                                                <SettingsDialogContent />
                                             
                                        
                                            
                                                <HealthInformationForm />
                                             
                                        
                                        
                                            Speech
                                        
                                            
                                                <SpeechSettings/>
                                            
                                    
                                
                                
                                

                            
                        
                        
                            Help &amp; Support
                        
                        
                            Clear Chat History
                        
                    
                
            
        </>
    );
}
