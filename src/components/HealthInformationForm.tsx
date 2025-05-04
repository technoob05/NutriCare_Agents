'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { z } from "zod";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { 
    Alert, 
    AlertDescription 
} from "@/components/ui/alert";
import { 
    Accordion, 
    AccordionContent, 
    AccordionItem, 
    AccordionTrigger 
} from "@/components/ui/accordion";

// --- Constants for Select Options ---
const GENDERS = ["Nam", "Nữ"] as const;
const AGE_GROUPS = [
    "Dưới 18 tuổi", "Từ 18 đến 24 tuổi", "Từ 25 đến 34 tuổi", "Từ 35 đến 44 tuổi",
    "Từ 45 đến 54 tuổi", "Từ 55 đến 64 tuổi", "Trên 65 tuổi"
] as const;
const RACES = ["Kinh", "Hoa", "Chăm", "Khmer", "Tày", "Khác"] as const;
const HOUSEHOLD_INCOMES = [
    "Dưới 3 triệu/tháng", "3 - 5 triệu/tháng", "5 - 7 triệu/tháng", "7 - 10 triệu/tháng",
    "10 - 15 triệu/tháng", "15 - 20 triệu/tháng", "20 - 25 triệu/tháng", "25 - 30 triệu/tháng",
    "30 - 40 triệu/tháng", "40 - 50 triệu/tháng", "50 - 60 triệu/tháng", "Trên 60 triệu/tháng"
] as const;
const EDUCATIONS = [
    "Chưa đi học", "Tiểu học", "Trung học cơ sở", "Trung học phổ thông", "Trung cấp",
    "Cao đẳng", "Đại học", "Sau đại học", "Thạc sĩ", "Tiến sĩ"
] as const;

// --- Form Schema ---
const formSchema = z.object({
    gender: z.enum(GENDERS, { required_error: "Vui lòng chọn giới tính." }),
    age_group: z.enum(AGE_GROUPS).optional(),
    race: z.enum(RACES).optional(),
    household_income: z.enum(HOUSEHOLD_INCOMES).optional(),
    education: z.enum(EDUCATIONS).optional(),
    symptom: z.string().optional(),
    spefical_diet: z.string().optional(),
    disease: z.string().optional(),
});

type HealthInformationFormValues = z.infer<typeof formSchema>;

// Helper function to parse comma-separated string to array
const parseStringToArray = (str: string | undefined | null): string[] => {
    if (!str) return [];
    return str.split(',').map(item => item.trim()).filter(item => item !== '');
};

// --- Main Component ---
export function HealthInformationForm() {
    const [submissionState, setSubmissionState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>("basic");

    const form = useForm<HealthInformationFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            gender: undefined,
            age_group: undefined,
            race: undefined,
            household_income: undefined,
            education: undefined,
            symptom: "",
            spefical_diet: "",
            disease: "",
        },
        mode: "onChange",
    });

    // --- Submission Logic ---
    async function onSubmit(values: HealthInformationFormValues) {
        setSubmissionState('submitting');
        setErrorMessage(null);
        
        console.log("Raw form values:", values);

        // Prepare payload for API
        const payload = {
            ...values,
            symptom: parseStringToArray(values.symptom),
            spefical_diet: parseStringToArray(values.spefical_diet),
            disease: parseStringToArray(values.disease),
        };

        // Remove optional fields if they are undefined or empty arrays
        Object.keys(payload).forEach(key => {
            const typedKey = key as keyof typeof payload;
            if (payload[typedKey] === undefined || (Array.isArray(payload[typedKey]) && (payload[typedKey] as string[]).length === 0)) {
                delete payload[typedKey];
            }
        });

        console.log("Payload to send:", payload);

        const url = "https://huynhtrungkiet09032005-food-recommend-api.hf.space/recommend_for_new_user";
        const headers = {
            "Content-Type": "application/json"
        };

        try {
            const response = await axios.post(url, payload, { headers });
            console.log("API Response:", response.data);

            // --- Save recommendations to localStorage ---
            if (response.data && Array.isArray(response.data.recommendations)) {
                try {
                    localStorage.setItem('userFoodRecommendations', JSON.stringify(response.data.recommendations));
                    console.log("Recommendations saved to localStorage.");
                } catch (storageError) {
                    console.error("Error saving recommendations to localStorage:", storageError);
                }
            } else {
                console.warn("No 'recommendations' array found in API response to save.");
            }

            setSubmissionState('success');
            
            // You could add navigation after success:
            // setTimeout(() => {
            //     window.location.href = '/recommendations';
            // }, 2000);
            
        } catch (error) {
            console.error('Error sending data to API:', error);
            setSubmissionState('error');
            setErrorMessage("Có lỗi xảy ra khi gửi thông tin. Vui lòng thử lại sau.");
        }
    }

    return (
        <div className="w-full bg-background px-3 py-4">
            <div className="max-w-md mx-auto">
                <Card className="border shadow-sm overflow-hidden">
                    <CardHeader className="space-y-1 bg-primary/5 py-3">
                        <CardTitle className="text-lg font-semibold text-center md:text-left">
                            Thông tin Sức khỏe & Dinh dưỡng
                        </CardTitle>
                        <CardDescription className="text-center md:text-left text-xs">
                            Cung cấp thông tin để nhận đề xuất dinh dưỡng phù hợp với bạn.
                        </CardDescription>
                    </CardHeader>
                    
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                            <CardContent className="pt-3 px-3 space-y-3">
                                {/* --- Success Alert --- */}
                                {submissionState === 'success' && (
                                    <Alert className="bg-green-50 border-green-200 py-2">
                                        <Check className="h-4 w-4 text-green-600" />
                                        <AlertDescription className="text-green-700 text-xs">
                                            Thông tin đã được gửi thành công!
                                        </AlertDescription>
                                    </Alert>
                                )}
                                
                                {/* --- Error Alert --- */}
                                {submissionState === 'error' && (
                                    <Alert className="bg-red-50 border-red-200 py-2">
                                        <AlertCircle className="h-4 w-4 text-red-600" />
                                        <AlertDescription className="text-red-700 text-xs">
                                            {errorMessage || "Có lỗi xảy ra. Vui lòng thử lại sau."}
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {/* --- Tabs Navigation --- */}
                                <Tabs 
                                    defaultValue="basic" 
                                    value={activeTab} 
                                    onValueChange={setActiveTab} 
                                    className="w-full"
                                >
                                    <TabsList className="grid grid-cols-3 mb-2 h-8">
                                        <TabsTrigger value="basic" className="text-xs py-1">Cơ bản</TabsTrigger>
                                        <TabsTrigger value="demographic" className="text-xs py-1">Nhân khẩu học</TabsTrigger>
                                        <TabsTrigger value="health" className="text-xs py-1">Sức khỏe</TabsTrigger>
                                    </TabsList>
                                    
                                    {/* --- Basic Tab Content --- */}
                                    <TabsContent value="basic" className="mt-0 space-y-3">
                                        {/* --- Gender (Required) --- */}
                                        <FormField
                                            control={form.control}
                                            name="gender"
                                            render={({ field }) => (
                                                <FormItem className="space-y-1">
                                                    <FormLabel className="text-sm font-medium flex items-center gap-1">
                                                        Giới tính <span className="text-red-500 text-xs">*</span>
                                                    </FormLabel>
                                                    <FormControl>
                                                        <RadioGroup
                                                            onValueChange={field.onChange}
                                                            defaultValue={field.value}
                                                            className="flex flex-row items-center gap-6"
                                                        >
                                                            {GENDERS.map(gender => (
                                                                <FormItem key={gender} className="flex items-center space-x-2 space-y-0">
                                                                    <FormControl>
                                                                        <RadioGroupItem value={gender} />
                                                                    </FormControl>
                                                                    <FormLabel className="font-normal text-sm cursor-pointer">
                                                                        {gender}
                                                                    </FormLabel>
                                                                </FormItem>
                                                            ))}
                                                        </RadioGroup>
                                                    </FormControl>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )}
                                        />

                                        {/* --- Age Group --- */}
                                        <FormField
                                            control={form.control}
                                            name="age_group"
                                            render={({ field }) => (
                                                <FormItem className="space-y-1">
                                                    <FormLabel className="text-sm font-medium">
                                                        Nhóm tuổi
                                                    </FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="w-full bg-background text-sm h-8">
                                                                <SelectValue placeholder="Chọn nhóm tuổi" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="max-h-[200px]">
                                                            {AGE_GROUPS.map(group => (
                                                                <SelectItem key={group} value={group} className="text-xs">
                                                                    {group}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    </TabsContent>
                                    
                                    {/* --- Demographic Tab Content --- */}
                                    <TabsContent value="demographic" className="mt-0 space-y-3">
                                        {/* --- Race --- */}
                                        <FormField
                                            control={form.control}
                                            name="race"
                                            render={({ field }) => (
                                                <FormItem className="space-y-1">
                                                    <FormLabel className="text-sm font-medium">
                                                        Dân tộc
                                                    </FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="w-full bg-background text-sm h-8">
                                                                <SelectValue placeholder="Chọn dân tộc" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {RACES.map(race => (
                                                                <SelectItem key={race} value={race} className="text-xs">
                                                                    {race}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )}
                                        />

                                        {/* --- Household Income --- */}
                                        <FormField
                                            control={form.control}
                                            name="household_income"
                                            render={({ field }) => (
                                                <FormItem className="space-y-1">
                                                    <FormLabel className="text-sm font-medium">
                                                        Thu nhập hộ gia đình
                                                    </FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="w-full bg-background text-sm h-8">
                                                                <SelectValue placeholder="Chọn mức thu nhập" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="max-h-[200px]">
                                                            {HOUSEHOLD_INCOMES.map(income => (
                                                                <SelectItem key={income} value={income} className="text-xs">
                                                                    {income}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )}
                                        />

                                        {/* --- Education --- */}
                                        <FormField
                                            control={form.control}
                                            name="education"
                                            render={({ field }) => (
                                                <FormItem className="space-y-1">
                                                    <FormLabel className="text-sm font-medium">
                                                        Trình độ học vấn
                                                    </FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="w-full bg-background text-sm h-8">
                                                                <SelectValue placeholder="Chọn trình độ học vấn" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="max-h-[200px]">
                                                            {EDUCATIONS.map(edu => (
                                                                <SelectItem key={edu} value={edu} className="text-xs">
                                                                    {edu}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    </TabsContent>
                                    
                                    {/* --- Health Tab Content --- */}
                                    <TabsContent value="health" className="mt-0 space-y-3">
                                        {/* --- Symptom (Array as Textarea) --- */}
                                        <FormField
                                            control={form.control}
                                            name="symptom"
                                            render={({ field }) => (
                                                <FormItem className="space-y-1">
                                                    <FormLabel className="text-sm font-medium">
                                                        Triệu chứng sức khỏe (nếu có)
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="Nhập các triệu chứng, cách nhau bằng dấu phẩy"
                                                            {...field}
                                                            rows={1}
                                                            className="resize-none bg-background text-sm min-h-[36px] px-2 py-1"
                                                        />
                                                    </FormControl>
                                                    <FormDescription className="text-xs">
                                                        Ví dụ: đau đầu, mệt mỏi, khó tiêu
                                                    </FormDescription>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )}
                                        />

                                        {/* --- Special Diet (Array as Textarea) --- */}
                                        <FormField
                                            control={form.control}
                                            name="spefical_diet"
                                            render={({ field }) => (
                                                <FormItem className="space-y-1">
                                                    <FormLabel className="text-sm font-medium">
                                                        Chế độ ăn đặc biệt (nếu có)
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="Nhập các chế độ ăn, cách nhau bằng dấu phẩy"
                                                            {...field}
                                                            rows={1}
                                                            className="resize-none bg-background text-sm min-h-[36px] px-2 py-1"
                                                        />
                                                    </FormControl>
                                                    <FormDescription className="text-xs">
                                                        Ví dụ: low carb, keto, ăn chay
                                                    </FormDescription>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )}
                                        />

                                        {/* --- Disease (Array as Textarea) --- */}
                                        <FormField
                                            control={form.control}
                                            name="disease"
                                            render={({ field }) => (
                                                <FormItem className="space-y-1">
                                                    <FormLabel className="text-sm font-medium">
                                                        Bệnh lý (nếu có)
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="Nhập các bệnh lý, cách nhau bằng dấu phẩy"
                                                            {...field}
                                                            rows={1}
                                                            className="resize-none bg-background text-sm min-h-[36px] px-2 py-1"
                                                        />
                                                    </FormControl>
                                                    <FormDescription className="text-xs">
                                                        Ví dụ: tiểu đường, huyết áp cao, gout
                                                    </FormDescription>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    </TabsContent>
                                </Tabs>
                            </CardContent>

                            {/* --- Submit Button --- */}
                            <CardFooter className="px-3 py-3 border-t bg-muted/20">
                                <div className="flex flex-col w-full gap-2">
                                    <div className="flex justify-between mb-1">
                                        <Button 
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                if (activeTab === "basic") return;
                                                else if (activeTab === "demographic") setActiveTab("basic");
                                                else if (activeTab === "health") setActiveTab("demographic");
                                            }}
                                            disabled={activeTab === "basic"}
                                            className="text-xs h-8 px-3"
                                        >
                                            Quay lại
                                        </Button>
                                        
                                        {activeTab !== "health" ? (
                                            <Button 
                                                type="button"
                                                size="sm"
                                                onClick={() => {
                                                    if (activeTab === "basic") setActiveTab("demographic");
                                                    else if (activeTab === "demographic") setActiveTab("health");
                                                }}
                                                className="text-xs h-8 px-3"
                                            >
                                                Tiếp tục
                                            </Button>
                                        ) : (
                                            <Button 
                                                type="submit" 
                                                disabled={submissionState === 'submitting' || submissionState === 'success'}
                                                size="sm"
                                                className="text-xs h-8 px-3"
                                            >
                                                {submissionState === 'submitting' ? (
                                                    <span className="flex items-center justify-center gap-1">
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                        <span>Đang xử lý...</span>
                                                    </span>
                                                ) : submissionState === 'success' ? (
                                                    <span className="flex items-center justify-center gap-1">
                                                        <Check className="h-3 w-3" />
                                                        <span>Đã gửi thành công</span>
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center justify-center">
                                                        Gửi thông tin
                                                    </span>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                    
                                    <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                                        <div 
                                            className="bg-primary h-full transition-all duration-300 ease-out"
                                            style={{
                                                width: activeTab === "basic" ? "33%" : activeTab === "demographic" ? "66%" : "100%"
                                            }}
                                        />
                                    </div>
                                </div>
                            </CardFooter>
                        </form>
                    </Form>
                </Card>
                
                <p className="mt-2 text-center text-xs text-muted-foreground leading-tight">
                    Thông tin của bạn sẽ được bảo mật và chỉ sử dụng để đưa ra gợi ý dinh dưỡng phù hợp.
                </p>
            </div>
        </div>
    );
}