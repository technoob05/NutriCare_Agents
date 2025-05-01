'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AgentInteractionVisualizer, AgentInteractionStep } from '@/components/ui/AgentInteractionVisualizer';
import { cn } from "@/lib/utils";
import { 
  ChefHat, 
  Utensils, 
  Calendar, 
  ShoppingBag, 
  Heart, 
  AlertCircle, 
  Info, 
  Download, 
  Share2, 
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Salad,
  Coffee,
  UtensilsCrossed,
  Soup,
  Loader2,
  BrainCircuit,
  Image as ImageIcon,
  FileText,
  File,
  MapPin,
  Flame as Fire, // For calories
  Fish, // For protein
  Wheat, // For carbs
  Droplet, // For fat
  MoreHorizontal,
  ExternalLink,
  ChevronsUpDown
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { buildShopeeFoodSearchUrl, buildTiktokSearchUrl } from '@/services/shopeefood';
import { MenuAnalysisChart } from "./MenuAnalysisChart";
import { ShareMenuDialog } from "./ShareMenuDialog";
import { useMenuCollection } from "@/hooks/use-menu-collection";

// Tipos de datos
interface MenuItem {
  name: string;
  ingredients: string[];
  preparation: string;
  estimatedCost?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  healthBenefits?: string[];
  reasoning?: string;
  imageUrl?: string;
}

interface DailyMenu {
  breakfast: MenuItem[];
  lunch: MenuItem[];
  dinner: MenuItem[];
  snacks?: MenuItem[];
}

interface WeeklyMenu {
  Monday?: DailyMenu;
  Tuesday?: DailyMenu;
  Wednesday?: DailyMenu;
  Thursday?: DailyMenu;
  Friday?: DailyMenu;
  Saturday?: DailyMenu;
  Sunday?: DailyMenu;
}

type MenuData = DailyMenu | WeeklyMenu;

interface AgentFeedback {
  agentName: string;
  feedback: string;
  score?: number;
  recommendations?: string[];
  icon?: React.ReactNode;
}

interface Citation {
  source: string;
  url: string;
  title: string;
}

interface MenuAgentSystemProps {
  menuType: 'daily' | 'weekly';
  menuData: MenuData;
  userPreferences?: string;
  agentFeedbacks?: AgentFeedback[];
  interactionSteps?: AgentInteractionStep[];
  citations?: Citation[];
  isLoading?: boolean;
  onShare?: () => void;
  onModify?: (feedback: string) => void;
  onOpenUnderstandMeal?: (mealName: string) => void;
  onFindNearbyRestaurants?: (mealName: string) => void;
}

// Animaciones para componentes
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};

const slideDown = {
  hidden: { height: 0, opacity: 0 },
  visible: { height: 'auto', opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { height: 0, opacity: 0, transition: { duration: 0.3, ease: "easeIn" } }
};

// Icons para tipos de comidas
const getMealIcon = (mealType: string) => {
  switch (mealType.toLowerCase()) {
    case 'breakfast': return <Coffee className="h-5 w-5" />;
    case 'lunch': return <UtensilsCrossed className="h-5 w-5" />;
    case 'dinner': return <Utensils className="h-5 w-5" />;
    case 'snacks': return <Soup className="h-5 w-5" />;
    default: return <Salad className="h-5 w-5" />;
  }
};

// Componente para cada plato
const MenuItemCard: React.FC<{
  item: MenuItem;
  expanded?: boolean;
  onOpenUnderstandMeal?: (mealName: string) => void;
  onFindNearbyRestaurants?: (mealName: string) => void;
}> = ({ item, expanded = false, onOpenUnderstandMeal, onFindNearbyRestaurants }) => {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageData, setGeneratedImageData] = useState<string | null>(null);
  const { toast } = useToast();

  // Manejador para generar imagen
  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    setGeneratedImageData(null);
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dishName: item.name }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.imageData) {
        setGeneratedImageData(data.imageData);
        toast({ title: "Đã tạo ảnh", description: `Ảnh minh họa cho "${item.name}" đã sẵn sàng.` });
      } else {
        throw new Error("API không trả về dữ liệu ảnh hợp lệ (imageData).");
      }
    } catch (error: any) {
      console.error("Generate Image Error:", error);
      toast({ title: "Lỗi tạo ảnh", description: error.message, variant: "destructive" });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Identificar la imagen que se mostrará (generada o desde backend)
  const displayImage = generatedImageData 
    ? `data:image/png;base64,${generatedImageData}`
    : item.imageUrl;

  return (
    <motion.div 
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="mb-4 overflow-hidden border-border/40 shadow-sm hover:shadow-md transition-all group">
        <CardContent className="p-0">
          {/* Imagen del plato si está disponible */}
          {displayImage && (
            <div className="relative w-full h-40 overflow-hidden">
              <img 
                src={displayImage} 
                alt={`Ảnh ${item.name}`} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Overlay con el nombre del plato */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex items-end p-3">
                <h4 className="font-semibold text-white text-lg">{item.name}</h4>
              </div>
            </div>
          )}

          <div className="p-4">
            {/* Cuando no hay imagen, mostramos el nombre del plato aquí */}
            {!displayImage && (
              <h4 className="font-semibold text-lg mb-2">{item.name}</h4>
            )}
            
            {/* Botones de acción */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-1">
                <TooltipProvider>
                  {onOpenUnderstandMeal && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40" onClick={() => onOpenUnderstandMeal(item.name)} disabled={isGeneratingImage}>
                          <BrainCircuit className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Hiểu món ăn</TooltipContent>
                    </Tooltip>
                  )}

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/40" onClick={handleGenerateImage} disabled={isGeneratingImage}>
                        {isGeneratingImage ? 
                          <Loader2 className="h-4 w-4 animate-spin" /> : 
                          <ImageIcon className="h-4 w-4" />
                        }
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Tạo ảnh minh họa</TooltipContent>
                  </Tooltip>

                  {onFindNearbyRestaurants && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40" onClick={() => onFindNearbyRestaurants(item.name)} disabled={isGeneratingImage}>
                          <MapPin className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Tìm quán ăn gần đây</TooltipContent>
                    </Tooltip>
                  )}
                </TooltipProvider>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={buildShopeeFoodSearchUrl(item.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                  title="Tìm món này trên ShopeeFood"
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" className="flex-shrink-0"><path fill="#ee4d2d" d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10s10-4.477 10-10C22 6.477 17.523 2 12 2Zm0 18.5A8.5 8.5 0 1 1 12 3.5a8.5 8.5 0 0 1 0 17Zm-1-13h2v6h-2v-6Zm0 8h2v2h-2v-2Z"/></svg>
                  <span className="hidden sm:inline">ShopeeFood</span>
                </a>
                <a
                  href={buildTiktokSearchUrl(item.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-pink-600 hover:text-pink-800 flex items-center gap-1 transition-colors"
                  title="Tìm món này trên TikTok"
                >
                  <svg width="16" height="16" viewBox="0 0 256 256" fill="none" className="flex-shrink-0"><g><path d="M168.6 32c0 30.2 24.5 54.7 54.7 54.7v36.5c-16.7 0-32.2-5.1-45-13.8v61.6c0 44.2-35.8 80-80 80s-80-35.8-80-80 35.8-80 80-80c6.2 0 12.2.7 18 2.1v37.2a44.1 44.1 0 1 0 26.7 40.7V16h25.6z" fill="#000"/><path d="M168.6 32c0 30.2 24.5 54.7 54.7 54.7v36.5c-16.7 0-32.2-5.1-45-13.8v61.6c0 44.2-35.8 80-80 80s-80-35.8-80-80 35.8-80 80-80c6.2 0 12.2.7 18 2.1v37.2a44.1 44.1 0 1 0 26.7 40.7V16h25.6z" fill="#25F4EE"/><path d="M168.6 32c0 30.2 24.5 54.7 54.7 54.7v36.5c-16.7 0-32.2-5.1-45-13.8v61.6c0 44.2-35.8 80-80 80s-80-35.8-80-80 35.8-80 80-80c6.2 0 12.2.7 18 2.1v37.2a44.1 44.1 0 1 0 26.7 40.7V16h25.6z" fill="#FE2C55" fillOpacity=".5"/></g></svg>
                  <span className="hidden sm:inline">TikTok</span>
                </a>
              </div>
            </div>

            {/* Información nutricional */}
            {(item.calories || item.protein || item.carbs || item.fat) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {item.calories && (
                  <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-md px-2 py-1.5">
                    <Fire className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">{item.calories} kcal</span>
                  </div>
                )}
                {item.protein && (
                  <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md px-2 py-1.5">
                    <Fish className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">{item.protein}g protein</span>
                  </div>
                )}
                {item.carbs && (
                  <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-md px-2 py-1.5">
                    <Wheat className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">{item.carbs}g carbs</span>
                  </div>
                )}
                {item.fat && (
                  <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md px-2 py-1.5">
                    <Droplet className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">{item.fat}g chất béo</span>
                  </div>
                )}
              </div>
            )}

            {/* Botón para mostrar/ocultar detalles */}
            <Button
              variant="outline"
              size="sm"
              className="w-full flex items-center justify-center gap-1 text-sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Ẩn chi tiết' : 'Xem chi tiết'}
              <ChevronsUpDown className="h-4 w-4" />
            </Button>

            {/* Detalles expandibles */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  variants={slideDown}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-3 border-t border-border/60">
                    {/* Ingredientes */}
                    {item.ingredients && item.ingredients.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <ShoppingBag className="h-4 w-4 text-blue-500" />
                          Nguyên liệu:
                        </h5>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-4 pl-2">
                          {item.ingredients.map((ingredient, idx) => (
                            <li key={idx} className="text-sm flex items-start">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 mr-2 flex-shrink-0"></span>
                              {ingredient}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Preparación */}
                    {item.preparation && (
                      <div className="mb-3">
                        <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Utensils className="h-4 w-4 text-green-500" />
                          Cách chế biến:
                        </h5>
                        <p className="text-sm leading-relaxed">{item.preparation}</p>
                      </div>
                    )}
                    
                    {/* Costo estimado */}
                    {item.estimatedCost && (
                      <div className="mb-3">
                        <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <ShoppingBag className="h-4 w-4 text-purple-500" />
                          Chi phí ước tính:
                        </h5>
                        <p className="text-sm leading-relaxed">{item.estimatedCost}</p>
                      </div>
                    )}
                    
                    {/* Beneficios para la salud */}
                    {item.healthBenefits && item.healthBenefits.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Heart className="h-4 w-4 text-red-500" />
                          Lợi ích sức khỏe:
                        </h5>
                        <div className="flex flex-wrap gap-1.5">
                          {item.healthBenefits.map((benefit, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              {benefit}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Reasoning */}
                    {item.reasoning && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-900/40">
                        <h5 className="text-sm font-medium mb-1 text-blue-700 dark:text-blue-400 flex items-center gap-2">
                          <Info className="h-4 w-4" />
                          Lý do chọn món:
                        </h5>
                        <p className="text-sm italic text-blue-700/80 dark:text-blue-400/80">{item.reasoning}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Componente para una sección de comidas (desayuno, almuerzo, cena)
const MealSection: React.FC<{
  title: string;
  items: MenuItem[];
  icon?: React.ReactNode;
  onOpenUnderstandMeal?: (mealName: string) => void;
  onFindNearbyRestaurants?: (mealName: string) => void;
}> = ({ title, items, icon, onOpenUnderstandMeal, onFindNearbyRestaurants }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Localización de títulos
  const getLocalizedTitle = (title: string) => {
    switch(title.toLowerCase()) {
      case 'breakfast': return 'Bữa sáng';
      case 'lunch': return 'Bữa trưa';
      case 'dinner': return 'Bữa tối';
      case 'snacks': return 'Bữa phụ';
      default: return title;
    }
  };
  
  const displayTitle = getLocalizedTitle(title);
  
  const sectionColors: Record<string, { bg: string, text: string, icon: string }> = {
    breakfast: { 
      bg: 'bg-orange-50 dark:bg-orange-900/20', 
      text: 'text-orange-700 dark:text-orange-400',
      icon: 'text-orange-500 dark:text-orange-400'
    },
    lunch: { 
      bg: 'bg-green-50 dark:bg-green-900/20', 
      text: 'text-green-700 dark:text-green-400',
      icon: 'text-green-500 dark:text-green-400'
    },
    dinner: { 
      bg: 'bg-blue-50 dark:bg-blue-900/20', 
      text: 'text-blue-700 dark:text-blue-400',
      icon: 'text-blue-500 dark:text-blue-400'
    },
    snacks: { 
      bg: 'bg-purple-50 dark:bg-purple-900/20', 
      text: 'text-purple-700 dark:text-purple-400',
      icon: 'text-purple-500 dark:text-purple-400'
    }
  };
  
  const colors = sectionColors[title.toLowerCase()] || sectionColors.snacks;
  
  return (
    <div className="mb-6">
      <motion.div 
        className={`flex items-center justify-between cursor-pointer py-2 px-3 rounded-lg ${colors.bg} mb-4`}
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center gap-2">
          <div className={colors.icon}>
            {icon || getMealIcon(title)}
          </div>
          <h3 className={`font-medium ${colors.text}`}>{displayTitle}</h3>
          <Badge variant="secondary" className={`ml-1 ${colors.bg} ${colors.text} border-0`}>
            {items.length} món
          </Badge>
        </div>
        <Button variant="ghost" size="sm" className={`h-6 w-6 p-0 ${colors.text}`}>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </motion.div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            variants={slideDown}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="px-1"
          >
            {items.map((item, idx) => (
              <MenuItemCard
                key={idx}
                item={item}
                expanded={idx === 0}
                onOpenUnderstandMeal={onOpenUnderstandMeal}
                onFindNearbyRestaurants={onFindNearbyRestaurants}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Componente para la vista diaria del menú
const DailyMenuView: React.FC<{
  menu: DailyMenu;
  day?: string;
  onOpenUnderstandMeal?: (mealName: string) => void;
  onFindNearbyRestaurants?: (mealName: string) => void;
}> = ({ menu, day, onOpenUnderstandMeal, onFindNearbyRestaurants }) => {
  return (
    <div className="space-y-4">
      {day && (
        <div className="flex items-center gap-2 mb-6 pb-3 border-b border-border/60">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold">{day}</h3>
        </div>
      )}
      
      {menu.breakfast && menu.breakfast.length > 0 && (
        <MealSection title="breakfast" items={menu.breakfast} onOpenUnderstandMeal={onOpenUnderstandMeal} onFindNearbyRestaurants={onFindNearbyRestaurants} />
      )}
      
      {menu.lunch && menu.lunch.length > 0 && (
        <MealSection title="lunch" items={menu.lunch} onOpenUnderstandMeal={onOpenUnderstandMeal} onFindNearbyRestaurants={onFindNearbyRestaurants} />
      )}
      
      {menu.dinner && menu.dinner.length > 0 && (
        <MealSection title="dinner" items={menu.dinner} onOpenUnderstandMeal={onOpenUnderstandMeal} onFindNearbyRestaurants={onFindNearbyRestaurants} />
      )}
      
      {menu.snacks && menu.snacks.length > 0 && (
        <MealSection title="snacks" items={menu.snacks} onOpenUnderstandMeal={onOpenUnderstandMeal} onFindNearbyRestaurants={onFindNearbyRestaurants} />
      )}
    </div>
  );
};

// Componente para la vista semanal del menú
const WeeklyMenuView: React.FC<{
  menu: WeeklyMenu;
  onOpenUnderstandMeal?: (mealName: string) => void;
  onFindNearbyRestaurants?: (mealName: string) => void;
}> = ({ menu, onOpenUnderstandMeal, onFindNearbyRestaurants }) => {
  const [activeDay, setActiveDay] = useState<string>('Monday');

  // Localización de días
  const getLocalizedDay = (day: string) => {
    switch(day) {
      case 'Monday': return 'Thứ Hai';
      case 'Tuesday': return 'Thứ Ba';
      case 'Wednesday': return 'Thứ Tư';
      case 'Thursday': return 'Thứ Năm';
      case 'Friday': return 'Thứ Sáu';
      case 'Saturday': return 'Thứ Bảy';
      case 'Sunday': return 'Chủ Nhật';
      default: return day;
    }
  };
  
  // Días disponibles en el menú
  const availableDays = Object.keys(menu).filter(day => menu[day as keyof WeeklyMenu]);
  
  const tabItemVariants = {
    initial: { opacity: 0, y: 20 },
    animate: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.05, duration: 0.3 }
    }),
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
  };
  
  return (
    <div className="space-y-4">
      <Tabs defaultValue={activeDay} onValueChange={setActiveDay} className="w-full">
        <div className="relative mb-6 overflow-x-auto pb-1">
          <TabsList className="flex w-auto justify-start h-auto p-1.5 bg-background/80 backdrop-blur-sm border border-border/50 rounded-xl overflow-x-auto">
            {availableDays.map((day, i) => (
              <motion.div
                key={day}
                custom={i}
                initial="initial"
                animate="animate"
                variants={tabItemVariants}
              >
                <TabsTrigger 
                  value={day} 
                  className="min-w-[100px] py-2.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-medium"
                >
                  {getLocalizedDay(day)}
                </TabsTrigger>
              </motion.div>
            ))}
          </TabsList>
        </div>
        
        <AnimatePresence mode="wait">
          {availableDays.map(day => {
            const dailyMenu = menu[day as keyof WeeklyMenu];
            return dailyMenu ? (
              <TabsContent key={day} value={day} className="mt-0">
                <motion.div
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <DailyMenuView
                    menu={dailyMenu}
                    day={getLocalizedDay(day)}
                    onOpenUnderstandMeal={onOpenUnderstandMeal}
                    onFindNearbyRestaurants={onFindNearbyRestaurants}
                  />
                </motion.div>
              </TabsContent>
            ) : null;
          })}
        </AnimatePresence>
      </Tabs>
    </div>
  );
};

// Componente para mostrar feedback de agentes
const AgentFeedbackSection: React.FC<{ feedbacks: AgentFeedback[] }> = ({ feedbacks }) => {
  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Phân tích từ AI Agents</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {feedbacks.map((feedback, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.3 }}
          >
            <Card className="h-full overflow-hidden border-border/40 hover:shadow-md transition-shadow bg-gradient-to-br from-background to-muted/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 mt-0.5 ring-2 ring-primary/10">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {feedback.agentName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">{feedback.agentName}</h4>
                      {feedback.score !== undefined && (
                        <Badge 
                          variant={feedback.score >= 8 ? "default" : feedback.score >= 6 ? "secondary" : "destructive"}
                          className="font-medium"
                        >
                          {feedback.score}/10
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground leading-relaxed">{feedback.feedback}</p>
                    
                    {feedback.recommendations && feedback.recommendations.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-border/60">
                        <h5 className="text-sm font-medium mb-2 text-blue-600 dark:text-blue-400">Đề xuất:</h5>
                        <ul className="space-y-2">
                          {feedback.recommendations.map((rec, idx) => (
                            <li key={idx} className="text-sm flex items-start">
                              <span className="inline-block text-blue-500 mr-2 mt-1.5">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Componente para mostrar las citas
const CitationsSection: React.FC<{ citations: Citation[] }> = ({ citations }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <ExternalLink className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Nguồn Tham Khảo Web</h3>
      </div>
      
      <ScrollArea className="h-[500px] pr-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {citations.map((citation, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
            >
              <Card className="overflow-hidden border-border/60 hover:shadow-md transition-shadow h-full">
                <CardContent className="p-4">
                  <h4 className="font-medium text-base mb-2">{citation.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3">Nguồn: {citation.source}</p>
                  <div className="flex items-center gap-2">
                    <a
                      href={citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5 transition-colors mt-auto"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Truy cập nguồn
                    </a>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

// Componente principal
export const MenuAgentSystem: React.FC<MenuAgentSystemProps> = ({
  menuType,
  menuData,
  userPreferences,
  agentFeedbacks = [],
  interactionSteps = [],
  citations = [],
  isLoading = false,
  onShare,
  onModify,
  onOpenUnderstandMeal,
  onFindNearbyRestaurants,
}) => {
  const [activeTab, setActiveTab] = useState<string>('menu');
  const menuRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [showChart, setShowChart] = useState(false);

  const isWeeklyMenu = menuType === 'weekly';
  
  const { isMenuSaved, saveMenu, removeMenu } = useMenuCollection();
  const [isSaved, setIsSaved] = useState(false);

  // Check if menu is saved on mount and when menuData changes
  useEffect(() => {
    setIsSaved(isMenuSaved(menuData));
  }, [menuData, isMenuSaved]);

  const handleSaveToCollection = () => {
    if (isSaved) {
      // Instead of using id, find the menu by its data and remove it
      const savedMenus = JSON.parse(localStorage.getItem('nutricare_saved_menus') || '[]');
      const menuToRemove = savedMenus.find((menu: any) => 
        JSON.stringify(menu.data) === JSON.stringify(menuData)
      );
      
      if (menuToRemove) {
        removeMenu(menuToRemove.id);
        setIsSaved(false);
        toast({
          title: "Đã xóa khỏi bộ sưu tập",
          description: "Thực đơn đã được xóa khỏi danh sách yêu thích của bạn.",
        });
      }
    } else {
      // Save new menu
      const saved = saveMenu({
        type: menuType,
        data: menuData,
        name: `Thực đơn ${menuType === 'daily' ? 'ngày' : 'tuần'} ${new Date().toLocaleDateString('vi-VN')}`,
      });

      if (saved) {
        setIsSaved(true);
        toast({
          title: "Đã lưu vào bộ sưu tập!",
          description: "Thực đơn đã được thêm vào danh sách yêu thích của bạn.",
        });
      } else {
        toast({
          title: "Lỗi lưu thực đơn",
          description: "Không thể lưu thực đơn. Vui lòng thử lại.",
          variant: "destructive",
        });
      }
    }
  };

  // Función para descargar el menú
  function handleDownload(format: 'txt' | 'pdf') {
    if (!menuData) {
      toast({ title: "Lỗi", description: "Không có dữ liệu thực đơn để tải.", variant: "destructive" });
      return;
    }

    if (format === 'txt') {
      let content = `${isWeeklyMenu ? 'Thực đơn tuần' : 'Thực đơn ngày'}\n`;
      content += "=====================================\n\n";

      const formatMeal = (mealName: string, items: MenuItem[]) => {
        if (!Array.isArray(items)) return ''; 
        
        let mealContent = `** ${mealName.toUpperCase()} **\n`;
        items.forEach(item => {
          mealContent += `- ${item.name}\n`;
          if (item.ingredients && Array.isArray(item.ingredients) && item.ingredients.length > 0) {
            mealContent += `  Nguyên liệu: ${item.ingredients.join(', ')}\n`;
          }
          if (item.preparation) {
            mealContent += `  Chuẩn bị: ${item.preparation}\n`;
          }
          if (item.calories) mealContent += `  Calories: ~${item.calories} kcal\n`;
          mealContent += '\n';
        });
        return mealContent;
      };

      if (isWeeklyMenu) {
        const weekly = menuData as WeeklyMenu;
        Object.entries(weekly).forEach(([day, dailyMenu]) => {
          if (dailyMenu) {
            content += `\n--- ${day.toUpperCase()} ---\n`;
            if (dailyMenu.breakfast?.length > 0) content += formatMeal('Bữa sáng', dailyMenu.breakfast);
            if (dailyMenu.lunch?.length > 0) content += formatMeal('Bữa trưa', dailyMenu.lunch);
            if (dailyMenu.dinner?.length > 0) content += formatMeal('Bữa tối', dailyMenu.dinner);
            if (dailyMenu.snacks?.length > 0) content += formatMeal('Bữa phụ', dailyMenu.snacks);
          }
        });
      } else {
        const daily = menuData as DailyMenu;
        if (daily.breakfast && daily.breakfast.length > 0) content += formatMeal('Bữa sáng', daily.breakfast);
        if (daily.lunch && daily.lunch.length > 0) content += formatMeal('Bữa trưa', daily.lunch);
        if (daily.dinner && daily.dinner.length > 0) content += formatMeal('Bữa tối', daily.dinner);
        if (daily.snacks && daily.snacks.length > 0) content += formatMeal('Bữa phụ', daily.snacks); 
      }

      try {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const fileName = `thuc_don_${menuType}_${Date.now()}.txt`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({ title: "Đã tải xuống TXT", description: `Thực đơn đã được lưu vào ${fileName}` });
      } catch (error) {
        console.error("Failed to download TXT:", error);
        toast({ title: "Lỗi tải TXT", description: "Không thể tạo tệp tải xuống.", variant: "destructive" });
      }
    } else if (format === 'pdf') {
      toast({ title: "Chưa hỗ trợ", description: "Chức năng tải PDF hiện chưa được triển khai.", variant: "default" });
      console.log("PDF download clicked - requires implementation.");
    }
  }
  
  return (
    <Card className="w-full overflow-hidden border-border/40 shadow-md bg-white dark:bg-gray-950">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-1.5 rounded-full">
              <ChefHat className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-xl font-semibold">
              {isWeeklyMenu ? 'Thực đơn tuần' : 'Thực đơn ngày'}
            </CardTitle>
          </div>
          
          <div className="flex gap-1">
            <ShareMenuDialog
              menuData={menuData}
              menuType={menuType}
              onSaveToCollection={handleSaveToCollection}
              isSaved={isSaved}
            />
            {onShare && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={onShare}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Chia sẻ thực đơn</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => handleDownload('txt')}>
                    <FileText className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Tải về dạng TXT</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => handleDownload('pdf')} disabled>
                    <File className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Tải về dạng PDF (sắp ra)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {userPreferences && (
          <CardDescription className="mt-2 p-2 bg-primary/5 rounded-md border border-primary/10 text-sm">
            <span className="font-medium text-primary">Yêu cầu:</span> {userPreferences}
          </CardDescription>
        )}
      </CardHeader>
      
      <Separator className="mb-0" />
      
      <CardContent className="p-0">
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={cn(
            "w-full grid rounded-none border-b sticky top-0 z-10 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm",
            citations && citations.length > 0 ? "grid-cols-3" : "grid-cols-2"
          )}>
            <TabsTrigger value="menu" className="py-3">
              <div className="flex items-center gap-2">
                <Utensils className="h-4 w-4" />
                <span>Thực đơn</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="analysis" className="py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>Phân tích</span>
              </div>
            </TabsTrigger>
            {citations && citations.length > 0 && (
              <TabsTrigger value="citations" className="py-3">
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  <span>Tham khảo</span>
                </div>
              </TabsTrigger>
            )}
          </TabsList>

          <div className="p-5">
            <TabsContent value="menu" className="mt-0">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative">
                    <motion.div 
                      animate={{ 
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatType: "loop"
                      }}
                      className="absolute inset-0 bg-primary/20 rounded-full blur-xl"
                    />
                    <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
                  </div>
                  <p className="text-base text-muted-foreground mt-4">Đang tạo thực đơn thông minh...</p>
                </div>
              ) : (
                <div ref={menuRef}>
                  {isWeeklyMenu ? (
                    <WeeklyMenuView
                      menu={menuData as WeeklyMenu}
                      onOpenUnderstandMeal={onOpenUnderstandMeal}
                      onFindNearbyRestaurants={onFindNearbyRestaurants}
                    />
                  ) : (
                    <DailyMenuView
                      menu={menuData as DailyMenu}
                      onOpenUnderstandMeal={onOpenUnderstandMeal}
                      onFindNearbyRestaurants={onFindNearbyRestaurants}
                    />
                  )}
                  
                  {onModify && (
                    <motion.div 
                      className="mt-8 flex justify-center"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.3 }}
                    >
                      <Button 
                        className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all px-5 py-6 h-auto"
                        onClick={() => onModify('Tôi muốn thay đổi thực đơn này')}
                      >
                        <Sparkles className="h-4 w-4" />
                        <span className="font-medium">Điều chỉnh thực đơn</span>
                      </Button>
                    </motion.div>
                  )}
                  {/* Chart trigger button below menu output */}
                  {!showChart && (
                    <div className="flex justify-center mt-4">
                      <Button
                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-md px-4 py-3 text-base"
                        onClick={() => setShowChart(true)}
                      >
                        Xem biểu đồ phân tích thực đơn
                      </Button>
                    </div>
                  )}
                  {showChart && (
                    <MenuAnalysisChart menuData={menuData} menuType={menuType} />
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="analysis" className="mt-0">
              <div className="space-y-8">
                {interactionSteps.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <AgentInteractionVisualizer 
                      interactionSteps={interactionSteps} 
                      title="Quy trình phân tích & tạo thực đơn"
                    />
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Info className="h-10 w-10 text-muted-foreground mb-4" />
                    <p className="text-base text-muted-foreground">Chưa có phân tích chi tiết từ AI Agents</p>
                  </div>
                )}

                {agentFeedbacks.length > 0 && (
                  <AgentFeedbackSection feedbacks={agentFeedbacks} />
                )}
              </div>
            </TabsContent>

            {citations && citations.length > 0 && (
              <TabsContent value="citations" className="mt-0">
                <CitationsSection citations={citations} />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex items-center justify-between p-4 bg-muted/30 border-t border-border/40">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} AI Menu System</p>
        {onModify && (
          <Button 
            variant="outline" 
            size="sm"
            className="text-xs"
            onClick={() => onModify('Tôi có phản hồi về ứng dụng')}
          >
            Gửi phản hồi
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};