import React from 'react';

/**
 * Content to be displayed inside the sidebar (both mobile sheet and desktop).
 */
export function SidebarContent() {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Chat Sessions</h2>
      {/* Placeholder for chat history or other sidebar items */}
      <ul className="space-y-2">
        <li className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">
          Wikipedia/Gemini Intro
        </li>
        <li className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">
          Previous Topic
        </li>
        {/* Add more items dynamically later */}
      </ul>
      {/* Add other sections like settings, etc. if needed */}
    </div>
  );
}

/**
 * The Sidebar component specifically for desktop view.
 */
export function Sidebar() {
  return (
    <aside className="hidden md:block w-64 bg-gray-50 dark:bg-gray-950 h-full border-r dark:border-gray-800">
       <SidebarContent />
    </aside>
  );
}
