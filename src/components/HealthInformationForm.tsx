'use client';

import React, { useState } from 'react';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
    name: z.string().min(2, {
        message: "Name must be at least 2 characters.",
    }),
    age: z.number().min(1, {
        message: "Age must be at least 1.",
    }).max(120, {
        message: "Age must be less than 120.",
    }),
    height: z.number().min(1, {
        message: "Height must be at least 1.",
    }),
    weight: z.number().min(1, {
        message: "Weight must be at least 1.",
    }),
    gender: z.string().optional(), // Added gender
    activityLevel: z.string().optional(), // More detailed activity level
    allergies: z.string().optional(),
    dietaryRestrictions: z.string().optional(),
    medicalConditions: z.string().optional(),
    preferences: z.string().optional(), // Added preferences
    goals: z.string().optional(), // Added goals
});

type HealthInformationFormValues = z.infer<typeof formSchema>;

function Fieldset({ children }: { children: React.ReactNode }) {
    return (
        <Card className="mb-6">
            <CardContent className="grid gap-4">
                {children}
            </CardContent>
        </Card>
    );
}

const steps = [
    { id: 1, name: 'Personal Information' },
    { id: 2, name: 'Physical Attributes' },
    { id: 3, name: 'Lifestyle Information' },
    { id: 4, name: 'Dietary Information' },
    { id: 5, name: 'Medical Details & Goals' },
];

export function HealthInformationForm() {
    const form = useForm<HealthInformationFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            age: 0,
            height: 0,
            weight: 0,
            gender: "",
            activityLevel: "",
            allergies: "",
            dietaryRestrictions: "",
            medicalConditions: "",
            preferences: "",
            goals: "",
        },
        mode: "onChange",
    });

    const [currentStep, setCurrentStep] = useState(1);

    const nextStep = () => setCurrentStep(prev => prev + 1);
    const prevStep = () => setCurrentStep(prev => prev - 1);

    function onSubmit(values: HealthInformationFormValues) {
        console.log(values);
        // Handle submission logic here
    }

    return (
        <div className="flex flex-col lg:flex-row gap-8">
            {/* Navigation */}
            <div className="lg:w-1/4">
                <Card>
                    <CardHeader>
                        <CardTitle>Sections</CardTitle>
                        <CardDescription>Navigate to different sections.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                        <ScrollArea className="h-[400px] w-full">
                            <div className="flex flex-col space-y-2">
                                {steps.map((step) => (
                                    <Button
                                        key={step.id}
                                        variant={currentStep === step.id ? "default" : "outline"}
                                        onClick={() => setCurrentStep(step.id)}
                                        className="justify-start"
                                    >
                                        {step.name}
                                    </Button>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {/* Form */}
            <div className="lg:w-3/4">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        {currentStep === 1 && (
                            <Fieldset>
                                <CardHeader>
                                    <CardTitle>Step 1: Personal Information</CardTitle>
                                    <CardDescription>Enter your basic personal details.</CardDescription>
                                </CardHeader>
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter your name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="age"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Age</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="Enter your age" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="gender"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Gender</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Enter your gender" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </Fieldset>
                        )}

                        {currentStep === 2 && (
                            <Fieldset>
                                <CardHeader>
                                    <CardTitle>Step 2: Physical Attributes</CardTitle>
                                    <CardDescription>Provide your height and weight information.</CardDescription>
                                </CardHeader>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="height"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Height (cm)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="Enter your height in cm" {...field} />
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
                                                <FormLabel>Weight (kg)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="Enter your weight in kg" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </Fieldset>
                        )}

                        {currentStep === 3 && (
                            <Fieldset>
                                <CardHeader>
                                    <CardTitle>Step 3: Lifestyle Information</CardTitle>
                                    <CardDescription>Describe your typical activity level.</CardDescription>
                                </CardHeader>
                                <FormField
                                    control={form.control}
                                    name="activityLevel"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Activity Level</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter your activity level" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </Fieldset>
                        )}

                        {currentStep === 4 && (
                            <Fieldset>
                                <CardHeader>
                                    <CardTitle>Step 4: Dietary Information</CardTitle>
                                    <CardDescription>Share any allergies, dietary restrictions, and food preferences.</CardDescription>
                                </CardHeader>
                                <FormField
                                    control={form.control}
                                    name="allergies"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Allergies</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter any allergies" {...field} />
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
                                            <FormLabel>Dietary Restrictions</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter any dietary restrictions" {...field} />
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
                                            <FormLabel>Food Preferences</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Enter your food preferences" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </Fieldset>
                        )}

                        {currentStep === 5 && (
                            <Fieldset>
                                <CardHeader>
                                    <CardTitle>Step 5: Medical Details &amp; Goals</CardTitle>
                                    <CardDescription>Provide information about medical conditions and your dietary goals.</CardDescription>
                                </CardHeader>
                                <FormField
                                    control={form.control}
                                    name="medicalConditions"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Medical Conditions</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter any medical conditions" {...field} />
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
                                            <FormLabel>Dietary Goals</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Enter your dietary goals" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </Fieldset>
                        )}

                        {/*
                         
                            {currentStep > 1 && (
                                <Button variant="secondary" onClick={prevStep}>
                                    Previous
                                </Button>
                            )}
                            {currentStep < 5 && (
                                <Button type="button" onClick={nextStep}>
                                    Next
                                </Button>
                            )}
                            {currentStep === 5 && (
                                <Button type="submit">
                                    Submit
                                </Button>
                            )}
                         */}
                         <Button type="submit">
                            Save
                        </Button>
                    </form>
                </Form>
            </div>
        </div>
    );
}

