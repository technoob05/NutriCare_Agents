import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChefHat, Brain, X } from 'lucide-react';

// Define props for the component
interface ActiveToolIndicatorProps {
  activeTools: { [tool: string]: boolean }; // The state of active tools
  onRemoveTool: (tool: string) => void; // Callback to remove/deactivate a tool
}

export function ActiveToolIndicator({ activeTools, onRemoveTool }: ActiveToolIndicatorProps) {
  const activeToolEntries = Object.entries(activeTools).filter(([, v]) => v);

  if (activeToolEntries.length === 0) {
    return null; // Don't render anything if no tools are active
  }

  const getToolInfo = (tool: string): { icon: React.ReactNode; name: string; className: string } => {
    switch (tool) {
      case 'menu-daily':
        return { 
          icon: <CalendarDays className="h-3.5 w-3.5 mr-0.5 text-emerald-600" />, 
          name: 'Thực đơn ngày', 
          className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' 
        };
      case 'menu-weekly':
        return { 
          icon: <ChefHat className="h-3.5 w-3.5 mr-0.5 text-emerald-600" />, 
          name: 'Thực đơn tuần', 
          className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' 
        };
      case 'extended-thinking':
        return { 
          icon: <Brain className="h-3.5 w-3.5 mr-0.5 text-purple-600" />, 
          name: 'Suy luận chi tiết', 
          className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' 
        };
      default:
        // Fallback for potentially unknown tools
        return { 
          icon: null, 
          name: tool.replace('-', ' '), 
          className: 'bg-muted text-muted-foreground' 
        };
    }
  };

  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {activeToolEntries.map(([tool]) => {
        const { icon, name, className } = getToolInfo(tool);
        return (
          <Badge
            key={tool}
            variant="secondary"
            className={`h-6 flex items-center rounded-md px-2 pr-1 gap-1 animate-fade-in ${className}`}
          >
            {icon}
            <span className="capitalize text-xs">{name}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemoveTool(tool)} // Use the callback prop
              className="h-4 w-4 ml-0.5 p-0 text-muted-foreground hover:text-destructive rounded-full hover:bg-destructive/10"
              aria-label={`Bỏ chọn ${tool}`}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        );
      })}
    </div>
  );
}
