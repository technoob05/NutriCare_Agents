import React from 'react';
import { Button } from "@/components/ui/button";
import {
  Utensils, PieChart, FileText, BarChart, CalendarDays, Database
} from 'lucide-react';

// Define the structure for a suggested action
interface SuggestedAction {
  id: string;
  text: string;
  command: string;
  icon: React.ReactNode;
}

// Define the suggested actions data (copied from ChatInterface)
const suggestedActionsData: SuggestedAction[] = [
  { id: 'suggest-menu', text: 'Tạo thực đơn cá nhân', command: 'Tạo thực đơn 1 ngày phù hợp với người muốn giảm cân', icon: <Utensils className="h-3.5 w-3.5 mr-1.5"/> },
  { id: 'suggest-explain', text: 'Phân tích món ăn', command: 'Phân tích giá trị dinh dưỡng trong một bát phở bò', icon: <PieChart className="h-3.5 w-3.5 mr-1.5"/> },
  { id: 'suggest-recipe', text: 'Công thức healthy', command: 'Công thức nấu bún chả phiên bản healthy ít dầu mỡ', icon: <FileText className="h-3.5 w-3.5 mr-1.5"/> },
  { id: 'suggest-calories', text: 'Tính lượng calo', command: 'Tôi nên tiêu thụ bao nhiêu calo mỗi ngày với chiều cao 1m65, nặng 60kg và muốn giảm cân?', icon: <BarChart className="h-3.5 w-3.5 mr-1.5"/> },
  { id: 'suggest-meal-plan', text: 'Lên kế hoạch bữa ăn', command: 'Gợi ý thực đơn 7 ngày cho người tập gym muốn tăng cơ', icon: <CalendarDays className="h-3.5 w-3.5 mr-1.5"/> },
  { id: 'suggest-pantry', text: 'Quản lý tủ lạnh', command: 'Tôi có cà chua, trứng, hành và phô mai trong tủ lạnh. Có thể nấu món gì?', icon: <Database className="h-3.5 w-3.5 mr-1.5"/> },
];

// Define props for the component
interface SuggestedActionsProps {
  onActionClick: (command: string) => void; // Callback when an action button is clicked
}

export function SuggestedActions({ onActionClick }: SuggestedActionsProps) {
  return (
    <div className="mb-4">
      <p className="text-sm text-muted-foreground mb-2 px-1">Bạn có thể hỏi tôi:</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {suggestedActionsData.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            className="text-xs h-9 bg-white dark:bg-gray-800 hover:bg-muted justify-start px-3"
            onClick={() => onActionClick(action.command)} // Use the callback prop
          >
            {action.icon}
            {action.text}
          </Button>
        ))}
      </div>
    </div>
  );
}
