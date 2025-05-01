'use client';

// No longer need useState or Message type here
import { ChatInterface } from '@/components/chat-mobi/ChatInterface';
import { Sidebar } from '@/components/ui/sidebar'; // Import the CORRECT Sidebar

export default function ChatMobiPage() {
  // messages state is managed within ChatInterface again

  return (
    // Use flex-row for sidebar and main content side-by-side
    // The Sidebar component now manages its own visibility and container
    <div className="flex flex-row h-screen bg-gray-100 dark:bg-black overflow-hidden relative"> {/* Added relative positioning context */}
      {/* Sidebar Component - No longer passing live messages */}
      <Sidebar />

      {/* Main chat interface takes up the remaining space */}
      <main className="flex-1 flex flex-col overflow-hidden"> {/* Ensure main area can scroll independently */}
        {/* ChatInterface manages its own state */}
        <ChatInterface />
      </main>
    </div>
  );
}
