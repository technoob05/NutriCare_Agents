'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, TrendingUp } from 'lucide-react'; // Example icons

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

interface SavedMenu {
  id: string;
  type: 'daily' | 'weekly';
  data: any;
  savedAt: string;
  name?: string;
}

// Define structure for AI Analysis Result (must match the one in page.tsx)
interface HistoryAnalysisResult {
  summary: string;
  frequentFoods: string[];
  healthGoals: string[];
  trends: string[];
  keywords: string[];
}

interface JourneyInsightsProps {
  journeyData: JourneyEntry[];
  savedMenus: SavedMenu[];
  historyAnalysis: HistoryAnalysisResult | null; // Add historyAnalysis prop
}

export function JourneyInsights({ journeyData, savedMenus, historyAnalysis }: JourneyInsightsProps) {
  const totalSavedMenus = savedMenus.length;
  const totalLoggedDays = journeyData.length;
  const totalLoggedFoods = journeyData.reduce((sum, entry) => sum + entry.foods.length, 0);

  // Basic food frequency calculation (example)
  const foodFrequency: { [key: string]: number } = {};
  journeyData.forEach(entry => {
    entry.foods.forEach(food => {
      const foodNameLower = food.name.toLowerCase().trim();
      foodFrequency[foodNameLower] = (foodFrequency[foodNameLower] || 0) + 1;
    });
  });

  // Get top 3 most frequent foods (example)
  const topFoods = Object.entries(foodFrequency)
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, 3);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Stat Card: Saved Menus */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saved Menus</CardTitle>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalSavedMenus}</div>
          <p className="text-xs text-muted-foreground">Total menus created and saved.</p>
        </CardContent>
      </Card>

      {/* Stat Card: Logged Days */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Logged Days</CardTitle>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" /><path d="M16 18h.01" /></svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalLoggedDays}</div>
          <p className="text-xs text-muted-foreground">Total days with logged entries.</p>
        </CardContent>
      </Card>

      {/* Stat Card: Logged Foods */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Logged Food Items</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalLoggedFoods}</div>
          <p className="text-xs text-muted-foreground">Total individual food items logged.</p>
        </CardContent>
      </Card>

      {/* Placeholder for Food Frequency/Charts */}
      {topFoods.length > 0 && (
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center">
              <BarChart className="h-4 w-4 mr-2" />
              Food Frequency (Top {topFoods.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {topFoods.map(([name, count]) => (
                <li key={name} className="flex justify-between">
                  <span className="capitalize">{name}</span>
                  <span className="font-medium">{count} times</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-2">More visualizations coming soon.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
