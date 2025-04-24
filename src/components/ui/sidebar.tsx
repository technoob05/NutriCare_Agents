import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, Settings, HelpCircle, Utensils, Menu, X, FileUp, Home, Trash2, ChevronLeft, ChevronRight, Mic, Camera } from 'lucide-react'; // Added Mic, Camera, ChevronLeft/Right
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

// Define the structure for a chat history item
interface ChatHistoryItem {
    id: number;
    title: string;
    timestamp: number;
    preferences?: string;
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
    const [currentSources, setCurrentSources] = useState<{ files: File[], link: string }>({ files: [], link: '' });
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeChatId = searchParams.get('id');

    // --- Grouping Logic ---
    const groupChatHistoryByDate = (history: ChatHistoryItem[]) => {
        const groups: { [key: string]: ChatHistoryItem[] } = {
            "Hôm nay": [],
            "Hôm qua": [],
            "7 ngày trước": [],
            "Cũ hơn": [],
        };
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);

        history.forEach(chat => {
            const chatDate = new Date(chat.timestamp);
            if (chatDate >= today) {
                groups["Hôm nay"].push(chat);
            } else if (chatDate >= yesterday) {
                groups["Hôm qua"].push(chat);
            } else if (chatDate >= sevenDaysAgo) {
                groups["7 ngày trước"].push(chat);
            } else {
                groups["Cũ hơn"].push(chat);
            }
        });

        // Remove empty groups
        Object.keys(groups).forEach(key => {
            if (groups[key].length === 0) {
                delete groups[key];
            }
        });

        return groups;
    };

    const groupedChatHistory = useMemo(() => groupChatHistoryByDate(chatHistory), [chatHistory]);

    // Set initial sidebar state based on screen size, but still allow users to toggle
    useEffect(() => {
        if (isMobile) {
            setIsOpen(false);
        }
    }, [isMobile]);

    // Function to load chat list metadata from localStorage
    const loadChatList = useCallback(() => {
        const storedList = localStorage.getItem('chatHistoryList');
        if (storedList) {
            try {
                const parsedList = JSON.parse(storedList).map((item: any) => ({
                    ...item,
                    timestamp: Number(item.timestamp) || 0
                }));
                setChatHistory(parsedList.sort((a: ChatHistoryItem, b: ChatHistoryItem) => b.timestamp - a.timestamp));
            } catch (e) {
                console.error("Failed to parse chat history list:", e);
                localStorage.removeItem('chatHistoryList');
                setChatHistory([]);
            }
        } else {
            setChatHistory([]);
        }
    }, []);

    // Load chat list on initial mount and when sidebar opens
    useEffect(() => {
        loadChatList();
    }, [loadChatList, isOpen]);

    // Save chat list metadata to localStorage
    const saveChatHistoryList = (newList: ChatHistoryItem[]) => {
        const sortedList = newList.sort((a, b) => b.timestamp - a.timestamp);
        localStorage.setItem('chatHistoryList', JSON.stringify(sortedList));
        setChatHistory(sortedList);
    };

    const toggleSidebar = useCallback(() => {
        setIsOpen((prev) => !prev);
    }, []);

    const handleNewChat = () => {
        const now = Date.now();
        const newChat: ChatHistoryItem = {
            id: now,
            title: newChatTitle || `Chat ${new Date(now).toLocaleString()}`,
            timestamp: now,
            preferences: preferences
        };
        saveChatHistoryList([newChat, ...chatHistory]);
        localStorage.setItem(`chatMessages_${newChat.id}`, JSON.stringify([]));
        setNewChatTitle('');
        setPreferences('');
        setCurrentSources({ files: [], link: '' });
        window.location.href = `/chat?id=${newChat.id}`;
        toast({ title: "Đã tạo cuộc trò chuyện mới", description: `"${newChat.title}"` });
        if (isMobile) setIsOpen(false);
    };

    const clearChatHistory = () => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa tất cả lịch sử trò chuyện không?")) {
            return;
        }
        localStorage.removeItem('chatHistoryList');
        chatHistory.forEach(chat => {
            localStorage.removeItem(`chatMessages_${chat.id}`);
        });
        setChatHistory([]);
        toast({ title: "Lịch sử trò chuyện đã được xóa" });
        window.location.href = '/chat';
    };

    const handleDeleteChat = (chatIdToDelete: number, event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        if (!window.confirm(`Bạn có chắc chắn muốn xóa cuộc trò chuyện này không?`)) {
            return;
        }

        console.log("Deleting chat:", chatIdToDelete);
        const updatedList = chatHistory.filter(chat => chat.id !== chatIdToDelete);
        saveChatHistoryList(updatedList);
        localStorage.removeItem(`chatMessages_${chatIdToDelete}`);
        toast({ title: "Đã xóa cuộc trò chuyện" });

        if (activeChatId === chatIdToDelete.toString()) {
            router.push('/chat');
        }
    };

    const handleSourcesAdded = (sources: { files: File[], link: string }) => {
        console.log("Sources added:", sources);
        setCurrentSources(sources);
    };

    return (
        <>
            {/* Modern Toggle Button - Always visible, outside sidebar container */}
            <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className={`
                    fixed top-4 z-50 rounded-full bg-background shadow-md border hover:shadow-lg transition-all
                    ${isOpen ? 'left-[276px]' : 'left-4'}
                `}
                aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
            >
                {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>

            {/* Sidebar Container with adjusted positioning to not overlay the toggle */}
            <div className={`
                flex h-full flex-col border-r bg-background transition-all duration-300 ease-in-out
                ${isMobile ? 'fixed top-0 left-0 z-40' : 'relative'}
                ${isOpen ? 'translate-x-0 w-72' : 'translate-x-[-100%] w-0 opacity-0 pointer-events-none'}
                {/* Removed redundant lg: prefixed classes */}
            `}>
                {/* Header - With padding to not overlap with toggle */}
                <div className="flex h-16 items-center justify-between border-b px-4 flex-shrink-0 pl-14">
                    <div className="flex items-center space-x-2">
                        <Utensils className="h-6 w-6" />
                        <h1 className="text-lg font-semibold">NutriCare Agents</h1>
                    </div>
                    <ThemeToggle />
                </div>

                {/* Top Actions Area */}
                <div className="p-4 space-y-3 border-b flex-shrink-0">
                    <Button onClick={handleNewChat} className="w-full">
                        <Plus className="mr-2 h-4 w-4" />
                        Cuộc trò chuyện mới
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => setIsAddSourceDialogOpen(true)}>
                        <FileUp className="mr-2 h-4 w-4" />
                        Thêm nguồn (Tài liệu/Link)
                    </Button>
                    {(currentSources.files.length > 0 || currentSources.link) && (
                        <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                            Nguồn hiện tại: {currentSources.files.length} file(s), {currentSources.link ? '1 link' : '0 links'}.
                            <Button variant="link" size="sm" className="h-auto p-0 ml-1 text-xs" onClick={() => setCurrentSources({ files: [], link: '' })}>Xóa</Button>
                        </div>
                    )}
                </div>

                {/* Main Content Area (Chat History) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    <Link href="/" passHref>
                        <Button variant="ghost" className="w-full justify-start">
                            <Home className="mr-2 h-4 w-4" />
                            Trang chủ
                        </Button>
                    </Link>

                    {/* Add Voice Chat Link */}
                    <Link href="/voice" passHref>
                        <Button variant="ghost" className="w-full justify-start">
                            <Mic className="mr-2 h-4 w-4" />
                            Chat bằng giọng nói
                        </Button>
                    </Link>

                    {/* Add Recognize Meal Link */}
                    <Link href="/recognize-meal" passHref>
                        <Button variant="ghost" className="w-full justify-start">
                            <Camera className="mr-2 h-4 w-4" />
                            Nhận diện món ăn
                        </Button>
                    </Link>

                    {/* Add AI Explainer Link */}
                    <Link href="/ai-explainer" passHref>
                        <Button variant="ghost" className="w-full justify-start">
                            {/* You might want to choose a more specific icon */}
                            <HelpCircle className="mr-2 h-4 w-4" /> 
                            AI Explainer
                        </Button>
                    </Link>

                    {/* Add Pantry Tracker Link */}
                    <Link href="/pantry-tracker" passHref>
                        <Button variant="ghost" className="w-full justify-start">
                            {/* You might want to choose a more specific icon */}
                            <Utensils className="mr-2 h-4 w-4" /> 
                            Pantry Tracker
                        </Button>
                    </Link>

                    {/* Chat History Section - Now Grouped */}
                    {chatHistory.length === 0 && (
                        <p className="text-sm text-muted-foreground px-3 py-2">Chưa có cuộc trò chuyện nào.</p>
                    )}
                    {Object.entries(groupedChatHistory).map(([groupTitle, chats]) => (
                        <div key={groupTitle} className="pt-2">
                            <h2 className="text-xs font-semibold text-muted-foreground px-3 mb-1 uppercase tracking-wider">{groupTitle}</h2>
                            <div className="space-y-1">
                                {chats.map((chat) => {
                                    const isActive = activeChatId === chat.id.toString();
                                    const chatDate = new Date(chat.timestamp);
                                    const timeAgo = Math.round((Date.now() - chat.timestamp) / (1000 * 60));
                                    let displayTime = `${timeAgo} phút trước`;
                                    if (timeAgo >= 60) {
                                        const hoursAgo = Math.round(timeAgo / 60);
                                        displayTime = `${hoursAgo} giờ trước`;
                                        if (hoursAgo >= 24) {
                                            displayTime = chatDate.toLocaleDateString('vi-VN');
                                        }
                                    }
                                    if (timeAgo < 1) displayTime = "Vừa xong";

                                    return (
                                        <Link key={chat.id} href={`/chat?id=${chat.id}`} passHref className="block group relative">
                                            <Button
                                                variant={isActive ? "secondary" : "ghost"}
                                                className="w-full justify-between h-auto py-1.5 px-2 text-left"
                                            >
                                                <div className="flex items-center overflow-hidden">
                                                    <MessageSquare className="mr-2 h-4 w-4 flex-shrink-0" />
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="truncate text-sm font-medium">{chat.title}</span>
                                                        <span className="text-xs text-muted-foreground">{displayTime}</span>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive"
                                                    onClick={(e) => handleDeleteChat(chat.id, e)}
                                                    aria-label="Xóa cuộc trò chuyện"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </Button>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Activity Section */}
                <div className="border-t p-4 space-y-1 flex-shrink-0">
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

                    <Dialog open={isHelpDialogOpen} onOpenChange={setIsHelpDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start">
                                <HelpCircle className="mr-2 h-4 w-4" />
                                Trợ giúp & Hỗ trợ
                            </Button>
                        </DialogTrigger>
                        <HelpDialog open={isHelpDialogOpen} onOpenChange={setIsHelpDialogOpen} />
                    </Dialog>

                    {/* Clear Chat History Button */}
                    {chatHistory.length > 0 && (
                        <Button 
                            variant="ghost" 
                            className="w-full justify-start text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                            onClick={clearChatHistory}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Xóa tất cả cuộc trò chuyện
                        </Button>
                    )}
                </div>
            </div>

            {/* Render the Add Source Dialog */}
            <AddSourceDialog
                open={isAddSourceDialogOpen}
                onOpenChange={setIsAddSourceDialogOpen}
                onSourcesAdded={handleSourcesAdded}
            />

            {/* Overlay for when sidebar is open on mobile */}
            {isMobile && isOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/30 lg:hidden"
                    onClick={toggleSidebar}
                ></div>
            )}

            {/* Content margin spacer - Now simpler implementation */}
            <div className={`
                fixed top-0 left-0 h-16 w-16 z-30 pointer-events-none
                transition-all duration-300 ease-in-out 
                ${isOpen ? 'ml-72' : 'ml-0'}
                lg:ml-${isOpen ? '72' : '0'}
            `}></div>
            
            {/* Just the toggle button remains visible when sidebar is closed */}
        </>
    );
}
