'use client';

import React, { Suspense } from 'react';

// Dynamically import the component that contains the chat interface
const DynamicChatInterface = React.lazy(() => import('@/components/HomePage'));

export default function ChatPage() {
  // Add authentication check if needed for the chat page specifically
  // You might want to redirect unauthenticated users from here as well
  // useEffect(() => { ... check localStorage ... router.push('/auth/login') ... }, []);

  return (
    // Use Suspense for lazy loading the chat component
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Đang tải giao diện chat...</p>
        </div>
      </div>
    }>
      <DynamicChatInterface />
    </Suspense>
  );
}
