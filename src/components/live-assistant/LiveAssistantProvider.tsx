import React, { createContext, useContext, useState, ReactNode } from "react";
import { useLiveAPI } from "../../../scr_live_api_web_consolle/hooks/use-live-api";

// Define the context type
interface LiveAssistantContextType {
  assistantActive: boolean;
  setAssistantActive: (active: boolean) => void;
  liveAPI: ReturnType<typeof useLiveAPI>;
}

// Create context
const LiveAssistantContext = createContext<LiveAssistantContextType | undefined>(undefined);

// Provider component
export function LiveAssistantProvider({
  children,
  apiKey,
  url,
}: {
  children: ReactNode;
  apiKey: string;
  url?: string;
}) {
  const [assistantActive, setAssistantActive] = useState(false);
  const liveAPI = useLiveAPI({ apiKey, url });

  return (
    <LiveAssistantContext.Provider value={{ assistantActive, setAssistantActive, liveAPI }}>
      {children}
    </LiveAssistantContext.Provider>
  );
}

// Hook to use the context
export function useLiveAssistant() {
  const ctx = useContext(LiveAssistantContext);
  if (!ctx) throw new Error("useLiveAssistant must be used within LiveAssistantProvider");
  return ctx;
}
