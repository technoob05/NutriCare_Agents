'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
    DialogFooter, DialogClose, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import NearbyRestaurantsMap from '@/components/NearbyRestaurantsMap';
import { UnderstandMealDialog } from '@/components/UnderstandMealDialog';
import {
    MoreVertical, Image as ImageIcon, Edit, Trash2, ChevronDown, ChevronUp,
    UtensilsCrossed, Cookie, Soup, Sandwich, Loader2, Coins, CalendarDays, Info,
    AlertCircle, ChefHat, ShoppingBasket, Download, Sparkles, Salad, MapPin,
    MessageSquareQuote, ChevronRight, BookOpenCheck,
} from 'lucide-react';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from '@/hooks/use-mobile';
import { type DailyMenuData, type WeeklyMenuData, type AnyMenuData, type StepTrace } from '@/ai/flows/generate-menu-from-preferences';
import { cn } from '@/lib/utils';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

// --- Types ---
interface MenuItemData {
    name: string;
    ingredients: string[];
    preparation: string;
    estimatedCost?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    healthBenefits?: string[];
}

interface InteractiveMenuProps {
    menuData: {
        menu?: AnyMenuData;
        menuType: 'daily' | 'weekly';
        feedbackRequest?: string;
        trace?: StepTrace[];
    };
    isLoading?: boolean;
    onEditItem?: (day: string | null, mealType: string, itemIndex: number) => void;
    onRemoveItem?: (day: string | null, mealType: string, itemIndex: number) => void;
    onExportIngredients?: (markdown: string) => void;
    onPromptClick?: (prompt: string) => void;
}

// --- Helper Components ---

// Nutrition Chart Component (Mobile-First with ResponsiveContainer)
const NutritionChart: React.FC<{ data: DailyMenuData | undefined }> = ({ data }) => {
    if (!data) return null;

    const chartData = useMemo(() => {
        const meals: (keyof DailyMenuData)[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
        return meals.map(mealKey => {
            const totalCalories = data[mealKey]?.reduce((sum, item) => sum + (item.calories ?? 0), 0) ?? 0;
            return totalCalories > 0 ? {
                meal: mealKey.charAt(0).toUpperCase() + mealKey.slice(1),
                calories: totalCalories,
            } : null;
        }).filter(item => item !== null) as { meal: string; calories: number }[];
    }, [data]);

    if (!chartData || chartData.length === 0) {
        return (
            <div className="text-xs text-center text-muted-foreground italic py-2">
                Không đủ dữ liệu dinh dưỡng.
            </div>
        );
    }

    const chartConfig = {
        calories: { label: "Calo (kcal)", color: "hsl(var(--chart-1))" },
    } satisfies ChartConfig;

    return (
        <div className="border border-dashed border-border/50 rounded-lg bg-muted/20 p-2 sm:p-3 md:p-4 w-full">
            <div className="mb-1 sm:mb-2">
                <h4 className="text-xs sm:text-sm font-semibold">Tổng quan Calo Ước tính</h4>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Tổng lượng calo ước tính cho mỗi bữa ăn.</p>
            </div>
            <ChartContainer config={chartConfig} className="w-full min-w-0 h-[150px] sm:h-[180px] overflow-x-auto">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{ top: 5, right: 5, left: -15, bottom: 0 }}
                        accessibilityLayer
                    >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" />
                        <XAxis dataKey="meal" tickLine={false} axisLine={false} tickMargin={6} 
                               tickFormatter={(value) => value.substring(0, 3)} 
                               style={{ fontSize: '9px', fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={4} 
                               style={{ fontSize: '9px', fill: 'hsl(var(--muted-foreground))' }} />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel indicator="dot" className="text-xs" />}
                        />
                        <Bar dataKey="calories" fill="var(--color-calories)" radius={4} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
        </div>
    );
};

// MenuItemCard Component (Mobile-First with Wrapping Badges)
const MenuItemCard: React.FC<{
    item: MenuItemData;
    itemIndex: number;
    dayKey: string | null;
    mealType: string;
    onEdit?: InteractiveMenuProps['onEditItem'];
    onRemove?: InteractiveMenuProps['onRemoveItem'];
    onOpenUnderstandMeal?: (mealName: string) => void;
}> = ({ item, itemIndex, dayKey, mealType, onEdit, onRemove, onOpenUnderstandMeal }) => {
    const [isPrepExpanded, setIsPrepExpanded] = useState(false);
    const [isIngredientsExpanded, setIsIngredientsExpanded] = useState(false);
    const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
    const [isLoadingImage, setIsLoadingImage] = useState(false);
    const [imageData, setImageData] = useState<string | null>(null);
    const [imageError, setImageError] = useState<string | boolean>(false);
    const [isMapDialogOpen, setIsMapDialogOpen] = useState(false);
    const [isEditImageDialogOpen, setIsEditImageDialogOpen] = useState(false);
    const [editPrompt, setEditPrompt] = useState<string>('');
    const [isEditingImage, setIsEditingImage] = useState(false);
    const [isNutritionExpanded, setIsNutritionExpanded] = useState(false);
    const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
    const [enhanceError, setEnhanceError] = useState<string | null>(null);

    // --- Handlers ---
    const handleEdit = (e: React.MouseEvent) => { e.stopPropagation(); onEdit?.(dayKey, mealType, itemIndex); };
    const handleRemove = (e: React.MouseEvent) => { e.stopPropagation(); onRemove?.(dayKey, mealType, itemIndex); };
    const togglePrep = () => setIsPrepExpanded(!isPrepExpanded);
    const toggleIngredients = () => setIsIngredientsExpanded(!isIngredientsExpanded);
    const toggleNutrition = () => setIsNutritionExpanded(!isNutritionExpanded);
    const handleDialogChange = (open: boolean) => setIsImageDialogOpen(open);
    const handleMapDialogChange = (open: boolean) => setIsMapDialogOpen(open);

    const handleGenerateImage = useCallback(async () => {
        if (!item.name || isLoadingImage) return;
        setIsLoadingImage(true);
        setImageData(null);
        setImageError(false);
        setIsImageDialogOpen(true);
        try {
            const response = await fetch('/api/generate-image', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ dishName: item.name }) 
            });
            if (!response.ok) { 
                const errData = await response.json().catch(() => ({})); 
                throw new Error(errData.error || `HTTP error! status: ${response.status}`); 
            }
            const data = await response.json();
            if (data.imageData) setImageData(data.imageData);
            else throw new Error("API không trả về dữ liệu ảnh hợp lệ.");
        } catch (error: any) { 
            console.error("Lỗi tạo ảnh:", error); 
            setImageError(error.message || "Không thể tạo ảnh."); 
        }
        finally { 
            setIsLoadingImage(false); 
        }
    }, [item.name, isLoadingImage]);

    const handleEditImage = useCallback(() => { 
        setIsEditImageDialogOpen(true); 
    }, []);
    
    const handleEditPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => { 
        setEditPrompt(e.target.value); 
    };

    const handleApplyEdit = useCallback(async () => {
        if (!imageData || !editPrompt || isEditingImage) return;
        setIsEditingImage(true); 
        setImageError(false);
        try {
            const response = await fetch('/api/generate-image', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ imageData: imageData, editPrompt: editPrompt }) 
            });
            if (!response.ok) { 
                const errData = await response.json().catch(() => ({})); 
                throw new Error(errData.error || `HTTP error! status: ${response.status}`); 
            }
            const data = await response.json();
            if (data.imageData) { 
                setImageData(data.imageData); 
                setIsEditImageDialogOpen(false); 
            }
            else throw new Error("API không trả về dữ liệu ảnh hợp lệ.");
        } catch (error: any) { 
            console.error("Lỗi sửa ảnh:", error); 
            setImageError(error.message || "Không thể sửa ảnh."); 
        }
        finally { 
            setIsEditingImage(false); 
        }
    }, [imageData, editPrompt, isEditingImage]);
    
    const handleEnhancePrompt = useCallback(async () => {
        if (!editPrompt || isEnhancingPrompt) return;
        setIsEnhancingPrompt(true); 
        setEnhanceError(null); 
        setImageError(false);
        try {
            const response = await fetch('/api/enhance-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'image',
                    prompt: editPrompt
                })
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.enhancedPrompt) {
                setEditPrompt(data.enhancedPrompt);
            } else {
                throw new Error("API không trả về gợi ý đã cải thiện hợp lệ.");
            }
        } catch (error: any) {
            console.error("Lỗi cải thiện gợi ý:", error);
            setEnhanceError(error.message || "Không thể cải thiện gợi ý.");
        } finally {
            setIsEnhancingPrompt(false);
        }
    }, [editPrompt, isEnhancingPrompt]);
    
    const hasNutritionData = item.calories !== undefined || 
                            item.protein !== undefined || 
                            item.carbs !== undefined || 
                            item.fat !== undefined || 
                            (item.healthBenefits && item.healthBenefits.length > 0);

    return (
        <TooltipProvider delayDuration={300}>
            {/* Image Dialog: Fully Responsive */}
            <Dialog open={isImageDialogOpen} onOpenChange={handleDialogChange}>
                <DialogContent className="w-[95vw] max-w-md sm:max-w-md md:max-w-lg lg:max-w-xl p-3 sm:p-4 md:p-6">
                    <DialogHeader className="mb-2 sm:mb-3">
                        <DialogTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg md:text-xl">
                            <Sparkles size={16} className="text-primary" /> Hình ảnh: {item.name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex justify-center items-center min-h-[200px] sm:min-h-[250px] md:min-h-[350px] bg-muted/30 dark:bg-muted/10 rounded-md p-2 border border-dashed border-border/40 my-2 relative overflow-x-auto">
                        <AnimatePresence mode="wait">
                            {isLoadingImage && (
                                <motion.div 
                                    key="loading" 
                                    initial={{ opacity: 0 }} 
                                    animate={{ opacity: 1 }} 
                                    exit={{ opacity: 0 }} 
                                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground text-center bg-background/70 backdrop-blur-sm z-10"
                                >
                                    <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-primary" />
                                    <p className="text-xs sm:text-sm font-medium mt-1">Đang tạo ảnh...</p>
                                </motion.div>
                            )}
                            {!isLoadingImage && imageData && (
                                <motion.img 
                                    key="image" 
                                    src={`data:image/png;base64,${imageData}`} 
                                    alt={`Ảnh ${item.name}`} 
                                    className="max-w-full max-h-[250px] sm:max-h-[300px] md:max-h-[400px] object-contain rounded shadow-sm z-0" 
                                    initial={{ opacity: 0, scale: 0.95 }} 
                                    animate={{ opacity: 1, scale: 1 }} 
                                    exit={{ opacity: 0, scale: 0.95 }} 
                                    transition={{ duration: 0.3 }} 
                                />
                            )}
                            {!isLoadingImage && imageError && (
                                <motion.div 
                                    key="error" 
                                    initial={{ opacity: 0 }} 
                                    animate={{ opacity: 1 }} 
                                    exit={{ opacity: 0 }} 
                                    className="absolute inset-0 flex items-center justify-center p-4 z-10"
                                >
                                    <Alert variant="destructive" className="w-full max-w-sm bg-background/80 backdrop-blur-sm">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle className="text-xs sm:text-sm">Lỗi!</AlertTitle>
                                        <AlertDescription className="text-xs">
                                            {typeof imageError === 'string' ? imageError : "Không thể tạo ảnh."}
                                        </AlertDescription>
                                    </Alert>
                                </motion.div>
                            )}
                            {!isLoadingImage && !imageData && !imageError && (
                                <motion.div 
                                    key="placeholder" 
                                    initial={{ opacity: 0 }} 
                                    animate={{ opacity: 1 }} 
                                    exit={{ opacity: 0 }} 
                                    className="text-center text-muted-foreground p-4"
                                >
                                    <ImageIcon size={32} className="mx-auto mb-2 sm:mb-3 opacity-25" />
                                    <p className="text-xs font-medium">Chưa có hình ảnh</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <DialogFooter className="mt-3 sm:mt-4 flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-2">
                        <DialogClose asChild>
                            <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto">Đóng</Button>
                        </DialogClose>
                        <div className="flex flex-col sm:flex-row sm:justify-end gap-2 w-full sm:w-auto">
                            {imageData && !isLoadingImage && (
                                <Button type="button" variant="secondary" size="sm" onClick={handleGenerateImage} className="w-full sm:w-auto">
                                    <Sparkles size={14} className="mr-1.5" /> Tạo lại
                                </Button>
                            )}
                            {imageData && !isLoadingImage && (
                                <Button type="button" variant="secondary" size="sm" onClick={handleEditImage} className="w-full sm:w-auto">
                                    <Edit size={14} className="mr-1.5" /> Chỉnh sửa
                                </Button>
                            )}
                            {imageError && !isLoadingImage && (
                                <Button type="button" variant="secondary" size="sm" onClick={handleGenerateImage} className="w-full sm:w-auto">
                                    <Sparkles size={14} className="mr-1.5" /> Thử lại
                                </Button>
                            )}
                            {!imageData && !imageError && !isLoadingImage && (
                                <Button type="button" variant="default" size="sm" onClick={handleGenerateImage} className="w-full sm:w-auto">
                                    <Sparkles size={14} className="mr-1.5" /> Tạo ảnh
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Image Dialog */}
            <Dialog open={isEditImageDialogOpen} onOpenChange={setIsEditImageDialogOpen}>
                <DialogContent className="w-[95vw] max-w-md sm:max-w-md md:max-w-lg lg:max-w-xl p-3 sm:p-4 md:p-6">
                    <DialogHeader className="mb-2 sm:mb-3">
                        <DialogTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg md:text-xl">
                            <Edit size={16} className="text-primary" /> Chỉnh sửa ảnh: {item.name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex justify-center items-center min-h-[200px] sm:min-h-[250px] md:min-h-[350px] bg-muted/30 dark:bg-muted/10 rounded-md p-2 border border-dashed border-border/40 my-2 relative overflow-x-auto">
                        <AnimatePresence mode="wait">
                            {isEditingImage && (
                                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground text-center bg-background/70 backdrop-blur-sm z-10">
                                    <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-primary" />
                                    <p className="text-xs sm:text-sm font-medium mt-1">Đang chỉnh sửa...</p>
                                </motion.div>
                            )}
                            {!isEditingImage && imageData && (
                                <motion.img key="image" src={`data:image/png;base64,${imageData}`} alt={`Ảnh ${item.name}`} 
                                    className="max-w-full max-h-[250px] sm:max-h-[300px] md:max-h-[400px] object-contain rounded shadow-sm z-0" 
                                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} 
                                    transition={{ duration: 0.3 }} 
                                />
                            )}
                            {!isEditingImage && imageError && (
                                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                                    className="absolute inset-0 flex items-center justify-center p-4 z-10">
                                    <Alert variant="destructive" className="w-full max-w-sm bg-background/80 backdrop-blur-sm">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle className="text-xs sm:text-sm">Lỗi!</AlertTitle>
                                        <AlertDescription className="text-xs">
                                            {typeof imageError === 'string' ? imageError : "Không thể sửa ảnh."}
                                        </AlertDescription>
                                    </Alert>
                                </motion.div>
                            )}
                            {!isEditingImage && !imageData && !imageError && (
                                <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                                    className="text-center text-muted-foreground p-4">
                                    <ImageIcon size={32} className="mx-auto mb-2 sm:mb-3 opacity-25" />
                                    <p className="text-xs font-medium">Chưa có hình ảnh</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    {enhanceError && (
                        <Alert variant="destructive" className="mb-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle className="text-xs sm:text-sm">Lỗi Cải Thiện</AlertTitle>
                            <AlertDescription className="text-xs">{enhanceError}</AlertDescription>
                        </Alert>
                    )}
                    <div className="relative mb-2 sm:mb-3">
                        <Textarea
                            placeholder="Mô tả chỉnh sửa (vd: thêm rau thơm, phong cách hoạt hình...)"
                            value={editPrompt} onChange={handleEditPromptChange}
                            className="resize-none text-xs md:text-sm pr-10 py-1.5 border rounded-md dark:bg-gray-700/80 dark:text-gray-100 dark:border-gray-600/70 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-0"
                            rows={2}
                        />
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="icon" 
                                        className="absolute top-1.5 right-1.5 h-6 w-6 text-muted-foreground hover:bg-primary/10 hover:text-primary" 
                                        onClick={handleEnhancePrompt} 
                                        disabled={isEnhancingPrompt || !editPrompt}
                                    >
                                        {isEnhancingPrompt ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                        <span className="sr-only">Cải thiện</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top"><p>Cải thiện gợi ý (AI)</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <DialogFooter className="mt-3 sm:mt-4 flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-2">
                        <DialogClose asChild>
                            <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto">Đóng</Button>
                        </DialogClose>
                        <Button 
                            type="button" 
                            variant="default" 
                            size="sm" 
                            onClick={handleApplyEdit} 
                            disabled={isEditingImage || !editPrompt} 
                            className="w-full sm:w-auto"
                        >
                            {isEditingImage ? (
                                <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Đang sửa...</>
                            ) : (
                                <><Edit size={14} className="mr-1.5" /> Áp dụng</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Map Dialog */}
            <Dialog open={isMapDialogOpen} onOpenChange={handleMapDialogChange}>
                <DialogContent className="w-[95vw] max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl h-[90vh] sm:h-[85vh] md:h-[80vh] flex flex-col p-0">
                    <DialogHeader className="p-2 sm:p-3 md:p-4 border-b shrink-0">
                        <DialogTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base md:text-lg">
                            <MapPin size={14} className="text-primary" /> Tìm quán ăn: {item.name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-grow overflow-y-auto p-1 sm:p-2 md:p-4">
                        {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                            <NearbyRestaurantsMap keyword={item.name} apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY} />
                        ) : (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle className="text-xs sm:text-sm">Lỗi Cấu Hình</AlertTitle>
                                <AlertDescription className="text-xs">Thiếu API Key Google Maps.</AlertDescription>
                            </Alert>
                        )}
                    </div>
                    <DialogFooter className="p-2 sm:p-3 md:p-4 border-t shrink-0">
                        <DialogClose asChild>
                            <Button type="button" variant="outline" size="sm">Đóng</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Card Component */}
            <motion.div
                layout 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="group relative rounded-lg border border-border/50 bg-card shadow-sm hover:border-border/80 transition-colors duration-200 w-full"
            >
                <div className="p-2 sm:p-3">
                    <div className="flex justify-between items-start gap-1 sm:gap-2">
                        <div className="flex-grow overflow-x-auto mr-1 min-w-0">
                            <h4 className="font-semibold text-xs sm:text-sm text-foreground mb-0.5 truncate" title={item.name}>{item.name}</h4>
                            {item.estimatedCost && (
                                <Badge variant="outline" className="text-[9px] sm:text-[10px] flex items-center gap-0.5 px-1 sm:px-1.5 py-0 border-green-300/70 dark:border-green-700/50 text-green-700 dark:text-green-400 bg-green-50/50 dark:bg-green-900/20 font-medium">
                                    <Coins size={10} /> {item.estimatedCost}
                                </Badge>
                            )}
                        </div>
                        <div className="flex-shrink-0 -mr-1 -mt-1">
                            <DropdownMenu>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 p-1 rounded-full text-muted-foreground hover:bg-muted/60">
                                                <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                <span className="sr-only">Tùy chọn</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent side="left"><p>Tùy chọn</p></TooltipContent>
                                </Tooltip>
                                <DropdownMenuContent align="end" className="w-44 sm:w-48">
                                    <DropdownMenuItem onClick={handleGenerateImage} disabled={isLoadingImage}>
                                        {isLoadingImage ? <Loader2 className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" /> : <ImageIcon className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />} 
                                        {imageData ? "Xem/Tạo lại ảnh" : "Tạo ảnh"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleEditImage} disabled={!imageData}>
                                        <Edit className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Chỉnh sửa ảnh
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setIsMapDialogOpen(true)}>
                                        <MapPin className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Tìm quán ăn
                                    </DropdownMenuItem>
                                    {onOpenUnderstandMeal && (
                                        <DropdownMenuItem onClick={() => onOpenUnderstandMeal(item.name)}>
                                            <BookOpenCheck className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Tìm hiểu món ăn
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    {onEdit && (
                                        <DropdownMenuItem onClick={handleEdit}>
                                            <Edit className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Chỉnh sửa món
                                        </DropdownMenuItem>
                                    )}
                                    {onRemove && (
                                        <DropdownMenuItem onClick={handleRemove} className="text-red-600 focus:text-red-600 focus:bg-red-100/80 dark:focus:bg-red-900/40">
                                            <Trash2 className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Xóa món
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Ingredients Section */}
                    {item.ingredients && item.ingredients.length > 0 && (
                        <div className="mt-1.5 sm:mt-2">
                            <button 
                                onClick={toggleIngredients} 
                                className="flex items-center justify-between w-full text-left text-[10px] sm:text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-0.5 sm:py-1 group/toggle -mx-1 px-1 rounded hover:bg-muted/50"
                            >
                                <span className="flex items-center gap-1">
                                    <ShoppingBasket size={12} /> Nguyên liệu ({item.ingredients.length})
                                </span>
                                {isIngredientsExpanded ? (
                                    <ChevronUp size={12} className="group-hover/toggle:text-foreground"/>
                                ) : (
                                    <ChevronDown size={12} className="group-hover/toggle:text-foreground"/>
                                )}
                            </button>
                            <AnimatePresence initial={false}>
                                {isIngredientsExpanded && (
                                    <motion.div 
                                        key="ingredients-content" 
                                        initial="collapsed" 
                                        animate="open" 
                                        exit="collapsed" 
                                        variants={{ 
                                            open: { opacity: 1, height: 'auto', marginTop: '4px', marginBottom: '2px' }, 
                                            collapsed: { opacity: 0, height: 0, marginTop: '0px', marginBottom: '0px' } 
                                        }} 
                                        transition={{ duration: 0.25, ease: [0.04, 0.62, 0.23, 0.98] }} 
                                        // Removed overflow-x-auto class and style
                                    >
                                        {/* Added min-w-0 to allow wrapping */}
                                        <div className="flex flex-wrap gap-1 pt-0.5 pb-0.5 w-full max-w-full min-w-0">
                                            {item.ingredients.map((ing, idx) => (
                                                <Badge 
                                                    key={idx} 
                                                    variant="secondary" 
                                                    // Added break-all and whitespace-normal for better wrapping
                                                    className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 font-normal break-all whitespace-normal"
                                                >
                                                    {ing}
                                                </Badge>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Preparation Section */}
                    {item.preparation && (
                        <div className="mt-1 sm:mt- Facial5">
                            <button 
                                onClick={togglePrep} 
                                className="flex items-center justify-between w-full text-left text-[10px] sm:text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-0.5 sm:py-1 group/toggle -mx-1 px-1 rounded hover:bg-muted/50"
                            >
                                <span className="flex items-center gap-1">
                                    <ChefHat size={12} /> Cách chế biến
                                </span>
                                {isPrepExpanded ? (
                                    <ChevronUp size={12} className="group-hover/toggle:text-foreground"/>
                                ) : (
                                    <ChevronDown size={12} className="group-hover/toggle:text-foreground"/>
                                )}
                            </button>
                            <AnimatePresence initial={false}>
                                {isPrepExpanded && (
                                    <motion.div 
                                        key="prep-content" 
                                        initial="collapsed" 
                                        animate="open" 
                                        exit="collapsed" 
                                        variants={{ 
                                            open: { opacity: 1, height: 'auto', marginTop: '4px', marginBottom: '2px' }, 
                                            collapsed: { opacity: 0, height: 0, marginTop: '0px', marginBottom: '0px' } 
                                        }} 
                                        transition={{ duration: 0.25, ease: [0.04, 0.62, 0.23, 0.98] }} 
                                        className="overflow-x-auto"
                                    >
                                        <p className="text-[9px] sm:text-xs text-muted-foreground whitespace-pre-line break-words leading-relaxed pt-0.5 pb-0.5 pl-1.5 border-l-2 border-primary/20">
                                            {item.preparation}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Nutrition Section */}
                    {hasNutritionData && (
                        <div className="mt-1 sm:mt-1.5">
                            <button 
                                onClick={toggleNutrition} 
                                className="flex items-center justify-between w-full text-left text-[10px] sm:text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-0.5 sm:py-1 group/toggle -mx-1 px-1 rounded hover:bg-muted/50"
                            >
                                <span className="flex items-center gap-1">
                                    <Info size={12} /> Dinh dưỡng & Lợi ích
                                </span>
                                {isNutritionExpanded ? (
                                    <ChevronUp size={12} className="group-hover/toggle:text-foreground"/>
                                ) : (
                                    <ChevronDown size={12} className="group-hover/toggle:text-foreground"/>
                                )}
                            </button>
                            <AnimatePresence initial={false}>
                                {isNutritionExpanded && (
                                    <motion.div 
                                        key="nutrition-content" 
                                        initial="collapsed" 
                                        animate="open" 
                                        exit="collapsed" 
                                        variants={{ 
                                            open: { opacity: 1, height: 'auto', marginTop: '4px', marginBottom: '2px' }, 
                                            collapsed: { opacity: 0, height: 0, marginTop: '0px', marginBottom: '0px' } 
                                        }} 
                                        transition={{ duration: 0.25, ease: [0.04, 0.62, 0.23, 0.98] }} 
                                        className="overflow-x-auto"
                                    >
                                        <div className="text-[9px] sm:text-[11px] text-muted-foreground space-y-1 pt-0.5 pb-0.5 pl-1.5 border-l-2 border-blue-500/20">
                                            {(item.calories !== undefined || item.protein !== undefined || item.carbs !== undefined || item.fat !== undefined) && (
                                                <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                                    {item.calories !== undefined && (
                                                        <p><strong className="font-medium text-foreground/80">Calo:</strong> {item.calories} kcal</p>
                                                    )}
                                                    {item.protein !== undefined && (
                                                        <p><strong className="font-medium text-foreground/80">Đạm:</strong> {item.protein} g</p>
                                                    )}
                                                    {item.carbs !== undefined && (
                                                        <p><strong className="font-medium text-foreground/80">Carb:</strong> {item.carbs} g</p>
                                                    )}
                                                    {item.fat !== undefined && (
                                                        <p><strong className="font-medium text-foreground/80">Béo:</strong> {item.fat} g</p>
                                                    )}
                                                </div>
                                            )}
                                            {item.healthBenefits && item.healthBenefits.length > 0 && (
                                                <div className="pt-0.5 sm:pt-1">
                                                    <p className="font-medium text-foreground/80 mb-0.5">Lợi ích:</p>
                                                    <ul className="list-disc list-inside space-y-0.5">
                                                        {item.healthBenefits.map((benefit, idx) => (
                                                            <li key={idx}>{benefit}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </motion.div>
        </TooltipProvider>
    );
};

// MealPlaceholder Component
const MealPlaceholder: React.FC<{ mealLabel: string }> = ({ mealLabel }) => (
    <div className="px-2 sm:px-3 py-3 sm:py-4 text-center text-[10px] sm:text-xs text-muted-foreground border border-dashed border-border/40 rounded-md bg-muted/10">
        Chưa có món cho {mealLabel.toLowerCase()}.
    </div>
);

// DayMealsSection Component
const DayMealsSection: React.FC<{
    dayData: DailyMenuData | undefined;
    dayKey: string | null;
    onEditItem?: InteractiveMenuProps['onEditItem'];
    onRemoveItem?: InteractiveMenuProps['onRemoveItem'];
    onOpenUnderstandMeal?: (mealName: string) => void;
}> = ({ dayData, dayKey, onEditItem, onRemoveItem, onOpenUnderstandMeal }) => {
    const allMealTypes: { key: keyof DailyMenuData; label: string; icon: React.ElementType; isOptional?: boolean }[] = [
        { key: 'breakfast', label: 'Bữa Sáng', icon: Sandwich },
        { key: 'lunch', label: 'Bữa Trưa', icon: Soup },
        { key: 'dinner', label: 'Bữa Tối', icon: UtensilsCrossed },
        { key: 'snacks', label: 'Bữa Phụ / Ăn Vặt', icon: Cookie, isOptional: true },
    ];
    const hasAnyDataForDay = dayData && Object.values(dayData).some(meal => meal && meal.length > 0);

    if (!hasAnyDataForDay) {
        return (
            <div className="flex flex-col items-center justify-center p-4 sm:p-6 text-center text-muted-foreground min-h-[120px] sm:min-h-[150px] bg-muted/20 rounded-lg border border-dashed border-border/40">
                <Salad size={28} className="mb-2 opacity-30" />
                <p className="text-xs font-medium">Không có kế hoạch bữa ăn.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-5 md:space-y-6 px-0 sm:px-0.5 pb-1 w-full">
            {allMealTypes.map(({ key, label, icon: Icon, isOptional }) => {
                const items = dayData?.[key] ?? [];
                const hasItems = items.length > 0;
                if (isOptional && !hasItems) return null;
                const sectionId = `${dayKey ?? 'daily'}-${key}`;

                return (
                    <section key={key} className="scroll-mt-16" id={sectionId}>
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                            <div className="p-1 sm:p-1.5 bg-primary/10 rounded-full flex-shrink-0">
                                <Icon size={14} className="text-primary" />
                            </div>
                            <h3 className="text-xs sm:text-base md:text-lg font-semibold text-foreground flex-grow truncate pr-2 min-w-0">
                                {label}
                            </h3>
                            {hasItems && (
                                <Badge variant="outline" className="ml-auto flex-shrink-0 text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0">
                                    {items.length} món
                                </Badge>
                            )}
                        </div>
                        <div className="space-y-2 sm:space-y-3">
                            {hasItems ? (
                                items.map((item, itemIdx) => (
                                    <MenuItemCard
                                        key={`${sectionId}-${itemIdx}-${item.name.slice(0,10)}`}
                                        item={item} 
                                        itemIndex={itemIdx} 
                                        dayKey={dayKey} 
                                        mealType={key}
                                        onEdit={onEditItem} 
                                        onRemove={onRemoveItem}
                                        onOpenUnderstandMeal={onOpenUnderstandMeal}
                                    />
                                ))
                            ) : (
                                <MealPlaceholder mealLabel={label} />
                            )}
                        </div>
                    </section>
                );
            })}
        </div>
    );
};

// Suggested Prompts Component (Mobile-First with Wrapping)
const SuggestedPrompts: React.FC<{
    menu?: AnyMenuData;
    onPromptClick?: (prompt: string) => void;
}> = ({ menu, onPromptClick }) => {
    if (!onPromptClick || !menu) return null;

    const basePrompts = ["Món nào tốt cho sức khỏe?", "Gợi ý món chay?", "Tạo lại cho người tập gym."];
    let sampleDishName: string | undefined;
    
    if (menu) {
        const findDish = (data: DailyMenuData | undefined) => 
            data?.breakfast?.[0]?.name ?? 
            data?.lunch?.[0]?.name ?? 
            data?.dinner?.[0]?.name;
            
        if ('breakfast' in menu) {
            sampleDishName = findDish(menu as DailyMenuData);
        } else {
            for (const day of daysOfWeek) {
                sampleDishName = findDish((menu as WeeklyMenuData)[day]);
                if (sampleDishName) break;
            }
        }
    }
    
    const finalPrompts = [...basePrompts];
    if (sampleDishName) {
        finalPrompts.splice(1, 0, `Thêm về "${sampleDishName.substring(0, 15)}${sampleDishName.length > 15 ? '...' : ''}"?`);
    }

    return (
        <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-border/40 px-0 sm:px-0.5 w-full">
            <h4 className="text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2 flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
                <MessageSquareQuote size={12} /> Gợi ý:
            </h4>
            <div className="flex flex-wrap gap-1 sm:gap-1.5 overflow-x-auto">
                {finalPrompts.map((prompt, index) => (
                    <Button
                        key={index} 
                        variant="outline" 
                        size="sm"
                        className="text-[9px] sm:text-[11px] h-auto py-0.5 px-1.5 sm:px-2 text-left font-normal text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-150 ease-in-out border-border/60 whitespace-normal break-words max-w-[calc(50%-0.25rem)] sm:max-w-[calc(33%-0.25rem)]"
                        onClick={() => onPromptClick(prompt)}
                    >
                        {prompt}
                    </Button>
                ))}
            </div>
        </div>
    );
};

// --- Main Component ---
const daysOfWeek: (keyof WeeklyMenuData)[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const dayTranslations: Record<string, string> = {
    "Monday": "T2", 
    "Tuesday": "T3", 
    "Wednesday": "T4", 
    "Thursday": "T5", 
    "Friday": "T6", 
    "Saturday": "T7", 
    "Sunday": "CN",
};

export function InteractiveMenu({ menuData, isLoading, onEditItem, onRemoveItem, onExportIngredients, onPromptClick }: InteractiveMenuProps) {
    const { menu, menuType, feedbackRequest } = menuData;
    const isMobile = useIsMobile();
    const menuContentRef = useRef<HTMLDivElement>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isGeneratingText, setIsGeneratingText] = useState(false);
    const [activeTab, setActiveTab] = useState<string | undefined>(undefined);
    const [isUnderstandMealOpen, setIsUnderstandMealOpen] = useState(false);
    const [selectedMealForUnderstanding, setSelectedMealForUnderstanding] = useState<string | null>(null);

    const handleOpenUnderstandMeal = useCallback((mealName: string) => {
        setSelectedMealForUnderstanding(mealName);
        setIsUnderstandMealOpen(true);
    }, []);

    const defaultWeeklyTab = useMemo(() => {
        if (menuType !== 'weekly' || !menu) return undefined;
        const weeklyMenu = menu as WeeklyMenuData;
        return daysOfWeek.find(day => 
            weeklyMenu[day] && Object.values(weeklyMenu[day]!).some(meal => meal && meal.length > 0)
        ) || daysOfWeek[0];
    }, [menu, menuType]);

    useEffect(() => {
        if (menuType === 'weekly' && defaultWeeklyTab && !activeTab) setActiveTab(defaultWeeklyTab);
        if (menuType !== 'weekly' || !menu) setActiveTab(undefined);
    }, [defaultWeeklyTab, menuType, menu, activeTab]);

    // --- Handlers ---
    const handleExportIngredients = useCallback(() => {
        if (!menu || !onExportIngredients) return;
        let allIngredients: string[] = [];
        
        if (menuType === 'daily') {
            const dailyMenu = menu as DailyMenuData;
            Object.values(dailyMenu).forEach(mealItems => {
                mealItems?.forEach(item => {
                    if (item.ingredients) allIngredients.push(...item.ingredients);
                });
            });
        } else {
            const weeklyMenu = menu as WeeklyMenuData;
            daysOfWeek.forEach(day => {
                const dayData = weeklyMenu[day];
                if (dayData) {
                    Object.values(dayData).forEach(mealItems => {
                        mealItems?.forEach(item => {
                            if (item.ingredients) allIngredients.push(...item.ingredients);
                        });
                    });
                }
            });
        }
        
        const uniqueIngredients = [...new Set(allIngredients)].sort((a, b) => a.localeCompare(b));
        const markdown = uniqueIngredients.length > 0 
            ? `# Nguyên liệu (${menuType === 'weekly' ? 'Tuần' : 'Hôm nay'})\n\n${uniqueIngredients.map(ing => `- [ ] ${ing}`).join('\n')}` 
            : `# Nguyên liệu\n\n(Không có)`;
            
        onExportIngredients(markdown);
    }, [onExportIngredients, menuType, menu]);

    const handleDownloadPdf = useCallback(async () => {
        const elementToCapture = menuContentRef.current;
        if (!elementToCapture || isGeneratingPdf) return;
        setIsGeneratingPdf(true);
        
        const originalBg = elementToCapture.style.backgroundColor;
        const computedStyle = getComputedStyle(elementToCapture);
        const themeBg = computedStyle.getPropertyValue('--background').trim() || '#ffffff';
        elementToCapture.style.backgroundColor = themeBg;
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            const scale = isMobile ? 1.2 : 1.5;
            const canvas = await html2canvas(elementToCapture, { 
                scale, 
                useCORS: true, 
                logging: false, 
                backgroundColor: null 
            });
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ 
                orientation: 'portrait', 
                unit: 'px', 
                format: [canvas.width, canvas.height] 
            });
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const effectivePdfHeight = pdfWidth * (canvas.height / canvas.width);
            const pageHeightLimit = pdfWidth * 1.414;
            
            let position = 0;
            while (position < effectivePdfHeight) {
                if (position > 0) pdf.addPage([canvas.width, canvas.height], 'portrait');
                pdf.addImage(imgData, 'PNG', 0, -position, pdfWidth, effectivePdfHeight);
                position += pageHeightLimit;
            }
            
            pdf.save(`thuc-don-${menuType}-${(menuType === 'weekly' ? activeTab : 'hom-nay') ?? 'export'}.pdf`);
        } catch (error) { 
            console.error("Lỗi tạo PDF:", error); 
            alert("Lỗi tạo PDF."); 
        } finally { 
            if (menuContentRef.current) menuContentRef.current.style.backgroundColor = originalBg; 
            setIsGeneratingPdf(false); 
        }
    }, [isGeneratingPdf, menuType, activeTab, isMobile]);

    const handleDownloadText = useCallback(() => {
        if (!menu || isGeneratingText) return;
        setIsGeneratingText(true);
        let menuText = "";
        
        const formatItem = (item: MenuItemData, indent = "  ") => {
            let text = `${indent}- ${item.name}\n`;
            if (item.estimatedCost) text += `${indent}  * Chi phí: ${item.estimatedCost}\n`;
            if (item.calories !== undefined) text += `${indent}  * Calo: ${item.calories} kcal\n`;
            if (item.protein !== undefined) text += `${indent}  * Đạm: ${item.protein} g\n`;
            if (item.carbs !== undefined) text += `${indent}  * Carb: ${item.carbs} g\n`;
            if (item.fat !== undefined) text += `${indent}  * Béo: ${item.fat} g\n`;
            if (item.ingredients && item.ingredients.length > 0) {
                text += `${indent}  * Nguyên liệu: ${item.ingredients.join(', ')}\n`;
            }
            if (item.preparation) {
                text += `${indent}  * Chế biến: ${item.preparation.split('\n')[0]}...\n`;
            }
            if (item.healthBenefits && item.healthBenefits.length > 0) {
                text += `${indent}  * Lợi ích: ${item.healthBenefits.join(', ')}\n`;
            }
            return text;
        };
        
        const formatMeal = (mealKey: keyof DailyMenuData, mealData: MenuItemData[] | undefined, indent = "") => {
            if (!mealData || mealData.length === 0) return "";
            const mealLabels: Record<string, string> = { 
                breakfast: "Sáng", 
                lunch: "Trưa", 
                dinner: "Tối", 
                snacks: "Phụ" 
            };
            let text = `${indent}--- ${mealLabels[mealKey]} ---\n`;
            mealData.forEach(item => text += formatItem(item, indent + "  "));
            return text + "\n";
        };

        if (menuType === 'daily') {
            const dailyMenu = menu as DailyMenuData;
            menuText += `THỰC ĐƠN HÔM NAY\n==================\n\n`;
            menuText += formatMeal('breakfast', dailyMenu.breakfast);
            menuText += formatMeal('lunch', dailyMenu.lunch);
            menuText += formatMeal('dinner', dailyMenu.dinner);
            menuText += formatMeal('snacks', dailyMenu.snacks);
        } else {
            const weeklyMenu = menu as WeeklyMenuData;
            menuText += `THỰC ĐƠN TUẦN\n==================\n\n`;
            daysOfWeek.forEach(day => {
                const dayData = weeklyMenu[day];
                if (dayData && Object.values(dayData).some(m => m && m.length > 0)) {
                    menuText += `=== ${dayTranslations[day] || day} ===\n`;
                    menuText += formatMeal('breakfast', dayData.breakfast, " ");
                    menuText += formatMeal('lunch', dayData.lunch, " ");
                    menuText += formatMeal('dinner', dayData.dinner, " ");
                    menuText += formatMeal('snacks', dayData.snacks, " ");
                    menuText += "\n";
                }
            });
        }
        
        try {
            const blob = new Blob([menuText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `thuc-don-${menuType}-${(menuType === 'weekly' ? activeTab : 'hom-nay') ?? 'export'}.txt`;
            document.body.appendChild(link); 
            link.click(); 
            document.body.removeChild(link); 
            URL.revokeObjectURL(url);
        } catch (error) { 
            console.error("Lỗi tạo file text:", error); 
            alert("Lỗi tạo file text."); 
        } finally { 
            setIsGeneratingText(false); 
        }
    }, [menu, menuType, activeTab, isGeneratingText]);

    // --- Loading State ---
    if (isLoading) {
        return (
            <div className="w-full p-1 space-y-3 sm:space-y-4">
                <Skeleton className="h-6 sm:h-8 w-1/3" />
                <Skeleton className="h-5 sm:h-6 w-1/2" />
                <div className="space-y-2 sm:space-y-3">
                    <Skeleton className="h-16 sm:h-20 w-full rounded-lg" />
                    <Skeleton className="h-16 sm:h-20 w-full rounded-lg" />
                </div>
            </div>
        );
    }

    // --- Empty State ---
    if (!menu || Object.keys(menu).length === 0) {
        return (
            <div className="w-full p-3 sm:p-4">
                <div className="flex flex-col items-center justify-center p-4 sm:p-6 text-center text-muted-foreground min-h-[120px] sm:min-h-[150px] bg-muted/20 rounded-lg border border-dashed border-border/40">
                    <Info size={24} className="mb-2 sm:mb-3 opacity-30" />
                    <p className="text-xs sm:text-sm font-medium">Không có dữ liệu thực đơn</p>
                    {feedbackRequest && (
                        <p className="mt-2 sm:mt-3 text-[10px] sm:text-xs italic border-t border-border/30 pt-2 w-full max-w-xs">
                            {feedbackRequest}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    // --- Weekly Menu View ---
    if (menuType === 'weekly') {
        const weeklyMenu = menu as WeeklyMenuData;
        const hasAnyWeeklyData = daysOfWeek.some(day => 
            weeklyMenu[day] && Object.values(weeklyMenu[day]!).some(meal => meal && meal.length > 0)
        );

        if (!hasAnyWeeklyData) {
            return (
                <div className="w-full p-3 sm:p-4">
                    <div className="flex flex-col items-center justify-center p-4 sm:p-6 text-center text-muted-foreground min-h-[120px] sm:min-h-[150px] bg-muted/20 rounded-lg border border-dashed border-border/40">
                        <CalendarDays size={24} className="mb-2 sm:mb-3 opacity-30" />
                        <p className="text-xs sm:text-sm font-medium">Thực đơn tuần trống</p>
                        {feedbackRequest && (
                            <p className="mt-2 sm:mt-3 text-[10px] sm:text-xs italic border-t border-border/30 pt-2 w-full max-w-xs">
                                {feedbackRequest}
                            </p>
                        )}
                    </div>
                </div>
            );
        }
        
        if (!activeTab) {
            return (
                <div className="w-full p-1 space-y-2">
                    <Skeleton className="h-8 w-full rounded-md" />
                    <Skeleton className="h-32 sm:h-40 w-full rounded-lg" />
                </div>
            );
        }

        return (
            <div className="w-full">
                {hasAnyWeeklyData && (
                    <div className="flex justify-end mb-1.5 sm:mb-2 -mt-1 px-0 sm:px-0.5">
                        <DropdownMenu>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="text-[10px] sm:text-xs h-6 sm:h-7 px-1.5 sm:px-2">
                                                <MoreVertical className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 -ml-0.5" />Tùy chọn
                                            </Button>
                                        </DropdownMenuTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" align="end"><p>Hành động</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <DropdownMenuContent align="end" className="w-44 sm:w-48">
                                {onExportIngredients && (
                                    <DropdownMenuItem onClick={handleExportIngredients}>
                                        <ShoppingBasket className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Xuất Nguyên Liệu
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={handleDownloadPdf} disabled={isGeneratingPdf}>
                                    {isGeneratingPdf ? (
                                        <Loader2 className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                                    ) : (
                                        <Download className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    )} 
                                    {isGeneratingPdf ? "Đang tạo..." : `Tải ${dayTranslations[activeTab] ?? activeTab} (PDF)`}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadText} disabled={isGeneratingText}>
                                    {isGeneratingText ? (
                                        <Loader2 className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                                    ) : (
                                        <Download className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    )} 
                                    {isGeneratingText ? "Đang tạo..." : "Tải cả tuần (TXT)"}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}

                <TooltipProvider>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="relative mb-2 sm:mb-3 border-b border-border/40">
                            <ScrollArea className="w-full pb-1 sm:pb-1.5 -mx-1 px-1">
                                <TabsList className="inline-flex h-auto p-0.5 bg-muted/60 rounded-md gap-0.5 w-max">
                                    {daysOfWeek.map(day => {
                                        const dayHasData = weeklyMenu[day] && 
                                            Object.values(weeklyMenu[day]!).some(m => m && m.length > 0);
                                        const dayLabel = dayTranslations[day] || day;
                                        
                                        return (
                                            <Tooltip key={day} delayDuration={isMobile ? 800 : 200}>
                                                <TooltipTrigger asChild>
                                                    <TabsTrigger
                                                        value={day} 
                                                        disabled={!dayHasData}
                                                        className={cn(
                                                            "px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-[9px] sm:text-xs rounded-[4px] sm:rounded-[5px] transition-all duration-150 h-6 sm:h-7",
                                                            "data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:font-semibold",
                                                            "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted-foreground/5 data-[state=inactive]:hover:text-foreground/80",
                                                            "data-[disabled]:opacity-40 data-[disabled]:pointer-events-none"
                                                        )}
                                                    >
                                                        {dayLabel}
                                                    </TabsTrigger>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{Object.entries(dayTranslations).find(([key, val]) => val === dayLabel)?.[0] || day}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        );
                                    })}
                                </TabsList>
                            </ScrollArea>
                        </div>

                        <div ref={menuContentRef} id="menu-content-weekly" className="bg-background rounded-md w-full">
                            {daysOfWeek.map(day => (day === activeTab && weeklyMenu[day]) ? (
                                <TabsContent key={day} value={day} className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                                    <DayMealsSection 
                                        dayData={weeklyMenu[day]} 
                                        dayKey={day} 
                                        onEditItem={onEditItem} 
                                        onRemoveItem={onRemoveItem} 
                                        onOpenUnderstandMeal={handleOpenUnderstandMeal} 
                                    />
                                </TabsContent>
                            ) : null)}
                        </div>
                    </Tabs>
                </TooltipProvider>

                {feedbackRequest && (
                    <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-border/40 px-0 sm:px-0.5">
                        <p className="text-[10px] sm:text-xs text-muted-foreground italic flex items-start gap-1 sm:gap-1.5">
                            <Info size={12} className="mt-px flex-shrink-0 opacity-70"/>
                            <span>{feedbackRequest}</span>
                        </p>
                    </div>
                )}
                <SuggestedPrompts menu={menu} onPromptClick={onPromptClick} />
            </div>
        );
    }

    // --- Daily Menu View ---
    if (menuType === 'daily') {
        const dailyMenu = menu as DailyMenuData;
        const hasAnyDailyData = Object.values(dailyMenu).some(meal => meal && meal.length > 0);

        if (!hasAnyDailyData) {
            return (
                <div className="w-full p-3 sm:p-4">
                    <div className="flex flex-col items-center justify-center p-4 sm:p-6 text-center text-muted-foreground min-h-[120px] sm:min-h-[150px] bg-muted/20 rounded-lg border border-dashed border-border/40">
                        <CalendarDays size={24} className="mb-2 sm:mb-3 opacity-30" />
                        <p className="text-xs sm:text-sm font-medium">Thực đơn hôm nay trống</p>
                        {feedbackRequest && (
                            <p className="mt-2 sm:mt-3 text-[10px] sm:text-xs italic border-t border-border/30 pt-2 w-full max-w-xs">
                                {feedbackRequest}
                            </p>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div className="w-full">
                <div className="pb-2 sm:pb-3 pt-0.5 sm:pt-1 px-0 sm:px-0.5 mb-2 sm:mb-3 border-b border-border/40 flex flex-row items-center justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <CalendarDays size={16} className="text-primary flex-shrink-0" />
                        <h2 className="text-sm sm:text-lg md:text-xl font-semibold text-foreground truncate">Hôm Nay</h2>
                    </div>
                    {hasAnyDailyData && (
                        <div className="flex-shrink-0">
                            <DropdownMenu>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7">
                                                    <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                    <span className="sr-only">Tùy chọn</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" align="end"><p>Tùy chọn</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <DropdownMenuContent align="end" className="w-44 sm:w-48">
                                    {onExportIngredients && (
                                        <DropdownMenuItem onClick={handleExportIngredients}>
                                            <ShoppingBasket className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Xuất Nguyên Liệu
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={handleDownloadPdf} disabled={isGeneratingPdf}>
                                        {isGeneratingPdf ? (
                                            <Loader2 className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                                        ) : (
                                            <Download className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                        )} 
                                        {isGeneratingPdf ? "Đang tạo..." : "Tải PDF"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadText} disabled={isGeneratingText}>
                                        {isGeneratingText ? (
                                            <Loader2 className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                                        ) : (
                                            <Download className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                        )} 
                                        {isGeneratingText ? "Đang tạo..." : "Tải TXT"}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                </div>

                <div ref={menuContentRef} id="menu-content-daily" className="bg-background rounded-md w-full">
                    <DayMealsSection 
                        dayData={dailyMenu} 
                        dayKey={null} 
                        onEditItem={onEditItem} 
                        onRemoveItem={onRemoveItem} 
                        onOpenUnderstandMeal={handleOpenUnderstandMeal} 
                    />
                    <div className="mt-3 sm:mt-4 px-0 sm:px-0.5 pb-1">
                        <NutritionChart data={dailyMenu} />
                    </div>
                </div>

                {feedbackRequest && (
                    <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-border/40 px-0 sm:px-0.5">
                        <p className="text-[10px] sm:text-xs text-muted-foreground italic flex items-start gap-1 sm:gap-1.5">
                            <Info size={12} className="mt-px flex-shrink-0 opacity-70"/>
                            <span>{feedbackRequest}</span>
                        </p>
                    </div>
                )}
                <SuggestedPrompts menu={menu} onPromptClick={onPromptClick} />

                <UnderstandMealDialog
                    mealName={selectedMealForUnderstanding ?? ''}
                    open={isUnderstandMealOpen}
                    onOpenChange={setIsUnderstandMealOpen}
                />
            </div>
        );
    }

    // Fallback
    return (
        <div className="w-full p-3 sm:p-4">
            <div className="flex flex-col items-center justify-center p-4 sm:p-6 text-center text-destructive min-h-[120px] sm:min-h-[150px] bg-destructive/10 rounded-lg border border-dashed border-destructive/30">
                <AlertCircle size={24} className="mb-2 sm:mb-3 opacity-50" />
                <p className="text-xs sm:text-sm font-medium">Lỗi hiển thị</p>
                <p className="text-[10px] sm:text-xs mt-1">Loại thực đơn không hợp lệ.</p>
            </div>
        </div>
    );
}
