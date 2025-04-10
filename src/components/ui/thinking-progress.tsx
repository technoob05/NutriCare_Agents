// src/components/ui/thinking-progress.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, Circle } from 'lucide-react'; // Icons for states

interface ThinkingProgressProps {
  steps: string[];
  isComplete: boolean; // Flag to know if the overall process finished
  hasError: boolean; // Flag if the process ended with an error
}

export function ThinkingProgress({ steps, isComplete, hasError }: ThinkingProgressProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (isComplete || hasError) {
        // If process is done or errored, show all steps potentially (or just the final state)
        setCurrentStepIndex(steps.length); // Mark all as 'processed'
        return;
    }

    // Simulate progress through steps while loading
    const interval = setInterval(() => {
      setCurrentStepIndex((prevIndex) => {
        if (prevIndex < steps.length - 1) {
          return prevIndex + 1;
        }
        clearInterval(interval); // Stop interval when last step is reached
        return prevIndex;
      });
    }, 1500); // Adjust timing as needed (e.g., 1.5 seconds per step)

    return () => clearInterval(interval); // Cleanup interval on unmount or completion
  }, [steps.length, isComplete, hasError]); // Rerun effect if completion status changes

  const getStepStatus = (index: number): 'loading' | 'complete' | 'pending' => {
    if (isComplete && !hasError) return 'complete'; // All complete if finished successfully
    if (hasError && index <= currentStepIndex) return 'complete'; // Show steps processed before error
    if (index < currentStepIndex) return 'complete';
    if (index === currentStepIndex) return 'loading';
    return 'pending';
  };

  const getIcon = (status: 'loading' | 'complete' | 'pending') => {
     switch (status) {
        case 'loading':
            return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
        case 'complete':
            return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'pending':
            return <Circle className="h-4 w-4 text-gray-400" />;
        default:
            return null;
     }
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-700/50 my-2">
      <h4 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Processing steps:</h4>
      <ul className="space-y-2">
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          return (
            <li key={index} className={`flex items-center gap-2 text-sm ${ 
                status === 'complete' ? 'text-green-600 dark:text-green-400' :
                status === 'loading' ? 'text-blue-600 dark:text-blue-400 font-medium' :
                'text-gray-500 dark:text-gray-400'
            }`}>
              {getIcon(status)}
              <span>{step}</span>
            </li>
          );
        })}
         {/* Optional: Add a final status message */}
         {isComplete && !hasError && (
             <li className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium mt-3">
                <CheckCircle className="h-4 w-4" />
                <span>Processing complete!</span>
             </li>
         )}
         {hasError && (
             <li className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 font-medium mt-3">
                 {/* Consider a specific error icon */}
                <CheckCircle className="h-4 w-4" />
                <span>Finished processing (encountered error).</span>
             </li>
         )}
      </ul>
    </div>
  );
}
