"use client";

// Removed SessionProvider import
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/context/AuthContext";
import { LiveAssistantProvider } from "./live-assistant/LiveAssistantProvider";
import FloatingAssistantButton from "./live-assistant/FloatingAssistantButton";
import AssistantModal from "./live-assistant/AssistantModal";

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY as string;

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <LiveAssistantProvider apiKey={GEMINI_API_KEY}>
          {children}
          <FloatingAssistantButton />
          <AssistantModal />
        </LiveAssistantProvider>
        <Toaster />
      </ThemeProvider>
    </AuthProvider>
  );
}
