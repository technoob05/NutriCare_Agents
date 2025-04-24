'use client'; // Need client component for state (Sheet open/close)

import React from 'react';
import { Sidebar, SidebarContent } from '@/components/chat-mobi/Sidebar'; // Import actual Sidebar
import { ChatInterface } from '@/components/chat-mobi/ChatInterface'; // Import actual ChatInterface
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet'; // Import Sheet components
import { Menu } from 'lucide-react'; // Import Menu icon

export default function ChatMobiPage() {
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  return (
    <div className="flex h-screen max-h-screen overflow-hidden bg-background text-foreground">
      {/* --- Desktop Sidebar --- */}
      <Sidebar />

      {/* --- Main Content Area --- */}
      <div className="flex flex-col flex-1 w-full md:w-auto overflow-hidden">
        {/* Header */}
        <header className="p-3 border-b dark:border-gray-700 flex items-center justify-between md:justify-center sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
          {/* Mobile Menu Button using SheetTrigger */}
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="outline" size="icon" className="mr-2">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open sidebar</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 bg-background">
              {/* Use SheetClose inside SidebarContent if needed, or close programmatically */}
              <SidebarContent />
            </SheetContent>
          </Sheet>

          <h1 className="text-lg sm:text-xl font-semibold">Chat (Mobi)</h1>

          {/* Spacer to balance header on mobile when button is present */}
          <div className="md:hidden w-10"></div>
        </header>

        {/* Chat Interface - Takes remaining space */}
        <ChatInterface />
      </div>
    </div>
  );
}
