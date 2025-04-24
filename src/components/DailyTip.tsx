import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';

// Placeholder tips - replace with dynamic fetching or a larger list
const tips = [
  "Drink a glass of water before each meal to aid digestion and feel fuller.",
  "Swap white rice for brown rice for more fiber and nutrients.",
  "Try adding herbs and spices instead of salt to flavor your food.",
  "Plan your meals for the week to save time and make healthier choices.",
  "A handful of nuts makes a great healthy snack between meals.",
];

const DailyTip = () => {
  // Logic to select a daily tip (e.g., based on the current date)
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  const tipIndex = dayOfYear % tips.length;
  const dailyTip = tips[tipIndex];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-500" />
          Daily Tip
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm">{dailyTip}</p>
      </CardContent>
    </Card>
  );
};

export default DailyTip;
