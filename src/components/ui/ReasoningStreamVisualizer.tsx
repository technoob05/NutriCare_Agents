import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  BrainCircuit, 
  Sparkles,
  Eye,
  EyeOff,
  Copy,
  ArrowDownToLine
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

// Step type for reasoning
export interface ReasoningStep {
  id: string; // Unique identifier for each step
  text: string;
  status: 'pending' | 'running' | 'success' | 'error';
  detail?: string;
  timestamp?: number; // When the step was created/updated
}

interface ReasoningStreamVisualizerProps {
  steps?: ReasoningStep[];
  streamContent?: string;
  isProcessing?: boolean;
  title?: string;
  onCopyContent?: () => void;
  onDownload?: () => void;
  className?: string;
  initiallyExpanded?: boolean;
  maxHeight?: string | number;
  onToggleVisibility?: (isVisible: boolean) => void;
}

export const ReasoningStreamVisualizer: React.FC<ReasoningStreamVisualizerProps> = ({
  steps,
  streamContent,
  isProcessing = false,
  title = 'AI Reasoning Process',
  onCopyContent,
  onDownload,
  className,
  initiallyExpanded = true,
  maxHeight = "400px",
  onToggleVisibility,
}) => {
  const [isVisible, setIsVisible] = useState(initiallyExpanded);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  // Calculate progress based on steps if available
  const completedCount = steps ? steps.filter(s => s.status === 'success' || s.status === 'error').length : 0;
  const totalSteps = steps ? steps.length : 0;
  const progress = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : isProcessing ? 50 : 100;
  
  // Current running step (if any)
  const runningStep = steps?.find(s => s.status === 'running');
  
  // Handle visibility toggle
  const toggleVisibility = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    if (onToggleVisibility) {
      onToggleVisibility(newVisibility);
    }
  };
  
  // Handle copy functionality
  const handleCopy = () => {
    if (!contentRef.current) return;
    
    const textToCopy = streamContent || 
                       (steps ? steps.map(s => `${s.text}${s.detail ? `\n${s.detail}` : ''}`).join('\n\n') : '');
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
    
    if (onCopyContent) onCopyContent();
  };
  
  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (contentRef.current && isVisible && (isProcessing || runningStep)) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [streamContent, steps, isProcessing, isVisible, runningStep]);

  // Icon by status
  const getStatusIcon = (status: ReasoningStep['status']) => {
    switch (status) {
      case 'success': return <CheckCircle2 size={16} className="text-green-500" />;
      case 'error': return <AlertCircle size={16} className="text-red-500" />;
      case 'running': return <Loader2 size={16} className="animate-spin text-blue-500" />;
      default: return <Sparkles size={16} className="text-gray-400" />;
    }
  };
  
  // Format timestamp if available
  const formatTime = (timestamp?: number) => {
    if (!timestamp) return null;
    return new Date(timestamp).toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Variants for animations
  const containerVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { 
      opacity: 1, 
      height: 'auto',
      transition: { 
        duration: 0.3,
        ease: "easeInOut"
      }
    },
    exit: { 
      opacity: 0, 
      height: 0,
      transition: { 
        duration: 0.2,
        ease: "easeInOut"
      }
    }
  };
  
  const stepVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({ 
      opacity: 1, 
      y: 0,
      transition: { 
        delay: i * 0.05,
        duration: 0.3
      }
    }),
  };
  
  return (
    <div 
      className={cn(
        "border rounded-lg shadow-sm w-full max-w-full overflow-hidden transition-all duration-300",
        "bg-gradient-to-b from-purple-50/70 to-white dark:from-purple-900/40 dark:to-gray-900/80",
        "border-purple-200 dark:border-purple-800/70",
        "hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700",
        className
      )}
      aria-labelledby="reasoning-title"
      role="region"
    >
      {/* Header with Toggle and Actions */}
      <div className="flex justify-between items-center px-3 py-2.5 border-b border-purple-100 dark:border-purple-800/50">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: isProcessing ? 360 : 0 }}
            transition={{ duration: 2, repeat: isProcessing ? Infinity : 0, ease: "linear" }}
          >
            <BrainCircuit className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </motion.div>
          
          <h3 
            id="reasoning-title"
            className="text-sm font-semibold tracking-wide text-purple-800 dark:text-purple-300"
          >
            {title}
          </h3>
          
          {isProcessing && (
            <Badge 
              variant="outline" 
              className="ml-2 text-xs py-0 h-5 px-2 bg-purple-100/50 text-purple-700 border-purple-300 
                         dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700"
            >
              Processing
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={300}>
            {/* Copy button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-purple-700 hover:text-purple-900 hover:bg-purple-100 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/40"
                  onClick={handleCopy}
                  aria-label="Copy content"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{copied ? 'Copied!' : 'Copy content'}</p>
              </TooltipContent>
            </Tooltip>
            
            {/* Download button */}
            {onDownload && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-purple-700 hover:text-purple-900 hover:bg-purple-100 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/40"
                    onClick={onDownload}
                    aria-label="Download content"
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Download content</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {/* Toggle visibility button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-purple-700 hover:text-purple-900 hover:bg-purple-100 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/40"
                  onClick={toggleVisibility}
                  aria-expanded={isVisible}
                  aria-label={isVisible ? 'Hide content' : 'Show content'}
                >
                  {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{isVisible ? 'Hide content' : 'Show content'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* Progress indicator */}
      <div className="h-1 w-full bg-gray-100 dark:bg-gray-800">
        <motion.div 
          className="h-full bg-gradient-to-r from-purple-500 to-violet-500 dark:from-purple-600 dark:to-violet-500"
          initial={{ width: 0 }}
          animate={{ 
            width: `${progress}%`,
            transition: { duration: 0.5, ease: "easeInOut" }
          }}
        />
      </div>
      
      {/* Expandable content area */}
      <AnimatePresence initial={false}>
        {isVisible && (
          <motion.div
            key="content"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div 
              ref={contentRef}
              className="p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-200 dark:scrollbar-thumb-purple-800 scrollbar-track-transparent"
              style={{ maxHeight }}
            >
              {/* Render streamed content if available */}
              {streamContent !== undefined ? (
                <div className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed">
                  {streamContent}
                </div>
              ) : steps && steps.length > 0 ? (
                // Render steps if streamContent is not available but steps are
                <ul className="space-y-3">
                  {steps.map((step, idx) => (
                    <motion.li 
                      key={step.id || idx}
                      className={cn(
                        "flex items-start gap-2.5 p-2.5 rounded-md transition-colors",
                        "hover:bg-purple-50/70 dark:hover:bg-purple-900/10",
                        step.status === 'running' && "bg-blue-50/50 dark:bg-blue-900/10",
                        step.status === 'success' && "bg-green-50/30 dark:bg-green-900/5",
                        step.status === 'error' && "bg-red-50/30 dark:bg-red-900/5"
                      )}
                      variants={stepVariants}
                      custom={idx}
                      initial="hidden"
                      animate="visible"
                    >
                      <div className="mt-0.5">
                        {getStatusIcon(step.status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <span className={cn(
                            "text-sm font-medium",
                            step.status === 'success' && "text-green-700 dark:text-green-400",
                            step.status === 'error' && "text-red-700 dark:text-red-400",
                            step.status === 'running' && "text-blue-700 dark:text-blue-300",
                            step.status === 'pending' && "text-gray-700 dark:text-gray-300"
                          )}>
                            {step.text}
                          </span>
                          
                          {step.timestamp && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                              {formatTime(step.timestamp)}
                            </span>
                          )}
                        </div>
                        
                        {step.detail && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ 
                              opacity: 1, 
                              height: 'auto',
                              transition: { duration: 0.2, delay: 0.1 }
                            }}
                            className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-sm border-l-2 border-purple-200 dark:border-purple-700"
                          >
                            {step.detail}
                          </motion.div>
                        )}
                      </div>
                    </motion.li>
                  ))}
                </ul>
              ) : (
                // Fallback if neither streamContent nor steps are provided
                <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500 dark:text-gray-400">
                  <Sparkles className="h-10 w-10 mb-3 text-purple-300 dark:text-purple-700" />
                  <p className="text-sm">No reasoning data available yet.</p>
                  <p className="text-xs mt-1">Reasoning details will appear here when processing begins.</p>
                </div>
              )}
            </div>
            
            {/* Footer with stats (only for steps) */}
            {steps && steps.length > 0 && (
              <div className="flex justify-between items-center w-full text-xs px-4 py-2 border-t border-purple-100 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-900/20">
                <span className="text-purple-700 dark:text-purple-300 font-medium">
                  {progress}% complete
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {completedCount} / {totalSteps} steps {isProcessing && "• Processing..."}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReasoningStreamVisualizer;