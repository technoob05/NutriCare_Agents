
// src/components/Sidebar.tsx (Updated)
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, Settings, HelpCircle, History, Utensils, Menu, X, Trash2, FileUp, Home, Mic } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HealthInformationForm } from '@/components/HealthInformationForm';
import { AddSourceDialog } from '@/components/AddSourceDialog';
import { SettingsDialogContent, SpeechSettings } from '@/components/SettingsDialogContent';
import { HelpDialog } from '@/components/HelpDialog';

interface ChatHistoryItem {
    id: number;
    title: string;
    preferences: string;
}

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
    const [isAddSourceDialogOpen, setIsAddSourceDialogOpen] = useState(false);
    const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);

    // State to store added sources (optional, depends on how you use them)
    const [currentSources, setCurrentSources] = useState<{ files: File[], link: string }>({ files: [], link: '' });

    useEffect(() => {
        if (isMobile) {
            setIsOpen(false);
        } else {
            setIsOpen(true);
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
        setNewChatTitle('New Chat'); // Reset for next potential chat
        setPreferences('');
        setCurrentSources({ files: [], link: '' }); // Reset sources for the new chat
        // TODO: Navigate to the new chat interface/route
        toast({ title: "Đã tạo cuộc trò chuyện mới", description: `"${newChat.title}"` });
        if (isMobile) setIsOpen(false); // Close sidebar on mobile after creating chat
    };

    const clearChatHistory = () => {
        // Optional: Add a confirmation dialog before clearing
        localStorage.removeItem('chatHistory');
        setChatHistory([]);
        toast({ title: "Lịch sử trò chuyện đã được xóa" });
    };

    // Callback function to receive data from AddSourceDialog
    const handleSourcesAdded = (sources: { files: File[], link: string }) => {
        console.log("Sources added:", sources);
        // You can now use these sources, e.g., store them in state,
        // associate them with the current chat, or trigger an upload process.
        setCurrentSources(sources);
        // Example: Displaying a summary toast (already handled in AddSourceDialog, but you can add more logic here)
        // toast({
        //     title: "Sources Ready",
        //     description: `${sources.files.length} file(s) and ${sources.link ? '1 link' : '0 links'} ready for use.`,
        // });
    };

    return (
        <>
            {/* Sidebar Container - Button will be moved inside */}
            {/* Use conditional rendering for mobile instead of just width 0 to prevent layout shifts */}
            <div className={`
                flex h-full flex-col border-r bg-background transition-transform duration-300 ease-in-out
                ${isMobile ? 'fixed top-0 left-0 z-40' : 'relative'}
                ${isOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'}
                lg:relative lg:translate-x-0 lg:w-72 lg:flex
            `}>
                {/* Mobile Toggle Button - Moved Inside */}
                {isMobile && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleSidebar}
                        // Position absolutely relative to the sidebar container
                        className="absolute top-4 right-4 z-50 lg:hidden"
                    >
                        {/* Icon remains the same, but now it's inside the sliding container */}
                        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                    </Button>
                )}
                {/* Header */}
                <div className="flex h-16 items-center justify-between border-b px-4 flex-shrink-0">
                    <div className="flex items-center space-x-2">
                        <Utensils className="h-6 w-6" />
                        <h1 className="text-lg font-semibold">NutriCare Agents</h1>
                    </div>
                    <ThemeToggle />
                    {/* Close button for mobile inside header */}
                    {isMobile && isOpen && (
                         <Button variant="ghost" size="icon" onClick={toggleSidebar} className="lg:hidden">
                             <X className="h-4 w-4" />
                         </Button>
                    )}
                </div>

                {/* Top Actions Area */}
                <div className="p-4 space-y-3 border-b flex-shrink-0">
                     {/* New Chat Button - More prominent */}
                     <Button onClick={handleNewChat} className="w-full">
                        <Plus className="mr-2 h-4 w-4" />
                        Cuộc trò chuyện mới
                    </Button>
                    {/* Add Source Button */}
                    <Button variant="outline" className="w-full" onClick={() => setIsAddSourceDialogOpen(true)}>
                        <FileUp className="mr-2 h-4 w-4" />
                        Thêm nguồn (Tài liệu/Link)
                    </Button>
                    {/* Optional: Display current sources summary */}
                    { (currentSources.files.length > 0 || currentSources.link) && (
                        <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                            Nguồn hiện tại: {currentSources.files.length} file(s), {currentSources.link ? '1 link' : '0 links'}.
                            <Button variant="link" size="sm" className="h-auto p-0 ml-1 text-xs" onClick={() => setCurrentSources({ files: [], link: '' })}>Xóa</Button>
                        </div>
                    )}
                </div>


                {/* Main Content Area (Chat History) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {/* Home Link */}
                    <Link href="/" passHref>
                       <Button variant="ghost" className="w-full justify-start">
                           <Home className="mr-2 h-4 w-4" />
                           Trang chủ
                       </Button>
                    </Link>

                    {/* Recent Chats Section */}
                    <h2 className="text-sm font-semibold text-muted-foreground pt-2">Gần đây</h2>
                    <div className="space-y-1">
                        {chatHistory.length === 0 && (
                            <p className="text-sm text-muted-foreground px-3 py-2">Chưa có cuộc trò chuyện nào.</p>
                        )}
                        {chatHistory.map((chat) => (
                            // Wrap with Link to navigate to the specific chat page
                            <Link key={chat.id} href={`/chat/${chat.id}`} passHref>
                                <Button variant="ghost" className="w-full justify-start truncate">
                                    <MessageSquare className="mr-2 h-4 w-4 flex-shrink-0" />
                                    <span className="truncate">{chat.title}</span>
                                    {/* TODO: Add delete/rename options on hover/focus */}
                                </Button>
                            </Link>
                        ))}
                    </div>

                     {/* Removed New Chat Title/Preferences Inputs - Handled by New Chat button */}
                     {/* Removed RAG Input Section - Handled by Add Source Dialog */}
                </div>

                {/* Footer Activity Section */}
                <div className="border-t p-4 space-y-1 flex-shrink-0">
                    {/* Settings Dialog */}
                    <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start">
                                <Settings className="mr-2 h-4 w-4" />
                                Cài đặt
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                             <DialogHeader>
                                <DialogTitle>Cài đặt (Settings)</DialogTitle>
                                <DialogDescription>
                                    Quản lý thông tin sức khỏe và cấu hình AI của bạn.
                                </DialogDescription>
                            </DialogHeader>
                            <Tabs defaultValue="ai-config" className="mt-4">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="ai-config">Cấu hình AI</TabsTrigger>
                                    <TabsTrigger value="health-info">Thông tin sức khỏe</TabsTrigger>
                                    <TabsTrigger value="speech">Speech</TabsTrigger>
                                </TabsList>
                                <TabsContent value="ai-config" className="mt-4">
                                    <SettingsDialogContent />
                                </TabsContent>
                                <TabsContent value="health-info" className="mt-4">
                                    <HealthInformationForm />
                                </TabsContent>
                                <TabsContent value="speech" className="mt-4">
                                    <SpeechSettings />
                                </TabsContent>
                            </Tabs>
                        </DialogContent>
                    </Dialog>

                    {/* Help Button */}
                    <Dialog open={isHelpDialogOpen} onOpenChange={setIsHelpDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start">
                                <HelpCircle className="mr-2 h-4 w-4" />
                                Trợ giúp & Hỗ trợ
                            </Button>
                        </DialogTrigger>
                        <HelpDialog open={isHelpDialogOpen} onOpenChange={setIsHelpDialogOpen} />
                    </Dialog>
                </div>
            </div >

            {/* Render the Add Source Dialog */}
            <AddSourceDialog
                open={isAddSourceDialogOpen}
                onOpenChange={setIsAddSourceDialogOpen}
                onSourcesAdded={handleSourcesAdded}
            />

            {/* Overlay for mobile when sidebar is open */}
            {isMobile && isOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/30 lg:hidden"
                    onClick={toggleSidebar} // Close sidebar when clicking overlay
                ></div>
            )}
        </>
    );
}
