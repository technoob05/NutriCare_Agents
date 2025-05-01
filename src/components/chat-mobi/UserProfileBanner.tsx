import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, History } from 'lucide-react'; // Import History icon
import { MenuAnalyticsDrawer } from './MenuAnalyticsDrawer'; // Import the new drawer

// Define props if needed in the future, e.g., for dynamic goals
interface UserProfileBannerProps {
  // Example: healthGoals: string[];
  onOpenSettings?: () => void; // Callback for when settings button is clicked
}

export function UserProfileBanner({ onOpenSettings }: UserProfileBannerProps) {
  // State to control the analytics drawer
  const [isAnalyticsDrawerOpen, setIsAnalyticsDrawerOpen] = useState(false);

  // Hardcoded for now, replace with props if data becomes dynamic
  const healthGoals = ["Giảm cân", "Ăn ít đường"];

  return (
    <> {/* Use Fragment to wrap multiple elements */}
      <div className="bg-background px-4 py-2 border-b dark:border-gray-800 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Mục tiêu sức khỏe:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {/* Map through goals if they become dynamic */}
            <Badge variant="outline" className="text-xs bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400">
              Giảm cân
            </Badge>
            <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400">
              Ăn ít đường
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2"> {/* Group buttons */}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-8"
            onClick={() => setIsAnalyticsDrawerOpen(true)} // Open the drawer
            title="Xem lịch sử & phân tích" // Tooltip for accessibility
          >
            <History className="h-3.5 w-3.5 mr-1.5" />
            Lịch sử
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-8"
            onClick={onOpenSettings} // Use the callback if provided
          >
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Cá nhân hóa
          </Button>
        </div>
      </div>

      {/* Render the drawer */}
      <MenuAnalyticsDrawer
        open={isAnalyticsDrawerOpen}
        onOpenChange={setIsAnalyticsDrawerOpen}
      />
    </>
  );
}
