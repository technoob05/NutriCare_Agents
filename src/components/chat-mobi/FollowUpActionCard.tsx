import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, CalendarDays, CloudSun, Smile } from "lucide-react";

interface FollowUpActionCardProps {
  options: { key: string; label: string; icon?: React.ReactNode; description?: string }[];
  onSelect: (key: string) => void;
}

export const FollowUpActionCard: React.FC<FollowUpActionCardProps> = ({ options, onSelect }) => {
  return (
    <Card className="p-6 rounded-xl shadow-lg max-w-md mx-auto mt-4 bg-white dark:bg-zinc-900">
      <div className="mb-4 text-lg font-semibold text-center">
        Bạn muốn tiếp tục với chức năng nào khác?
      </div>
      <div className="flex flex-col gap-3">
        {options.map((opt) => (
          <Button
            key={opt.key}
            variant="outline"
            size="lg"
            className="flex items-center justify-start gap-3 text-base font-medium px-4 py-3 rounded-lg border-2 hover:bg-primary/10 transition"
            onClick={() => onSelect(opt.key)}
          >
            {opt.icon}
            <span>{opt.label}</span>
            {opt.description && (
              <span className="ml-2 text-xs text-muted-foreground">{opt.description}</span>
            )}
          </Button>
        ))}
      </div>
    </Card>
  );
};

// Gợi ý sử dụng:
// <FollowUpActionCard
//   options={[
//     { key: "menu-daily", label: "Tạo thực đơn theo ngày", icon: <CalendarDays size={20} /> },
//     { key: "emotion-food", label: "Tạo thực đơn theo cảm xúc", icon: <Smile size={20} /> },
//     { key: "weather-food", label: "Tạo thực đơn theo thời tiết", icon: <CloudSun size={20} /> },
//     { key: "end", label: "Kết thúc", icon: <Sparkles size={20} /> },
//   ]}
//   onSelect={(key) => ...}
// />
