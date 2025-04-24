"use client";

import React, { useState, useRef, useEffect } from "react";
import { marked } from "marked";
import { GoogleGenAI } from "@google/genai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Terminal, Lightbulb, Brain, Search, Database, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils"; // Utility for conditional class names
import { MainNav } from "@/components/main-nav";

interface Slide {
  id: number;
  text: string;
  image: string | null;
  mimeType: string | null;
}

const AiExplainerPage: React.FC = () => {
  const [prompt, setPrompt] = useState<string>("");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const slideIdCounterRef = useRef<number>(0);
  const chatRef = useRef<any>(null);

  const examplePrompts = [
    { icon: <Brain size={14} />, text: "Tư vấn chế độ ăn phù hợp cho người bị tiểu đường" },
    { icon: <Search size={14} />, text: "Tìm hiểu thành phần dinh dưỡng của món phở bò" },
    { icon: <Info size={14} />, text: "Giải thích tại sao chất xơ lại quan trọng với sức khỏe" },
    { icon: <Database size={14} />, text: "Phân tích bảng thành phần dinh dưỡng từ dữ liệu người dùng" },
  ];
  

  // Configure marked
  useEffect(() => {
    marked.setOptions({
      gfm: true,
      breaks: true,
    });
  }, []);

  // Load API key from environment variables on component mount
  useEffect(() => {
    const initializeAPI = async () => {
      try {
        // This assumes you've set up your Next.js app to expose this env variable safely
        // through a server endpoint or using NEXT_PUBLIC_ prefix
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (apiKey) {
          initializeChat(apiKey);
        }
      } catch (err) {
        console.error("Failed to initialize chat:", err);
        setError("Could not load API key from environment variables.");
      }
    };
    
    initializeAPI();
  }, []);

  const parseAndRenderMarkdown = async (markdown: string): Promise<string> => {
    try {
      // Simplify markdown output to match reference style
      // First sanitize the input
      const sanitized = markdown.replace(/<script.*?>.*?<\/script>/gi, "");
      
      // Parse the markdown but keep it simple - we want minimal HTML for styling purposes
      const parsedHtml = await marked.parse(sanitized);
      
      // For a more minimal style matching the reference cards,
      // we'll extract just the main content text without complex HTML
      // This helps us achieve the simple, colorful text style shown in reference
      const textContent = parsedHtml
        .replace(/<\/?h[1-6]>/gi, "") // Remove heading tags but keep content
        .replace(/<\/?p>/gi, "") // Remove paragraph tags but keep content
        .replace(/<\/?li>/gi, "• ") // Replace list items with bullets
        .replace(/<\/?[uo]l>/gi, "<br>") // Replace list containers with line breaks
        .replace(/<strong>(.*?)<\/strong>/gi, "$1") // Remove bold but keep content
        .replace(/<em>(.*?)<\/em>/gi, "$1") // Remove italic but keep content
        .trim();
      
      // We keep the main content as a paragraph for styling
      return `<p>${textContent}</p>`;
    } catch (e) {
      console.error("Markdown parsing error:", e);
      return markdown;
    }
  };

  // Initialize the chat instance with API key
  const initializeChat = (key: string) => {
    if (!key) return;
    
    try {
      const aiInstance = new GoogleGenAI({apiKey: key});
      chatRef.current = aiInstance.chats.create({
        model: 'gemini-2.0-flash-exp',
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
        history: [],
      });
    } catch (err) {
      console.error("Failed to initialize chat:", err);
      setError("Failed to initialize Google AI client. Please check your API key configuration.");
    }
  };

  const generateExplanation = async (currentPrompt: string) => {
    if (!currentPrompt.trim() || isLoading) return;
    
    if (!chatRef.current) {
      setError("API not initialized. Please check your environment configuration.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSlides([]);
    slideIdCounterRef.current = 0;

    // Reset chat history
    if (chatRef.current && chatRef.current.history) {
      chatRef.current.history.length = 0;
    }

    // Updated instructions to match the reference card style
    const additionalInstructions = `
Use a fun story about lots of tiny cats as a metaphor.
Keep sentences short but conversational, casual, and engaging.
Generate a cute, minimal illustration for each sentence with black ink on white background.
No commentary, just begin your explanation.
Keep going until you're done`;

    const fullPrompt = currentPrompt + additionalInstructions;

    try {
      // Send message stream using chat interface
      const result = await chatRef.current.sendMessageStream({
        message: fullPrompt,
      });

      let text = '';
      let img = null;

      // Process the stream
      for await (const chunk of result) {
        for (const candidate of chunk.candidates) {
          for (const part of candidate.content.parts ?? []) {
            if (part.text) {
              text += part.text;
            } else if (part.inlineData) {
              // Create image from inline data
              img = part.inlineData.data;
              const mimeType = part.inlineData.mimeType || "image/png";
              
              // If we have both text and image, create a slide
              if (text && img) {
                const renderedText = await parseAndRenderMarkdown(text);
                const newSlide: Slide = {
                  id: slideIdCounterRef.current++,
                  text: renderedText,
                  image: img,
                  mimeType: mimeType,
                };
                setSlides(prev => [...prev, newSlide]);
                text = ''; // Reset text
                img = null; // Reset image
              }
            }
          }
        }
      }

      // Handle any remaining text without an image
      if (text.trim()) {
        const renderedText = await parseAndRenderMarkdown(text);
        const finalSlide: Slide = {
          id: slideIdCounterRef.current++,
          text: renderedText,
          image: null,
          mimeType: null,
        };
        setSlides(prev => [...prev, finalSlide]);
      }
    } catch (err: any) {
      console.error("Failed to generate explanation:", err);
      
      // Parse error
      let detailedError = err.message || "An unknown error occurred.";
      try {
        const regex = /{"error":(.*)}/gm;
        const match = regex.exec(err.toString());
        if (match && match[1]) {
          const parsedError = JSON.parse(match[1]);
          detailedError = parsedError.message || detailedError;
        }
      } catch (parseErr) {
        // If error parsing fails, use the original error message
      }
      
      setError(detailedError);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  const handleSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    generateExplanation(prompt);
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
    generateExplanation(example);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <MainNav />
      <div className="space-y-8 pt-6"> {/* Added pt-6 for spacing */}
        {/* Header Section with style similar to reference */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight" 
              style={{
                background: "linear-gradient(135deg, #3b82f6, #10b981, #f59e0b)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontFamily: "'Comic Sans MS', 'Comic Sans', cursive, sans-serif"
              }}>
            AI Concept Explainer
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Get instant visual explanations with simple illustrations
          </p>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 gap-8">
          {/* Input Section styled to match reference */}
          <Card className="shadow-md border-2 border-gray-200 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl" style={{
                background: "linear-gradient(135deg, #3b82f6, #10b981, #f59e0b)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontFamily: "'Comic Sans MS', 'Comic Sans', cursive, sans-serif"
              }}>
                Ask anything
              </CardTitle>
              <CardDescription>
                Get simple visual explanations with black & white illustrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Textarea
                  id="prompt-input"
                  placeholder="e.g., Gợi ý thực đơn cho người giảm cân trong 1 tuần..."
                  value={prompt}
                  onChange={handlePromptChange}
                  rows={3}
                  className="resize-none bg-white border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  disabled={isLoading}
                  aria-label="Enter your prompt here"
                />
                <div className="flex flex-col space-y-4">
                  <div>
                    <Label className="text-sm text-gray-600 mb-2 block"
                       style={{
                        fontFamily: "'Comic Sans MS', 'Comic Sans', cursive, sans-serif"
                      }}>
                      Try these examples:
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {examplePrompts.map((ex, index) => (
                        <Badge
                          key={ex.text}
                          variant="outline"
                          className={cn(
                            "cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-1.5 py-2 px-3 bg-white border-2",
                            index % 3 === 0 ? "border-blue-200 text-blue-600" : 
                            index % 3 === 1 ? "border-emerald-200 text-emerald-600" : "border-amber-200 text-amber-600"
                          )}
                          onClick={() => handleExampleClick(ex.text)}
                          style={{
                            fontFamily: "'Comic Sans MS', 'Comic Sans', cursive, sans-serif"
                          }}
                        >
                          {ex.icon}
                          <span>{ex.text}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="px-6 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white"
                      style={{
                        fontFamily: "'Comic Sans MS', 'Comic Sans', cursive, sans-serif",
                        borderRadius: "8px"
                      }}
                    >
                      {isLoading ? "Drawing..." : "Create Explanation"}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="animate-in fade-in">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading States */}
          {isLoading && (
            <div className="space-y-6 animate-pulse">
              <div className="flex justify-center">
                <Skeleton className="h-8 w-1/3" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex flex-col items-center space-y-4">
                    <Skeleton className="h-52 w-52 rounded-md" />
                    <div className="space-y-2 w-full">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-4/6" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results Display - styled like reference cards */}
          {!isLoading && slides.length > 0 && (
            <div className="space-y-6 animate-in fade-in">
              <h2 className="text-xl font-medium text-center relative">
                <span className="bg-white px-4 relative z-10">Explanation Cards</span>
                <Separator className="absolute top-1/2 w-full left-0 -z-0" />
              </h2>
              
              <Tabs defaultValue="cards" className="w-full">
                <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
                  <TabsTrigger value="cards">Card View</TabsTrigger>
                  <TabsTrigger value="scroll">Scroll View</TabsTrigger>
                </TabsList>
                
                <TabsContent value="cards" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {slides.map((slide, index) => (
                      <Card key={slide.id} className="overflow-hidden border shadow-md hover:shadow-lg transition-shadow bg-white">
                        <CardContent className="p-6 flex flex-col items-center">
                          {slide.image && (
                            <div className="flex justify-center mb-4">
                              <div className="flex items-center justify-center w-64 h-64">
                                <img
                                  src={`data:${slide.mimeType};base64,${slide.image}`}
                                  alt="AI generated illustration"
                                  className="object-contain max-h-full max-w-full"
                                />
                              </div>
                            </div>
                          )}
                          <div 
                            className={cn(
                              "mt-2 text-center w-full",
                              // Random colors for each card's text, similar to the reference
                              index % 3 === 0 ? "text-blue-600" : 
                              index % 3 === 1 ? "text-emerald-600" : "text-amber-600"
                            )}
                            style={{
                              fontFamily: "'Comic Sans MS', 'Comic Sans', cursive, sans-serif",
                              fontWeight: "normal"
                            }}
                            dangerouslySetInnerHTML={{ __html: slide.text }}
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="scroll" className="mt-6">
                  <ScrollArea className="w-full rounded-md">
                    <div className="flex space-x-4 p-4">
                      {slides.map((slide, index) => (
                        <Card
                          key={slide.id}
                          className="min-w-[300px] max-w-[350px] flex-shrink-0 bg-white border shadow-md"
                        >
                          <CardContent className="p-6 flex flex-col items-center">
                            {slide.image && (
                              <div className="flex justify-center mb-4">
                                <div className="flex items-center justify-center w-64 h-64">
                                  <img
                                    src={`data:${slide.mimeType};base64,${slide.image}`}
                                    alt="AI generated illustration"
                                    className="object-contain max-h-full max-w-full"
                                  />
                                </div>
                              </div>
                            )}
                            <div 
                              className={cn(
                                "mt-2 text-center w-full",
                                index % 3 === 0 ? "text-blue-600" : 
                                index % 3 === 1 ? "text-emerald-600" : "text-amber-600"
                              )}
                              style={{
                                fontFamily: "'Comic Sans MS', 'Comic Sans', cursive, sans-serif",
                                fontWeight: "normal"
                              }}
                              dangerouslySetInnerHTML={{ __html: slide.text }}
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </TabsContent>
              </Tabs>
              
              <CardFooter className="pt-2 justify-center">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lightbulb size={12} />
                  <span>AI-generated explanations with custom illustrations</span>
                </p>
              </CardFooter>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiExplainerPage;
