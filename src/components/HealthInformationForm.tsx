'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// --- UI Components ---
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// --- Icons ---
import {
    User, Check, ChevronLeft, ChevronRight, Send, Activity, Apple, Scale, HeartPulse, Target, Info, CircleUserRound, Weight, Ruler, Bike, Ban, Utensils, Goal
} from 'lucide-react';

// --- Form Schema ---
const GENDERS = ["Male", "Female", "Other", "Prefer not to say"] as const;
const ACTIVITY_LEVELS = [
    { value: "sedentary", label: "Sedentary (little or no exercise)" },
    { value: "light", label: "Lightly active (light exercise/sports 1-3 days/week)" },
    { value: "moderate", label: "Moderately active (moderate exercise/sports 3-5 days/week)" },
    { value: "active", label: "Very active (hard exercise/sports 6-7 days a week)" },
    { value: "extra_active", label: "Extra active (very hard exercise/sports & physical job)" },
] as const;

const formSchema = z.object({
    name: z.string().min(2, "Tên phải có ít nhất 2 ký tự."),
    age: z.coerce.number({ invalid_type_error: "Tuổi phải là một số." })
        .positive("Tuổi phải là số dương.")
        .max(120, "Tuổi không hợp lệ.")
        .optional().nullable(),
    gender: z.enum(GENDERS).optional(),
    height: z.coerce.number({ invalid_type_error: "Chiều cao phải là một số." })
        .positive("Chiều cao phải là số dương.")
        .optional().nullable(),
    weight: z.coerce.number({ invalid_type_error: "Cân nặng phải là một số." })
        .positive("Cân nặng phải là số dương.")
        .optional().nullable(),
    activityLevel: z.enum(ACTIVITY_LEVELS.map(a => a.value) as [string, ...string[]]).optional(),
    allergies: z.string().optional(),
    dietaryRestrictions: z.string().optional(),
    preferences: z.string().optional(),
    medicalConditions: z.string().optional(),
    goals: z.string().optional(),
});

type HealthInformationFormValues = z.infer<typeof formSchema>;

// --- Steps Definition ---
// Sử dụng 'as const' để đảm bảo type inference chính xác cho các trường fields
const steps = [
    { id: 1, name: 'Thông tin Cá nhân', icon: CircleUserRound, fields: ['name', 'age', 'gender'] },
    { id: 2, name: 'Chỉ số Cơ thể', icon: Scale, fields: ['height', 'weight'] },
    { id: 3, name: 'Mức độ Vận động', icon: Bike, fields: ['activityLevel'] },
    { id: 4, name: 'Thông tin Dinh dưỡng', icon: Utensils, fields: ['allergies', 'dietaryRestrictions', 'preferences'] },
    { id: 5, name: 'Sức khỏe & Mục tiêu', icon: Goal, fields: ['medicalConditions', 'goals'] },
] as const; // <-- 'as const' làm cho 'fields' thành readonly

// --- Main Component ---
export function HealthInformationForm() {
    const [currentStep, setCurrentStep] = useState(1);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);

    const form = useForm<HealthInformationFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            age: null,
            gender: undefined,
            height: null,
            weight: null,
            activityLevel: undefined,
            allergies: "",
            dietaryRestrictions: "",
            medicalConditions: "",
            preferences: "",
            goals: "",
        },
        mode: "onChange",
    });

    // --- Navigation Logic ---
    const triggerValidation = async (stepIndex: number): Promise<boolean> => {
        // Lấy mảng fields readonly từ steps
        const readonlyFields = steps[stepIndex - 1]?.fields;

        // *** SỬA LỖI: Tạo bản sao mutable của mảng fields ***
        // Sử dụng toán tử spread (...) để tạo một mảng mới (mutable)
        const fieldsToValidate = readonlyFields ? [...readonlyFields] : undefined;
        // ----------------------------------------------------

        if (!fieldsToValidate) return true; // Không có field để validate cho bước này

        // Trigger validation cho các field của bước hiện tại bằng mảng mutable
        const result = await form.trigger(fieldsToValidate, { shouldFocus: true });
        return result;
    };

    const nextStep = async () => {
        const isValid = await triggerValidation(currentStep);
        if (isValid) {
            setCompletedSteps(prev => [...new Set([...prev, currentStep])]);
            if (currentStep < steps.length) {
                setCurrentStep(prev => prev + 1);
            }
        } else {
            console.log("Validation failed for step:", currentStep);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const goToStep = async (stepId: number) => {
        if (stepId < currentStep) {
            setCurrentStep(stepId);
        } else if (stepId > currentStep) {
            let canProceed = true;
            for (let i = currentStep; i < stepId; i++) {
                const isValid = await triggerValidation(i);
                if (!isValid) {
                    setCurrentStep(i);
                    canProceed = false;
                    break;
                }
                setCompletedSteps(prev => [...new Set([...prev, i])]);
            }
            if (canProceed) {
                setCurrentStep(stepId);
            }
        }
    };

    // --- Submission Logic ---
    async function onSubmit(values: HealthInformationFormValues) {
        const isLastStepValid = await triggerValidation(steps.length);
        if (isLastStepValid) {
            setCompletedSteps(prev => [...new Set([...prev, steps.length])]);
            console.log("Form Submitted:", values);
            alert("Form submitted successfully! Check console for values.");
            // Xử lý logic submit ở đây
        } else {
            console.log("Validation failed on the final step.");
        }
    }

    // --- Animation Variants ---
    const variants = {
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 20 },
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8 p-4 md:p-6 max-w-6xl mx-auto">
            {/* --- Vertical Stepper Navigation --- */}
            <nav className="w-full lg:w-1/4 lg:pr-8 mb-6 lg:mb-0">
                <div className="sticky top-6">
                    <h2 className="text-lg font-semibold mb-4 text-foreground">Các Mục Thông Tin</h2>
                    <ol className="space-y-4">
                        {steps.map((step, index) => {
                            const isCompleted = completedSteps.includes(step.id);
                            const isActive = currentStep === step.id;

                            return (
                                <li key={step.id} className="flex items-start group cursor-pointer" onClick={() => goToStep(step.id)}>
                                    <div className="flex flex-col items-center mr-4">
                                        <motion.div
                                            className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-200",
                                                isActive ? "bg-primary border-primary text-primary-foreground" :
                                                isCompleted ? "bg-green-500 border-green-500 text-white" :
                                                "bg-muted border-border text-muted-foreground group-hover:border-primary"
                                            )}
                                            whileHover={{ scale: isActive ? 1 : 1.1 }}
                                            transition={{ type: "spring", stiffness: 300 }}
                                        >
                                            {isCompleted ? <Check size={16} /> : <step.icon size={16} />}
                                        </motion.div>
                                        {index < steps.length - 1 && (
                                            <div className={cn(
                                                "w-px h-8 mt-1",
                                                isCompleted ? "bg-green-500" : "bg-border"
                                            )}></div>
                                        )}
                                    </div>
                                    <div className="pt-1">
                                        <p className={cn(
                                            "text-sm font-medium transition-colors duration-200",
                                            isActive ? "text-primary" :
                                            isCompleted ? "text-foreground" :
                                            "text-muted-foreground group-hover:text-foreground"
                                        )}>
                                            {step.name}
                                        </p>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            </nav>

            {/* --- Form Content Area --- */}
            <div className="flex-1 lg:w-3/4">
                <Card className="shadow-lg border-border/80 bg-card">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)}>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    variants={variants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                >
                                    <CardHeader>
                                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                                            {/* Lấy icon từ mảng steps */}
                                            {React.createElement(steps[currentStep - 1].icon, { className: "text-primary" })}
                                            {steps[currentStep - 1].name}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6 pt-4">
                                        {/* --- Step 1 Content --- */}
                                        {currentStep === 1 && (
                                            <>
                                                <FormField
                                                    control={form.control}
                                                    name="name"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Họ và Tên</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Nhập họ và tên của bạn" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <FormField
                                                        control={form.control}
                                                        name="age"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Tuổi</FormLabel>
                                                                <FormControl>
                                                                    <Input type="number" placeholder="Nhập tuổi" value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="gender"
                                                        render={({ field }) => (
                                                            <FormItem className="space-y-3">
                                                                <FormLabel>Giới tính</FormLabel>
                                                                <FormControl>
                                                                    <RadioGroup
                                                                        onValueChange={field.onChange}
                                                                        defaultValue={field.value}
                                                                        className="flex flex-col sm:flex-row sm:flex-wrap gap-x-4 gap-y-2"
                                                                    >
                                                                        {GENDERS.map(gender => (
                                                                            <FormItem key={gender} className="flex items-center space-x-2 space-y-0">
                                                                                <FormControl>
                                                                                    <RadioGroupItem value={gender} />
                                                                                </FormControl>
                                                                                <FormLabel className="font-normal">{gender}</FormLabel>
                                                                            </FormItem>
                                                                        ))}
                                                                    </RadioGroup>
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {/* --- Step 2 Content --- */}
                                        {currentStep === 2 && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <FormField
                                                    control={form.control}
                                                    name="height"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="flex items-center gap-1"><Ruler size={16} /> Chiều cao (cm)</FormLabel>
                                                            <FormControl>
                                                                <Input type="number" placeholder="Ví dụ: 170" value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="weight"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="flex items-center gap-1"><Weight size={16} /> Cân nặng (kg)</FormLabel>
                                                            <FormControl>
                                                                <Input type="number" placeholder="Ví dụ: 65" value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        )}

                                        {/* --- Step 3 Content --- */}
                                        {currentStep === 3 && (
                                            <FormField
                                                control={form.control}
                                                name="activityLevel"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Mức độ Vận động Hàng ngày</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Chọn mức độ vận động của bạn" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {ACTIVITY_LEVELS.map(level => (
                                                                    <SelectItem key={level.value} value={level.value}>
                                                                        {level.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormDescription>
                                                            Chọn mức độ phù hợp nhất với lối sống của bạn.
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}

                                        {/* --- Step 4 Content --- */}
                                        {currentStep === 4 && (
                                            <>
                                                <FormField
                                                    control={form.control}
                                                    name="allergies"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="flex items-center gap-1"><Ban size={16} /> Dị ứng Thực phẩm (nếu có)</FormLabel>
                                                            <FormControl>
                                                                <Textarea placeholder="Liệt kê các loại thực phẩm bạn bị dị ứng (ví dụ: đậu phộng, hải sản vỏ cứng,...)" {...field} rows={3} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="dietaryRestrictions"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Hạn chế Ăn uống (nếu có)</FormLabel>
                                                            <FormControl>
                                                                <Textarea placeholder="Ví dụ: ăn chay, không dung nạp lactose, không ăn thịt đỏ,..." {...field} rows={3} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="preferences"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Sở thích Ăn uống</FormLabel>
                                                            <FormControl>
                                                                <Textarea placeholder="Mô tả các món ăn, hương vị, hoặc loại thực phẩm bạn yêu thích hoặc không thích..." {...field} rows={4} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </>
                                        )}

                                        {/* --- Step 5 Content --- */}
                                        {currentStep === 5 && (
                                            <>
                                                <FormField
                                                    control={form.control}
                                                    name="medicalConditions"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="flex items-center gap-1"><HeartPulse size={16} /> Tình trạng Sức khỏe Liên quan (nếu có)</FormLabel>
                                                            <FormControl>
                                                                <Textarea placeholder="Ví dụ: tiểu đường type 2, cao huyết áp, bệnh gout,..." {...field} rows={3} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="goals"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="flex items-center gap-1"><Target size={16} /> Mục tiêu Dinh dưỡng/Sức khỏe</FormLabel>
                                                            <FormControl>
                                                                <Textarea placeholder="Ví dụ: giảm cân, tăng cơ, ăn uống lành mạnh hơn, kiểm soát đường huyết,..." {...field} rows={4} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </>
                                        )}
                                    </CardContent>
                                </motion.div>
                            </AnimatePresence>

                            {/* --- Navigation Buttons --- */}
                            <div className="flex justify-between p-6 border-t border-border/60 mt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={prevStep}
                                    disabled={currentStep === 1}
                                    className={cn(currentStep === 1 && "opacity-50 cursor-not-allowed")}
                                >
                                    <ChevronLeft className="mr-2 h-4 w-4" />
                                    Quay lại
                                </Button>

                                {currentStep < steps.length ? (
                                    <Button type="button" onClick={nextStep}>
                                        Tiếp theo
                                        <ChevronRight className="ml-2 h-4 w-4" />
                                    </Button>
                                ) : (
                                    <Button type="submit">
                                        <Send className="mr-2 h-4 w-4" />
                                        Hoàn tất & Lưu
                                    </Button>
                                )}
                            </div>
                        </form>
                    </Form>
                </Card>
            </div>
        </div>
    );
}