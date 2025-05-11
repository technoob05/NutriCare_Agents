'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast'; // Import useToast

// Import the created components
import { JourneyInputForm } from './_components/JourneyInputForm';
import { JourneyTimeline } from './_components/JourneyTimeline';
import { JourneyInsights } from './_components/JourneyInsights';

// Define data structures (adjust as needed)
interface FoodEntry {
  id: string;
  name: string;
  quantity: string;
  time: string; // e.g., "08:00" or "Breakfast"
  calories?: number; // Optional
  notes?: string; // Optional
}

interface JourneyEntry {
  date: string; // YYYY-MM-DD
  foods: FoodEntry[];
  dailyQuestionResponse?: string;
  insights?: string[]; // Simple insights generated later
}

interface SavedMenu {
  id: string;
  type: 'daily' | 'weekly';
  data: any; // Structure of menu data
  savedAt: string;
  name?: string;
}

// Define structure for AI Analysis Result
interface HistoryAnalysisResult {
  summary: string;
  frequentFoods: string[];
  healthGoals: string[];
  trends: string[];
  keywords: string[];
}

// Constants for localStorage keys (should match sidebar.tsx)
const CHAT_MOBI_HISTORY_LIST_KEY = 'chatMobiHistoryList';
const CHAT_MOBI_MESSAGES_PREFIX = 'chatMobiMessages_';

// Define the structure for a chat history item (from sidebar.tsx)
interface ChatHistoryItem {
    id: number;
    title: string;
    timestamp: number;
    preferences?: string;
}

// Define the structure for a chat message (from ChatInterface.tsx)
interface ChatMessage {
    id: string;
    sender: 'user' | 'agent' | 'system';
    content: string | React.ReactNode; // Content can be string or ReactNode
    timestamp: string;
    agentName?: string;
    menuData?: any; // For menu messages
    menuType?: 'daily' | 'weekly'; // For menu messages
    // Add other relevant fields from ChatMessage if needed for analysis
}


export default function JourneyPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast(); // Initialize toast

  const [journeyData, setJourneyData] = useState<JourneyEntry[]>([]);
  const [savedMenus, setSavedMenus] = useState<SavedMenu[]>([]);
  const [chatMobiHistoryList, setChatMobiHistoryList] = useState<ChatHistoryItem[]>([]); // State for chat list
  const [dailyQuestion, setDailyQuestion] = useState<string>("How are you feeling today?"); // State for daily question
  const [historyAnalysis, setHistoryAnalysis] = useState<HistoryAnalysisResult | null>(null); // State for analysis results
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isAnalyzingHistory, setIsAnalyzingHistory] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);


  const journeyKey = user ? `nutricare_journey_${user.uid}` : null;
  const menuKey = 'nutricare_saved_menus';

  // --- Data Loading Effects ---

  // Set hasMounted to true after the component has mounted
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Load Journey Data and Saved Menus from localStorage
  useEffect(() => {
    if (!authLoading && user && journeyKey) {
      setIsLoadingData(true);
      try {
        // Load Journey Data
        const storedJourney = localStorage.getItem(journeyKey);
        if (storedJourney) {
          setJourneyData(JSON.parse(storedJourney));
        } else {
          setJourneyData([]); // Initialize if nothing stored
        }

        // Load Saved Menus
        const storedMenus = localStorage.getItem(menuKey);
        if (storedMenus) {
          setSavedMenus(JSON.parse(storedMenus));
        } else {
          setSavedMenus([]);
        }

      } catch (error) {
        console.error("Error loading data from localStorage:", error);
        // Handle potential JSON parsing errors
        setJourneyData([]);
        setSavedMenus([]);
        if (hasMounted) {
          toast({
              title: "Lỗi tải dữ liệu",
              description: "Không thể tải dữ liệu hành trình hoặc menu đã lưu.",
              variant: "destructive",
          });
        }
      } finally {
        setIsLoadingData(false);
      }
    } else if (!authLoading && !user) {
      // If user is not logged in and auth is not loading
      setIsLoadingData(false);
      setJourneyData([]);
      setSavedMenus([]);
    }
  }, [user, authLoading, journeyKey, toast, hasMounted]); // Rerun when user or auth state changes

  // Load Chat Mobi History List from localStorage
  useEffect(() => {
    if (!authLoading && user) {
        try {
            const storedChatList = localStorage.getItem(CHAT_MOBI_HISTORY_LIST_KEY);
            if (storedChatList) {
                const parsedList = JSON.parse(storedChatList).map((item: any) => ({
                    ...item,
                    timestamp: Number(item.timestamp) || 0
                }));
                setChatMobiHistoryList(parsedList.sort((a: ChatHistoryItem, b: ChatHistoryItem) => b.timestamp - a.timestamp));
            } else {
                setChatMobiHistoryList([]);
            }
        } catch (error) {
            console.error("Error loading chat history list:", error);
            setChatMobiHistoryList([]);
            if (hasMounted) {
              toast({
                  title: "Lỗi tải lịch sử chat",
                  description: "Không thể tải danh sách lịch sử trò chuyện.",
                  variant: "destructive",
              });
            }
        }
    } else if (!authLoading && !user) {
         setChatMobiHistoryList([]);
    }
  }, [user, authLoading, toast, hasMounted]); // Rerun when user or auth state changes


  // Fetch Daily Question from API
  useEffect(() => {
    const fetchDailyQuestion = async () => {
      try {
        const response = await fetch('/api/journey/generate-question');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.question) {
          setDailyQuestion(data.question);
        }
      } catch (error) {
        console.error("Error fetching daily question:", error);
        // Keep default question if API fails
      }
    };

    // Fetch only if user is logged in and not loading
    if (!authLoading && user) {
        fetchDailyQuestion();
    } else if (!authLoading && !user) {
        // Reset to default if user logs out
        setDailyQuestion("How are you feeling today?");
    }
  }, [user, authLoading]); // Rerun when user or auth state changes


  // Function to add a new journey entry (passed to the form)
  const addJourneyEntry = (newEntryData: Omit<JourneyEntry, 'insights'>) => {
    if (!journeyKey) {
      if (hasMounted) {
        toast({
            title: "Lỗi",
            description: "Không thể lưu dữ liệu. Vui lòng đăng nhập.",
            variant: "destructive",
        });
      }
        return;
    }

    const newEntry: JourneyEntry = {
      ...newEntryData,
      // Add default/empty insights if needed
    };

    setJourneyData(prevData => {
      const updatedData = [...prevData];
      // Check if an entry for this date already exists
      const existingEntryIndex = updatedData.findIndex(entry => entry.date === newEntry.date);

      if (existingEntryIndex > -1) {
        // Append foods to existing entry for the date
        // Note: This simple append might need refinement (e.g., merging daily questions)
        updatedData[existingEntryIndex] = {
          ...updatedData[existingEntryIndex],
          foods: [...updatedData[existingEntryIndex].foods, ...newEntry.foods],
          dailyQuestionResponse: newEntry.dailyQuestionResponse || updatedData[existingEntryIndex].dailyQuestionResponse,
        };
      } else {
        // Add as a new entry
        updatedData.push(newEntry);
      }

      // Sort by date descending for display
      updatedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      try {
        localStorage.setItem(journeyKey, JSON.stringify(updatedData));
        if (hasMounted) {
          toast({
              title: "Đã lưu!",
              description: "Mục hành trình đã được thêm.",
          });
        }
      } catch (error) {
        console.error("Error saving journey data to localStorage:", error);
        // Handle potential storage errors (e.g., quota exceeded)
        if (hasMounted) {
          toast({
              title: "Lỗi lưu trữ",
              description: "Không thể lưu dữ liệu hành trình vào bộ nhớ cục bộ.",
              variant: "destructive",
          });
        }
      }
      return updatedData;
    });
  };

  // Function to analyze chat history
  const analyzeChatHistory = useCallback(async () => {
      if (!user) {
        if (hasMounted) {
          toast({
              title: "Lỗi",
              description: "Vui lòng đăng nhập để phân tích lịch sử.",
              variant: "destructive",
          });
        }
          return;
      }
      if (isAnalyzingHistory) return;

      setIsAnalyzingHistory(true);
      setHistoryAnalysis(null); // Clear previous analysis

          try {
              let combinedHistoryText = "";

              // Iterate through all chat-mobi sessions and collect messages
              for (const chatItem of chatMobiHistoryList) {
                  const messagesKey = `${CHAT_MOBI_MESSAGES_PREFIX}${chatItem.id}`;
                  const storedMessages = localStorage.getItem(messagesKey);

                  if (storedMessages) {
                      try {
                          const messages: ChatMessage[] = JSON.parse(storedMessages);
                          // Append user and agent messages to the combined text
                          messages.forEach(msg => {
                              // Only include string content, ignore ReactNodes
                              if (typeof msg.content === 'string') {
                                  combinedHistoryText += `${msg.sender}: ${msg.content}\n`;
                              }
                           // Optionally include menu data if it's relevant for analysis
                           if (msg.menuData && typeof msg.menuData === 'object') {
                                combinedHistoryText += `${msg.agentName || 'Agent'} Menu Data: ${JSON.stringify(msg.menuData)}\n`;
                           }
                      });
                  } catch (e) {
                      console.error(`Error parsing messages for chat ${chatItem.id}:`, e);
                      // Continue to the next chat if one fails
                  }
              }
          }

          if (!combinedHistoryText.trim()) {
            if (hasMounted) {
              toast({
                  title: "Không có lịch sử",
                  description: "Không tìm thấy lịch sử trò chuyện Chat Mobi để phân tích.",
                  variant: "default", // Changed from "info" to "default"
              });
            }
              setIsAnalyzingHistory(false);
              return;
          }

          // Send combined text to the analysis API
          const response = await fetch('/api/journey/analyze-history', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ combinedHistoryText }),
          });

          if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || `API error: ${response.status}`);
          }

          const analysisResult: HistoryAnalysisResult = await response.json();
          setHistoryAnalysis(analysisResult);
          if (hasMounted) {
            toast({
                title: "Phân tích hoàn tất",
                description: "Đã phân tích lịch sử trò chuyện của bạn.",
            });
          }

      } catch (error: any) {
          console.error("Error analyzing chat history:", error);
          if (hasMounted) {
            toast({
                title: "Lỗi phân tích",
                description: `Không thể phân tích lịch sử: ${error.message}`,
                variant: "destructive",
            });
          }
          setHistoryAnalysis(null); // Clear analysis on error
      } finally {
          setIsAnalyzingHistory(false);
      }
  }, [user, chatMobiHistoryList, toast, isAnalyzingHistory, hasMounted]); // Depend on user, chatMobiHistoryList, toast, and isAnalyzingHistory state


  // --- Render Logic ---
  if (authLoading || isLoadingData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading your journey...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center">
        <h1 className="text-2xl font-semibold mb-4">Nutrition Journey</h1>
        <p className="mb-6 text-muted-foreground">Please log in to track your nutrition journey.</p>
        <Link href="/auth/login" passHref>
          <Button>Log In</Button>
        </Link>
      </div>
    );
  }

  // --- Main Content for Logged-in User ---
  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Your Nutrition Journey</h1>

      {/* Insights Section */}
      <Card>
        <CardHeader>
          <CardTitle>Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <JourneyInsights
            journeyData={journeyData}
            savedMenus={savedMenus}
            historyAnalysis={historyAnalysis} // Pass analysis results
          />
           <div className="mt-6">
              <Button
                  onClick={analyzeChatHistory}
                  disabled={isAnalyzingHistory || chatMobiHistoryList.length === 0}
              >
                  {isAnalyzingHistory ? (
                      <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing History...
                      </>
                  ) : (
                      "Analyze My Chat History"
                  )}
              </Button>
               {chatMobiHistoryList.length === 0 && (
                   <p className="text-sm text-muted-foreground mt-2">No Chat Mobi history found to analyze.</p>
               )}
           </div>
        </CardContent>
      </Card>

      {/* Input Form Section */}
      <JourneyInputForm onSubmit={addJourneyEntry} dailyQuestion={dailyQuestion} /> {/* Pass daily question */}

      {/* Saved Menus Section */}
       {savedMenus.length > 0 && (
           <Card>
               <CardHeader>
                   <CardTitle>Saved Menus</CardTitle>
               </CardHeader>
               <CardContent>
                   <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                       {savedMenus.map(menu => (
                           <li key={menu.id} className="border rounded-md p-4 text-sm">
                               <h3 className="font-semibold truncate">{menu.name || `Menu ${new Date(menu.savedAt).toLocaleDateString()}`}</h3>
                               <p className="text-xs text-muted-foreground">Saved on: {new Date(menu.savedAt).toLocaleDateString()}</p>
                               {/* Add a link or button to view menu details if needed */}
                               {/* <Button variant="link" size="sm" className="h-auto p-0 mt-2">View Details</Button> */}
                           </li>
                       ))}
                   </ul>
               </CardContent>
           </Card>
       )}


      {/* Timeline Section */}
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          <JourneyTimeline journeyData={journeyData} />
        </CardContent>
      </Card>
    </div>
  );
}
