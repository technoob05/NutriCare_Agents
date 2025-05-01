'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { cn } from '@/lib/utils';
import {
    Loader2, BookOpenCheck, AlertCircle, Info, CheckCircle, XCircle, Timer, Play, RotateCcw,
    Coffee, Utensils, Globe, Leaf, Lightbulb, ChevronRight, Award, Heart, X, ArrowRight // Added ArrowRight
} from 'lucide-react';

// --- Constants ---
const API_ENDPOINT = '/api/understand-meal';
const QUIZ_TIME_PER_QUESTION = 15; // Seconds
const FEEDBACK_DELAY = 1200; // ms delay to show feedback before allowing continue
const ANIMATION_DURATION = 0.3;
const STAGGER_DELAY = 0.08;

// --- Types ---
interface QuizQuestion {
    question: string;
    options: string[];
    answer: string;
}

interface UnderstandMealData {
    summary: {
        introduction?: string;
        cooking?: string;
        nutrition?: string;
        origin?: string;
        funFact?: string;
    };
    game?: {
        quiz: QuizQuestion[];
    };
}

// --- Animation Variants ---
const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { duration: ANIMATION_DURATION, ease: "easeInOut" }
    },
    exit: { opacity: 0, transition: { duration: ANIMATION_DURATION / 2, ease: "easeInOut" } }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: ANIMATION_DURATION, ease: "easeOut" }
    }
};

const sectionItemVariants: Variants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
        opacity: 1,
        x: 0,
        transition: {
            delay: i * STAGGER_DELAY,
            duration: ANIMATION_DURATION,
            ease: "easeOut"
        }
    })
};

const quizOptionVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: (i: number) => ({
        opacity: 1,
        scale: 1,
        transition: {
            delay: i * STAGGER_DELAY,
            duration: ANIMATION_DURATION,
            ease: "easeOut"
        }
    }),
    hover: { scale: 1.03, transition: { duration: 0.15 } },
    tap: { scale: 0.98 }
};

// --- Quiz Player Sub-component ---
interface QuizPlayerProps {
    questionData: QuizQuestion;
    onAnswer: (selectedOption: string) => void; // Only string, timeout handled separately
    questionIndex: number;
    totalQuestions: number;
    timeLeft: number;
    maxTime: number;
    selectedOption: string | null;
    isAnswerCorrect: boolean | null;
    showContinue: boolean; // New prop to control continue button visibility
    onContinue: () => void; // New prop for continue action
    isTimeout: boolean; // New prop to indicate timeout state
}

const QuizPlayer: React.FC<QuizPlayerProps> = ({
    questionData, onAnswer, questionIndex, totalQuestions, timeLeft, maxTime,
    selectedOption, isAnswerCorrect, showContinue, onContinue, isTimeout
}) => {
    const getButtonState = (option: string): 'default' | 'correct' | 'incorrect' | 'revealed' | 'disabled' => {
        if (selectedOption === null && !isTimeout) return 'default';
        if (option === selectedOption) {
            return isAnswerCorrect ? 'correct' : 'incorrect';
        }
        // If an answer was selected (correct or incorrect), or if timed out, reveal the correct answer
        if ((selectedOption !== null || isTimeout) && option === questionData.answer) {
            return 'revealed';
        }
        return 'disabled'; // All other buttons are disabled after selection/timeout
    };

    return (
        <motion.div
            key={`quiz-content-${questionIndex}`} // Animate presence of the whole player content
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: ANIMATION_DURATION }}
            className="flex flex-col items-center gap-5 w-full" // Reduced gap slightly
        >
            {/* Timer and Question Progress */}
            <div className="w-full flex items-center justify-between mb-1 px-1">
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: STAGGER_DELAY * 1 }}
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                >
                    <Timer size={16} className={cn(timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-amber-600 dark:text-amber-500")} />
                    <span>Còn lại: <span className={cn("font-semibold", timeLeft <= 5 ? "text-red-600 dark:text-red-500" : "text-foreground")}>{timeLeft}s</span></span>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: STAGGER_DELAY * 0 }} // Show first
                    className="w-1/2"
                >
                    <Progress
                        value={(timeLeft / maxTime) * 100}
                        className={cn(
                            "h-2 rounded-full",
                            timeLeft <= 5 ? "bg-red-100 dark:bg-red-900/30" : "bg-amber-100 dark:bg-amber-900/30",
                            "[&>*]:rounded-full [&>*]:transition-all [&>*]:duration-1000 [&>*]:linear", // Target indicator
                            timeLeft <= 5 ? "[&>*]:bg-red-500" : "[&>*]:bg-amber-500"
                        )}
                    />
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: STAGGER_DELAY * 1 }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 rounded-full text-xs font-medium text-primary"
                >
                    <span>{questionIndex + 1}</span>
                    <span className="text-primary/60">/</span>
                    <span>{totalQuestions}</span>
                </motion.div>
            </div>

            {/* Question Text */}
            <motion.p
                key={`question-text-${questionIndex}`} // Ensure animation on text change
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: ANIMATION_DURATION, delay: STAGGER_DELAY * 2 }}
                className="text-lg md:text-xl font-semibold text-center mb-2 leading-tight" // Slightly larger text
            >
                {questionData.question}
            </motion.p>

            {/* Answer Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {questionData.options.map((option, index) => {
                    const state = getButtonState(option);
                    const isDisabled = selectedOption !== null || isTimeout;

                    return (
                        <motion.div
                            key={`${option}-${index}`}
                            custom={index + 3} // Continue stagger delay after question text
                            initial="hidden"
                            animate="visible"
                            variants={quizOptionVariants}
                            whileHover={!isDisabled ? "hover" : ""}
                            whileTap={!isDisabled ? "tap" : ""}
                        >
                            <Button
                                variant="outline"
                                onClick={() => !isDisabled && onAnswer(option)} // Prevent click if already answered/timeout
                                disabled={isDisabled && state !== 'correct' && state !== 'incorrect' && state !== 'revealed'} // Keep selected/revealed visually distinct but technically disabled
                                className={cn(
                                    "justify-between items-center w-full px-4 py-3 h-auto text-sm border-2 rounded-lg transition-all duration-200 ease-out",
                                    "text-left whitespace-normal leading-normal group", // Added group for potential icon hover effects
                                    // Base state
                                    state === 'default' && "border-border bg-background hover:border-primary/70 hover:bg-primary/5",
                                    // Correct selection
                                    state === 'correct' && "border-green-500 bg-green-50 dark:border-green-600 dark:bg-green-900/40 text-green-700 dark:text-green-300 ring-2 ring-green-500/30 ring-offset-1 ring-offset-background",
                                    // Incorrect selection
                                    state === 'incorrect' && "border-red-500 bg-red-50 dark:border-red-600 dark:bg-red-900/40 text-red-700 dark:text-red-400 ring-2 ring-red-500/30 ring-offset-1 ring-offset-background",
                                    // Revealed correct answer (when user chose wrong or timed out)
                                    state === 'revealed' && "border-green-500 bg-green-50 dark:border-green-600 dark:bg-green-900/40 text-green-700 dark:text-green-300 opacity-100", // Ensure revealed is fully opaque
                                    // Disabled (other options after selection/timeout)
                                    state === 'disabled' && "border-muted bg-muted/30 opacity-60 cursor-not-allowed"
                                )}
                            >
                                <span className="mr-2 flex-1 font-medium">{option}</span>
                                <div className="flex-shrink-0 h-5 w-5 ml-2 transition-transform duration-200">
                                    {state === 'correct' && <CheckCircle className="text-green-500" />}
                                    {state === 'incorrect' && <XCircle className="text-red-500" />}
                                    {state === 'revealed' && <CheckCircle className="text-green-500 opacity-80" />}
                                    {state === 'default' && <div className="rounded-full border-2 border-muted group-hover:border-primary/50 h-full w-full" />}
                                </div>
                            </Button>
                        </motion.div>
                    );
                })}
            </div>

            {/* Feedback Area (Timeout or Continue Button) */}
            <AnimatePresence>
                {isTimeout && !showContinue && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-4 text-red-600 dark:text-red-500 font-semibold flex items-center gap-2"
                    >
                        <Timer size={18} /> Hết giờ!
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="h-14 mt-2 flex items-center justify-center w-full"> {/* Placeholder for button */}
                <AnimatePresence>
                    {showContinue && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Button onClick={onContinue} size="lg" className="gap-2 px-6 group">
                                <span>Tiếp tục</span>
                                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

// --- Main Dialog Component ---
export function UnderstandMealDialog({ mealName, open, onOpenChange }: UnderstandMealDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<UnderstandMealData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [gameStage, setGameStage] = useState<'summary' | 'playing' | 'finished'>('summary');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
    const [isTimeout, setIsTimeout] = useState(false); // Track timeout state specifically
    const [showContinueButton, setShowContinueButton] = useState(false); // Control continue button visibility
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for delay before showing continue button
    const [timeLeft, setTimeLeft] = useState(QUIZ_TIME_PER_QUESTION);

    // --- State Reset ---
    const resetGameState = useCallback((stage: 'summary' | 'playing' | 'finished' = 'summary') => {
        setGameStage(stage);
        setCurrentQuestionIndex(0);
        setScore(0);
        setSelectedOption(null);
        setIsAnswerCorrect(null);
        setIsTimeout(false);
        setShowContinueButton(false);
        setTimeLeft(QUIZ_TIME_PER_QUESTION);
        if (timerRef.current) clearInterval(timerRef.current);
        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        timerRef.current = null;
        feedbackTimeoutRef.current = null;
    }, []);

    // --- Cleanup Timers ---
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        };
    }, []);

    // --- Data Fetching ---
    useEffect(() => {
        if (open && mealName) {
            const fetchData = async () => {
                setIsLoading(true);
                setData(null);
                setError(null);
                resetGameState('summary'); // Reset to summary stage initially

                try {
                    const response = await fetch(API_ENDPOINT, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ mealName }),
                    });
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const result: UnderstandMealData = await response.json();
                    console.log('[UnderstandMealDialog] API result:', result); // <--- Thêm log này
                    // Basic validation (can be more robust)
                    if (!result?.summary) throw new Error("Invalid data: 'summary' missing.");
                    if (result.game && !Array.isArray(result.game.quiz)) result.game.quiz = [];

                    setData(result);
                } catch (err: any) {
                    console.error("Fetch Error:", err);
                    setError(err.message || "Không thể tải thông tin. Vui lòng thử lại.");
                } finally {
                    setIsLoading(false);
                }
            };
            fetchData();
        } else if (!open) {
            // Reset completely when dialog closes
            setData(null);
            setError(null);
            setIsLoading(false);
            resetGameState('summary');
        }
    }, [open, mealName, resetGameState]); // resetGameState added

    // --- Quiz Logic ---

    // Go to Next Question or Finish
    const handleNextQuestion = useCallback(() => {
        // Clear feedback state for the next question
        setSelectedOption(null);
        setIsAnswerCorrect(null);
        setIsTimeout(false);
        setShowContinueButton(false);
        setTimeLeft(QUIZ_TIME_PER_QUESTION);
        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current); // Clear pending feedback timeout

        const nextIndex = currentQuestionIndex + 1;
        if (data?.game?.quiz && nextIndex < data.game.quiz.length) {
            setCurrentQuestionIndex(nextIndex);
            // Timer will be started by useEffect
        } else {
            setGameStage('finished');
            if (timerRef.current) clearInterval(timerRef.current); // Stop timer on finish
        }
    }, [currentQuestionIndex, data]);

    // Start Timer for Current Question
    const startTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeLeft(QUIZ_TIME_PER_QUESTION);

        timerRef.current = setInterval(() => {
            setTimeLeft((prevTime) => {
                if (prevTime <= 1) {
                    clearInterval(timerRef.current!);
                    timerRef.current = null;
                    // --- Handle Timeout ---
                    setIsTimeout(true); // Set timeout state
                    setSelectedOption(null); // No option was selected
                    setIsAnswerCorrect(false); // Timeout is considered incorrect
                    // Show feedback, then show continue button
                    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
                    feedbackTimeoutRef.current = setTimeout(() => {
                        setShowContinueButton(true);
                    }, FEEDBACK_DELAY / 2); // Shorter delay for timeout feedback
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000);
    }, []); // Removed handleNextQuestion dependency

    // Handle User Answer Selection
    const handleAnswer = useCallback((selected: string) => {
        if (selectedOption !== null || isTimeout) return; // Prevent answering multiple times or after timeout

        if (timerRef.current) clearInterval(timerRef.current); // Stop timer on answer
        timerRef.current = null;
        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);

        if (!data?.game?.quiz) return; // Should not happen if playing

        const currentQuestion = data.game.quiz[currentQuestionIndex];
        const correct = selected === currentQuestion.answer;

        setSelectedOption(selected);
        setIsAnswerCorrect(correct);
        setIsTimeout(false); // Explicitly set timeout to false
        if (correct) {
            setScore((prevScore) => prevScore + 1);
            // Optional: Add sound effect for correct answer
        } else {
            // Optional: Add sound effect for incorrect answer
        }

        // Show feedback for a moment, then show the continue button
        feedbackTimeoutRef.current = setTimeout(() => {
            setShowContinueButton(true);
        }, FEEDBACK_DELAY);

    }, [currentQuestionIndex, data, selectedOption, isTimeout]); // Added selectedOption, isTimeout

    // Effect to Start Timer when entering 'playing' stage or question changes
    useEffect(() => {
        // Only start timer if playing, data is loaded, and no answer selected/timeout yet
        if (gameStage === 'playing' && data?.game?.quiz && selectedOption === null && !isTimeout) {
            startTimer();
        }
        // Cleanup timer if stage changes, answer selected, or timeout occurs
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [gameStage, currentQuestionIndex, data, startTimer, selectedOption, isTimeout]); // Added selectedOption, isTimeout

    // Handler to Start the Quiz
    const handleStartQuiz = () => {
        if (data?.game?.quiz && data.game.quiz.length > 0) {
            resetGameState('playing'); // Reset and set stage to playing
            // Timer will start via useEffect
        } else {
            console.warn("Cannot start quiz: No quiz data.");
            // Maybe show a toast/alert
        }
    };

    // Handler to Restart Quiz
    const handleRestartQuiz = () => {
        resetGameState('playing'); // Reset and set stage to playing
        // Timer will start via useEffect
    };

    // --- Data & Calculations ---
    const totalQuestions = data?.game?.quiz?.length ?? 0;
    const scorePercentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
    const currentQuizData = (data?.game?.quiz && currentQuestionIndex < totalQuestions)
        ? data.game.quiz[currentQuestionIndex]
        : null;

    // --- Score Feedback ---
    const getScoreFeedback = () => {
        // ... (keep existing score feedback logic)
        if (scorePercentage >= 90) return { message: "Xuất sắc! Bạn là chuyên gia ẩm thực!", icon: <Award className="h-20 w-20 text-yellow-500" />, color: "text-yellow-500" };
        if (scorePercentage >= 70) return { message: "Tuyệt vời! Am hiểu rất tốt!", icon: <CheckCircle className="h-20 w-20 text-green-500" />, color: "text-green-500" };
        if (scorePercentage >= 50) return { message: "Khá tốt! Kiến thức vững vàng.", icon: <Info className="h-20 w-20 text-blue-500" />, color: "text-blue-500" };
        return { message: "Cần tìm hiểu thêm nhé!", icon: <Heart className="h-20 w-20 text-red-500" />, color: "text-red-500" };
    };
    const scoreFeedback = getScoreFeedback();

    // --- Section Data ---
    const sectionIcons: { [key: string]: React.ReactNode } = {
        introduction: <Coffee size={20} className="text-blue-500" />,
        origin: <Globe size={20} className="text-indigo-500" />,
        cooking: <Utensils size={20} className="text-amber-500" />,
        nutrition: <Leaf size={20} className="text-green-500" />,
        funFact: <Lightbulb size={20} className="text-yellow-500" />
    };
    const sectionTitles: { [key: string]: string } = {
        introduction: "Giới thiệu & Văn hóa",
        origin: "Nguồn gốc & Vùng miền",
        cooking: "Cách chế biến",
        nutrition: "Dinh dưỡng & Lợi ích",
        funFact: "Thông tin thú vị"
    };
    const sectionColors: { [key: string]: string } = {
        introduction: "border-blue-200 bg-blue-50/50 dark:border-blue-800/40 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300",
        origin: "border-indigo-200 bg-indigo-50/50 dark:border-indigo-800/40 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-300",
        cooking: "border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300",
        nutrition: "border-green-200 bg-green-50/50 dark:border-green-800/40 dark:bg-green-950/20 text-green-800 dark:text-green-300",
        funFact: "border-yellow-200 bg-yellow-50/50 dark:border-yellow-800/40 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-300",
    };
    const summarySections = data?.summary
        ? Object.entries(data.summary).filter(([, value]) => value)
        : [];
    const hasValidQuiz = data?.game?.quiz && data.game.quiz.length > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[95vh] h-full sm:h-auto sm:max-h-[90vh] flex flex-col p-0 shadow-2xl rounded-xl border-border/10 overflow-hidden bg-background/95 backdrop-blur-sm">
                {/* Header */}
                <DialogHeader className="p-5 md:p-6 pb-4 border-b shrink-0 bg-background/80">
                    <DialogTitle className="flex items-center gap-3 text-lg md:text-xl font-semibold">
                        <BookOpenCheck size={22} className="text-primary" />
                        <span>Tìm hiểu về: <span className="text-primary font-bold">{mealName}</span></span>
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground mt-1.5">
                        {/* Dynamic Description based on stage */}
                        {gameStage === 'summary' && "Khám phá thông tin và thử thách kiến thức."}
                        {gameStage === 'playing' && totalQuestions > 0 && `Câu ${currentQuestionIndex + 1}/${totalQuestions} - Thời gian: ${QUIZ_TIME_PER_QUESTION}s`}
                        {gameStage === 'playing' && totalQuestions === 0 && "Đang chuẩn bị câu hỏi..."}
                        {gameStage === 'finished' && "Kết quả bài kiểm tra kiến thức."}
                    </DialogDescription>
                </DialogHeader>

                {/* Overall Quiz Progress Bar */}
                {gameStage === 'playing' && totalQuestions > 0 && (
                    <div className="px-6 pt-3 pb-0 shrink-0">
                        <Progress
                            value={((currentQuestionIndex + 1) / totalQuestions) * 100}
                            className="w-full h-1.5 rounded-full bg-muted [&>*]:bg-primary [&>*]:rounded-full [&>*]:transition-all [&>*]:duration-300 [&>*]:ease-out"
                        />
                    </div>
                )}

                {/* Scrollable Content Area */}
                <ScrollArea className="flex-grow overflow-y-auto" type="auto">
                    <div className="p-5 md:p-6"> {/* Content Padding */}
                        <AnimatePresence mode="wait">
                            {/* Loading State */}
                            {isLoading && (
                                <motion.div key="loading" {...containerVariants} className="flex flex-col items-center justify-center gap-4 text-muted-foreground text-center min-h-[350px]">
                                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                    <p className="text-base font-medium mt-2">Đang tải dữ liệu...</p>
                                </motion.div>
                            )}

                            {/* Error State */}
                            {!isLoading && error && (
                                <motion.div key="error" {...containerVariants} className="flex items-center justify-center p-4 min-h-[350px]">
                                    <Alert variant="destructive" className="w-full max-w-md border-2 shadow-md bg-red-50 dark:bg-red-950/50">
                                        <AlertCircle className="h-5 w-5" />
                                        <AlertTitle className="font-semibold">Đã xảy ra lỗi</AlertTitle>
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                </motion.div>
                            )}

                            {/* Summary Stage */}
                            {!isLoading && !error && data && gameStage === 'summary' && (
                                <motion.div key="summary" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4 md:space-y-5">
                                    {summarySections.length > 0 ? summarySections.map(([key, value], index) => (
                                        <motion.section
                                            key={key} custom={index} variants={sectionItemVariants}
                                            className={cn("p-4 rounded-lg border transition-colors duration-200", sectionColors[key] || "border-muted bg-muted/20")}
                                        >
                                            <h3 className={cn("font-semibold text-base mb-2 flex items-center gap-2.5", sectionColors[key]?.split(' ').find(c => c.startsWith('text-')) || 'text-foreground')}>
                                                {sectionIcons[key] || <Info size={20} />}
                                                <span>{sectionTitles[key] || key}</span>
                                            </h3>
                                            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{String(value)}</p>
                                        </motion.section>
                                    )) : (
                                        <motion.div variants={itemVariants} className="text-center text-muted-foreground p-6 border rounded-lg bg-muted/30">
                                            <Info size={24} className="mx-auto mb-2 opacity-60" />
                                            Chưa có thông tin tóm tắt cho món ăn này.
                                        </motion.div>
                                    )}

                                    {/* Start Quiz Button */}
                                    {hasValidQuiz ? (
                                        <motion.div custom={summarySections.length} variants={sectionItemVariants} className="pt-4 text-center">
                                            <div className="p-5 rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 shadow-sm hover:shadow-md transition-shadow duration-300">
                                                <h3 className="font-semibold text-lg mb-2 text-primary">Sẵn sàng thử thách?</h3>
                                                <p className="text-muted-foreground mb-4 text-sm">Kiểm tra hiểu biết của bạn về <span className="font-medium">{mealName}</span>!</p>
                                                <Button onClick={handleStartQuiz} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 group shadow hover:shadow-lg hover:scale-[1.02]">
                                                    <Play className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:scale-110" /> Bắt đầu Quiz
                                                </Button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        !isLoading && data && (
                                            <motion.div key="no-quiz" custom={summarySections.length} variants={sectionItemVariants} className="text-center text-muted-foreground text-sm pt-5 mt-5 border-t border-dashed">
                                                <div className="p-4 rounded-lg bg-muted/50 inline-flex items-center gap-2">
                                                    <Info className="h-4 w-4 opacity-70" />
                                                    <p>Chưa có bài quiz cho món ăn này.</p>
                                                </div>
                                            </motion.div>
                                        )
                                    )}
                                </motion.div>
                            )}

                            {/* Playing Stage */}
                            {!isLoading && !error && data && currentQuizData && gameStage === 'playing' && (
                                <motion.div key="playing" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
                                    <QuizPlayer
                                        questionData={currentQuizData}
                                        onAnswer={handleAnswer}
                                        questionIndex={currentQuestionIndex}
                                        totalQuestions={totalQuestions}
                                        timeLeft={timeLeft}
                                        maxTime={QUIZ_TIME_PER_QUESTION}
                                        selectedOption={selectedOption}
                                        isAnswerCorrect={isAnswerCorrect}
                                        showContinue={showContinueButton}
                                        onContinue={handleNextQuestion}
                                        isTimeout={isTimeout}
                                    />
                                </motion.div>
                            )}

                            {/* Finished Stage */}
                            {!isLoading && !error && data && gameStage === 'finished' && (
                                <motion.div key="finished" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="text-center space-y-6 py-8 flex flex-col items-center">
                                    {/* Icon Animation */}
                                    <motion.div initial={{ scale: 0.5, opacity: 0, rotate: -15 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ duration: 0.6, type: "spring", stiffness: 120, damping: 10, delay: 0.1 }}>
                                        {scoreFeedback.icon}
                                    </motion.div>
                                    {/* Message */}
                                    <motion.h3 variants={itemVariants} className={cn("text-2xl font-bold", scoreFeedback.color)}>
                                        {scoreFeedback.message}
                                    </motion.h3>
                                    {/* Score Display */}
                                    <motion.div variants={itemVariants} transition={{ delay: 0.1 }} className="flex flex-col items-center gap-2">
                                        <p className="text-lg text-muted-foreground">Kết quả của bạn:</p>
                                        <div className="relative w-36 h-36 flex items-center justify-center my-2">
                                            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                                                <circle cx="50" cy="50" r="45" strokeWidth="8" className="stroke-muted/30" fill="none" />
                                                <motion.circle
                                                    cx="50" cy="50" r="45" strokeWidth="8" className="stroke-primary" fill="none"
                                                    strokeLinecap="round" transform="rotate(-90 50 50)"
                                                    style={{ pathLength: 0, pathOffset: 0 }}
                                                    initial={{ strokeDasharray: "0, 283" }}
                                                    animate={{ strokeDasharray: `${scorePercentage * 2.83}, 283` }}
                                                    transition={{ duration: 1.2, ease: "circOut", delay: 0.4 }}
                                                />
                                            </svg>
                                            <div className="text-center">
                                                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-4xl font-bold text-primary">{score}</motion.span>
                                                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="text-xl text-muted-foreground">/{totalQuestions > 0 ? totalQuestions : '?'}</motion.span>
                                            </div>
                                        </div>
                                        <motion.p variants={itemVariants} transition={{ delay: 0.2 }} className="text-base text-muted-foreground">
                                            (Đạt {scorePercentage}%)
                                        </motion.p>
                                    </motion.div>
                                    {/* Action Buttons */}
                                    <motion.div variants={itemVariants} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row justify-center gap-3 pt-4 w-full max-w-xs mx-auto">
                                        <Button onClick={handleRestartQuiz} variant="default" size="lg" className="gap-2 w-full sm:w-auto flex-1 shadow hover:shadow-md">
                                            <RotateCcw className="h-4 w-4" /> Chơi lại
                                        </Button>
                                        <Button onClick={() => setGameStage('summary')} variant="outline" size="lg" className="gap-2 w-full sm:w-auto flex-1">
                                            <BookOpenCheck className="h-4 w-4" /> Xem lại thông tin
                                        </Button>
                                    </motion.div>
                                </motion.div>
                            )}

                            {/* No Data State */}
                            {!isLoading && !data && !error && (
                                <motion.div key="nodata" {...containerVariants} className="flex flex-col items-center justify-center gap-3 text-muted-foreground text-center min-h-[350px]">
                                    <Info size={32} className="opacity-50" />
                                    <p className="text-sm font-medium mt-2">Không có dữ liệu.</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </ScrollArea>

                {/* Footer */}
                <DialogFooter className="p-4 md:px-6 md:py-4 border-t bg-muted/40 sm:justify-end shrink-0">
                    <DialogClose asChild>
                        <Button type="button" variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                            <X size={16}/> Đóng
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}