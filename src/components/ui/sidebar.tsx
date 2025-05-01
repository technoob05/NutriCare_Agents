import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation'; // Import usePathname
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, Settings, HelpCircle, Utensils, Menu, X, FileUp, Home, Trash2, ChevronLeft, ChevronRight, Mic, Camera } from 'lucide-react'; // Added Mic, Camera, ChevronLeft/Right
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils'; // Import cn utility
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

// Constants for localStorage keys
const CHAT_HISTORY_LIST_KEY = 'chatHistoryList';
const CHAT_MESSAGES_PREFIX = 'chatMessages_';
const CHAT_MOBI_HISTORY_LIST_KEY = 'chatMobiHistoryList';
const CHAT_MOBI_MESSAGES_PREFIX = 'chatMobiMessages_';


// Define the structure for a chat history item (for localStorage)
interface ChatHistoryItem {
    id: number;
    title: string;
    timestamp: number;
    preferences?: string;
}

// Removed SidebarProps interface

export function Sidebar() { // Removed props destructuring
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
    const pathname = usePathname(); // Get current pathname
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

    // Function to load chat list metadata from localStorage based on current path
    const loadChatList = useCallback(() => {
        const isMobi = pathname === '/chat-mobi';
        const listKey = isMobi ? CHAT_MOBI_HISTORY_LIST_KEY : CHAT_HISTORY_LIST_KEY;
        console.log(`Loading chat list from key: ${listKey}`); // Debug log
        const storedList = localStorage.getItem(listKey);
        if (storedList) {
            try {
                const parsedList = JSON.parse(storedList).map((item: any) => ({
                    ...item,
                    timestamp: Number(item.timestamp) || 0
                }));
                setChatHistory(parsedList.sort((a: ChatHistoryItem, b: ChatHistoryItem) => b.timestamp - a.timestamp));
            } catch (e) {
                console.error(`Failed to parse chat history list from ${listKey}:`, e);
                localStorage.removeItem(listKey);
                setChatHistory([]);
            }
        } else {
            console.log(`No chat list found for key: ${listKey}`); // Debug log
            setChatHistory([]);
        }
    }, [pathname]); // Depend on pathname

    // Load chat list on initial mount, when sidebar opens, or pathname changes
    useEffect(() => {
        loadChatList();
    }, [loadChatList, isOpen, pathname]);

    // Save chat list metadata to localStorage based on current path
    const saveChatHistoryList = (newList: ChatHistoryItem[]) => {
        const isMobi = pathname === '/chat-mobi';
        const listKey = isMobi ? CHAT_MOBI_HISTORY_LIST_KEY : CHAT_HISTORY_LIST_KEY;
        console.log(`Saving chat list to key: ${listKey}`); // Debug log
        const sortedList = newList.sort((a, b) => b.timestamp - a.timestamp);
        localStorage.setItem(listKey, JSON.stringify(sortedList));
        setChatHistory(sortedList); // Update local state as well
    };

    const toggleSidebar = useCallback(() => {
        setIsOpen((prev) => !prev);
    }, []);

    const handleNewChat = () => {
        const isMobi = pathname === '/chat-mobi';
        const messagesPrefix = isMobi ? CHAT_MOBI_MESSAGES_PREFIX : CHAT_MESSAGES_PREFIX;
        const targetPath = isMobi ? '/chat-mobi' : '/chat';

        const now = Date.now();
        const newChat: ChatHistoryItem = {
            id: now,
            title: newChatTitle || `Chat ${new Date(now).toLocaleString()}`,
            timestamp: now,
            preferences: preferences
        };
        // saveChatHistoryList already uses the correct key based on pathname
        saveChatHistoryList([newChat, ...chatHistory]);
        // Use the correct messages prefix
        localStorage.setItem(`${messagesPrefix}${newChat.id}`, JSON.stringify([])); // Start with empty messages
        setNewChatTitle('');
        setPreferences('');
        setCurrentSources({ files: [], link: '' });
        // Navigate to the correct path
        window.location.href = `${targetPath}?id=${newChat.id}`;
        toast({ title: "Đã tạo cuộc trò chuyện mới", description: `"${newChat.title}"` });
        if (isMobile) setIsOpen(false);
    };

    const clearChatHistory = () => {
        const isMobi = pathname === '/chat-mobi';
        const listKey = isMobi ? CHAT_MOBI_HISTORY_LIST_KEY : CHAT_HISTORY_LIST_KEY;
        const messagesPrefix = isMobi ? CHAT_MOBI_MESSAGES_PREFIX : CHAT_MESSAGES_PREFIX;
        const targetPath = isMobi ? '/chat-mobi' : '/chat';

        if (!window.confirm(`Bạn có chắc chắn muốn xóa tất cả lịch sử trò chuyện ${isMobi ? 'Chat Mobi' : 'Chat'} không?`)) {
            return;
        }
        localStorage.removeItem(listKey);
        // Need to reload the list from storage to get IDs to delete messages
        const storedList = localStorage.getItem(listKey); // Re-read (or use state if sure it's up-to-date)
        if (storedList) {
             try {
                 const parsedList: ChatHistoryItem[] = JSON.parse(storedList);
                 parsedList.forEach(chat => {
                     localStorage.removeItem(`${messagesPrefix}${chat.id}`);
                 });
             } catch (e) { console.error("Error parsing list for deletion:", e); }
        }
        // Also clear current state
        setChatHistory([]);
        toast({ title: "Lịch sử trò chuyện đã được xóa" });
        window.location.href = targetPath; // Navigate to the base path
    };

    const handleDeleteChat = (chatIdToDelete: number, event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        const isMobi = pathname === '/chat-mobi';
        const messagesPrefix = isMobi ? CHAT_MOBI_MESSAGES_PREFIX : CHAT_MESSAGES_PREFIX;
        const targetPath = isMobi ? '/chat-mobi' : '/chat';

        if (!window.confirm(`Bạn có chắc chắn muốn xóa cuộc trò chuyện này không?`)) {
            return;
        }

        console.log(`Deleting ${isMobi ? 'chat-mobi' : 'chat'} conversation:`, chatIdToDelete);
        const updatedList = chatHistory.filter(chat => chat.id !== chatIdToDelete);
        // saveChatHistoryList already uses the correct key
        saveChatHistoryList(updatedList);
        // Use the correct messages prefix for deletion
        localStorage.removeItem(`${messagesPrefix}${chatIdToDelete}`);
        toast({ title: "Đã xóa cuộc trò chuyện" });

        // If the currently active chat was deleted, navigate to the base path
        if (activeChatId === chatIdToDelete.toString()) {
            router.push(targetPath);
        }
        // No need to manually reload list, saveChatHistoryList updates state
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

                    {/* Chat History Section - Reverted to original */}
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

                                            // Determine the correct link path
                                            const linkPath = pathname === '/chat-mobi' ? `/chat-mobi?id=${chat.id}` : `/chat?id=${chat.id}`;

                                            return (
                                                <Link key={chat.id} href={linkPath} passHref className="block group relative rounded-md"> {/* Added rounded-md */}
                                                    {/* Use a div styled like a button instead of nesting buttons */}
                                                    <div
                                                        className={cn(
                                                            "flex w-full items-center justify-between h-auto py-1.5 px-2 text-left rounded-md transition-colors", // Base styles + rounded
                                                            isActive
                                                                ? "bg-secondary text-secondary-foreground" // Active styles
                                                                : "hover:bg-muted" // Hover styles for non-active
                                                        )}
                                                    >
                                                        {/* Main content */}
                                                        <div className="flex items-center overflow-hidden flex-1 mr-2"> {/* Added flex-1 and mr-2 */}
                                                            <MessageSquare className="mr-2 h-4 w-4 flex-shrink-0" />
                                                            <div className="flex flex-col overflow-hidden">
                                                                <span className="truncate text-sm font-medium">{chat.title}</span>
                                                                <span className="text-xs text-muted-foreground">{displayTime}</span>
                                                            </div>
                                                        </div>
                                                        {/* Delete button - Sibling to content, absolutely positioned by parent Link */}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive z-10" // Added z-10
                                                            onClick={(e) => handleDeleteChat(chat.id, e)}
                                                            aria-label="Xóa cuộc trò chuyện"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
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
