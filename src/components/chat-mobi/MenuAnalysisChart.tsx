import React from "react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "../ui/chart";
import * as Recharts from "recharts";
import { BarChart, LineChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Translate meal names to Vietnamese
const translateMeal = (meal: string) => {
  switch(meal.toLowerCase()) {
    case 'breakfast': return 'Bữa sáng';
    case 'lunch': return 'Bữa trưa';
    case 'dinner': return 'Bữa tối';
    case 'snacks': return 'Bữa phụ';
    default: return meal;
  }
};

// Translate day names to Vietnamese
const translateDay = (day: string) => {
  switch(day) {
    case 'Monday': return 'Thứ 2';
    case 'Tuesday': return 'Thứ 3';
    case 'Wednesday': return 'Thứ 4';
    case 'Thursday': return 'Thứ 5';
    case 'Friday': return 'Thứ 6';
    case 'Saturday': return 'Thứ 7';
    case 'Sunday': return 'CN';
    default: return day;
  }
};

// Utility: extract nutrition/cost data from menuData (daily/weekly)
function extractChartData(menuData: any, menuType: 'daily' | 'weekly') {
  if (menuType === 'daily') {
    const meals = ['breakfast', 'lunch', 'dinner', 'snacks'];
    return meals.map(meal => {
      const items = menuData[meal] || [];
      const calories = items.reduce((sum: number, i: any) => sum + (i.calories || 0), 0);
      const cost = items.reduce((sum: number, i: any) => sum + (parseInt((i.estimatedCost||'').replace(/[^\d]/g, '')) || 0), 0);
      return { 
        meal: translateMeal(meal), 
        calories, 
        cost,
        name: translateMeal(meal) // For chart label
      };
    }).filter(item => item.calories > 0 || item.cost > 0); // Only show meals with data
  } else {
    // weekly: sum per day
    return Object.entries(menuData).map(([day, daily]: [string, any]) => {
      const meals = ['breakfast', 'lunch', 'dinner', 'snacks'];
      let calories = 0, cost = 0;
      meals.forEach(meal => {
        const items = (daily && daily[meal]) || [];
        calories += items.reduce((sum: number, i: any) => sum + (i.calories || 0), 0);
        cost += items.reduce((sum: number, i: any) => sum + (parseInt((i.estimatedCost||'').replace(/[^\d]/g, '')) || 0), 0);
      });
      return { 
        day: translateDay(day), 
        calories, 
        cost,
        name: translateDay(day) // For chart label
      };
    }).filter(item => item.calories > 0 || item.cost > 0); // Only show days with data
  }
}

export const MenuAnalysisChart: React.FC<{ menuData: any; menuType: 'daily' | 'weekly'; }> = ({ menuData, menuType }) => {
  const chartData = extractChartData(menuData, menuType);
  
  return (
    <div className="w-full space-y-4 mt-4 p-3 sm:p-4 border rounded-lg bg-card overflow-hidden">
      <div className="space-y-1.5">
        <h4 className="font-semibold text-base sm:text-lg">Biểu đồ phân tích thực đơn</h4>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {menuType === 'daily' ? 'Phân bố calories và chi phí theo bữa' : 'Phân bố calories và chi phí trong tuần'}
        </p>
      </div>

      <div className="w-full h-[250px] sm:h-[300px] md:h-[400px] -mx-2 sm:mx-0">
        <ResponsiveContainer width="100%" height="100%">
          {menuType === 'daily' ? (
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                yAxisId="left" 
                orientation="left" 
                stroke="#22c55e"
                tick={{ fontSize: 11 }}
                width={45}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                stroke="#eab308"
                tick={{ fontSize: 11 }}
                width={45}
              />
              <Tooltip content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-popover/95 border rounded-lg shadow-lg p-2 text-xs sm:text-sm">
                      <p className="font-medium mb-1">{label}</p>
                      <p className="text-emerald-500">Calories: {payload[0].value} kcal</p>
                      <p className="text-yellow-500">Chi phí: {payload[1].value}k VND</p>
                    </div>
                  );
                }
                return null;
              }} />
              <Legend 
                wrapperStyle={{ fontSize: '11px' }}
                iconSize={8}
                margin={{ top: 0, left: 0, right: 0, bottom: 0 }}
              />
              <Bar 
                yAxisId="left" 
                dataKey="calories" 
                name="Calories (kcal)" 
                fill="#22c55e" 
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              />
              <Bar 
                yAxisId="right" 
                dataKey="cost" 
                name="Chi phí (k VND)" 
                fill="#eab308" 
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
              />
            </BarChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11 }}
                interval={0}
              />
              <YAxis 
                yAxisId="left" 
                orientation="left" 
                stroke="#22c55e"
                tick={{ fontSize: 11 }}
                width={45}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                stroke="#eab308"
                tick={{ fontSize: 11 }}
                width={45}
              />
              <Tooltip content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-popover/95 border rounded-lg shadow-lg p-2 text-xs sm:text-sm">
                      <p className="font-medium mb-1">{label}</p>
                      <p className="text-emerald-500">Calories: {payload[0].value} kcal</p>
                      <p className="text-yellow-500">Chi phí: {payload[1].value}k VND</p>
                    </div>
                  );
                }
                return null;
              }} />
              <Legend 
                wrapperStyle={{ fontSize: '11px' }}
                iconSize={8}
                margin={{ top: 0, left: 0, right: 0, bottom: 0 }}
              />
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="calories" 
                name="Calories (kcal)" 
                stroke="#22c55e" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="cost" 
                name="Chi phí (k VND)" 
                stroke="#eab308" 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
