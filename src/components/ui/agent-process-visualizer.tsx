'use client';

import React, {useState, useEffect} from 'react';
import {motion, AnimatePresence} from 'framer-motion'; // Ensure framer-motion is installed
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  CheckCircle2,
  XCircle,
  SkipForward,
  Clock,
  LogIn,
  LogOut,
  AlertCircle,
  Sparkles,
  BrainCircuit,
  SearchCheck,
  FileText,
  Paintbrush,
  BookOpenText,
  Loader2,
} from 'lucide-react';
import {type StepTrace} from '@/ai/flows/generate-menu-from-preferences';
import {Progress} from '@/components/ui/progress'; // Import Progress component

interface AgentProcessVisualizerProps {
  trace: StepTrace[]; // Receive the full trace from backend
}

// Helper maps and functions remain the same...
const stepIcons: Record<string, React.ElementType> = {
  'Recipe Search (RAG)': SearchCheck,
  'Menu Planning': BrainCircuit,
  'Menu Content Generation': FileText,
  'Feedback Request Generation': Sparkles,
  'Final Formatting': Paintbrush,
};

// Helper to format data for display
function formatTraceData(data: any): string {
  if (data === undefined || data === null) return 'N/A';
  if (typeof data === 'string') return data;
  try {
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return String(data);
  }
}

// Helper to get status icon
const getStatusIcon = (status: StepTrace['status']) => {
  const size = 16;
  switch (status) {
    case 'success':
      return <CheckCircle2 size={size} className="text-green-500" />;
    case 'error':
      return <XCircle size={size} className="text-red-500" />;
    case 'skipped':
      return <SkipForward size={size} className="text-yellow-500" />;
    default:
      return <Sparkles size={size} className="text-gray-400" />;
  }
};

export function AgentProcessVisualizer({trace}: AgentProcessVisualizerProps) {
  const [revealedSteps, setRevealedSteps] = useState<StepTrace[]>([]); // State for visible steps
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]); // State to keep last item open
  const [progress, setProgress] = useState(0); // State for overall progress

  useEffect(() => {
    if (!trace || trace.length === 0) {
      setRevealedSteps([]); // Clear if trace is empty/null
      setProgress(0);
      setOpenAccordionItems([]);
      return;
    }

    // Reset revealed steps and progress when a new trace comes in
    setRevealedSteps([]);
    setProgress(0);
    setOpenAccordionItems([]);

    let stepIndex = 0;
    const totalSteps = trace.length;
    const interval = setInterval(() => {
      if (stepIndex < totalSteps) {
        // Add next step and automatically open its accordion item
        const nextStep = trace[stepIndex];
        const newItemValue = `item-${stepIndex}`;
        setRevealedSteps(prev => [...prev, nextStep]);
        setOpenAccordionItems([newItemValue]); // Keep only the latest item open
        stepIndex++;

        // Update progress
        const newProgress = Math.round((stepIndex / totalSteps) * 100);
        setProgress(newProgress);
      } else {
        clearInterval(interval); // Stop when all steps are revealed
      }
    }, 1500); // Adjust reveal speed (e.g., 1.5 seconds per step)

    return () => clearInterval(interval); // Cleanup on unmount or new trace
  }, [trace]); // Rerun effect when the trace prop changes

  if (!trace || trace.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Waiting for processing trace...
      </div>
    );
  }

  const allStepsCompleted = revealedSteps.length === trace.length;
  const hasError = trace.some(step => step.status === 'error');

  return (
    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/60 my-2 shadow-md w-full">
      <h4 className="text-sm font-semibold mb-3 text-gray-800 dark:text-gray-200">
        AI Processing Trace:
      </h4>
      {/* Overall Progress Bar */}
      <Progress value={progress} className="mb-3" />
      {/* Display completion or error message */}
      {allStepsCompleted && !hasError && (
        <motion.div
          className="text-green-500 text-sm font-medium mb-2"
          initial={{opacity: 0, y: -10}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.5}}
        >
          <CheckCircle2 className="inline-block mr-1 h-4 w-4 align-middle" />
          Processing complete!
        </motion.div>
      )}
      {hasError && (
        <motion.div
          className="text-red-500 text-sm font-medium mb-2"
          initial={{opacity: 0, y: -10}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.5}}
        >
          <AlertCircle className="inline-block mr-1 h-4 w-4 align-middle" />
          Processing encountered an error. See details below.
        </motion.div>
      )}
      {/* Use value and onValueChange for controlled Accordion */}
      <Accordion
        type="multiple"
        className="w-full"
        value={openAccordionItems}
        onValueChange={setOpenAccordionItems}
      >
        <AnimatePresence initial={false}>
          {revealedSteps.map((step, index) => {
            const IconComponent = stepIcons[step.stepName] || Sparkles;
            const outputData = step.outputData;
            const isPlanningStep = step.stepName === 'Menu Planning';
            const itemValue = `item-${index}`;
            const isComplete = step.status === 'success';
            const isError = step.status === 'error';

            return (
              <motion.div
                key={itemValue} // Use unique value for key
                initial={{opacity: 0, height: 0}}
                animate={{opacity: 1, height: 'auto'}}
                exit={{opacity: 0, height: 0}}
                transition={{duration: 0.4, ease: 'easeInOut'}}
                style={{overflow: 'hidden'}} // Important for height animation
              >
                <AccordionItem value={itemValue} className="border-b border-border/60">
                  <AccordionTrigger
                    className={`flex items-center gap-2 text-sm font-medium rounded-md px-3 py-2 transition-colors hover:bg-muted/50 ${
                      step.status === 'error'
                        ? 'text-red-600 dark:text-red-400'
                        : step.status === 'skipped'
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {/* Trigger content remains the same */}
                    <div className="flex items-center gap-2 flex-grow">
                      {isComplete ? (
                        <motion.span
                          initial={{scale: 0}}
                          animate={{scale: 1}}
                          transition={{duration: 0.3}}
                        >
                          {getStatusIcon(step.status)}
                        </motion.span>
                      ) : isError ? (
                        <motion.span
                          initial={{rotate: 0}}
                          animate={{rotate: 360}}
                          transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            ease: 'linear',
                          }}
                        >
                          {getStatusIcon(step.status)}
                        </motion.span>
                      ) : (
                        <motion.span
                          initial={{opacity: 0}}
                          animate={{opacity: 1}}
                          transition={{duration: 0.5}}
                        >
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        </motion.span>
                      )}
                      <IconComponent size={16} className="text-muted-foreground" />
                      <span>{step.stepName}</span>
                    </div>
                    {step.durationMs !== undefined && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto pr-2">
                        <Clock size={12} /> {step.durationMs}ms
                      </span>
                    )}
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pt-2 pb-4 text-xs space-y-3 bg-white dark:bg-gray-800 rounded-b-md">
                    {/* Increased space-y */}
                    {/* Input Data */}
                    {step.inputData !== undefined && (
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-1">
                          <LogIn size={14} /> Input:
                        </span>
                        <pre className="whitespace-pre-wrap bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-800 dark:text-gray-200 text-[11px] max-h-40 overflow-auto">
                          {formatTraceData(step.inputData)}
                        </pre>
                      </div>
                    )}
                    {/* Reasoning (Specific to Planning Step) */}
                    {isPlanningStep && outputData?.reasoning && (
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-1">
                          <BookOpenText size={14} /> Reasoning:
                        </span>
                        {/* Display reasoning as formatted text, not pre */}
                        <p className="whitespace-pre-line bg-blue-50 dark:bg-blue-900/30 p-2 rounded text-blue-800 dark:text-blue-200 text-[11px]">
                          {String(outputData.reasoning)}
                        </p>
                      </div>
                    )}
                    {/* Output Data (Plan for Planning, Request for Feedback, Menu for Writing, etc.) */}
                    {outputData !== undefined && (
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-1">
                          <LogOut size={14} /> Output:
                        </span>
                        {/* For planning step, show only the 'plan' part in the main output pre */}
                        <pre className="whitespace-pre-wrap bg-gray-100 dark:bg-gray-700 p-2 rounded text-gray-800 dark:text-gray-200 text-[11px] max-h-40 overflow-auto">
                          {isPlanningStep
                            ? formatTraceData({plan: outputData.plan})
                            : formatTraceData(outputData)}
                        </pre>
                      </div>
                    )}
                    {/* Error Details */}
                    {step.status === 'error' && step.errorDetails && (
                      <div className="flex flex-col mt-2">
                        <span className="font-medium text-red-600 dark:text-red-400 flex items-center gap-1 mb-1">
                          <AlertCircle size={14} /> Error Details:
                        </span>
                        <pre className="whitespace-pre-wrap bg-red-50 dark:bg-red-900/30 p-2 rounded text-red-700 dark:text-red-300 text-[11px]">
                          {step.errorDetails}
                        </pre>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </Accordion>
    </div>
  );
}
