'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

interface JourneyTimelineProps {
  journeyData: JourneyEntry[];
}

// Helper to format date for display
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    // Add timeZone option to ensure consistency if needed, but for YYYY-MM-DD it's usually fine
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC' // Specify UTC to avoid timezone shifts affecting the date display
    });
  } catch (e) {
    console.error("Error formatting date:", e);
    return dateString; // Fallback to original string
  }
};

export function JourneyTimeline({ journeyData }: JourneyTimelineProps) {
  if (!journeyData || journeyData.length === 0) {
    return <p className="text-muted-foreground">No journey entries logged yet. Start adding your food intake!</p>;
  }

  // Data is assumed to be sorted by date descending from the parent component

  return (
    <div className="space-y-6">
      {journeyData.map((entry) => (
        <Card key={entry.date}>
          <CardHeader>
            <CardTitle>{formatDate(entry.date)}</CardTitle>
            {entry.dailyQuestionResponse && (
              <CardDescription className="pt-2 italic">
                "{entry.dailyQuestionResponse}"
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {entry.foods.length > 0 ? (
              <ul className="space-y-3">
                {entry.foods.map((food) => (
                  <li key={food.id} className="flex justify-between items-center border-b pb-2 last:border-b-0">
                    <div>
                      <span className="font-medium">{food.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">({food.quantity})</span>
                    </div>
                    <Badge variant="outline">{food.time}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No specific food items logged for this day.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
