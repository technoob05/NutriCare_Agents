'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import {
    CheckCircle2, // Success
    XCircle,      // Error (alternative)
    AlertCircle,  // Error / Alert
    SkipForward,  // Skipped
    Clock,        // Duration
    LogIn,        // Input
    LogOut,       // Output
    Sparkles,     // Default / Pending / Feedback
    BrainCircuit, // Planning
    SearchCheck,  // Search / RAG
    FileText,     // Content Generation
    Paintbrush,   // Formatting
    BookOpenText, // Reasoning
    Loader2,      // Loading / Running
    Info,         // Info / Default
} from 'lucide-react';
import { type StepTrace } from '@/ai/flows/generate-menu-from-preferences'; // Đảm bảo import đúng type
import { cn } from '@/lib/utils'; // Import cn nếu cần

// --- Streaming Text Component (Giữ nguyên như bạn cung cấp) ---
interface StreamingTextProps {
    text: string;
    speed?: number; // Characters per second
    className?: string;
}

const StreamingText: React.FC<StreamingTextProps> = ({
    text,
    speed = 60, // Tăng tốc độ một chút
    className = '',
}) => {
    const [displayedText, setDisplayedText] = useState('');
    const indexRef = useRef(0);
    const animationFrameRef = useRef<number | null>(null);
    const lastUpdateTimeRef = useRef<number>(0);

    useEffect(() => {
        indexRef.current = 0;
        setDisplayedText('');
        // Hủy animation cũ nếu có khi text thay đổi
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        lastUpdateTimeRef.current = performance.now();

        if (!text) return; // Không làm gì nếu text rỗng

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
                animationFrameRef.current = null; // Dừng khi hoàn thành
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

    // Sử dụng key để đảm bảo component re-render hoàn toàn khi text thay đổi
    return <p key={text} className={cn('whitespace-pre-line font-mono', className)}>{displayedText}</p>;
};
// --- End Streaming Text Component ---

interface AgentProcessVisualizerProps {
    trace: StepTrace[]; // Nhận trace đầy đủ hoặc cập nhật từng phần
    isProcessing: boolean; // Cờ báo hiệu quá trình tổng thể đang chạy
}

// Map tên bước với icon tương ứng (có thể tùy chỉnh)
const stepIcons: Record<string, React.ElementType> = {
    'Bước 1: Tìm kiếm Thông tin (RAG)': SearchCheck,
    'Bước 2: Lập Kế hoạch & Suy luận (Reasoning)': BrainCircuit,
    'Bước 3: Tạo Nội dung Thực đơn (daily)': FileText,
    'Bước 3: Tạo Nội dung Thực đơn (weekly)': FileText,
    'Bước 4: Tạo Câu hỏi Phản hồi': Sparkles, // Hoặc MessageSquarePlus
    'Bước 5: Định dạng Kết quả Cuối cùng': Paintbrush, // Hoặc CheckSquare
    'Input Validation': AlertCircle, // Ví dụ nếu có bước validation
    'Flow Execution': Info, // Ví dụ cho lỗi tổng thể
    // Thêm các bước khác nếu có
};

// Helper định dạng dữ liệu trace (giữ nguyên)
function formatTraceData(data: any): string {
    if (data === undefined || data === null) return 'N/A';
    if (typeof data === 'string') return data;
    try {
        // Sử dụng safeStringify nếu có, hoặc JSON.stringify cơ bản
        return JSON.stringify(data, null, 2); // Pretty print JSON
    } catch (e) {
        console.error("Error formatting trace data:", e);
        return '[Could not format data]';
    }
}

// Helper lấy icon trạng thái động
const getStatusIcon = (status: StepTrace['status'], size = 16) => {
    switch (status) {
        case 'success':
            return <CheckCircle2 size={size} className="text-green-500" />;
        case 'error':
            return <AlertCircle size={size} className="text-red-500" />; // Dùng AlertCircle cho lỗi
        case 'skipped':
            return <SkipForward size={size} className="text-yellow-500" />;
        default: // Should not happen if status is always defined
            return <Info size={size} className="text-gray-400" />;
    }
};

export function AgentProcessVisualizer({
    trace,
    isProcessing,
}: AgentProcessVisualizerProps) {
    const revealedSteps = trace || [];
    const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);

    // Tính toán progress và tự động mở accordion cho bước mới nhất
    useEffect(() => {
        const completedSteps = revealedSteps.filter(
            step => step.status === 'success' || step.status === 'error' || step.status === 'skipped'
        ).length;

        // Ước tính tổng số bước dựa trên trace hiện tại hoặc một giá trị dự kiến nếu biết
        // Ví dụ đơn giản: coi số bước hiện có là tổng số bước tiềm năng
        const estimatedTotalSteps = Math.max(revealedSteps.length, 5); // Giả sử có khoảng 5 bước
        const currentTotalSteps = Math.max(revealedSteps.length, 1); // Tránh chia cho 0

        // Tính progress dựa trên số bước đã hoàn thành / tổng số bước *đã xuất hiện*
        const newProgress = Math.round((completedSteps / currentTotalSteps) * 100);
        setProgress(newProgress);

        // Tự động mở accordion cho bước cuối cùng được thêm vào
        if (revealedSteps.length > 0) {
            const lastStepIndex = revealedSteps.length - 1;
            const lastItemValue = `item-${lastStepIndex}`;
            setOpenAccordionItems(prevOpen => {
                // Chỉ thêm nếu chưa có, giữ lại các mục đã mở khác
                return prevOpen.includes(lastItemValue) ? prevOpen : [...prevOpen, lastItemValue];
                // Hoặc nếu muốn chỉ mở mục cuối cùng: return [lastItemValue];
            });
        } else {
            setOpenAccordionItems([]); // Đóng tất cả nếu trace rỗng
        }
    }, [revealedSteps]); // Chỉ phụ thuộc vào revealedSteps

    // Memoize các giá trị tính toán để tránh tính lại không cần thiết
    const { allStepsCompleted, hasError } = useMemo(() => {
        const completed = !isProcessing && revealedSteps.length > 0;
        const error = revealedSteps.some(step => step.status === 'error');
        return { allStepsCompleted: completed, hasError: error };
    }, [isProcessing, revealedSteps]);

    // --- Render Logic ---

    // Trạng thái chờ ban đầu
    if (revealedSteps.length === 0 && !isProcessing) {
        return (
            <div className="text-sm text-muted-foreground p-4 text-center italic">
                AI chưa bắt đầu xử lý.
            </div>
        );
    }

    // Trạng thái đang chờ bước đầu tiên
    if (revealedSteps.length === 0 && isProcessing) {
        return (
            <div className="text-sm text-blue-600 dark:text-blue-400 p-4 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang khởi tạo quá trình AI...
            </div>
        );
    }

    return (
        <div className="p-3 md:p-4 border border-border/80 rounded-lg bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-800/60 dark:to-gray-900/70 my-2 shadow-sm w-full backdrop-blur-sm">
            {/* Header với Progress Bar */}
            <div className="mb-3 px-1">
                <div className="flex justify-between items-center mb-1">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        AI Processing Trace
                    </h4>
                    {isProcessing && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                </div>
                <Progress value={progress} className="h-1.5" /> {/* Làm progress bar mỏng hơn */}
            </div>

            {/* Thông báo hoàn thành / lỗi tổng thể */}
            <AnimatePresence>
                {allStepsCompleted && (
                    <motion.div
                        className={cn(
                            "text-sm font-medium mb-3 px-1 flex items-center gap-1.5 rounded",
                            hasError ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"
                        )}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }} // Exit animation nếu cần
                        transition={{ duration: 0.3 }}
                    >
                        {hasError ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        {hasError ? "Quá trình xử lý hoàn tất với lỗi." : "Quá trình xử lý hoàn tất!"}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Accordion cho các bước */}
            <Accordion
                type="multiple"
                className="w-full space-y-1" // Thêm space giữa các item
                value={openAccordionItems}
                onValueChange={setOpenAccordionItems} // Controlled component
            >
                <AnimatePresence initial={false}>
                    {revealedSteps.map((step, index) => {
                        const DefaultIcon = Info; // Icon mặc định nếu không khớp
                        const IconComponent = stepIcons[step.stepName] || DefaultIcon;
                        const outputData = step.outputData;
                        // Xác định rõ ràng bước Planning để xử lý Reasoning
                        const isPlanningStep = step.stepName === 'Bước 2: Lập Kế hoạch & Suy luận (Reasoning)';
                        const itemValue = `item-${index}`;

                        // Xác định trạng thái chi tiết của bước này
                        const isStepComplete = step.status === 'success' || step.status === 'error' || step.status === 'skipped';
                        const isStepError = step.status === 'error';
                        // Bước hiện tại là bước cuối cùng *và* quá trình tổng thể đang chạy *và* bước này chưa hoàn thành
                        const isCurrentStep = isProcessing && index === revealedSteps.length - 1 && !isStepComplete;
                        const isStepSuccess = step.status === 'success';
                        const isStepSkipped = step.status === 'skipped';

                        return (
                            // Wrap mỗi item trong motion.div để AnimatePresence hoạt động
                            <motion.div
                                key={itemValue} // Key phải ở đây
                                layout // Giúp animation mượt hơn khi item thay đổi vị trí
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }} // Ease-out-cubic
                                style={{ overflow: 'hidden' }} // Quan trọng cho height animation
                            >
                                <AccordionItem value={itemValue} className="border border-border/60 rounded-md bg-white dark:bg-gray-800/70 shadow-xs overflow-hidden">
                                    <AccordionTrigger
                                        className={cn(
                                            "flex items-center gap-2 text-sm font-medium px-3 py-2.5 transition-colors duration-150 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 w-full text-left",
                                            // Màu chữ dựa trên trạng thái
                                            isStepError ? 'text-red-600 dark:text-red-400' :
                                            isStepSkipped ? 'text-yellow-600 dark:text-yellow-400' :
                                            isStepSuccess ? 'text-green-600 dark:text-green-400' :
                                            isCurrentStep ? 'text-blue-600 dark:text-blue-400' :
                                            'text-gray-700 dark:text-gray-300' // Pending/Default
                                        )}
                                    >
                                        {/* Icon Trạng thái Động */}
                                        <motion.div
                                            key={isCurrentStep ? 'running' : step.status} // Key thay đổi khi trạng thái thay đổi
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 0.25 }}
                                            className="flex-shrink-0 w-4 h-4 flex items-center justify-center"
                                        >
                                            {isCurrentStep ? (
                                                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                            ) : isStepComplete ? (
                                                getStatusIcon(step.status, 16)
                                            ) : (
                                                <Sparkles size={16} className="text-gray-400" /> // Icon cho Pending
                                            )}
                                        </motion.div>

                                        {/* Icon Bước */}
                                        <IconComponent size={16} className="text-muted-foreground flex-shrink-0" />

                                        {/* Tên Bước */}
                                        <span className="flex-grow truncate mr-2">{step.stepName}</span>

                                        {/* Thời gian (nếu có) */}
                                        {step.durationMs !== undefined && isStepComplete && (
                                            <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto flex-shrink-0 pr-1">
                                                <Clock size={12} /> {step.durationMs}ms
                                            </span>
                                        )}
                                        {/* Chevron được quản lý bởi AccordionTrigger */}
                                    </AccordionTrigger>
                                    <AccordionContent className="px-3 pt-1 pb-3 text-xs space-y-3 bg-gray-50/30 dark:bg-gray-800/40 border-t border-border/50">
                                        {/* Input Data */}
                                        {step.inputData !== undefined && (
                                            <div>
                                                <span className="font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5 mb-1">
                                                    <LogIn size={14} /> Input Data
                                                </span>
                                                <pre className="whitespace-pre-wrap bg-gray-100 dark:bg-gray-700/80 p-2 rounded text-gray-800 dark:text-gray-200 text-[11px] max-h-40 overflow-auto font-mono shadow-inner">
                                                    {formatTraceData(step.inputData)}
                                                </pre>
                                            </div>
                                        )}

                                        {/* Reasoning (Hiển thị nổi bật cho bước Planning) */}
                                        {isPlanningStep && outputData?.reasoning && (
                                            <div>
                                                <span className="font-medium text-purple-700 dark:text-purple-400 flex items-center gap-1.5 mb-1">
                                                    <BookOpenText size={14} /> AI Reasoning
                                                </span>
                                                {/* Sử dụng StreamingText */}
                                                <div className="bg-purple-50 dark:bg-purple-900/30 p-2.5 rounded border border-purple-200 dark:border-purple-800 shadow-sm">
                                                    <StreamingText
                                                        text={String(outputData.reasoning)}
                                                        speed={70} // Tăng tốc độ stream
                                                        className="text-purple-800 dark:text-purple-200 text-[11.5px] leading-relaxed" // Tăng cỡ chữ nhẹ
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Output Data */}
                                        {outputData !== undefined && (
                                            // Không hiển thị output nếu là bước planning và chỉ có reasoning (đã hiển thị ở trên)
                                            !(isPlanningStep && !outputData.plan && outputData.reasoning) &&
                                            <div>
                                                <span className="font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5 mb-1">
                                                    <LogOut size={14} /> Output Data
                                                </span>
                                                <pre className="whitespace-pre-wrap bg-gray-100 dark:bg-gray-700/80 p-2 rounded text-gray-800 dark:text-gray-200 text-[11px] max-h-40 overflow-auto font-mono shadow-inner">
                                                    {/* Cho bước planning, chỉ hiển thị plan ở đây nếu có */}
                                                    {isPlanningStep
                                                        ? formatTraceData({ plan: outputData.plan, ...(outputData.errorOutput ? { errorOutput: outputData.errorOutput } : {}) }) // Hiển thị plan và error nếu có
                                                        : formatTraceData(outputData)}
                                                </pre>
                                            </div>
                                        )}

                                        {/* Error Details */}
                                        {isStepError && step.errorDetails && (
                                            <div className="mt-2">
                                                <span className="font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5 mb-1">
                                                    <AlertCircle size={14} /> Error Details
                                                </span>
                                                <pre className="whitespace-pre-wrap bg-red-50 dark:bg-red-900/30 p-2 rounded text-red-700 dark:text-red-300 text-[11px] font-mono border border-red-200 dark:border-red-800">
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