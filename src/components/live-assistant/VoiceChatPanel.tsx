import React, { useEffect, useRef, useState, useCallback } from "react";
import { useLiveAssistant } from "./LiveAssistantProvider";
import { AudioRecorder } from "../../../scr_live_api_web_consolle/lib/audio-recorder";
import AudioPulse from "../../../scr_live_api_web_consolle/components/audio-pulse/AudioPulse";
import { AudioStreamer } from "../../../scr_live_api_web_consolle/lib/audio-streamer";
import { useScreenCapture } from "../../../scr_live_api_web_consolle/hooks/use-screen-capture";
import { useRouter } from "next/navigation";
import navigationManifest from "@/ai/data/app-navigation-manifest.json";
import { Mic, Send, UserCircle, Bot, ChevronDown, Loader2 } from "lucide-react"; // Added more icons

interface NavItem {
  pageName: string;
  route: string;
  description: string;
  keywords: string[];
}

// Enhanced intent parser using the manifest
function parseNavigationIntent(text: string): string | null {
  const lowerText = text.toLowerCase();

  for (const item of navigationManifest as NavItem[]) {
    // Check main pageName
    if (lowerText.includes(item.pageName.toLowerCase())) {
      return item.route;
    }
    // Check keywords
    for (const keyword of item.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return item.route;
      }
    }
    
    // Sophisticated description matching approach
    const descriptionWords = item.description.toLowerCase().split(/\s+/);
    const textWords = lowerText.split(/\s+/);
    const commonKeywords = descriptionWords.filter(word => textWords.includes(word) && word.length > 3);

    if (commonKeywords.length > 1) {
      return item.route;
    }
  }
  return null;
}

export default function VoiceChatPanel() {
  const { liveAPI } = useLiveAssistant();
  const { client, connected, connect, disconnect, volume } = liveAPI;
  const [recording, setRecording] = useState(false);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<{ role: string; text: string; id: string }[]>([]);
  const [inVolume, setInVolume] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const screenFrameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const screenCapture = useScreenCapture();
  
  // Auto-scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Function to capture and send a screen frame
  const sendScreenFrame = useCallback(() => {
    if (screenCapture.isStreaming && screenCapture.stream && videoRef.current && canvasRef.current && client) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.readyState >= video.HAVE_METADATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frameDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          const base64Data = frameDataUrl.split(',')[1];
          if (base64Data) {
            client.sendRealtimeInput([{ mimeType: 'image/jpeg', data: base64Data }]);
          }
        }
      }
    }
  }, [screenCapture.isStreaming, screenCapture.stream, client]);

  // Start/stop voice streaming
  useEffect(() => {
    if (recording && connected) {
      if (!audioRecorderRef.current) {
        audioRecorderRef.current = new AudioRecorder();
      }
      const recorder = audioRecorderRef.current;
      const onData = (base64: string) => {
        client.sendRealtimeInput([
          {
            mimeType: "audio/pcm;rate=16000",
            data: base64,
          },
        ]);
      };
      recorder.on("data", onData).on("volume", setInVolume).start();
      return () => {
        recorder.off("data", onData).off("volume", setInVolume);
        recorder.stop();
      };
    }
  }, [recording, connected, client]);

  // Listen for AI responses (text and audio)
  useEffect(() => {
    let navigationHandledByTool = false;

    const onToolCall = (toolCall: any) => {
      console.log("Tool call received:", toolCall);
      if (toolCall && toolCall.functionCalls) {
        for (const fc of toolCall.functionCalls) {
          if (fc.name === "navigateToPage") {
            const receivedRoute = fc.args?.route;
            if (receivedRoute && typeof receivedRoute === "string") {
              // Validate the route against the manifest
              const isValidRoute = (navigationManifest as NavItem[]).some(item => item.route === receivedRoute);
              if (isValidRoute) {
                console.log(`Tool call: Navigating to valid route ${receivedRoute}`);
                router.push(receivedRoute);
                client.sendToolResponse({
                  functionResponses: [{ id: fc.id, response: { success: true, route: receivedRoute } }]
                });
                navigationHandledByTool = true;
              } else {
                console.error(`navigateToPage tool call: Invalid route ${receivedRoute} not in manifest.`);
                client.sendToolResponse({
                  functionResponses: [{ id: fc.id, response: { success: false, error: `Invalid route: ${receivedRoute}. Page not found.` } }]
                });
              }
            } else {
              console.error("navigateToPage tool call missing route or route is not a string:", fc.args);
              client.sendToolResponse({
                functionResponses: [{ id: fc.id, response: { success: false, error: "Missing or invalid route parameter." } }]
              });
            }
          }
          else if (fc.name === "startScreenShare") {
            console.log("Tool call: startScreenShare");
            screenCapture.start()
              .then(stream => {
                if (stream && videoRef.current) {
                  videoRef.current.srcObject = stream;
                  videoRef.current.play().catch(err => console.error("Error playing screen capture video:", err));
                  if (screenFrameIntervalRef.current) clearInterval(screenFrameIntervalRef.current);
                  screenFrameIntervalRef.current = setInterval(sendScreenFrame, 1000 / 5);
                  client.sendToolResponse({
                    functionResponses: [{ id: fc.id, response: { success: true, message: "Screen share started." } }]
                  });
                } else {
                  throw new Error("Failed to get screen stream or video element not ready.");
                }
              })
              .catch(error => {
                console.error("Error starting screen share:", error);
                client.sendToolResponse({
                  functionResponses: [{ id: fc.id, response: { success: false, error: error.message } }]
                });
              });
          } else if (fc.name === "stopScreenShare") {
            console.log("Tool call: stopScreenShare");
            screenCapture.stop();
            if (screenFrameIntervalRef.current) {
              clearInterval(screenFrameIntervalRef.current);
              screenFrameIntervalRef.current = null;
            }
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
            client.sendToolResponse({
              functionResponses: [{ id: fc.id, response: { success: true, message: "Screen share stopped." } }]
            });
          }
        }
      }
    };

    const onContent = (data: any) => {
      setIsTyping(false);
      navigationHandledByTool = false;
      let text = "";
      if (data && data.modelTurn && data.modelTurn.parts) {
        for (const part of data.modelTurn.parts) {
          if (part.text) text += part.text;
        }
      }
      if (text) {
        setMessages((msgs) => [...msgs, { role: "ai", text, id: `ai-${Date.now()}` }]);
        // Fallback navigation is significantly reduced or removed as AI is now primary.
        // Kept for now, but this logic might be removed if AI handles all navigation reliably.
        if (!navigationHandledByTool) {
          const navRouteFromFallback = parseNavigationIntent(text);
          if (navRouteFromFallback) {
            // Ensure fallback also navigates only to valid routes from manifest (already handled by parseNavigationIntent)
            console.log(`Fallback navigation (from AI text): Navigating to ${navRouteFromFallback}`);
            setTimeout(() => router.push(navRouteFromFallback), 500);
          }
        }
      }
    };

    const onAudio = (chunk: ArrayBuffer) => {
      if (!audioStreamerRef.current) {
        audioStreamerRef.current = new AudioStreamer(new window.AudioContext());
        audioStreamerRef.current.resume();
      }
      audioStreamerRef.current.addPCM16(new Uint8Array(chunk));
    };

    client.on("toolcall", onToolCall);
    client.on("content", onContent);
    client.on("audio", onAudio);

    return () => {
      client.off("toolcall", onToolCall);
      client.off("content", onContent);
      client.off("audio", onAudio);
      if (screenCapture.isStreaming) {
        screenCapture.stop();
      }
      if (screenFrameIntervalRef.current) {
        clearInterval(screenFrameIntervalRef.current);
      }
    };
  }, [client, router, screenCapture, sendScreenFrame]);

  // Handle text input send
  const handleSendText = () => {
    if (inputText.trim()) {
      const messageId = `user-${Date.now()}`;
      setMessages((msgs) => [...msgs, { role: "user", text: inputText, id: messageId }]);
      client.send({ text: inputText });
      // Client-side parsing on user's direct text input can be kept as a quick action,
      // but it should also only navigate to valid manifest routes.
      // parseNavigationIntent already does this.
      const navRouteFromUserInput = parseNavigationIntent(inputText);
      if (navRouteFromUserInput) {
        console.log(`Client-side navigation (from user input): Navigating to ${navRouteFromUserInput}`);
        setTimeout(() => router.push(navRouteFromUserInput), 500);
      }
      setInputText("");
      
      // Set typing indicator when sending a message, will be cleared on content response
      setIsTyping(true);
    }
  };

  // Connect to Gemini API on mount
  useEffect(() => {
    if (!connected) {
      connect();
      setTimeout(() => setConnecting(false), 1000); // Simulate connection time for UI
    } else {
      setConnecting(false);
    }
  }, [connected, connect]);

  // Handling input resize based on content
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = 'auto'; // Reset height
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; // Limit max height
  };

  // Load welcome message after connection
  useEffect(() => {
    if (connected && messages.length === 0) {
      setTimeout(() => {
        setMessages([{ 
          role: "ai", 
          text: "Xin chào! Tôi là NutriCare AI. Bạn có thể hỏi tôi bất kỳ câu hỏi nào về dinh dưỡng và sức khỏe.", 
          id: "welcome-msg" 
        }]);
      }, 1500);
    }
  }, [connected, messages.length]);

  return (
    <div className="w-full max-w-md flex flex-col h-full relative rounded-lg shadow-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="bg-green-600 text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-2">
          <Bot size={22} />
          <h2 className="font-medium text-lg">NutriCare AI</h2>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-300' : 'bg-yellow-300'} animate-pulse`}></span>
          <span className="text-xs">{connected ? 'Trực tuyến' : 'Đang kết nối...'}</span>
        </div>
      </div>

      {/* Connection overlay */}
      {connecting && (
        <div className="absolute inset-0 bg-white bg-opacity-80 flex flex-col items-center justify-center z-10 transition-opacity duration-500">
          <Loader2 className="w-10 h-10 text-green-600 animate-spin mb-4" />
          <p className="text-slate-700 font-medium">Đang kết nối đến NutriCare AI...</p>
        </div>
      )}
      
      {/* Hidden video and canvas for screen capture processing */}
      <video ref={videoRef} style={{ display: "none" }} playsInline />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-grow bg-slate-50 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-green-300 scrollbar-track-slate-100 min-h-[150px] max-h-[calc(90vh-220px)]"
      >
        {messages.length === 0 && !connecting && (
          <div className="text-slate-400 text-center py-10 flex flex-col items-center space-y-4 animate-fade-in">
            <Bot size={48} className="text-green-500 mb-2" />
            <p>Bắt đầu cuộc trò chuyện với NutriCare AI.</p>
            <ChevronDown size={20} className="text-green-500 animate-bounce mt-4" />
          </div>
        )}

        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-message-appear`}
            >
              <div
                className={`flex max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div className={`flex-shrink-0 flex items-start pt-1 ${msg.role === "user" ? "ml-2" : "mr-2"}`}>
                  {msg.role === "user" ? (
                    <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-white">
                      <UserCircle size={20} />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white">
                      <Bot size={20} />
                    </div>
                  )}
                </div>
                <div
                  className={`py-3 px-4 rounded-2xl shadow-sm ${
                    msg.role === "user"
                      ? "bg-sky-600 text-white rounded-tr-none" 
                      : "bg-white text-slate-800 rounded-tl-none border border-slate-200"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start animate-message-appear">
              <div className="flex max-w-[85%] flex-row">
                <div className="flex-shrink-0 flex items-start pt-1 mr-2">
                  <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white">
                    <Bot size={20} />
                  </div>
                </div>
                <div className="py-3 px-4 rounded-2xl shadow-sm bg-white text-slate-800 rounded-tl-none border border-slate-200">
                  <div className="flex space-x-1 items-center h-5">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-typing-dot"></div>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-typing-dot animation-delay-200"></div>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-typing-dot animation-delay-400"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Controls Area */}
      <div className="bg-white border-t border-slate-200 p-4 shadow-inner">
        {/* Voice recording button and status */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setRecording((r) => !r)}
            className={`p-3 rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 transform hover:scale-105
              ${recording 
                ? "bg-green-600 text-white shadow-lg scale-110 hover:bg-green-700" 
                : "bg-slate-200 text-slate-600 hover:bg-slate-300"}`}
            aria-label={recording ? "Dừng ghi âm" : "Bắt đầu ghi âm"}
            disabled={!connected}
          >
            <Mic size={22} className={recording ? "animate-pulse" : ""} />
          </button>
          <div className="relative flex-1">
            <div className="w-32 h-8 transform scale-125">
              <AudioPulse 
                active={recording && connected} 
                volume={inVolume} 
              />
            </div>
            <span className={`text-sm font-medium absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
              ${recording ? "text-green-600" : "text-slate-500"}`}>
              {recording ? "Đang ghi âm..." : (connected ? "Nhấn mic để nói" : "Đang kết nối...")}
            </span>
          </div>
        </div>

        {/* Input Area */}
        <div className="flex items-end gap-2 bg-slate-100 rounded-lg p-2 shadow-inner">
          <textarea
            value={inputText}
            onChange={handleInputChange}
            placeholder="Nhập yêu cầu hoặc nói..."
            className="flex-grow p-2 bg-transparent border-none rounded-lg focus:ring-0 outline-none resize-none min-h-[40px] max-h-[120px] text-sm transition-all duration-200"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendText();
              }
            }}
            disabled={!connected}
          />
          <button
            onClick={handleSendText}
            disabled={!inputText.trim() || !connected}
            className="bg-green-600 text-white p-2.5 rounded-lg hover:bg-green-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 self-end mb-0.5 mr-0.5"
            aria-label="Gửi tin nhắn"
          >
            <Send size={20} />
          </button>
        </div>
      </div>

      {/* Custom CSS */}
      <style jsx global>{`
        @keyframes message-appear {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes typing-dot {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-message-appear {
          animation: message-appear 0.3s ease-out forwards;
        }
        
        .animate-typing-dot {
          animation: typing-dot 0.8s infinite;
        }
        
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        
        .animation-delay-400 {
          animation-delay: 0.4s;
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #86efac;
          border-radius: 10px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #4ade80;
        }
      `}</style>
    </div>
  );
}
