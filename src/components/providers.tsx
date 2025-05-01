"use client";

// Removed SessionProvider import
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/context/AuthContext"; // Import AuthProvider
import "@/i18n"; // Import i18n để khởi tạo đa ngôn ngữ

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // Wrap with AuthProvider instead of SessionProvider
    <AuthProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
        <Toaster />
      </ThemeProvider>
    </AuthProvider>
  );
}
