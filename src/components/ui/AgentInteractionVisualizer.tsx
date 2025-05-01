'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Bot, User, ArrowRight, BrainCircuit, Database, Search, CheckCircle, XCircle } from 'lucide-react'; // Example icons

// Define the structure of a single interaction step
export interface AgentInteractionStep {
  id: string | number;
  agentName: string;
  action: string; // e.g., 'Thinking', 'Searching Web', 'Accessing Database', 'Generating Response'
  details?: string | React.ReactNode; // More detailed information or data snippet
  status: 'processing' | 'success' | 'error' | 'complete';
  timestamp?: string;
  data?: any; // Optional raw data associated with the step
  icon?: React.ReactNode; // Optional custom icon
}

// Define the props for the visualizer component
interface AgentInteractionVisualizerProps {
  interactionSteps: AgentInteractionStep[];
  title?: string;
  className?: string;
}

// Helper to get an icon based on action/status
const getStepIcon = (step: AgentInteractionStep): React.ReactNode => {
  if (step.icon) return step.icon;
  if (step.status === 'error') return <XCircle className="h-5 w-5 text-destructive" />;
  if (step.status === 'success' || step.status === 'complete') return <CheckCircle className="h-5 w-5 text-green-500" />;

  switch (step.action.toLowerCase()) {
    case 'thinking':
    case 'processing':
    case 'analyzing':
      return <BrainCircuit className="h-5 w-5 text-blue-500 animate-pulse" />;
    case 'searching web':
      return <Search className="h-5 w-5 text-purple-500" />;
    case 'accessing database':
    case 'retrieving data':
      return <Database className="h-5 w-5 text-orange-500" />;
    case 'user input':
      return <User className="h-5 w-5 text-gray-600" />;
    case 'generating response':
    case 'agent response':
      return <Bot className="h-5 w-5 text-teal-500" />;
    default:
      return <ArrowRight className="h-5 w-5 text-gray-400" />;
  }
};

export const AgentInteractionVisualizer: React.FC<AgentInteractionVisualizerProps> = ({
  interactionSteps = [],
  title = 'Luồng Tương Tác Agents',
  className,
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1, // Stagger animation for each step
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <Card className={cn('w-full shadow-lg border border-border/40', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
          <Bot className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4 -mr-4"> {/* Adjust height as needed */}
          <motion.div
            className="space-y-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence initial={false}>
              {interactionSteps.map((step, index) => (
                <motion.div
                  key={step.id}
                  layout // Animate layout changes
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border transition-all duration-300 ease-in-out',
                    step.status === 'processing' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/30' :
                    step.status === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/30' :
                    step.status === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/30' :
                    'bg-background border-border/50'
                  )}
                >
                  <div className="flex-shrink-0 pt-1">
                    {getStepIcon(step)}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-foreground truncate mr-2">
                        {step.agentName || 'Hệ thống'}
                      </span>
                      <Badge
                        variant={step.status === 'error' ? 'destructive' : step.status === 'processing' ? 'secondary' : 'outline'}
                        className="text-xs capitalize flex-shrink-0"
                      >
                        {step.action}
                      </Badge>
                    </div>
                    {step.details && (
                      <div className="text-xs text-muted-foreground break-words">
                        {typeof step.details === 'string' ? (
                          <p>{step.details}</p>
                        ) : (
                          step.details
                        )}
                      </div>
                    )}
                    {step.timestamp && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">
                        {step.timestamp}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};