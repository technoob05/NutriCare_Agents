'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// Dynamically import the component that contains the chat interface
const DynamicChatInterface = React.lazy(() => import('@/components/HomePage'));

// Wrapper component to handle Suspense and search params
function ChatPageContent() {
  const searchParams = useSearchParams();
  const chatId = searchParams.get('id'); // Get chat ID from URL query ?id=...

  // Pass the chatId to the actual chat interface component
  return <DynamicChatInterface chatId={chatId} />;
}

export default function ChatPage() {
  // Add authentication check if needed here

  return (
    // Suspense boundary is necessary for useSearchParams
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Đang tải giao diện chat...</p>
        </div>
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  );
}
