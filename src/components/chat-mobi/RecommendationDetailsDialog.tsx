import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiRecommendationItem } from './RecommendedFoodItem'; // Import the interface
import { Separator } from '@/components/ui/separator';
import { 
  Leaf, Star, Zap, Utensils, Info, CookingPot, Lightbulb, Clock, Users, BarChart3, Tag, BookOpen, Youtube, ClipboardList, Sparkles, ExternalLink
} from 'lucide-react'; // Add more icons

interface RecommendationDetailsDialogProps {
  item: ApiRecommendationItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Helper function to render nutrient details if they exist
const NutrientDetail: React.FC<{ label: string; value: number | string | undefined; unit?: string; icon?: React.ReactNode }> = ({ label, value, unit, icon }) => {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex justify-between text-sm py-1.5 border-b border-dashed">
      <span className="text-muted-foreground flex items-center">{icon && <span className="mr-1.5">{icon}</span>}{label}</span>
      <span className="font-medium">{value}{unit || ''}</span>
    </div>
  );
};

export const RecommendationDetailsDialog: React.FC<RecommendationDetailsDialogProps> = ({ item, open, onOpenChange }) => {
  if (!item) return null;

  // Format ingredients string for better readability
  const formattedIngredients = item.ingredients
    ? item.ingredients.split(/[\t,]+/).map(ing => ing.trim()).filter(ing => ing)
    : [];
  
  const categoriesArray = item.categories?.split(',').map(cat => cat.trim()).filter(cat => cat) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="p-4 pb-3 border-b">
          <DialogTitle className="text-xl font-semibold">{item.name}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
             <Badge variant="secondary" className="text-amber-600 border-amber-600/30">
               <Star size={14} className="mr-1.5" /> {item.score?.toFixed(0)} điểm
             </Badge>
             {item.vegan && (
               <Badge variant="outline" className="text-green-600 border-green-600/50">
                 <Leaf size={14} className="mr-1.5" /> Chay
               </Badge>
             )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          {item.image_url && (
            <div className="w-full h-64 overflow-hidden">
              <img 
                src={item.image_url} 
                alt={item.name} 
                className="w-full h-full object-cover" 
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null; // prevent infinite loop if placeholder also fails
                  target.src = '/avatar-placeholder.png'; // Path to your fallback image in public folder
                }}
              />
            </div>
          )}
          <div className="space-y-4 p-4">
            {item.description && (
              <div>
                <h3 className="text-md font-semibold mb-2 flex items-center"><Info size={16} className="mr-2 text-primary"/>Mô tả</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{item.description}</p>
              </div>
            )}

            {item.selectionReasoning && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md border border-blue-200 dark:border-blue-700">
                <h3 className="text-md font-semibold mb-1 flex items-center text-blue-700 dark:text-blue-400"><Sparkles size={16} className="mr-2"/>Lý do gợi ý</h3>
                <p className="text-sm text-blue-600 dark:text-blue-300 italic">{item.selectionReasoning}</p>
              </div>
            )}

            {/* General Information Section */}
            {(item.serving_size || item.preparation_time || item.difficulty_level) && (
              <div>
                <h3 className="text-md font-semibold mb-2 flex items-center"><BookOpen size={16} className="mr-2 text-primary"/>Thông tin chung</h3>
                <div className="space-y-1">
                  <NutrientDetail label="Khẩu phần" value={item.serving_size} icon={<Users size={14} />} />
                  <NutrientDetail label="Thời gian chuẩn bị" value={item.preparation_time} icon={<Clock size={14} />} />
                  <NutrientDetail label="Độ khó" value={item.difficulty_level} icon={<BarChart3 size={14} />} />
                </div>
              </div>
            )}
            
            {categoriesArray.length > 0 && (
              <div>
                <h3 className="text-md font-semibold mb-2 flex items-center"><Tag size={16} className="mr-2 text-primary"/>Danh mục</h3>
                <div className="flex flex-wrap gap-2">
                  {categoriesArray.map((category, index) => (
                    <Badge key={index} variant="secondary">{category}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Nutritional Information Section */}
            <div>
              <h3 className="text-md font-semibold mb-2 flex items-center"><Zap size={16} className="mr-2 text-primary"/>Thông tin dinh dưỡng (ước tính)</h3>
              <div className="space-y-1">
                <NutrientDetail label="Calories" value={item.Calories} unit=" kcal" />
                <NutrientDetail label="Protein" value={item.Protein} unit=" g" />
                <NutrientDetail label="Carbohydrate" value={item.Carbohydrate} unit=" g" />
                <NutrientDetail label="Đường (Sugar)" value={item.Sugar} unit=" g" />
                <NutrientDetail label="Chất xơ (Fiber)" value={item["Fiber dietary"]} unit=" g" />
                <NutrientDetail label="Cholesterol" value={item.Cholesterol} unit=" mg" />
                <NutrientDetail label="Chất béo bão hòa" value={item["Saturated fat"]} unit=" g" />
                <NutrientDetail label="Vitamin C" value={item["Vitamin C"]} unit=" mg" />
                <NutrientDetail label="Vitamin D" value={item["Vitamin D"]} unit=" mcg" />
                <NutrientDetail label="Vitamin B12" value={item["Vitamin B12"]} unit=" mcg" />
                <NutrientDetail label="Canxi (Calcium)" value={item.Calcium} unit=" mg" />
                <NutrientDetail label="Sắt (Iron)" value={item.Iron} unit=" mg" />
                <NutrientDetail label="Kali (Potassium)" value={item.Potassium} unit=" mg" />
                <NutrientDetail label="Natri (Sodium)" value={item.Sodium} unit=" mg" />
                <NutrientDetail label="Phosphorous" value={item.Phosphorous} unit=" mg" />
                <NutrientDetail label="Folic acid" value={item["Folic acid"]} unit=" mcg" />
              </div>
            </div>

            <Separator />

            {/* Ingredients Section */}
            {formattedIngredients.length > 0 && (
              <div>
                <h3 className="text-md font-semibold mb-2 flex items-center"><Utensils size={16} className="mr-2 text-primary"/>Nguyên liệu</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground pl-4">
                  {formattedIngredients.map((ing, index) => (
                    <li key={index}>{ing}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Sơ chế Section */}
            {item["Sơ chế"] && (
              <div>
                <Separator className="my-3"/>
                <h3 className="text-md font-semibold mb-2 flex items-center"><ClipboardList size={16} className="mr-2 text-primary"/>Sơ chế</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{item["Sơ chế"]}</p>
              </div>
            )}

            {/* Thực hiện Section */}
            {item["Thực hiện"] && (
              <div>
                <Separator className="my-3"/>
                <h3 className="text-md font-semibold mb-2 flex items-center"><CookingPot size={16} className="mr-2 text-primary"/>Thực hiện</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{item["Thực hiện"]}</p>
              </div>
            )}

             {/* Optional Sections */}
             {(item["Cách dùng"] || item["Mách nhỏ"]) && <Separator className="my-3" />}

             {item["Cách dùng"] && (
               <div>
                 <h3 className="text-md font-semibold mb-2 flex items-center"><Info size={16} className="mr-2 text-primary"/>Cách dùng / Phục vụ</h3>
                 <p className="text-sm text-muted-foreground whitespace-pre-line">{item["Cách dùng"]}</p>
               </div>
             )}

             {item["Mách nhỏ"] && (
               <div>
                 <h3 className="text-md font-semibold mb-2 flex items-center"><Lightbulb size={16} className="mr-2 text-primary"/>Mách nhỏ</h3>
                 <p className="text-sm text-muted-foreground whitespace-pre-line">{item["Mách nhỏ"]}</p>
               </div>
             )}
             
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 border-t mt-0 flex flex-row justify-between sm:justify-start">
          <div className="flex gap-2">
            {item.url && (
              <Button variant="default" size="sm" asChild>
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={14} className="mr-1.5" /> Xem công thức
                </a>
              </Button>
            )}
            {item.youtube_url && (
              <Button variant="destructive" size="sm" asChild>
                <a href={item.youtube_url} target="_blank" rel="noopener noreferrer">
                  <Youtube size={14} className="mr-1.5" /> Xem Video
                </a>
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RecommendationDetailsDialog; // Ensuring default export
