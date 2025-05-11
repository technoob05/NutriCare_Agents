import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button'; // Added Button
import { Star, Leaf, Zap, Utensils, Eye } from 'lucide-react'; // Added Eye icon

// Interface based on the API response structure
export interface ApiRecommendationItem {
  name: string;
  ingredients: string;
  score: number;
  vegan?: boolean;
  index?: number;
  Carbohydrate?: number;
  Calories?: number;
  Protein?: number;
  Sugar?: number;
  "Fiber dietary"?: number;
  "Vitamin C"?: number;
  "Vitamin D"?: number;
  "Vitamin B12"?: number;
  Calcium?: number;
  Iron?: number;
  Cholesterol?: number;
  Phosphorous?: number;
  "Folic acid"?: number;
  "Saturated fat"?: number;
  Potassium?: number;
  Sodium?: number;
  "Cách dùng"?: string;
  "Mách nhỏ"?: string;
  // New fields from API upgrade
  description?: string;
  serving_size?: string;
  preparation_time?: string;
  difficulty_level?: string;
  categories?: string; // Comma-separated string of categories
  url?: string; // URL to the recipe/dish
  image_url?: string; // Primary image URL for the dish
  youtube_url?: string; // URL to a YouTube video for the dish
  "Sơ chế"?: string; // Pre-processing steps
  "Thực hiện"?: string; // Execution/cooking steps
  selectionReasoning?: string; // Reasoning from LLM for why this item was selected in the current context
}

interface RecommendedFoodItemProps {
  item: ApiRecommendationItem;
  onViewDetails: (item: ApiRecommendationItem) => void; // Add handler prop
}

const RecommendedFoodItem: React.FC<RecommendedFoodItemProps> = ({ item, onViewDetails }) => {
  // Helper to display nutritional values, handling undefined or 0
  const displayNutrient = (value: number | undefined, unit: string) => {
    if (value === undefined || value === null) return null; // Don't display if not present
    return `${value}${unit}`;
  };

  // Truncate ingredients string if too long
  const truncateIngredients = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Card className="w-full max-w-xs shrink-0 snap-start overflow-hidden shadow-md border-primary/10 hover:shadow-lg transition-shadow duration-300 flex flex-col">
      {item.image_url && (
        <div className="w-full h-32 overflow-hidden">
          <img 
            src={item.image_url} 
            alt={item.name} 
            className="w-full h-full object-cover" 
            onError={(e) => (e.currentTarget.style.display = 'none')} // Basic fallback: hide if error
          />
        </div>
      )}
      <CardHeader className={`p-3 pb-2 ${item.image_url ? 'pt-2' : ''}`}>
        <CardTitle className="text-base font-semibold truncate" title={item.name}>
          {item.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 text-xs flex-grow flex flex-col justify-between">
        <div className="space-y-2">
          {item.Calories !== undefined && item.Protein !== undefined && (
            <div className="flex flex-wrap gap-1 mb-2">
              {item.Calories !== undefined && (
                <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs px-1.5 py-0.5">
                  <Zap size={12} className="mr-1" /> {displayNutrient(item.Calories, ' kcal')}
                </Badge>
              )}
              {item.Protein !== undefined && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5">
                  <Utensils size={12} className="mr-1" /> {displayNutrient(item.Protein, 'g P')}
                </Badge>
              )}
              {item.Carbohydrate !== undefined && (
                 <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5">
                   {displayNutrient(item.Carbohydrate, 'g C')}
                 </Badge>
              )}
            </div>
          )}

          {item.ingredients && item.ingredients !== "Không có thông tin nguyên liệu" && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-0.5">Nguyên liệu:</h4>
              <p className="text-muted-foreground leading-snug">
                {truncateIngredients(item.ingredients.split('\t\t').join(', '))}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-dashed mt-2">
            <div className="flex items-center text-amber-600">
              <Star size={14} className="mr-1 fill-current" />
              <span className="font-semibold">{item.score?.toFixed(0) || 'N/A'}</span>
              <span className="ml-0.5 text-muted-foreground">điểm</span>
            </div>
            {item.vegan && (
              <Badge variant="outline" className="text-green-600 border-green-600/50 px-1.5 py-0.5 text-xs">
                <Leaf size={12} className="mr-1" /> Chay
              </Badge>
            )}
          </div>

          {/* Add View Details Button */}
          <Button
            variant="outline"
            size="sm" // Use "sm" as the smallest available size
            className="w-full mt-2 h-8 text-xs" // Adjusted height slightly for "sm" size if needed
            onClick={() => onViewDetails(item)}
          >
            <Eye size={14} className="mr-1.5" />
            Xem chi tiết
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecommendedFoodItem;
