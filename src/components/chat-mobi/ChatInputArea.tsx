import React, { useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Plus, CalendarDays, ChefHat, Brain, Search, Image as ImageIconLucide, CloudSun, Smile,
  Camera, FileText, Mic, StopCircle, SendHorizontal, Loader2, X
} from 'lucide-react';
import { ActiveToolIndicator } from './ActiveToolIndicator'; // Import the new component
import { SuggestedActions } from './SuggestedActions'; // Import the new component

// --- Props for ChatInputArea Component ---
interface ChatInputAreaProps {
  inputValue: string;
  isLoading: boolean;
  isListening: boolean;
  activeTools: { [tool: string]: boolean };
  popoverOpen: boolean;
  isWebSearchEnabled: boolean;
  imageDisplayMode: 'inline' | 'none';
  uploadedFile: File | null;
  uploadedFilePreview: string | null;
  showSuggestions: boolean; // To control SuggestedActions visibility
  messagesLength: number; // To control SuggestedActions visibility

  // Callbacks
  onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSendMessage: () => void;
  onKeyPress: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onToggleListening: () => void;
  onToggleTool: (tool: string) => void;
  onRemoveTool: (tool: string) => void; // Added for ActiveToolIndicator
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
  onWebSearchToggle: (checked: boolean) => void;
  onImageDisplayToggle: (checked: boolean) => void;
  onPopoverOpenChange: (open: boolean) => void;
  onSuggestedActionClick: (command: string) => void; // Added for SuggestedActions
}

export function ChatInputArea({
  inputValue,
  isLoading,
  isListening,
  activeTools,
  popoverOpen,
  isWebSearchEnabled,
  imageDisplayMode,
  uploadedFile,
  uploadedFilePreview,
  showSuggestions,
  messagesLength,
  onInputChange,
  onSendMessage,
  onKeyPress,
  onToggleListening,
  onToggleTool,
  onRemoveTool,
  onFileChange,
  onRemoveFile,
  onWebSearchToggle,
  onImageDisplayToggle,
  onPopoverOpenChange,
  onSuggestedActionClick,
}: ChatInputAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="p-4 border-t dark:border-gray-800 bg-background">
      {/* Suggested Actions */}
      {showSuggestions && !isLoading && messagesLength <= 1 && (
        <SuggestedActions onActionClick={onSuggestedActionClick} />
      )}

      {/* Active Tool Indicator */}
      <ActiveToolIndicator activeTools={activeTools} onRemoveTool={onRemoveTool} />

      {/* Input Field and Buttons Row */}
      <div className="flex items-center gap-2 w-full">
        {/* Tool Selection Popover */}
        <Popover open={popoverOpen} onOpenChange={onPopoverOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full flex-shrink-0 w-10 h-10 border-emerald-200 dark:border-emerald-800"
              disabled={isLoading}
            >
              <Plus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 space-y-2">
            <h4 className="font-medium text-sm text-emerald-700 dark:text-emerald-400 mb-2">Công cụ NutriCare</h4>
            {/* Tool Buttons */}
            <Button
              variant={activeTools['menu-daily'] ? 'secondary' : 'outline'}
              className={cn(
                "w-full justify-start h-9",
                activeTools['menu-daily']
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                  : "border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              )}
              onClick={() => onToggleTool('menu-daily')}
              disabled={isLoading}
            >
              <CalendarDays className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Thực đơn ngày
            </Button>
            <Button
              variant={activeTools['menu-weekly'] ? 'secondary' : 'outline'}
              className={cn(
                "w-full justify-start h-9",
                activeTools['menu-weekly']
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                  : "border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              )}
              onClick={() => onToggleTool('menu-weekly')}
              disabled={isLoading}
            >
              <ChefHat className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Thực đơn tuần
            </Button>
            <Button
              variant={activeTools['extended-thinking'] ? 'secondary' : 'outline'}
              className={cn(
                "w-full justify-start h-9",
                activeTools['extended-thinking']
                  ? "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300"
                  : "border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20"
              )}
              onClick={() => onToggleTool('extended-thinking')}
              disabled={isLoading}
            >
              <Brain className="mr-2 h-4 w-4 text-purple-600 dark:text-purple-400" /> Suy luận chi tiết (XAI)
            </Button>
            {/* --- Add Weather Food Suggestion Tool Button --- */}
            <Button
              variant={activeTools['weather-food'] ? 'secondary' : 'outline'}
              className={cn(
                "w-full justify-start h-9",
                activeTools['weather-food']
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                  : "border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              )}
              onClick={() => onToggleTool('weather-food')}
              disabled={isLoading}
            >
              <CloudSun className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" /> Món ăn theo thời tiết
            </Button>

            <Button
              variant={activeTools['emotion-food'] ? 'secondary' : 'outline'}
              className={cn(
                "w-full justify-start h-9",
                activeTools['emotion-food']
                  ? "bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300"
                  : "border-pink-200 dark:border-pink-800 hover:bg-pink-50 dark:hover:bg-pink-900/20"
              )}
              onClick={() => onToggleTool('emotion-food')}
              disabled={isLoading}
            >
              <Smile className="mr-2 h-4 w-4 text-pink-600 dark:text-pink-400" /> Món ăn theo cảm xúc
            </Button>

            <Separator className="my-2" />

            {/* Web Search and Image Display Toggles */}
            <div className="bg-muted/30 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5 text-blue-600" /> Tìm kiếm web
                </span>
                <Switch
                  id="web-search-toggle"
                  checked={isWebSearchEnabled}
                  onCheckedChange={onWebSearchToggle}
                  disabled={isLoading}
                  className="data-[state=checked]:bg-blue-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs flex items-center gap-1.5">
                  <ImageIconLucide className="h-3.5 w-3.5 text-green-600" /> Hiển thị ảnh
                </span>
                <Switch
                  id="image-display-toggle"
                  checked={imageDisplayMode === 'inline'}
                  onCheckedChange={(checked) => onImageDisplayToggle(checked)}
                  disabled={isLoading}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Upload file/image button */}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full flex-shrink-0 w-10 h-10 border-emerald-200 dark:border-emerald-800"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                aria-label="Gửi ảnh hoặc file"
              >
                <Camera className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top"><p>Gửi ảnh món ăn</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf" // Adjust accepted types if needed
          className="hidden"
          onChange={onFileChange}
        />

        {/* Main Input Field */}
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder={Object.keys(activeTools).some(k => activeTools[k]) // Check if any tool is truly active
              ? `Mô tả yêu cầu cho ${
                  activeTools['menu-daily'] ? 'thực đơn ngày' :
                  activeTools['menu-weekly'] ? 'thực đơn tuần' :
                  activeTools['extended-thinking'] ? 'suy luận chi tiết' :
                  activeTools['weather-food'] ? 'món ăn theo thời tiết' :
                  activeTools['emotion-food'] ? 'món ăn theo cảm xúc' :
                  'công cụ đã chọn'
                }...`
              : "Hỏi về dinh dưỡng, món ăn, chế độ ăn uống..."}
            value={inputValue}
            onChange={onInputChange}
            onKeyPress={onKeyPress}
            disabled={isLoading}
            className="flex-1 rounded-full py-2 border bg-white dark:bg-gray-800 focus:ring-emerald-500 focus:border-emerald-500 border-emerald-200 dark:border-emerald-800 w-full pl-4 pr-12" // Added pr-12 for STT button space
          />

          {/* STT Button (inside input) */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute right-1 top-1/2 -translate-y-1/2 rounded-full w-8 h-8",
              isListening && "text-red-500 animate-pulse"
            )}
            disabled={isLoading}
            onClick={onToggleListening}
          >
            {isListening ? <StopCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        </div>

        {/* Send Button */}
        <Button
          onClick={onSendMessage}
          // Disable if loading OR (no text input AND no file uploaded AND no tool active)
          disabled={isLoading || (!inputValue.trim() && !uploadedFile && !Object.values(activeTools).some(v => v))}
          className="rounded-full w-10 h-10 p-0 flex-shrink-0 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
          aria-label="Gửi tin nhắn"
        >
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizontal className="h-5 w-5" />}
        </Button>
      </div>

      {/* Preview uploaded file/image */}
      {uploadedFile && (
        <div className="flex items-center gap-2 mt-3 bg-muted/40 rounded-lg p-2">
          {uploadedFilePreview ? (
            <div className="relative group">
              <img src={uploadedFilePreview} alt="Preview" className="w-20 h-20 object-cover rounded-md border shadow-sm" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-md flex items-center justify-center">
                <p className="text-white text-xs">{uploadedFile.name}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">{uploadedFile.name}</span>
            </div>
          )}
          <Button size="icon" variant="ghost" onClick={onRemoveFile} aria-label="Xóa file" className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
          <p className="text-xs text-muted-foreground ml-auto">
            Bấm Gửi để phân tích ảnh món ăn
          </p>
        </div>
      )}

      {/* Power by badge */}
      <div className="flex justify-center items-center mt-3">
        <span className="text-xs text-muted-foreground">Powered by NutriCare AI Agents</span>
      </div>
    </div>
  );
}
