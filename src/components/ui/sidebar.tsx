// src/components/ui/sidebar.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, Settings, HelpCircle, History, Utensils } from 'lucide-react'; // Example icons
import { ThemeToggle } from '@/components/ui/theme-toggle';

export function Sidebar() {
  const recentChats = [
    { id: 1, title: 'Vegetarian Weekly Plan' },
    { id: 2, title: 'Pho Preferences Chat' },
    { id: 3, title: 'Budget Meal Ideas' },
  ];

  return (
    <div className="hidden md:flex flex-col h-full w-64 bg-gray-50 dark:bg-gray-800 p-4 border-r dark:border-gray-700">
      <div className="mb-6">
        <h1 className="text-xl font-semibold mb-4 dark:text-white flex items-center">
          <Utensils className="h-6 w-6 mr-2 text-primary" /> Viet Menu AI
        </h1>
        <Button className="w-full justify-start gap-2" variant="secondary">
          <Plus className="h-4 w-4" /> New Chat
        </Button>
      </div>

      <div className="mb-6 flex-grow overflow-y-auto">
        <h2 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Recent Chats</h2>
        <ul className="space-y-1">
          {recentChats.map((chat) => (
            <li key={chat.id}>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sm truncate hover:bg-gray-200 dark:hover:bg-gray-700">
                <MessageSquare className="h-4 w-4" /> {chat.title}
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto space-y-1">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sm hover:bg-gray-200 dark:hover:bg-gray-700">
          <History className="h-4 w-4" /> Activity
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sm hover:bg-gray-200 dark:hover:bg-gray-700">
          <Settings className="h-4 w-4" /> Settings
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sm hover:bg-gray-200 dark:hover:bg-gray-700">
          <HelpCircle className="h-4 w-4" /> Help & Support
        </Button>
        <ThemeToggle />
      </div>
    </div>
  );
}
