'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BrainCircuit, // Reasoning/Planning
    Cog,          // Settings/Processing
    Database,     // Generic Database
    DatabaseZap,  // RAG (Search/Query)
    CheckCircle,  // Check Mark
    ArrowRightLeft, // Interaction
    Zap,          // Action/Trigger
    Loader,       // Loader Icon
    Bot,          // Bot Icon
    TerminalSquare, // Prompt/Input Icon
    Edit3,        // Writer (Pencil Icon)
    ListChecks,   // Formatter/Menu (Checklist Icon)
    SearchCheck,  // RAG with check
    CircleDot     // Progress indicator
} from 'lucide-react';

// Animation presets for consistent behavior
const ANIMATION_PRESETS = {
  // Standard timing for smooth animations
  standardTiming: {
    staggerChildren: 0.3,
    duration: 0.6,
    bounce: 0.2,
    stiffness: 90,
    damping: 12
  },
  // Subtle pulse animation for visual interest without distraction
  subtlePulse: {
    scale: [0.95, 1.05, 0.95],
    opacity: [0.7, 1, 0.7],
    duration: 2.0,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

// --- Variant 1: Sequential Steps (Icon Only) ---
const SequentialStepsAnimation = ({ completed = [] }: { completed: number[] }) => {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: ANIMATION_PRESETS.standardTiming.staggerChildren,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                type: 'spring',
                stiffness: ANIMATION_PRESETS.standardTiming.stiffness,
                opacity: { repeat: Infinity, repeatType: 'reverse', duration: 1.5, delay: 0.3 },
            },
        },
    };

    const icons = [BrainCircuit, Cog, DatabaseZap, CheckCircle];

    return (
        <motion.div
            className="flex items-center justify-center space-x-4 p-2"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            role="status"
            aria-label="Processing request"
        >
            {icons.map((Icon, i) => (
                <motion.div key={i} variants={itemVariants} className="relative">
                    <Icon 
                        className={`w-5 h-5 ${completed.includes(i) ? 'text-green-500' : 'text-blue-500'}`}
                        aria-hidden="true" 
                    />
                    {completed.includes(i) && (
                        <motion.div 
                            className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring' }}
                        />
                    )}
                </motion.div>
            ))}
            <motion.div
                 className="w-1.5 h-1.5 bg-blue-400 rounded-full"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: [0, 1, 0]}}
                 transition={{ delay: 0.2, duration: 1, repeat: Infinity }}
                 aria-hidden="true"
            />
        </motion.div>
    );
};

// --- Variant 2: Connecting Nodes (Network) ---
const ConnectingNodesAnimation = () => {
    const nodeVariants = {
        initial: { scale: 0.8, opacity: 0.7 },
        animate: (i: number) => ({
            scale: ANIMATION_PRESETS.subtlePulse.scale,
            opacity: ANIMATION_PRESETS.subtlePulse.opacity,
            transition: {
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2, 
                ease: "easeInOut",
            },
        }),
    };

    const lineVariants = {
         hidden: { pathLength: 0, opacity: 0 },
         visible: (i: number) => ({
             pathLength: 1,
             opacity: 1,
             transition: {
                 pathLength: { delay: i * 0.3, type: "spring", duration: 0.8, bounce: 0 },
                 opacity: { delay: i * 0.3, duration: 0.01 }
             }
         })
     };

    return (
        <div 
            className="flex items-center justify-center p-2 h-12 relative"
            role="status"
            aria-label="Processing network"
        >
            {/* Nodes (Agents) */}
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={`node-${i}`}
                    className="w-4 h-4 mx-8 bg-gradient-to-br from-purple-600 to-indigo-700 dark:from-purple-500 
                               dark:to-indigo-600 rounded-full z-10 shadow-md"
                    variants={nodeVariants}
                    initial="initial"
                    animate="animate"
                    custom={i}
                    aria-hidden="true"
                />
            ))}

             {/* Connection lines (SVG for flexibility) */}
             <svg className="absolute w-full h-full top-0 left-0 overflow-visible" aria-hidden="true">
                 {/* Line 1 */}
                 <motion.line
                     x1="25%" y1="50%" x2="49%" y2="50%"
                     stroke="url(#gradientLine1)"
                     strokeWidth="2"
                     strokeLinecap="round"
                     variants={lineVariants}
                     initial="hidden"
                     animate="visible"
                     custom={0}
                 />
                 {/* Line 2 */}
                  <motion.line
                     x1="51%" y1="50%" x2="75%" y2="50%"
                     stroke="url(#gradientLine2)"
                     strokeWidth="2"
                     strokeLinecap="round"
                     variants={lineVariants}
                     initial="hidden"
                     animate="visible"
                     custom={1}
                 />
                 
                 {/* Gradient definitions for prettier lines */}
                 <defs>
                     <linearGradient id="gradientLine1" x1="0%" y1="0%" x2="100%" y2="0%">
                         <stop offset="0%" stopColor="rgba(139, 92, 246, 0.6)" /> {/* purple-500 */}
                         <stop offset="100%" stopColor="rgba(99, 102, 241, 0.6)" /> {/* indigo-500 */}
                     </linearGradient>
                     <linearGradient id="gradientLine2" x1="0%" y1="0%" x2="100%" y2="0%">
                         <stop offset="0%" stopColor="rgba(99, 102, 241, 0.6)" /> {/* indigo-500 */}
                         <stop offset="100%" stopColor="rgba(139, 92, 246, 0.6)" /> {/* purple-500 */}
                     </linearGradient>
                 </defs>
             </svg>
        </div>
    );
};

// --- Variant 3: Processing Cycle ---
const ProcessingCycleAnimation = () => {
    return (
        <div 
            className="flex items-center justify-center p-2 space-x-3"
            role="status"
            aria-label="Processing"
        >
            <motion.div
                animate={{ rotate: 360 }}
                transition={{
                    repeat: Infinity,
                    duration: 2,
                    ease: 'linear',
                }}
                className="relative"
                aria-hidden="true"
            >
                <Cog className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                <motion.div 
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{ rotate: -360 }} // Counter-rotate
                    transition={{
                        repeat: Infinity,
                        duration: 3,
                        ease: 'linear',
                    }}
                >
                    <Cog className="w-3 h-3 text-blue-500" />
                </motion.div>
            </motion.div>
            
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Processing...</span>
            
            <div className="flex space-x-1">
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={`dot-${i}`}
                        className="w-1.5 h-1.5 bg-gray-500 dark:bg-gray-400 rounded-full"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{
                            duration: 1, 
                            repeat: Infinity, 
                            ease: "easeInOut",
                            delay: i * 0.2
                        }}
                        aria-hidden="true"
                    />
                ))}
            </div>
        </div>
    );
};

// --- Variant 4: Prompt and Bot (Interaction) ---
const PromptBotAnimation = () => {
     const containerVariants = {
         hidden: { opacity: 0 },
         visible: { opacity: 1, transition: { staggerChildren: 0.4 } },
     };
     const itemVariants = {
         hidden: { opacity: 0, scale: 0.5 },
         visible: { opacity: 1, scale: 1 },
     };
     const arrowVariants = {
         hidden: { opacity: 0 },
         visible: {
             opacity: [0.4, 1, 0.4],
             x: [-3, 3, -3],
             transition: {
                 duration: 1.2,
                 repeat: Infinity,
                 ease: "easeInOut",
                 delay: 0.4,
             }
         }
     };

     return (
         <motion.div
             className="flex items-center justify-center space-x-3 py-2 px-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 shadow-sm"
             variants={containerVariants}
             initial="hidden"
             animate="visible"
             role="status"
             aria-label="Prompt and bot interaction"
         >
             <motion.div variants={itemVariants} className="flex items-center justify-center p-1.5 bg-green-100 dark:bg-green-900/20 rounded-full">
                 <TerminalSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
             </motion.div>
             
             <motion.div 
                variants={arrowVariants}
                className="flex flex-col items-center"
             >
                <ArrowRightLeft className="w-5 h-5 text-gray-400" />
                <span className="text-xs text-gray-500 mt-1">Processing</span>
             </motion.div>
             
             <motion.div variants={itemVariants} className="flex items-center justify-center p-1.5 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                 <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
             </motion.div>
         </motion.div>
     );
 };

// --- Variant 5: Sequential Steps With Text (Enhanced) ---
type StepType = {
    Icon: React.ElementType;
    text: string;
    color: string;
};

const SequentialStepsWithTextAnimation = ({ 
    currentStep = 0, 
    steps = [
        { Icon: SearchCheck, text: "RAG: Searching for relevant information...", color: "text-teal-500" },
        { Icon: BrainCircuit, text: "Planning: Analyzing requirements...", color: "text-purple-500" },
        { Icon: Edit3, text: "Writing: Drafting response...", color: "text-orange-500" },
        { Icon: ListChecks, text: "Formatting: Organizing content...", color: "text-sky-500" },
    ] 
}: {
    currentStep?: number;
    steps?: StepType[];
}) => {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.5,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, x: -10 },
        visible: (i: number) => ({
            opacity: i <= currentStep ? 1 : 0.5,
            x: 0,
            transition: {
                type: 'spring',
                stiffness: ANIMATION_PRESETS.standardTiming.stiffness,
                damping: ANIMATION_PRESETS.standardTiming.damping
            },
        }),
    };

    // Progress calculation
    const progressPercent = ((currentStep + 1) / steps.length) * 100;

    return (
        <motion.div
            // Removed min-w classes to allow shrinking
            className="flex flex-col items-center justify-center p-4 rounded-lg bg-white dark:bg-gray-800
                       border border-gray-100 dark:border-gray-700 shadow-sm"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            role="status"
            aria-label="Processing steps"
        >
            {/* Progress bar */}
            <div className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full mb-1 overflow-hidden">
                <motion.div 
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.3 }}
                />
            </div>
            
            {steps.map((step, i) => (
                <motion.div
                    key={i}
                    className={`flex items-center space-x-3 w-full py-1 ${i === currentStep ? 'animate-pulse-subtle' : ''}`}
                    variants={itemVariants}
                    custom={i}
                >
                    <div className={`flex items-center justify-center p-1 rounded-full
                                    ${i < currentStep ? 'bg-green-100 dark:bg-green-900/20' : 
                                      i === currentStep ? 'bg-blue-100 dark:bg-blue-900/20' : 
                                      'bg-gray-100 dark:bg-gray-700/50'}`}>
                        {i < currentStep ? (
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : (
                            <step.Icon 
                                className={`w-4 h-4 ${
                                    i === currentStep ? step.color : 'text-gray-400 dark:text-gray-500'
                                } flex-shrink-0`} 
                            />
                        )}
                    </div>
                    
                    <span className={`text-sm font-medium ${
                        i < currentStep ? 'text-gray-600 dark:text-gray-300' : 
                        i === currentStep ? 'text-gray-900 dark:text-gray-100' : 
                        'text-gray-400 dark:text-gray-500'
                    }`}>
                        {step.text}
                    </span>
                    
                    {i === currentStep && (
                        <div className="flex ml-auto space-x-1">
                            {[0, 1, 2].map(dotIndex => (
                                <motion.div
                                    key={dotIndex}
                                    className="w-1 h-1 bg-blue-500 dark:bg-blue-400 rounded-full"
                                    animate={{ 
                                        scale: [1, 1.3, 1], 
                                        opacity: [0.5, 1, 0.5] 
                                    }}
                                    transition={{
                                        delay: dotIndex * 0.2,
                                        duration: 0.8,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                    aria-hidden="true"
                                />
                            ))}
                        </div>
                    )}
                </motion.div>
            ))}
            
            <div className="flex justify-between w-full text-xs text-gray-400 dark:text-gray-500 pt-2">
                <span>{Math.round(progressPercent)}% complete</span>
                <span>{currentStep + 1} of {steps.length}</span>
            </div>
        </motion.div>
    );
};

// --- Main Component (Enhanced) ---
const AgentThinkingAnimation = ({
    variant = 'stepsWithText',
    className = '',
    currentStep = 1,
    isComplete = false,
    completedSteps = [],
    customSteps = null,
    showLabels = true,
}: {
    variant?: 'sequential' | 'nodes' | 'cycle' | 'promptBot' | 'stepsWithText';
    className?: string;
    currentStep?: number;
    isComplete?: boolean;
    completedSteps?: number[];
    customSteps?: Array<{Icon: any; text: string; color: string}> | null;
    showLabels?: boolean;
}) => {
    // Use state to track simulated progress if needed
    const [progress, setProgress] = useState(currentStep);
    
    // Optionally add automatic progression simulation
    useEffect(() => {
        if (isComplete) return;
        
        const timer = setTimeout(() => {
            if (variant === 'stepsWithText' && progress < 3) {
                setProgress(prev => prev + 1);
            }
        }, 2000);
        
        return () => clearTimeout(timer);
    }, [progress, isComplete, variant]);

    // Responsive class adjustments
    const responsiveClasses = `
        ${className}
        transition-all duration-300
        sm:transform sm:hover:scale-[1.02]
    `;

    const renderAnimation = () => {
        switch (variant) {
            case 'stepsWithText':
                return (
                    <SequentialStepsWithTextAnimation 
                        currentStep={isComplete ? 3 : progress} 
                        steps={customSteps || undefined}
                    />
                );
            case 'nodes':
                return <ConnectingNodesAnimation />;
            case 'cycle':
                return <ProcessingCycleAnimation />;
            case 'promptBot':
                return <PromptBotAnimation />;
            case 'sequential':
                return <SequentialStepsAnimation completed={completedSteps} />;
            default:
                return <SequentialStepsWithTextAnimation currentStep={isComplete ? 3 : progress} />;
        }
    };

    return (
        <div 
            className={`inline-block ${responsiveClasses}`}
            aria-live="polite"
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={variant}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                >
                    {renderAnimation()}
                </motion.div>
            </AnimatePresence>
            
            {showLabels && variant !== 'stepsWithText' && variant !== 'promptBot' && (
                <div className="mt-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                    {isComplete ? 'Complete' : 'Processing...'}
                </div>
            )}
        </div>
    );
};

export default AgentThinkingAnimation;

// Add these to your global CSS for the subtle animation
/*
@keyframes pulse-subtle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

.animate-pulse-subtle {
  animation: pulse-subtle 2s ease-in-out infinite;
}
*/
