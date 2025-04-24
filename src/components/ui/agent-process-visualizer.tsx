'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button'; // Import Button
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import {
    CheckCircle2, XCircle, AlertCircle, SkipForward, Clock, LogIn, LogOut,
    Sparkles, BrainCircuit, SearchCheck, FileText, Paintbrush, BookOpenText,
    Loader2, Info, Link as LinkIcon, CircleDot, ListChecks, ChevronDown, ChevronUp // Import toggle icons
} from 'lucide-react';
// --- ĐÃ SỬA IMPORT ---
// Import StepTrace từ flow and re-export it as AgentStep
import { type StepTrace } from '@/ai/flows/generate-menu-from-preferences';
export type { StepTrace as AgentStep }; // Re-exporting the type
// Import GroundingMetadata và GroundingChunk từ service (Đảm bảo GroundingChunk được export từ google-search.ts)
import { type GroundingMetadata, type GroundingChunk } from '@/services/google-search';
import { cn } from '@/lib/utils';

// --- Constants ---
const PLANNING_STEP_NAME = 'Bước 2: Lập Kế hoạch & Suy luận'; // REMOVED (Reasoning) to match backend
const RAG_STEP_NAME = 'Bước 1: Tìm kiếm Thông tin (RAG)';
const CONTENT_STEP_PREFIX = 'Bước 3: Tạo Nội dung Thực đơn'; // Prefix for daily/weekly
const FEEDBACK_STEP_NAME = 'Bước 4: Tạo Câu hỏi Phản hồi';
const FORMATTING_STEP_NAME = 'Bước 5: Định dạng Kết quả Cuối cùng';
const FALLBACK_STEP_NAME = "Bước 3.5: Đảm bảo Bữa ăn Bắt buộc (Fallback)";

// --- Streaming Text Component ---
interface StreamingTextProps {
    text: string;
    speed?: number;
    className?: string;
}
const StreamingText: React.FC<StreamingTextProps> = ({ text, speed = 60, className = '' }) => {
    const [displayedText, setDisplayedText] = useState('');
    const indexRef = useRef(0);
    const animationFrameRef = useRef<number | null>(null);
    const lastUpdateTimeRef = useRef<number>(0);

    useEffect(() => {
        indexRef.current = 0;
        setDisplayedText('');
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        lastUpdateTimeRef.current = performance.now();
        if (!text) return;
        const interval = 1000 / speed;
        const animate = (now: number) => {
            const elapsed = now - lastUpdateTimeRef.current;
            if (elapsed >= interval) {
                const charsToAdd = Math.floor(elapsed / interval);
                const nextIndex = Math.min(indexRef.current + charsToAdd, text.length);
                if (nextIndex > indexRef.current) {
                    setDisplayedText(text.substring(0, nextIndex));
                    indexRef.current = nextIndex;
                }
                lastUpdateTimeRef.current = now - (elapsed % interval);
            }
            if (indexRef.current < text.length) {
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                animationFrameRef.current = null;
            }
        };
        animationFrameRef.current = requestAnimationFrame(animate);
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [text, speed]);

    return <p key={text} className={cn('whitespace-pre-line font-mono text-xs break-words', className)}>{displayedText}</p>;
};
// --- End Streaming Text Component ---

// --- Helper Functions/Components for Data Formatting ---

// Basic value formatter (handles strings, numbers, booleans)
function formatTraceValue(value: any): string {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    // For complex objects/arrays, return a placeholder or summary
    if (Array.isArray(value)) return `[Array (${value.length} items)]`;
    if (typeof value === 'object') return `{Object (${Object.keys(value).length} keys)}`;
    return String(value);
}

// Simple Key-Value Pair Renderer for Objects
const SimpleObjectDisplay: React.FC<{ data: Record<string, any>, maxDepth?: number, currentDepth?: number }> = ({ data, maxDepth = 1, currentDepth = 0 }) => {
    if (currentDepth >= maxDepth) {
        return <span className="text-gray-500 dark:text-gray-400 text-[10px] italic">{`{Object (${Object.keys(data).length} keys)}`}</span>;
    }
    return (
        <div className="space-y-0.5 pl-2 border-l border-gray-200 dark:border-gray-700 ml-1 w-full">
            {Object.entries(data).map(([key, value]) => (
                <div key={key} className="flex text-[10px] flex-wrap">
                    {/* Responsive key width */}
                    <span className="font-medium text-gray-500 dark:text-gray-400 w-14 xs:w-16 sm:w-24 flex-shrink-0 truncate pr-1">{key}:</span>
                    <div className="flex-1 min-w-0">
                        {typeof value === 'object' && value !== null && !Array.isArray(value) ? (
                            <SimpleObjectDisplay data={value} maxDepth={maxDepth} currentDepth={currentDepth + 1} />
                        ) : typeof value === 'object' && value !== null && Array.isArray(value) ? (
                            <SimpleListDisplay data={value} maxDepth={maxDepth} currentDepth={currentDepth + 1} />
                        ) : (
                            <span className="text-gray-700 dark:text-gray-300 break-words">{formatTraceValue(value)}</span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

// Simple List Renderer for Arrays
const SimpleListDisplay: React.FC<{ data: any[], maxDepth?: number, currentDepth?: number }> = ({ data, maxDepth = 1, currentDepth = 0 }) => {
    if (currentDepth >= maxDepth) {
        return <span className="text-gray-500 dark:text-gray-400 text-[10px] italic">{`[Array (${data.length} items)]`}</span>;
    }
    return (
        <ul className="list-none space-y-0.5 pl-2 border-l border-gray-200 dark:border-gray-700 ml-1 w-full">
            {data.map((item, index) => (
                <li key={index} className="text-[10px] flex items-start flex-wrap">
                    <span className="text-gray-400 dark:text-gray-500 mr-1 flex-shrink-0">-</span>
                    <div className="flex-1 min-w-0">
                        {typeof item === 'object' && item !== null && !Array.isArray(item) ? (
                            <SimpleObjectDisplay data={item} maxDepth={maxDepth} currentDepth={currentDepth + 1} />
                        ) : typeof item === 'object' && item !== null && Array.isArray(item) ? (
                            <SimpleListDisplay data={item} maxDepth={maxDepth} currentDepth={currentDepth + 1} />
                        ) : (
                            <span className="text-gray-700 dark:text-gray-300 break-words">{formatTraceValue(item)}</span>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
};

// Main Data Renderer - Chooses the appropriate display component
const DataDisplay: React.FC<{ data: any, title: string, icon: React.ElementType }> = ({ data, title, icon: Icon }) => {
    if (data === undefined || data === null) return null;

    let content;
    if (typeof data === 'string') {
        // If it looks like JSON, try parsing for better display, otherwise show as string
        try {
            const parsed = JSON.parse(data);
            if (typeof parsed === 'object' && parsed !== null) {
                content = <SimpleObjectDisplay data={parsed} />;
            } else {
                content = <pre className="whitespace-pre-wrap text-[10px] font-mono break-words">{data}</pre>;
            }
        } catch (e) {
            content = <pre className="whitespace-pre-wrap text-[10px] font-mono break-words">{data}</pre>;
        }
    } else if (Array.isArray(data)) {
        content = <SimpleListDisplay data={data} />;
    } else if (typeof data === 'object') {
        content = <SimpleObjectDisplay data={data} />;
    } else {
        content = <pre className="whitespace-pre-wrap text-[10px] font-mono break-words">{String(data)}</pre>;
    }

    return (
        <div>
            <span className="font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5 mb-1 text-xs"><Icon size={14} /> {title}</span>
            <div className="bg-gray-100 dark:bg-gray-700/80 p-1.5 xs:p-2 rounded text-gray-800 dark:text-gray-200 shadow-inner max-h-48 overflow-y-auto break-words w-full">
                {content}
            </div>
        </div>
    );
};
// --- End Helper Functions/Components ---

interface AgentProcessVisualizerProps {
    trace: StepTrace[];
    isProcessing: boolean;
}

// Type for planned step status
type PlannedStepStatus = 'pending' | 'running' | 'completed' | 'error' | 'skipped';

// Map tên bước với icon (Used for Accordion)
const stepIcons: Record<string, React.ElementType> = {
    [RAG_STEP_NAME]: SearchCheck,
    [PLANNING_STEP_NAME]: BrainCircuit,
    [CONTENT_STEP_PREFIX + ' (daily)']: FileText, // Specific keys for potential direct match
    [CONTENT_STEP_PREFIX + ' (weekly)']: FileText,
    [FEEDBACK_STEP_NAME]: Sparkles,
    [FORMATTING_STEP_NAME]: Paintbrush,
    [FALLBACK_STEP_NAME]: CheckCircle2, // Or another appropriate icon
    'Input Validation': AlertCircle,
    'Flow Execution': Info,
};

// Helper định dạng dữ liệu trace
function formatTraceData(data: any): string {
    if (data === undefined || data === null) return 'N/A';
    if (typeof data === 'string') return data;
    try {
        return JSON.stringify(data, null, 2); // Pretty print JSON
    } catch (e) {
        console.error("Error formatting trace data:", e);
        return '[Could not format data]';
    }
}

// Helper lấy icon trạng thái động
const getStatusIcon = (status: StepTrace['status'], size = 16) => {
    switch (status) {
        case 'success': return <CheckCircle2 size={size} className="text-green-500" />;
        case 'error': return <AlertCircle size={size} className="text-red-500" />;
        case 'skipped': return <SkipForward size={size} className="text-yellow-500" />;
        default: return <Info size={size} className="text-gray-400" />;
    }
};

// --- Component Chính ---
export function AgentProcessVisualizer({
    trace,
    isProcessing,
}: AgentProcessVisualizerProps) {
    const [isVisible, setIsVisible] = useState(false); // State for visibility toggle (Default hidden)
    const revealedSteps = trace || [];
    const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);
    // --- State for Planned Steps ---
    const [plannedSteps, setPlannedSteps] = useState<string[]>([]);
    const [plannedStepStatus, setPlannedStepStatus] = useState<Record<string, PlannedStepStatus>>({});
    const planParsedRef = useRef(false); // Prevent re-parsing plan on every trace update

    // --- Effect to Calculate Progress, Parse Plan, Update Statuses ---
    useEffect(() => {
        // --- Progress Calculation ---
        const completedOrErrorOrSkipped = revealedSteps.filter(
            step => step.status === 'success' || step.status === 'error' || step.status === 'skipped'
        );
        const completedCount = completedOrErrorOrSkipped.length;
        // Estimate total steps: Use planned steps count if available, otherwise revealed steps
        const estimatedTotalSteps = plannedSteps.length > 0 ? plannedSteps.length : Math.max(revealedSteps.length, 1);
        const newProgress = Math.round((completedCount / estimatedTotalSteps) * 100);
        setProgress(newProgress);

        // --- Auto-open last Accordion item ---
        if (revealedSteps.length > 0) {
            const lastStepIndex = revealedSteps.length - 1;
            const lastItemValue = `item-${lastStepIndex}`;
            // Only add if not already open
            setOpenAccordionItems(prevOpen =>
                prevOpen.includes(lastItemValue) ? prevOpen : [...prevOpen, lastItemValue]
            );
        } else {
            setOpenAccordionItems([]); // Reset if trace is cleared
        }

        // --- Parse Plan (only once) ---
        if (!planParsedRef.current) {
            const planningStep = revealedSteps.find(step => step.stepName === PLANNING_STEP_NAME);
            if (planningStep?.status === 'success' && planningStep.outputData?.plan) {
                const planString = planningStep.outputData.plan as string;
                // Simple parsing: split by newline, trim, filter empty lines
                const steps = planString?.
                    split('\n')
                    .map(s => s.trim().replace(/^\d+\.\s*/, '')) // Remove leading numbers like "1. "
                    .filter(s => s.length > 0);

                if (steps.length > 0) {
                    setPlannedSteps(steps);
                    const initialStatus: Record<string, PlannedStepStatus> = {};
                    steps.forEach(step => { initialStatus[step] = 'pending'; });
                    setPlannedStepStatus(initialStatus);
                    planParsedRef.current = true; // Mark plan as parsed
                    console.log("Parsed planned steps:", steps);
                }
            }
        }

        // --- Update Planned Step Status based on Revealed Steps ---
        if (plannedSteps.length > 0) {
            setPlannedStepStatus(prevStatus => {
                const newStatus = { ...prevStatus };
                let statusChanged = false;

                revealedSteps.forEach((traceStep, index) => {
                    // --- Matching Logic: Try to map trace step name to planned step description ---
                    // This is heuristic. Adjust keywords as needed based on actual plan output.
                    let matchedPlanStep: string | undefined = undefined;
                    const traceNameLower = traceStep.stepName.toLowerCase();

                    // Try direct match first (if plan uses exact names)
                    if (newStatus[traceStep.stepName]) {
                        matchedPlanStep = traceStep.stepName;
                    } else {
                        // Keyword-based matching
                        if (traceNameLower.includes('tìm kiếm') || traceNameLower.includes('rag')) {
                            matchedPlanStep = plannedSteps.find(p => p.toLowerCase().includes('tìm kiếm') || p.toLowerCase().includes('search'));
                        } else if (traceNameLower.includes('lập kế hoạch') || traceNameLower.includes('reasoning')) {
                            matchedPlanStep = plannedSteps.find(p => p.toLowerCase().includes('kế hoạch') || p.toLowerCase().includes('plan'));
                        } else if (traceNameLower.includes('tạo nội dung')) {
                            matchedPlanStep = plannedSteps.find(p => p.toLowerCase().includes('tạo nội dung') || p.toLowerCase().includes('generate content') || p.toLowerCase().includes('thực đơn'));
                        } else if (traceNameLower.includes('câu hỏi phản hồi') || traceNameLower.includes('feedback')) {
                            matchedPlanStep = plannedSteps.find(p => p.toLowerCase().includes('phản hồi') || p.toLowerCase().includes('feedback'));
                        } else if (traceNameLower.includes('định dạng kết quả') || traceNameLower.includes('format')) {
                            matchedPlanStep = plannedSteps.find(p => p.toLowerCase().includes('định dạng') || p.toLowerCase().includes('format'));
                        } else if (traceNameLower.includes('fallback') || traceNameLower.includes('đảm bảo bữa ăn')) {
                            matchedPlanStep = plannedSteps.find(p => p.toLowerCase().includes('fallback') || p.toLowerCase().includes('đảm bảo'));
                        }
                        // Add more matching rules if needed
                    }

                    if (matchedPlanStep && newStatus[matchedPlanStep]) {
                        const isStepComplete = traceStep.status === 'success' || traceStep.status === 'error' || traceStep.status === 'skipped';
                        const isCurrentStep = isProcessing && index === revealedSteps.length - 1 && !isStepComplete;
                        let targetStatus: PlannedStepStatus = 'pending'; // Default

                        if (isCurrentStep) {
                            targetStatus = 'running';
                        } else if (traceStep.status === 'success') {
                            targetStatus = 'completed';
                        } else if (traceStep.status === 'error') {
                            targetStatus = 'error';
                        } else if (traceStep.status === 'skipped') {
                            targetStatus = 'skipped';
                        }

                        if (newStatus[matchedPlanStep] !== targetStatus) {
                            newStatus[matchedPlanStep] = targetStatus;
                            statusChanged = true;
                        }
                    }
                });

                return statusChanged ? newStatus : prevStatus; // Only update state if changed
            });
        }

    }, [revealedSteps, isProcessing, plannedSteps]); // Add plannedSteps to dependency array

    // --- Reset plan parsing state if trace is cleared ---
    useEffect(() => {
        if (revealedSteps.length === 0) {
            planParsedRef.current = false;
            setPlannedSteps([]);
            setPlannedStepStatus({});
        }
    }, [revealedSteps]);

    // Memoize các giá trị tính toán
    const { allStepsCompleted, hasError } = useMemo(() => {
        // Consider a step completed if it's success, error, or skipped
        const finalStateReached = !isProcessing && revealedSteps.length > 0 && revealedSteps.every(step => ['success', 'error', 'skipped'].includes(step.status));
        const errorOccurred = revealedSteps.some(step => step.status === 'error');
        return { allStepsCompleted: finalStateReached, hasError: errorOccurred };
    }, [isProcessing, revealedSteps]);

    // --- Helper to get planned step icon ---
    const getPlannedStepIcon = (status: PlannedStepStatus) => {
        switch (status) {
            case 'running': return <Loader2 size={12} className="animate-spin text-blue-500" />;
            case 'completed': return <CheckCircle2 size={12} className="text-green-500" />;
            case 'error': return <AlertCircle size={12} className="text-red-500" />;
            case 'skipped': return <SkipForward size={12} className="text-yellow-500" />;
            case 'pending':
            default: return <CircleDot size={12} className="text-gray-400" />; // Pending icon
        }
    };

    // --- Render Logic ---
    if (revealedSteps.length === 0 && !isProcessing) {
        return <div className="text-sm text-muted-foreground p-2 text-center italic">AI chưa bắt đầu xử lý.</div>;
    }
    if (revealedSteps.length === 0 && isProcessing) {
        return <div className="text-sm text-blue-600 dark:text-blue-400 p-2 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Đang khởi tạo quá trình AI...</div>;
    }

    return (
        // Changed overflow-x-auto to overflow-x-hidden on the main container
        <div className="border border-border/80 rounded-lg bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-800/60 dark:to-gray-900/70 my-2 shadow-sm w-full backdrop-blur-sm max-w-full overflow-hidden">
            {/* Header with Toggle Button */}
            <div className="flex justify-between items-center p-2 xs:p-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                    <h4 className="text-[10px] xs:text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        AI Processing Trace
                    </h4>
                    {isProcessing && <Loader2 className="h-3 w-3 xs:h-4 xs:w-4 animate-spin text-blue-500" />}
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 xs:h-7 xs:w-7 text-muted-foreground hover:bg-muted/50"
                    onClick={() => setIsVisible(!isVisible)}
                    aria-label={isVisible ? "Hide Processing Steps" : "Show Processing Steps"}
                >
                    {isVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
            </div>

            {/* Collapsible Content Area */}
            <AnimatePresence initial={false}>
                {isVisible && (
                    <motion.div
                        key="content"
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        variants={{
                            open: { opacity: 1, height: "auto" },
                            collapsed: { opacity: 0, height: 0 }
                        }}
                        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                        className="overflow-hidden" // Ensure content doesn't overflow during animation
                    >
                        <div className="p-2 xs:p-3 md:p-4"> {/* Add padding back to the content area */}
                            {/* Progress Bar */}
                            <div className="mb-2 xs:mb-3 px-0.5 xs:px-1">
                                <Progress value={progress} className="h-1 xs:h-1.5" />
                            </div>

                            {/* --- Planned Steps Visualization --- */}
            {plannedSteps.length > 0 && (
                <div className="mb-3 px-0.5 xs:px-1 border border-dashed border-border/50 rounded-md p-1.5 xs:p-2.5 bg-gray-50/30 dark:bg-gray-800/30 max-w-full">
                    <h5 className="text-[10px] xs:text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                        <ListChecks size={12} className="hidden xs:inline" />
                        <ListChecks size={10} className="xs:hidden" /> Planned Steps
                    </h5>
                    <ul className="space-y-1 w-full">
                        {plannedSteps.map((stepDesc, idx) => (
                            <motion.li
                                key={idx}
                                className={cn(
                                    // Removed wrapping classes from li (flex container)
                                    "flex items-center gap-1 xs:gap-2 text-[9px] xs:text-[10px] transition-colors duration-200",
                                    plannedStepStatus[stepDesc] === 'completed' ? 'text-green-600 dark:text-green-400' :
                                        plannedStepStatus[stepDesc] === 'running' ? 'text-blue-600 dark:text-blue-400 font-medium' :
                                            plannedStepStatus[stepDesc] === 'error' ? 'text-red-600 dark:text-red-400' :
                                                plannedStepStatus[stepDesc] === 'skipped' ? 'text-yellow-600 dark:text-yellow-400 line-through' :
                                                    'text-gray-500 dark:text-gray-400' // Pending
                                )}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: idx * 0.05 }}
                            >
                                <div className="flex-shrink-0 w-3 h-3 xs:w-4 xs:h-4 flex items-center justify-center">
                                    {getPlannedStepIcon(plannedStepStatus[stepDesc] || 'pending')}
                                </div>
                                {/* Added wrapping classes directly to the text span */}
                                <span className="flex-grow min-w-0 whitespace-normal break-all">{stepDesc}</span>
                            </motion.li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Thông báo hoàn thành / lỗi tổng thể */}
            <AnimatePresence>
                {allStepsCompleted && (
                    <motion.div
                        className={cn(
                            "text-[10px] xs:text-xs font-medium mb-2 xs:mb-3 px-0.5 xs:px-1 flex items-center gap-1 xs:gap-1.5 rounded",
                            hasError ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"
                        )}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {hasError ? <AlertCircle className="h-3 w-3 xs:h-4 xs:w-4" /> : <CheckCircle2 className="h-3 w-3 xs:h-4 xs:w-4" />}
                        {hasError ? "Quá trình xử lý hoàn tất với lỗi." : "Quá trình xử lý hoàn tất!"}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Accordion cho các bước chi tiết */}
            <Accordion
                type="multiple"
                className="w-full space-y-1 max-w-full"
                value={openAccordionItems}
                onValueChange={setOpenAccordionItems}
            >
                <AnimatePresence initial={false}>
                    {revealedSteps.map((step, index) => {
                        const DefaultIcon = Info;
                        // Try to find icon, potentially matching prefix for content step
                        let IconComponent = stepIcons[step.stepName];
                        if (!IconComponent && step.stepName.startsWith(CONTENT_STEP_PREFIX)) {
                            IconComponent = FileText; // Fallback for content steps
                        }
                        IconComponent = IconComponent || DefaultIcon; // Final fallback

                        const outputData = step.outputData as any; // Keep using 'as any' for flexibility or define a more specific type
                        const itemValue = `item-${index}`;

                        // Xác định các trạng thái và loại bước
                        const isStepComplete = step.status === 'success' || step.status === 'error' || step.status === 'skipped';
                        const isStepError = step.status === 'error';
                        const isCurrentStep = isProcessing && index === revealedSteps.length - 1 && !isStepComplete;
                        const isStepSuccess = step.status === 'success';
                        const isStepSkipped = step.status === 'skipped';
                        const isPlanningStep = step.stepName === PLANNING_STEP_NAME;
                        const isRagStep = step.stepName === RAG_STEP_NAME;
                        // Truy cập groundingMetadata một cách an toàn, sử dụng kiểu đã import
                        const groundingMeta = (isRagStep && outputData?.groundingMetadata) ? (outputData.groundingMetadata as GroundingMetadata) : undefined;

                        return (
                            <motion.div
                                key={itemValue}
                                // layout // Removed layout prop to potentially improve animation performance
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                                style={{ overflow: 'hidden' }}
                                className="max-w-full"
                            >
                                {/* Changed overflow-x-auto to overflow-x-hidden */}
                                <AccordionItem value={itemValue} className="border border-border/60 rounded-md bg-white dark:bg-gray-800/70 shadow-xs overflow-x-hidden max-w-full">
                                    <AccordionTrigger
                                        className={cn(
                                            "flex items-center gap-1 xs:gap-2 text-xs font-medium px-2 py-1.5 xs:px-3 xs:py-2.5 transition-colors duration-150 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 w-full text-left",
                                            isStepError ? 'text-red-600 dark:text-red-400' :
                                                isStepSkipped ? 'text-yellow-600 dark:text-yellow-400' :
                                                    isStepSuccess ? 'text-green-600 dark:text-green-400' :
                                                        isCurrentStep ? 'text-blue-600 dark:text-blue-400' :
                                                            'text-gray-700 dark:text-gray-300'
                                        )}
                                    >
                                        {/* Icon Trạng thái Động */}
                                        <motion.div
                                            key={isCurrentStep ? 'running' : step.status}
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 0.25 }}
                                            className="flex-shrink-0 w-3 h-3 xs:w-4 xs:h-4 flex items-center justify-center"
                                        >
                                            {isCurrentStep ? (
                                                <Loader2 className="h-3 w-3 xs:h-4 xs:w-4 animate-spin text-blue-500" />
                                            ) : isStepComplete ? (
                                                getStatusIcon(step.status, 14)
                                            ) : (
                                                <Sparkles size={14} className="text-gray-400" />
                                            )}
                                        </motion.div>
                                        {/* Icon Bước */}
                                        <IconComponent size={14} className="text-muted-foreground flex-shrink-0 mr-1 hidden xs:block" />
                                        {/* Tên Bước */}
                                        <span className="flex-grow truncate mr-1 text-[11px] xs:text-xs">{step.stepName}</span>
                                        {/* Thời gian */}
                                        {step.durationMs !== undefined && isStepComplete && (
                                            <span className="text-[9px] xs:text-[10px] text-muted-foreground flex items-center gap-0.5 ml-auto flex-shrink-0 pr-1">
                                                <Clock size={10} className="hidden xs:inline" />
                                                <Clock size={8} className="xs:hidden" /> {step.durationMs}ms
                                            </span>
                                        )}
                                    </AccordionTrigger>
                                    <AccordionContent className="px-2 xs:px-3 pt-1 pb-2 xs:pb-3 text-[10px] space-y-2 xs:space-y-3 bg-gray-50/30 dark:bg-gray-800/40 border-t border-border/50 max-w-full overflow-x-hidden">
                                        {/* Input Data - Using DataDisplay */}
                                        {step.inputData !== undefined && (
                                            <DataDisplay data={step.inputData} title="Input Data" icon={LogIn} />
                                        )}

                                        {/* Reasoning (cho bước Planning) */}
                                        {isPlanningStep && outputData?.reasoning && (
                                            <div>
                                                <span className="font-medium text-purple-700 dark:text-purple-400 flex items-center gap-1 mb-1 text-[11px]"><BookOpenText size={12} /> AI Reasoning</span>
                                                <div className="bg-purple-50 dark:bg-purple-900/30 p-1.5 xs:p-2.5 rounded border border-purple-200 dark:border-purple-800 shadow-sm">
                                                    <StreamingText text={String(outputData.reasoning)} speed={70} className="text-purple-800 dark:text-purple-200 text-[10px] xs:text-[11px] leading-relaxed" />
                                                </div>
                                            </div>
                                        )}

                                        {/* Output Data (Chung) - Using DataDisplay */}
                                        {outputData !== undefined && !(isPlanningStep && !outputData.plan && outputData.reasoning) && !isRagStep && (
                                            <DataDisplay
                                                data={isPlanningStep ? { plan: outputData.plan, ...(outputData.errorOutput ? { errorOutput: outputData.errorOutput } : {}) } : outputData}
                                                title="Output Data"
                                                icon={LogOut}
                                            />
                                        )}

                                        {/* Generic Reasoning Display (if not Planning/RAG and exists) */}
                                        {outputData?.reasoning && !isPlanningStep && !isRagStep && (
                                            <div className="pt-1.5 mt-1.5 border-t border-gray-200 dark:border-gray-700/50">
                                                <span className="font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-1 text-[11px]"><BookOpenText size={12} /> Reasoning</span>
                                                <p className="text-[10px] text-gray-700 dark:text-gray-300 break-words whitespace-pre-line">{String(outputData.reasoning)}</p>
                                            </div>
                                        )}

                                        {/* Reasoning (Specific for RAG Step, if not Planning) */}
                                        {isRagStep && outputData?.reasoning && (
                                            <div className="pt-1.5 mt-1.5 border-t border-gray-200 dark:border-gray-700/50">
                                                <span className="font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-1 text-[11px]"><BookOpenText size={12} /> Reasoning</span>
                                                <p className="text-[10px] text-gray-700 dark:text-gray-300 break-words">{outputData.reasoning}</p>
                                            </div>
                                        )}

                                        {/* Specific Output for Planning Step (Plan) */}
                                        {isPlanningStep && outputData?.plan && (
                                            <div className="pt-1.5 mt-1.5 border-t border-gray-200 dark:border-gray-700/50">
                                                <span className="font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-1 text-[11px]"><FileText size={12} /> Generated Plan</span>
                                                <p className="whitespace-pre-wrap bg-gray-100 dark:bg-gray-700/80 p-1.5 xs:p-2 rounded text-gray-800 dark:text-gray-200 text-[10px] font-mono shadow-inner break-words">{outputData.plan}</p>
                                            </div>
                                        )}

                                        {/* *** Hiển thị Grounding/Citations cho bước RAG *** */}
                                        {isRagStep && (outputData?.contentSummary || groundingMeta) && (
                                            <div className="space-y-2 xs:space-y-3 pt-1.5 border-t border-dashed border-blue-200 dark:border-blue-800/50 mt-1.5">
                                                {/* Optional: Display Content Summary from RAG */}
                                                {outputData?.contentSummary && (
                                                    <div>
                                                        <span className="font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-1 text-[11px]">
                                                            <FileText size={12} /> Tóm tắt nội dung tìm kiếm
                                                        </span>
                                                        <p className="text-[10px] text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/80 p-1.5 xs:p-2 rounded shadow-inner max-h-24 overflow-auto break-words">{outputData.contentSummary}</p>
                                                    </div>
                                                )}

                                                {/* 1. Search Suggestion Chip - Added Optional Chaining on groundingMeta */}
                                                {groundingMeta?.searchEntryPoint?.renderedContent && (
                                                    <div className="pt-1.5">
                                                        <span className="font-medium text-blue-700 dark:text-blue-400 flex items-center gap-1 mb-1 text-[11px]">
                                                            <SearchCheck size={12} /> Gợi ý tìm kiếm
                                                        </span>
                                                        {/* Changed overflow-x-auto to hidden and added wrapping classes */}
                                                        <div
                                                            className="google-search-suggestion overflow-x-hidden break-words whitespace-normal text-[10px]"
                                                            dangerouslySetInnerHTML={{ __html: groundingMeta.searchEntryPoint.renderedContent }}
                                                        />
                                                    </div>
                                                )}

                                                {/* 2. Grounding Chunks (Links) - Added Optional Chaining on groundingMeta */}
                                                {groundingMeta?.groundingChunks && groundingMeta?.groundingChunks.length > 0 && (
                                                    <div>
                                                        <span className="font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-1 text-[11px]">
                                                            <LinkIcon size={12} /> Nguồn tham khảo
                                                        </span>
                                                        <ul className="list-none space-y-1 pl-1"> {/* Increased spacing */}
                                                            {/* --- Use Optional Chaining on map too --- */}
                                                            {groundingMeta?.groundingChunks?.map((chunk: GroundingChunk, chunkIndex: number) => (
                                                                <li key={chunkIndex} className="flex items-start gap-1 group"> {/* Use items-start for long titles */}
                                                                    <LinkIcon size={10} className="text-blue-400 flex-shrink-0 mt-0.5" />
                                                                    <a
                                                                        href={chunk.web.uri}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-blue-600 dark:text-blue-400 hover:underline hover:bg-blue-50 dark:hover:bg-blue-900/30 px-1 py-0.5 rounded text-[9px] xs:text-[10px] leading-snug break-words group-hover:text-blue-500 dark:group-hover:text-blue-300 transition-colors"
                                                                        title={chunk.web.uri}
                                                                    >
                                                                        {chunk.web.title || chunk.web.uri}
                                                                    </a>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {/* *** Kết thúc phần hiển thị Grounding *** */}

                                        {/* Error Details */}
                                        {isStepError && step.errorDetails && (
                                            <div className="mt-1.5 pt-1.5 border-t border-dashed border-red-200 dark:border-red-800/50">
                                                <span className="font-medium text-red-600 dark:text-red-400 flex items-center gap-1 mb-1 text-[11px]"><AlertCircle size={12} /> Error Details</span>
                                                <pre className="whitespace-pre-wrap bg-red-50 dark:bg-red-900/30 p-1.5 xs:p-2 rounded text-red-700 dark:text-red-300 text-[9px] xs:text-[10px] font-mono border border-red-200 dark:border-red-800 break-words">{step.errorDetails}</pre>
                                            </div>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>
                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </Accordion>
                        </div> {/* End content padding div */}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
