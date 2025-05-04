'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// Match the types defined in the parent page
interface FoodEntry {
  id: string;
  name: string;
  quantity: string;
  time: string;
  calories?: number;
  notes?: string;
}

interface JourneyEntry {
  date: string; // YYYY-MM-DD
  foods: FoodEntry[];
  dailyQuestionResponse?: string;
}

// Define the props for the form component
interface JourneyInputFormProps {
  onSubmit: (newEntryData: Omit<JourneyEntry, 'insights'>) => void;
  // Add a daily question prop
  dailyQuestion?: string;
}

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function JourneyInputForm({ onSubmit, dailyQuestion = "How are you feeling today?" }: JourneyInputFormProps) {
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [mealTime, setMealTime] = useState(''); // e.g., Breakfast, Lunch, Dinner, Snack
  const [dailyResponse, setDailyResponse] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!foodName.trim() || !quantity.trim()) {
      // Basic validation: Ensure food name and quantity are provided
      // You might want to add more robust validation/feedback
      alert("Please enter food name and quantity.");
      return;
    }

    const newFoodEntry: FoodEntry = {
      id: `food-${Date.now()}-${Math.random().toString(36).substring(7)}`, // Simple unique ID
      name: foodName.trim(),
      quantity: quantity.trim(),
      time: mealTime.trim() || 'Unspecified', // Default if time is empty
    };

    const todayDate = getTodayDateString();

    const newJourneyEntryData: Omit<JourneyEntry, 'insights'> = {
      date: todayDate,
      foods: [newFoodEntry], // Submit one food item at a time for simplicity
      dailyQuestionResponse: dailyResponse.trim() || undefined, // Only include if provided
    };

    onSubmit(newJourneyEntryData);

    // Clear the food input fields after submission, but keep daily response?
    // Decide if daily response should clear after adding *one* food item,
    // or maybe have a separate "Save Daily Response" button.
    // For now, let's clear food fields only.
    setFoodName('');
    setQuantity('');
    setMealTime('');
    // setDailyResponse(''); // Uncomment if you want to clear daily response too
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Log Food Item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="foodName">Food Name</Label>
              <Input
                id="foodName"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                placeholder="e.g., Phở Bò"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g., 1 tô, 100g"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mealTime">Meal Time / Type</Label>
              <Input
                id="mealTime"
                value={mealTime}
                onChange={(e) => setMealTime(e.target.value)}
                placeholder="e.g., Breakfast, 12:30 PM"
              />
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <Label htmlFor="dailyResponse">{dailyQuestion}</Label>
            <Textarea
              id="dailyResponse"
              value={dailyResponse}
              onChange={(e) => setDailyResponse(e.target.value)}
              placeholder="Your response..."
              rows={3}
            />
             <p className="text-xs text-muted-foreground">
               Your answer will be saved with today's entry when you add a food item.
             </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit">Add Food Entry</Button>
        </CardFooter>
      </form>
    </Card>
  );
}
