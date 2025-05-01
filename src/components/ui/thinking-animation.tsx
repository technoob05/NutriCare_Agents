'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Apple,        // Nutrition icon
    HeartPulse,   // Health monitoring
    Microscope,   // Analysis
    ClipboardCheck, // Recommendations
    CheckCircle,  // Check Mark
    ArrowRightLeft, // Interaction
    Dumbbell,     // Fitness
    Loader,       // Loader Icon
    Bot,          // Bot Icon
    Salad,        // Healthy Food
    Utensils,     // Meal Planning
    ListChecks,   // Formatter/Menu
    SearchCheck,  // Search with check
    CircleDot,    // Progress indicator
    Brain,        // Intelligence/Analysis
    Calculator    // Nutrient Calculation
} from 'lucide-react';

// Animation timing presets
const ANIMATION_PRESETS = {
  standardTiming: {
    staggerChildren: 0.3,
    duration: 0.6,
    bounce: 0.2,
    stiffness: 100,
    damping: 15
  },
  subtlePulse: {
    scale: [0.97, 1.03, 0.97],
    opacity: [0.8, 1, 0.8],
    duration: 2.0,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

// Nutricare brand colors - can be adjusted based on actual brand guidelines
const NUTRICARE_COLORS = {
  primary: "text-emerald-600 dark:text-emerald-500",
  secondary: "text-teal-500 dark:text-teal-400",
  accent: "text-amber-500 dark:text-amber-400",
  highlight: "text-sky-500 dark:text-sky-400",
  neutral: "text-gray-600 dark:text-gray-400",
  success: "text-green-600 dark:text-green-500",
  
  // Background colors
  primaryBg: "bg-emerald-100 dark:bg-emerald-900/20",
  secondaryBg: "bg-teal-100 dark:bg-teal-900/20",
  accentBg: "bg-amber-100 dark:bg-amber-900/20",
  highlightBg: "bg-sky-100 dark:bg-sky-900/20",
  neutralBg: "bg-gray-100 dark:bg-gray-800/40",
  successBg: "bg-green-100 dark:bg-green-900/20",
  
  // Gradient
  gradient: "from-emerald-500 to-teal-500"
};

// --- Variant 1: Nutrition Assessment Steps ---
const NutritionStepsAnimation = ({ completed = [] }: { completed: number[] }) => {
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
        hidden: { opacity: 0, y: 12 },
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

    // Health-focused icons
    const icons = [Apple, Microscope, HeartPulse, ClipboardCheck];
    const labels = ["Intake", "Analysis", "Health", "Plan"];

    return (
        <motion.div
            className="flex items-center justify-center space-x-4 p-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            role="status"
            aria-label="Nutrition assessment in progress"
        >
            {icons.map((Icon, i) => (
                <motion.div key={i} variants={itemVariants} className="relative flex flex-col items-center">
                    <div className={`p-2 rounded-full ${completed.includes(i) ? NUTRICARE_COLORS.successBg : NUTRICARE_COLORS.primaryBg}`}>
                        <Icon 
                            className={`w-5 h-5 ${completed.includes(i) ? NUTRICARE_COLORS.success : NUTRICARE_COLORS.primary}`}
                            aria-hidden="true" 
                        />
                    </div>
                    <span className={`text-xs mt-1 font-medium ${completed.includes(i) ? "text-green-600 dark:text-green-500" : "text-gray-500 dark:text-gray-400"}`}>
                        {labels[i]}
                    </span>
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
                 className="w-1.5 h-1.5 bg-emerald-400 rounded-full"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: [0, 1, 0]}}
                 transition={{ delay: 0.2, duration: 1, repeat: Infinity }}
                 aria-hidden="true"
            />
        </motion.div>
    );
};

// --- Variant 2: Nutrient Analysis Network ---
const NutrientNetworkAnimation = () => {
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

    // Icons for nutrient analysis
    const nodeIcons = [
        <Apple className="w-3.5 h-3.5 text-white" />,
        <Calculator className="w-3.5 h-3.5 text-white" />,
        <ClipboardCheck className="w-3.5 h-3.5 text-white" />
    ];

    return (
        <div 
            className="flex items-center justify-center p-2 h-16 relative"
            role="status"
            aria-label="Analyzing nutrients"
        >
            {/* Nodes (Nutrition Elements) */}
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={`node-${i}`}
                    className="w-6 h-6 mx-8 bg-gradient-to-br from-emerald-600 to-teal-700 dark:from-emerald-500 
                               dark:to-teal-600 rounded-full z-10 shadow-md flex items-center justify-center"
                    variants={nodeVariants}
                    initial="initial"
                    animate="animate"
                    custom={i}
                    aria-hidden="true"
                >
                    {nodeIcons[i]}
                </motion.div>
            ))}

             {/* Connection lines (SVG) */}
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
                         <stop offset="0%" stopColor="rgba(16, 185, 129, 0.6)" /> {/* emerald-500 */}
                         <stop offset="100%" stopColor="rgba(20, 184, 166, 0.6)" /> {/* teal-500 */}
                     </linearGradient>
                     <linearGradient id="gradientLine2" x1="0%" y1="0%" x2="100%" y2="0%">
                         <stop offset="0%" stopColor="rgba(20, 184, 166, 0.6)" /> {/* teal-500 */}
                         <stop offset="100%" stopColor="rgba(16, 185, 129, 0.6)" /> {/* emerald-500 */}
                     </linearGradient>
                 </defs>
             </svg>
             
             {/* Labels under nodes */}
             <div className="absolute w-full flex justify-between px-12 text-xs text-gray-500 dark:text-gray-400 font-medium" style={{top: "70%"}}>
                <span>Nutrition</span>
                <span>Analysis</span>
                <span>Results</span>
             </div>
        </div>
    );
};

// --- Variant 3: Nutrition Processing Animation ---
const NutritionProcessingAnimation = () => {
    return (
        <div 
            className="flex items-center justify-center p-3 space-x-4"
            role="status"
            aria-label="Processing nutrition data"
        >
            <motion.div
                animate={{ rotate: 360 }}
                transition={{
                    repeat: Infinity,
                    duration: 2,
                    ease: 'linear',
                }}
                className="relative bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20 p-2 rounded-full"
                aria-hidden="true"
            >
                <Brain className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <motion.div 
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{ rotate: -360 }} // Counter-rotate
                    transition={{
                        repeat: Infinity,
                        duration: 3,
                        ease: 'linear',
                    }}
                >
                    <motion.div 
                        className="w-2 h-2 bg-teal-500 rounded-full"
                        animate={{ 
                            opacity: [0.6, 1, 0.6],
                            scale: [0.8, 1.2, 0.8] 
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                </motion.div>
            </motion.div>
            
            <div className="flex flex-col">
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Analyzing nutrients</span>
                <div className="flex space-x-1 mt-1">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={`dot-${i}`}
                            className="w-1.5 h-1.5 bg-teal-500 dark:bg-teal-400 rounded-full"
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
        </div>
    );
};

// --- Variant 4: Nutrition Bot Interaction ---
const NutritionBotAnimation = () => {
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
             aria-label="Nutrition bot interaction"
         >
             <motion.div variants={itemVariants} className={`flex items-center justify-center p-1.5 ${NUTRICARE_COLORS.primaryBg} rounded-full`}>
                 <Salad className={`w-4 h-4 ${NUTRICARE_COLORS.primary}`} />
             </motion.div>
             
             <motion.div 
                variants={arrowVariants}
                className="flex flex-col items-center"
             >
                <ArrowRightLeft className="w-5 h-5 text-gray-400" />
                <span className="text-xs text-gray-500 mt-1">Analyzing</span>
             </motion.div>
             
             <motion.div variants={itemVariants} className="flex items-center justify-center p-1.5 bg-emerald-100 dark:bg-emerald-900/20 rounded-full">
                 <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
             </motion.div>
         </motion.div>
     );
};

// --- Variant 5: Detailed Nutrition Analysis Steps ---
type StepType = {
    Icon: React.ElementType;
    text: string;
    color: string;
};

const NutritionStepsWithTextAnimation = ({ 
    currentStep = 0, 
    steps = [
        { Icon: Apple, text: "Analyzing nutrient intake...", color: "text-emerald-600 dark:text-emerald-400" },
        { Icon: Calculator, text: "Calculating nutritional requirements...", color: "text-teal-600 dark:text-teal-400" },
        { Icon: HeartPulse, text: "Assessing health parameters...", color: "text-amber-600 dark:text-amber-400" },
        { Icon: ClipboardCheck, text: "Generating personalized recommendations...", color: "text-sky-600 dark:text-sky-400" },
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
            className="flex flex-col items-center justify-center p-4 rounded-lg bg-white dark:bg-gray-800
                       border border-gray-100 dark:border-gray-700 shadow-sm"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            role="status"
            aria-label="Nutrition analysis progress"
        >
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full mb-2 overflow-hidden">
                <motion.div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.3 }}
                />
            </div>
            
            {steps.map((step, i) => (
                <motion.div
                    key={i}
                    className={`flex items-center space-x-3 w-full py-1.5 ${i === currentStep ? 'animate-pulse-subtle' : ''}`}
                    variants={itemVariants}
                    custom={i}
                >
                    <div className={`flex items-center justify-center p-1.5 rounded-full
                                    ${i < currentStep ? NUTRICARE_COLORS.successBg : 
                                      i === currentStep ? NUTRICARE_COLORS.primaryBg : 
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
                                    className="w-1.5 h-1.5 bg-emerald-500 dark:bg-emerald-400 rounded-full"
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

// --- Variant 6: Meal Plan Generation (New Variant) ---
const MealPlanAnimation = () => {
    const mealItems = [
        { name: "Breakfast", done: true },
        { name: "Lunch", done: true },
        { name: "Dinner", done: false },
        { name: "Snacks", done: false }
    ];

    return (
        <motion.div
            className="flex flex-col p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            role="status"
            aria-label="Generating meal plan"
        >
            <div className="flex items-center mb-2">
                <Utensils className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Creating Meal Plan</span>
            </div>

            <div className="space-y-2">
                {mealItems.map((meal, i) => (
                    <motion.div 
                        key={i}
                        className="flex items-center px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-700/40"
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.15 }}
                    >
                        {meal.done ? (
                            <CheckCircle className="w-3.5 h-3.5 mr-2 text-green-500 dark:text-green-400" />
                        ) : (
                            <motion.div
                                className="w-3.5 h-3.5 mr-2 rounded-full border-2 border-emerald-500 border-t-transparent"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                        )}
                        <span className={`text-xs ${meal.done ? 'text-gray-600 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
                            {meal.name}
                        </span>
                    </motion.div>
                ))}
            </div>

            <motion.div 
                className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full mt-2 overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
            >
                <motion.div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                    initial={{ width: "50%" }}
                    animate={{ width: ["50%", "75%"] }}
                    transition={{ duration: 2, delay: 0.8, ease: "easeInOut" }}
                />
            </motion.div>
        </motion.div>
    );
};

// --- Main Component ---
const NutricareAgentAnimation = ({
    variant = 'nutritionSteps',
    className = '',
    currentStep = 1,
    isComplete = false,
    completedSteps = [],
    customSteps = null,
    showLabels = true,
}: {
    variant?: 'nutritionSteps' | 'nutrientNetwork' | 'nutritionProcessing' | 'nutritionBot' | 'detailedAnalysis' | 'mealPlan';
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
            if (variant === 'detailedAnalysis' && progress < 3) {
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
            case 'nutritionSteps':
                return <NutritionStepsAnimation completed={completedSteps} />;
            case 'nutrientNetwork':
                return <NutrientNetworkAnimation />;
            case 'nutritionProcessing':
                return <NutritionProcessingAnimation />;
            case 'nutritionBot':
                return <NutritionBotAnimation />;
            case 'detailedAnalysis':
                return (
                    <NutritionStepsWithTextAnimation 
                        currentStep={isComplete ? 3 : progress} 
                        steps={customSteps || undefined}
                    />
                );
            case 'mealPlan':
                return <MealPlanAnimation />;
            default:
                return <NutritionStepsWithTextAnimation currentStep={isComplete ? 3 : progress} />;
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
            
            {showLabels && !['detailedAnalysis', 'nutritionBot', 'mealPlan'].includes(variant) && (
                <div className="mt-2 text-center text-xs font-medium text-gray-600 dark:text-gray-400">
                    {isComplete ? 'Analysis Complete' : 'Analyzing Nutrition Data...'}
                </div>
            )}
        </div>
    );
};

export default NutricareAgentAnimation;

// Add these to your global CSS for the subtle animation
/*
@keyframes pulse-subtle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
}

.animate-pulse-subtle {
  animation: pulse-subtle 2s ease-in-out infinite;
}
*/