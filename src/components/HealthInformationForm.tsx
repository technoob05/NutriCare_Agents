'use client';

import React from 'react';
import {
    Form,
    FormControl,
    FormDescription,
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
    allergies: z.string().optional(),
    dietaryRestrictions: z.string().optional(),
    medicalConditions: z.string().optional(),
    activityLevel: z.string().optional(),
});


export function HealthInformationForm() {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            age: 0,
            height: 0,
            weight: 0,
            allergies: "",
            dietaryRestrictions: "",
            medicalConditions: "",
            activityLevel: "",
        },
        mode: "onChange",
    })

    function onSubmit(values: z.infer<typeof formSchema>) {
        console.log(values)
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Personal Information</CardTitle>
                        <CardDescription>Enter your basic personal details.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
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
                        </div>
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
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Health Details</CardTitle>
                        <CardDescription>Provide details about your health and dietary needs.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
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
                    </CardContent>
                </Card>
                <Button type="submit">Submit</Button>
            </form>
        </Form>
    );
}
