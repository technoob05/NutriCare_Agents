'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react'; // Added useRef
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf'; // Added jsPDF import
import html2canvas from 'html2canvas'; // Added html2canvas import
// Removed unused Accordion imports
import { Badge } from '@/components/ui/badge';
// Removed unused Separator import
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
    DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import NearbyRestaurantsMap from '@/components/NearbyRestaurantsMap'; // Import the map component
import {
    MoreVertical,
    Image as ImageIcon,
    Edit,
    Trash2,
    ChevronDown,
    ChevronUp,
    UtensilsCrossed, // Dinner
    Cookie,         // Snacks
    Soup,           // Lunch
    Sandwich,       // Breakfast
    // List,        // Replaced by ShoppingBasket for context
    // ClipboardList, // Replaced by ChefHat for context
    Loader2,        // Loading
    Coins,          // Cost
    CalendarDays,   // Daily Menu / Date
    Info,           // General Info
    AlertCircle,    // Error
    ChefHat,        // Preparation Title Icon
    ShoppingBasket, // Ingredients Title Icon
    Download,       // Download Icon
    // X,           // Not used directly
    // Maximize2,   // Not used directly
    // Minimize2,   // Not used directly
    Sparkles,       // Image Generation Icon
    Salad,          // Placeholder Icon
    MapPin,         // Map Icon for nearby search
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Ensure TooltipProvider is imported
import { useIsMobile } from '@/hooks/use-mobile';
import { type DailyMenuData, type WeeklyMenuData, type AnyMenuData, type StepTrace } from '@/ai/flows/generate-menu-from-preferences'; // Added StepTrace
import { cn } from '@/lib/utils';
// +++ Import Chart Components +++
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"; // Assuming these exist

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
    };
    isLoading?: boolean; // Loading state for the whole menu
    onEditItem?: (day: string | null, mealType: string, itemIndex: number) => void;
    onRemoveItem?: (day: string | null, mealType: string, itemIndex: number) => void;
    onExportIngredients?: (markdown: string) => void;
    // No need for a specific PDF export prop, we'll handle it internally
}

// --- Helper Components ---

// +++ Nutrition Chart Component +++
const NutritionChart: React.FC<{ data: DailyMenuData | undefined }> = ({ data }) => {
    if (!data) return null;

    const chartData = useMemo(() => {
        const meals: (keyof DailyMenuData)[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
        return meals.map(mealKey => {
            const totalCalories = data[mealKey]?.reduce((sum, item) => sum + (item.calories ?? 0), 0) ?? 0;
            // Only include meals with calories > 0
            return totalCalories > 0 ? {
                meal: mealKey.charAt(0).toUpperCase() + mealKey.slice(1), // Capitalize (Breakfast, Lunch, etc.)
                calories: totalCalories,
            } : null;
        }).filter(item => item !== null); // Filter out null entries (meals with 0 calories)
    }, [data]);

    // Don't render chart if no valid data points exist
    if (!chartData || chartData.length === 0) {
        return (
             <div className="text-xs text-center text-muted-foreground italic py-4">
                Không đủ dữ liệu dinh dưỡng để vẽ biểu đồ.
            </div>
        );
    }

    const chartConfig = {
        calories: {
            label: "Calo (kcal)",
            color: "hsl(var(--chart-1))",
        },
    } satisfies ChartConfig;

    return (
        <Card className="border-dashed bg-muted/30">
            <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-base font-semibold">Tổng quan Calo Ước tính</CardTitle>
                <CardDescription className="text-xs">Tổng lượng calo ước tính cho mỗi bữa ăn.</CardDescription>
            </CardHeader>
            <CardContent className="pb-4 px-2">
                <ChartContainer config={chartConfig} className="h-[150px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            margin={{ top: 5, right: 5, left: -15, bottom: 0 }} // Adjust margins
                            accessibilityLayer // Improve accessibility
                        >
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis
                                dataKey="meal"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tickFormatter={(value) => value.substring(0, 3)} // Show first 3 letters (Sán, Trư, Tối, Phụ)
                                style={{ fontSize: '10px' }}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickMargin={4}
                                width={45} // Adjust width for labels
                                style={{ fontSize: '10px' }}
                            />
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent hideLabel />} // Simple tooltip
                            />
                            <Bar
                                dataKey="calories"
                                fill="var(--color-calories)"
                                radius={4}
                                barSize={30} // Adjust bar size
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    );
};
// --- End Nutrition Chart Component ---

/**
 * MenuItemCard: Displays a single menu item with enhanced details and interactions.
 */
const MenuItemCard: React.FC<{
    item: MenuItemData;
    itemIndex: number;
    dayKey: string | null;
    mealType: string;
    onEdit?: InteractiveMenuProps['onEditItem'];
    onRemove?: InteractiveMenuProps['onRemoveItem'];
}> = ({ item, itemIndex, dayKey, mealType, onEdit, onRemove }) => {
    const [isPrepExpanded, setIsPrepExpanded] = useState(false);
    const [isIngredientsExpanded, setIsIngredientsExpanded] = useState(false);
    const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
    const [isLoadingImage, setIsLoadingImage] = useState(false);
    const [imageData, setImageData] = useState<string | null>(null);
    const [imageError, setImageError] = useState<string | null>(null);
    const [isMapDialogOpen, setIsMapDialogOpen] = useState(false); // State for map dialog

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        console.log(`Edit item: ${dayKey ?? 'daily'} - ${mealType} - ${itemIndex}`);
        onEdit?.(dayKey, mealType, itemIndex);
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        console.log(`Remove item: ${dayKey ?? 'daily'} - ${mealType} - ${itemIndex}`);
        onRemove?.(dayKey, mealType, itemIndex);
    };

    const handleGenerateImage = useCallback(async () => {
        if (!item.name || isLoadingImage) return;

        setIsLoadingImage(true);
        setImageData(null);
        setImageError(null);
        setIsImageDialogOpen(true);

        console.log(`Requesting image for: ${item.name}`);

        try {
            // Replace with your actual API call
            const response = await fetch('/api/generate-image', { // <<<--- IMPORTANT: Update this endpoint
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dishName: item.name }),
            });

            // await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay

            if (!response.ok) {
                let errorMsg = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || `Failed with status ${response.status}`;
                } catch (e) { /* Ignore parsing error */ }
                throw new Error(errorMsg);
            }

            const data = await response.json();
            if (data.imageData) {
                setImageData(data.imageData);
            } else {
                throw new Error("API did not return valid image data.");
            }
        } catch (error) {
            console.error("Failed to generate image:", error);
            const errorMsg = error instanceof Error ? error.message : "An unknown error occurred.";
            setImageError(`Không thể tạo ảnh: ${errorMsg}`);
        } finally {
            setIsLoadingImage(false);
        }
    }, [item.name, isLoadingImage]);

    const handleDialogChange = (open: boolean) => {
        setIsImageDialogOpen(open);
        // Optional: Reset state on close, maybe with delay
        // if (!open) { setTimeout(() => { setImageData(null); setImageError(null); }, 300); }
    };

    const handleMapDialogChange = (open: boolean) => {
        setIsMapDialogOpen(open);
    };

    const togglePrep = () => setIsPrepExpanded(!isPrepExpanded);
    const toggleIngredients = () => setIsIngredientsExpanded(!isIngredientsExpanded);
    const [isNutritionExpanded, setIsNutritionExpanded] = useState(false);
    const toggleNutrition = () => setIsNutritionExpanded(!isNutritionExpanded);

    const hasNutritionData = item.calories !== undefined || item.protein !== undefined || item.carbs !== undefined || item.fat !== undefined || (item.healthBenefits && item.healthBenefits.length > 0);

    return (
        // TooltipProvider is correctly placed here for tooltips *within* this card
        <TooltipProvider delayDuration={300}>
            <Dialog open={isImageDialogOpen} onOpenChange={handleDialogChange}>
                <motion.div
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="group relative overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm hover:shadow-lg transition-shadow duration-300 ease-in-out"
                >
                    <div className="p-4">
                        <div className="flex justify-between items-start gap-3">
                            <div className="flex-grow overflow-hidden">
                                <h4 className="font-semibold text-base md:text-lg text-foreground mb-1 truncate" title={item.name}>
                                    {item.name}
                                </h4>
                                {item.estimatedCost && (
                                    <Badge
                                        variant="outline"
                                        className="text-xs flex items-center gap-1 px-2 py-0.5 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 font-medium"
                                    >
                                        <Coins size={13} />
                                        {item.estimatedCost}
                                    </Badge>
                                )}
                            </div>
                            <div className="flex-shrink-0">
                                <DropdownMenu>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted/80">
                                                    <MoreVertical className="h-4 w-4" />
                                                    <span className="sr-only">Tùy chọn món ăn</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent side="left"><p>Tùy chọn</p></TooltipContent>
                                    </Tooltip>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem onClick={handleGenerateImage} disabled={isLoadingImage}>
                                            {isLoadingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                                            {imageData ? "Xem/Tạo lại ảnh" : "Tạo ảnh món ăn"}
                                        </DropdownMenuItem>
                                        {/* --- Add Map Button --- */}
                                        <DropdownMenuItem onClick={() => setIsMapDialogOpen(true)}>
                                            <MapPin className="mr-2 h-4 w-4" /> Tìm quán gần đây
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={handleEdit}>
                                            <Edit className="mr-2 h-4 w-4" /> Chỉnh sửa
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleRemove} className="text-red-600 focus:text-red-600 focus:bg-red-100 dark:focus:bg-red-900/50">
                                            <Trash2 className="mr-2 h-4 w-4" /> Xóa món
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {item.ingredients && item.ingredients.length > 0 && (
                            <div className="mt-3">
                                <button onClick={toggleIngredients} className="flex items-center justify-between w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1">
                                    <span className="flex items-center gap-1.5"><ShoppingBasket size={15} /> Nguyên liệu ({item.ingredients.length})</span>
                                    {isIngredientsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                                <AnimatePresence initial={false}>
                                    {isIngredientsExpanded && (
                                        <motion.div
                                            key="ingredients-content" initial="collapsed" animate="open" exit="collapsed"
                                            variants={{ open: { opacity: 1, height: 'auto', marginTop: '8px' }, collapsed: { opacity: 0, height: 0, marginTop: '0px' } }}
                                            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }} className="overflow-hidden"
                                        >
                                            <div className="flex flex-wrap gap-1.5 pt-1 pb-1">
                                                {item.ingredients.map((ing, idx) => <Badge key={idx} variant="secondary" className="text-xs px-2 py-0.5 font-normal">{ing}</Badge>)}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {item.preparation && (
                            <div className="mt-2">
                                <button onClick={togglePrep} className="flex items-center justify-between w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1">
                                    <span className="flex items-center gap-1.5"><ChefHat size={15} /> Cách chế biến</span>
                                    {isPrepExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                                <AnimatePresence initial={false}>
                                    {isPrepExpanded && (
                                        <motion.div
                                            key="prep-content" initial="collapsed" animate="open" exit="collapsed"
                                            variants={{ open: { opacity: 1, height: 'auto', marginTop: '8px' }, collapsed: { opacity: 0, height: 0, marginTop: '0px' } }}
                                            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }} className="overflow-hidden"
                                        >
                                            <p className="text-xs md:text-sm text-muted-foreground whitespace-pre-line leading-relaxed pt-1 pb-1 pl-2 border-l-2 border-primary/30">
                                                {item.preparation}
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* +++ Nutrition Section +++ */}
                        {hasNutritionData && (
                            <div className="mt-2">
                                <button onClick={toggleNutrition} className="flex items-center justify-between w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1">
                                    <span className="flex items-center gap-1.5"><Info size={15} /> Thông tin Dinh dưỡng & Lợi ích</span>
                                    {isNutritionExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                                <AnimatePresence initial={false}>
                                    {isNutritionExpanded && (
                                        <motion.div
                                            key="nutrition-content" initial="collapsed" animate="open" exit="collapsed"
                                            variants={{ open: { opacity: 1, height: 'auto', marginTop: '8px' }, collapsed: { opacity: 0, height: 0, marginTop: '0px' } }}
                                            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }} className="overflow-hidden"
                                        >
                                            <div className="text-xs md:text-sm text-muted-foreground space-y-1.5 pt-1 pb-1 pl-2 border-l-2 border-blue-500/30">
                                                {(item.calories !== undefined || item.protein !== undefined || item.carbs !== undefined || item.fat !== undefined) && (
                                                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                                                        {item.calories !== undefined && <p><strong className="font-medium text-foreground/90">Calo:</strong> {item.calories} kcal</p>}
                                                        {item.protein !== undefined && <p><strong className="font-medium text-foreground/90">Đạm:</strong> {item.protein} g</p>}
                                                        {item.carbs !== undefined && <p><strong className="font-medium text-foreground/90">Carb:</strong> {item.carbs} g</p>}
                                                        {item.fat !== undefined && <p><strong className="font-medium text-foreground/90">Béo:</strong> {item.fat} g</p>}
                                                    </div>
                                                )}
                                                {item.healthBenefits && item.healthBenefits.length > 0 && (
                                                    <div className="pt-1">
                                                        <p className="font-medium text-foreground/90 mb-0.5">Lợi ích:</p>
                                                        <ul className="list-disc list-inside space-y-0.5">
                                                            {item.healthBenefits.map((benefit, idx) => <li key={idx}>{benefit}</li>)}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                        {/* --- End Nutrition Section --- */}

                    </div>
                </motion.div>

                <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <Sparkles size={20} className="text-primary" /> Hình ảnh cho: {item.name}
                        </DialogTitle>
                        <DialogDescription>Xem trước hình ảnh được tạo bởi AI cho món ăn này.</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center items-center min-h-[300px] md:min-h-[400px] bg-muted/40 dark:bg-muted/20 rounded-lg p-4 border border-dashed border-border/50 my-4 relative overflow-hidden">
                        <AnimatePresence mode="wait">
                            {isLoadingImage && (
                                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground text-center bg-background/80 backdrop-blur-sm z-10">
                                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                    <p className="text-base font-medium mt-2">Đang tạo ảnh...</p>
                                    <p className="text-xs">Vui lòng chờ trong giây lát.</p>
                                </motion.div>
                            )}
                            {!isLoadingImage && imageData && (
                                <motion.img key="image" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}
                                    src={`data:image/png;base64,${imageData}`} alt={`Generated image of ${item.name}`}
                                    className="max-w-full max-h-[450px] object-contain rounded-md shadow-md z-0" />
                            )}
                            {!isLoadingImage && imageError && (
                                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 flex items-center justify-center p-4 z-10">
                                    <Alert variant="destructive" className="w-full max-w-md bg-background/90 backdrop-blur-sm">
                                        <AlertCircle className="h-5 w-5" />
                                        <AlertTitle>Lỗi!</AlertTitle>
                                        <AlertDescription className="text-xs">{imageError}</AlertDescription>
                                    </Alert>
                                </motion.div>
                            )}
                            {!isLoadingImage && !imageData && !imageError && (
                                <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="text-center text-muted-foreground p-6">
                                    <ImageIcon size={48} className="mx-auto mb-4 opacity-30" />
                                    <p className="text-sm font-medium">Chưa có hình ảnh</p>
                                    <p className="text-xs mt-1">Nhấn nút "Tạo ảnh" trong menu tùy chọn <MoreVertical size={12} className="inline -mt-0.5"/> để tạo.</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <DialogFooter className="mt-2 flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2 gap-2">
                        <DialogClose asChild>
                            <Button type="button" variant="outline" className="w-full sm:w-auto">Đóng</Button>
                        </DialogClose>
                         <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                            {imageData && !isLoadingImage && (
                                <Button type="button" variant="secondary" onClick={handleGenerateImage} className="w-full sm:w-auto">
                                    <Sparkles size={16} className="mr-2"/> Tạo lại ảnh khác
                                </Button>
                            )}
                            {imageError && !isLoadingImage && (
                                <Button type="button" variant="secondary" onClick={handleGenerateImage} className="w-full sm:w-auto">
                                    <Sparkles size={16} className="mr-2"/> Thử lại
                                </Button>
                            )}
                         </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* --- Nearby Restaurants Map Dialog --- */}
            <Dialog open={isMapDialogOpen} onOpenChange={handleMapDialogChange}>
                <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
                    <DialogHeader className="p-4 border-b">
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <MapPin size={18} className="text-primary" /> Tìm quán ăn gần đây cho: {item.name}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Kết quả từ Google Maps. Vị trí của bạn được dùng để tìm kiếm (nếu được phép).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-grow overflow-y-auto p-4">
                        {/* Ensure API key exists before rendering */}
                        {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                            <NearbyRestaurantsMap
                                keyword={item.name}
                                apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                            />
                        ) : (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Lỗi Cấu Hình</AlertTitle>
                                <AlertDescription>API Key của Google Maps chưa được cấu hình trong biến môi trường (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).</AlertDescription>
                            </Alert>
                        )}
                    </div>
                    <DialogFooter className="p-4 border-t">
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Đóng</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
             {/* --- End Map Dialog --- */}

        </TooltipProvider>
    );
};

/**
 * MealPlaceholder: Component hiển thị khi một bữa ăn chính không có món.
 */
const MealPlaceholder: React.FC<{ mealLabel: string }> = ({ mealLabel }) => {
    return (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground border border-dashed rounded-lg bg-muted/20">
            Chưa có món ăn nào được lên kế hoạch cho {mealLabel.toLowerCase()}.
            {/* Optional: Add a button to add items */}
            {/* <Button variant="ghost" size="sm" className="mt-2 text-primary">Thêm món</Button> */}
        </div>
    );
};


/**
 * DayMealsSection: Organizes meals for a specific day, always showing main meals.
 */
const DayMealsSection: React.FC<{
    dayData: DailyMenuData | undefined;
    dayKey: string | null; // null for daily view
    onEditItem?: InteractiveMenuProps['onEditItem'];
    onRemoveItem?: InteractiveMenuProps['onRemoveItem'];
}> = ({ dayData, dayKey, onEditItem, onRemoveItem }) => {

    // Define ALL potential meal types, including main ones
    const allMealTypes: { key: keyof DailyMenuData; label: string; icon: React.ElementType; isOptional?: boolean }[] = [
        { key: 'breakfast', label: 'Bữa Sáng', icon: Sandwich },
        { key: 'lunch', label: 'Bữa Trưa', icon: Soup },
        { key: 'dinner', label: 'Bữa Tối', icon: UtensilsCrossed },
        { key: 'snacks', label: 'Bữa Phụ / Ăn Vặt', icon: Cookie, isOptional: true }, // Mark snacks as optional
    ];

    // Check if there's *any* data at all for the day
    const hasAnyDataForDay = dayData && Object.values(dayData).some(meal => meal && meal.length > 0);

    // If the entire day has no data (e.g., weekly view, user hasn't planned this day)
    if (!hasAnyDataForDay) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground min-h-[200px] bg-muted/30 rounded-lg border border-dashed">
                <Salad size={40} className="mb-3 opacity-40" />
                <p className="text-sm font-medium">Không có kế hoạch bữa ăn.</p>
                <p className="text-xs mt-1">Chưa có món ăn nào được thêm vào ngày này.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8 p-1">
            {allMealTypes.map(({ key, label, icon: Icon, isOptional }) => {
                const items = dayData?.[key] ?? [];
                const hasItems = items.length > 0;

                // Skip optional meals (like snacks) if they have no items
                if (isOptional && !hasItems) {
                    return null;
                }

                return (
                    <section key={key} className="scroll-mt-16" id={`${dayKey ?? 'daily'}-${key}`}>
                        {/* Sticky Header for the meal type */}
                        <div className="flex items-center gap-3 mb-4 sticky top-0 bg-background/90 backdrop-blur-sm py-2 z-10 -mx-1 px-1 border-b border-border/50">
                            <div className="p-2 bg-primary/10 rounded-full flex-shrink-0">
                                <Icon size={20} className="text-primary" />
                            </div>
                            <h3 className="text-lg md:text-xl font-semibold text-foreground flex-grow truncate pr-2">
                                {label}
                            </h3>
                            {/* Show item count only if there are items */}
                            {hasItems && (
                                <Badge variant="outline" className="ml-auto flex-shrink-0">{items.length} món</Badge>
                            )}
                        </div>

                        {/* Content: Either list of items or placeholder */}
                        <div className="space-y-4 pl-1 pr-1">
                            {hasItems ? (
                                items.map((item, itemIdx) => (
                                    <MenuItemCard
                                        key={`${key}-${itemIdx}-${item.name}`}
                                        item={item}
                                        itemIndex={itemIdx}
                                        dayKey={dayKey}
                                        mealType={key}
                                        onEdit={onEditItem}
                                        onRemove={onRemoveItem}
                                    />
                                ))
                            ) : (
                                // Show placeholder only for non-optional meals that are empty
                                <MealPlaceholder mealLabel={label} />
                            )}
                        </div>
                    </section>
                );
            })}
        </div>
    );
};

// --- Main Component ---
const daysOfWeek: (keyof WeeklyMenuData)[] = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
];
const dayTranslations: Record<string, string> = {
    "Monday": "Thứ Hai",
    "Tuesday": "Thứ Ba",
    "Wednesday": "Thứ Tư",
    "Thursday": "Thứ Năm",
    "Friday": "Thứ Sáu",
    "Saturday": "Thứ Bảy",
    "Sunday": "Chủ Nhật",
};

/**
 * InteractiveMenu: The main component to display daily or weekly menus.
 */
export function InteractiveMenu({ menuData, isLoading, onEditItem, onRemoveItem, onExportIngredients }: InteractiveMenuProps) {
    const { menu, menuType, feedbackRequest } = menuData;
    const isMobile = useIsMobile(); // Hook to detect mobile viewport
    const menuContentRef = useRef<HTMLDivElement>(null); // Ref for the content area to capture
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false); // State for PDF generation loading
    const [isGeneratingText, setIsGeneratingText] = useState(false); // State for Text generation loading

    // --- State for Active Tab (Weekly View) ---
    const [activeTab, setActiveTab] = useState<string | undefined>(undefined);

    // Calculate max scroll height dynamically and responsively
    const scrollMaxHeight = useMemo(() => {
        if (typeof window === 'undefined') return 450; // Default for SSR

        const headerHeight = 60; // Estimated height of your site header
        const footerHeight = feedbackRequest ? 70 : 30; // Estimated height of feedback/footer area
        const tabsHeight = menuType === 'weekly' ? 55 : 0; // Approx height of TabsList + margin
        const cardHeaderHeight = menuType === 'daily' ? 65 : 0; // Approx height of Daily CardHeader + margin
        const pagePaddingY = 40; // Vertical padding on the page containing this component
        const buffer = 20; // Extra buffer space

        const availableHeight = window.innerHeight - headerHeight - footerHeight - tabsHeight - cardHeaderHeight - pagePaddingY - buffer;

        return Math.max(300, availableHeight); // Ensure a minimum height
    }, [menuType, feedbackRequest, isMobile]); // Recalculate on these changes

    // --- Helper Function for Ingredient Export ---
    const handleExportIngredients = useCallback(() => {
        if (!menu || !onExportIngredients) return;

        let allIngredients: string[] = [];

        if (menuType === 'daily') {
            const dailyMenu = menu as DailyMenuData;
            Object.values(dailyMenu).forEach(mealItems => {
                mealItems?.forEach(item => {
                    if (item.ingredients) {
                        allIngredients.push(...item.ingredients);
                    }
                });
            });
        } else if (menuType === 'weekly') {
            const weeklyMenu = menu as WeeklyMenuData;
            daysOfWeek.forEach(day => {
                const dayData = weeklyMenu[day];
                if (dayData) {
                    Object.values(dayData).forEach(mealItems => {
                        mealItems?.forEach(item => {
                            if (item.ingredients) {
                                allIngredients.push(...item.ingredients);
                            }
                        });
                    });
                }
            });
        }

        // Get unique ingredients and sort them
        const uniqueIngredients = [...new Set(allIngredients)].sort((a, b) => a.localeCompare(b));

        // Format as Markdown checklist
        const markdown = uniqueIngredients.length > 0
            ? `# Danh sách Nguyên liệu (${menuType === 'weekly' ? 'Tuần' : 'Hôm nay'})\n\n${uniqueIngredients.map(ing => `- [ ] ${ing}`).join('\n')}`
            : `# Danh sách Nguyên liệu (${menuType === 'weekly' ? 'Tuần' : 'Hôm nay'})\n\n(Không có nguyên liệu nào được liệt kê)`;

        onExportIngredients(markdown);
    }, [onExportIngredients, menuType, menu]); // Added menu and menuType dependencies

    // --- PDF Download Handler ---
    const handleDownloadPdf = useCallback(async () => {
        const elementToCapture = menuContentRef.current; // Use the ref
        if (!elementToCapture || isGeneratingPdf) return;

        setIsGeneratingPdf(true);
        console.log("Starting PDF generation...");

        try {
            // Ensure styles are applied before capturing
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for rendering

            const canvas = await html2canvas(elementToCapture, {
                scale: 2, // Increase resolution
                useCORS: true, // If you have external images
                logging: false, // Reduce console noise
                // Allow elements to break across pages (experimental, might not work perfectly)
                // windowHeight: elementToCapture.scrollHeight,
                // scrollY: -window.scrollY, // Adjust for current scroll position
                backgroundColor: '#ffffff', // Set background to white for PDF
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px', // Use pixels for easier mapping from canvas
                format: [canvas.width, canvas.height] // Set PDF size based on canvas size
                // format: 'a4' // Or use a standard format like A4
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            // Check if image height exceeds PDF page height
            if (canvas.height > pdfHeight) {
                 // Simple multi-page handling (split image by page height)
                let position = 0;
                let pageHeight = pdfHeight; // Use the calculated page height in pixels
                let remainingHeight = canvas.height;

                while (remainingHeight > 0) {
                    // Calculate the height of the slice for the current page
                    const sliceHeight = Math.min(pageHeight, remainingHeight);

                    // Create a temporary canvas for the slice
                    const sliceCanvas = document.createElement('canvas');
                    sliceCanvas.width = canvas.width;
                    sliceCanvas.height = sliceHeight;
                    const sliceCtx = sliceCanvas.getContext('2d');

                    // Draw the slice from the original canvas
                    sliceCtx?.drawImage(canvas, 0, position, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

                    // Add the slice image to the PDF
                    const sliceImgData = sliceCanvas.toDataURL('image/png');
                    pdf.addImage(sliceImgData, 'PNG', 0, 0, pdfWidth, sliceHeight); // Use sliceHeight

                    remainingHeight -= sliceHeight;
                    position += sliceHeight;

                    // Add a new page if there's more content
                    if (remainingHeight > 0) {
                        pdf.addPage();
                    }
                }

            } else {
                 // Single page
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            }


            pdf.save(`thuc-don-${menuType}-${activeTab ?? 'hom-nay'}.pdf`); // Dynamic filename
            console.log("PDF generated successfully.");

        } catch (error) {
            console.error("Error generating PDF:", error);
            // Optionally show an error message to the user
            alert("Đã xảy ra lỗi khi tạo file PDF. Vui lòng thử lại.");
        } finally {
            setIsGeneratingPdf(false);
        }
    }, [isGeneratingPdf, menuType, activeTab]); // Dependencies for the PDF handler

    // --- Text Download Handler ---
    const handleDownloadText = useCallback(() => {
        if (!menu || isGeneratingText) return;

        setIsGeneratingText(true);
        console.log("Starting Text file generation...");

        let menuText = "";

        const formatItem = (item: MenuItemData, indent = "  ") => {
            let text = `${indent}- ${item.name}\n`;
            if (item.estimatedCost) text += `${indent}  * Chi phí ước tính: ${item.estimatedCost}\n`;
            if (item.calories !== undefined) text += `${indent}  * Calo: ${item.calories} kcal\n`;
            if (item.protein !== undefined) text += `${indent}  * Đạm: ${item.protein} g\n`;
            if (item.carbs !== undefined) text += `${indent}  * Carb: ${item.carbs} g\n`;
            if (item.fat !== undefined) text += `${indent}  * Béo: ${item.fat} g\n`;
            if (item.ingredients && item.ingredients.length > 0) {
                text += `${indent}  * Nguyên liệu:\n`;
                item.ingredients.forEach(ing => text += `${indent}    - ${ing}\n`);
            }
            if (item.preparation) {
                text += `${indent}  * Cách chế biến:\n${indent}    ${item.preparation.replace(/\n/g, `\n${indent}    `)}\n`; // Indent multi-line prep
            }
             if (item.healthBenefits && item.healthBenefits.length > 0) {
                text += `${indent}  * Lợi ích:\n`;
                item.healthBenefits.forEach(benefit => text += `${indent}    - ${benefit}\n`);
            }
            return text + "\n"; // Add space after item
        };

        const formatMeal = (mealKey: keyof DailyMenuData, mealData: MenuItemData[] | undefined, indent = "") => {
            if (!mealData || mealData.length === 0) return "";
            const mealLabels: Record<string, string> = {
                breakfast: "Bữa Sáng", lunch: "Bữa Trưa", dinner: "Bữa Tối", snacks: "Bữa Phụ / Ăn Vặt"
            };
            let text = `${indent}--- ${mealLabels[mealKey]} ---\n\n`;
            mealData.forEach(item => text += formatItem(item, indent + "  "));
            return text;
        };

        if (menuType === 'daily') {
            const dailyMenu = menu as DailyMenuData;
            menuText += "===========================\n";
            menuText += "    THỰC ĐƠN HÔM NAY\n";
            menuText += "===========================\n\n";
            menuText += formatMeal('breakfast', dailyMenu.breakfast);
            menuText += formatMeal('lunch', dailyMenu.lunch);
            menuText += formatMeal('dinner', dailyMenu.dinner);
            menuText += formatMeal('snacks', dailyMenu.snacks);
        } else if (menuType === 'weekly') {
            const weeklyMenu = menu as WeeklyMenuData;
            menuText += "===========================\n";
            menuText += "     THỰC ĐƠN TUẦN\n";
            menuText += "===========================\n\n";
            daysOfWeek.forEach(day => {
                const dayData = weeklyMenu[day];
                if (dayData && Object.values(dayData).some(m => m && m.length > 0)) {
                    menuText += `=== ${dayTranslations[day] || day} ===\n\n`;
                    menuText += formatMeal('breakfast', dayData.breakfast, "  ");
                    menuText += formatMeal('lunch', dayData.lunch, "  ");
                    menuText += formatMeal('dinner', dayData.dinner, "  ");
                    menuText += formatMeal('snacks', dayData.snacks, "  ");
                    menuText += "\n"; // Add space between days
                }
            });
        }

        try {
            const blob = new Blob([menuText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `thuc-don-${menuType}-${activeTab ?? 'hom-nay'}.txt`; // Dynamic filename
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            console.log("Text file generated successfully.");
        } catch (error) {
            console.error("Error generating text file:", error);
            alert("Đã xảy ra lỗi khi tạo file văn bản. Vui lòng thử lại.");
        } finally {
            setIsGeneratingText(false);
        }

    }, [menu, menuType, activeTab, isGeneratingText]); // Dependencies for the text handler


    // --- Loading State ---
    if (isLoading) {
        return (
            <Card className="w-full shadow-none border-none bg-transparent">
                <CardHeader className="px-1 pt-1 pb-3">
                     {/* Skeleton differs slightly based on view type */}
                     {menuType === 'weekly' ? (
                         <div className="flex space-x-2 pb-2 border-b border-border/50">
                            {[...Array(isMobile ? 4 : 7)].map((_, i) => <Skeleton key={i} className="h-9 w-16 rounded-md" />)}
                        </div>
                     ) : (
                         <div className="flex items-center gap-3 pb-4 border-b border-border/50">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-6 w-40" />
                        </div>
                     )}
                </CardHeader>
                <CardContent className="pt-4 space-y-6 px-1">
                    {/* Skeleton for Meal Sections */}
                    {[...Array(2)].map((_, i) => ( // Show 2 placeholder meal sections
                         <div key={i} className="space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <Skeleton className="h-5 w-1/4" />
                            </div>
                            <Skeleton className="h-24 w-full rounded-lg" />
                            <Skeleton className="h-24 w-full rounded-lg" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    // --- Empty State (No Menu Data Provided) ---
    // Also check if the export function is provided before showing the empty state with the button
    if (!menu || Object.keys(menu).length === 0) {
        return (
            <Card className="w-full shadow-none border-none bg-transparent">
                <CardContent className="pt-10">
                    <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground min-h-[250px] bg-muted/30 rounded-lg border border-dashed">
                        <Info size={40} className="mb-4 opacity-40" />
                        <p className="text-base font-semibold">Không có dữ liệu thực đơn</p>
                        <p className="text-sm mt-1">Không tìm thấy thông tin thực đơn để hiển thị.</p>
                        {feedbackRequest && <p className="mt-5 text-xs italic border-t pt-3 w-full max-w-md">{feedbackRequest}</p>}
                    </div>
                </CardContent>
            </Card>
        );
    }

    // --- Weekly Menu View ---
    if (menuType === 'weekly') {
        const weeklyMenu = menu as WeeklyMenuData;
        // Check if *any* day in the week has *any* meal planned
        const hasAnyWeeklyData = daysOfWeek.some(day => {
            const dayData = weeklyMenu[day];
            return dayData && Object.values(dayData).some(meal => meal && meal.length > 0);
        });

        // Empty state specifically for weekly view if no meals are planned for the whole week
        if (!hasAnyWeeklyData) {
            return (
                 <Card className="w-full shadow-none border-none bg-transparent">
                    <CardContent className="pt-10">
                        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground min-h-[250px] bg-muted/30 rounded-lg border border-dashed">
                            <CalendarDays size={40} className="mb-4 opacity-40" />
                            <p className="text-base font-semibold">Thực đơn tuần trống</p>
                            <p className="text-sm mt-1">Chưa có món ăn nào được tạo cho tuần này.</p>
                            {feedbackRequest && <p className="mt-5 text-xs italic border-t pt-3 w-full max-w-md">{feedbackRequest}</p>}
                        </div>
                    </CardContent>
                </Card>
            );
        }

        // Find the first day with data to set as default active tab
        const defaultActiveTab = daysOfWeek.find(day => {
            const dayData = weeklyMenu[day];
            return dayData && Object.values(dayData).some(meal => meal && meal.length > 0);
        }) || daysOfWeek[0]; // Default to Monday if somehow all are empty (though covered by hasAnyWeeklyData)

        // Initialize activeTab state *only once* when the component mounts or defaultActiveTab changes
        // We use useEffect for this side effect to avoid calling useState initializer incorrectly
        React.useEffect(() => {
            if (menuType === 'weekly' && defaultActiveTab && !activeTab) {
                setActiveTab(defaultActiveTab);
            }
            // Reset activeTab if menuType changes or menu becomes null
            if (menuType !== 'weekly' || !menu) {
                 setActiveTab(undefined);
            }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [defaultActiveTab, menuType, menu]); // Dependencies for initialization


        // Render Weekly View
        return (
            <div className="w-full">
                 {/* --- Menu Actions Dropdown (Corrected JSX) --- */}
                 {onExportIngredients && hasAnyWeeklyData && ( // Only show if handler is provided AND there's data
                    <div className="flex justify-end mb-3 -mt-1">
                        <DropdownMenu>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" className="text-xs">
                                                <MoreVertical className="h-4 w-4 mr-1.5 -ml-0.5" />
                                                Tùy chọn Thực đơn Tuần
                                            </Button>
                                        </DropdownMenuTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" align="end"><p>Các hành động cho thực đơn tuần này</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuItem onClick={handleExportIngredients}>
                                        <ShoppingBasket className="mr-2 h-4 w-4" /> Xuất Nguyên Liệu (Checklist)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadPdf} disabled={isGeneratingPdf}>
                                        {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                        {isGeneratingPdf ? "Đang tạo PDF..." : "Tải Thực Đơn (PDF)"}
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onClick={handleDownloadText} disabled={isGeneratingText}>
                                        {isGeneratingText ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                        {isGeneratingText ? "Đang tạo Văn bản..." : "Tải Thực Đơn (Văn bản)"}
                                    </DropdownMenuItem>
                                    {/* Add other actions like Save Menu later */}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                 )}

                {/* ================================================== */}
                {/* SỬA LỖI: Thêm TooltipProvider bao bọc Tabs       */}
                {/* ================================================== */}
                <TooltipProvider>
                    {/* Use controlled Tabs component with onValueChange */}
                    <Tabs
                        value={activeTab} // Control the active tab via state
                        onValueChange={setActiveTab} // Update state on change
                        // defaultValue={defaultActiveTab} // defaultValue is not needed for controlled component
                        className="w-full"
                    >
                        {/* Responsive TabsList with ScrollArea */}
                        <div className="relative mb-4"> {/* Increased margin-bottom */}
                            <ScrollArea className="w-full pb-2 -mx-1 px-1">
                                <TabsList className="inline-flex h-auto p-1 bg-muted rounded-lg gap-1 w-max">
                                    {daysOfWeek.map(day => {
                                        const dayHasData = weeklyMenu[day] && Object.values(weeklyMenu[day]!).some(m => m && m.length > 0);
                                        const dayLabel = dayTranslations[day] || day;
                                        // Use shorter label on mobile
                                        const displayLabel = isMobile ? dayLabel.substring(0, 3) : dayLabel;

                                        return (
                                            // Tooltip này bây giờ nằm trong TooltipProvider
                                            <Tooltip key={day} delayDuration={isMobile ? 1000 : 300}> {/* Longer delay on mobile */}
                                                <TooltipTrigger asChild>
                                                    <TabsTrigger
                                                        value={day}
                                                        disabled={!dayHasData}
                                                        className={cn(
                                                            "px-3 py-1.5 text-xs sm:text-sm rounded-md transition-all duration-200",
                                                            // --- Standard Active State ---
                                                            "data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:font-semibold", // Reverted to background bg, primary text, semibold
                                                            // --- Inactive State ---
                                                            "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted-foreground/10 data-[state=inactive]:hover:text-foreground",
                                                            // --- Disabled State ---
                                                            "data-[disabled]:opacity-40 data-[disabled]:pointer-events-none"
                                                        )}
                                                    >
                                                        {displayLabel}
                                                    </TabsTrigger>
                                                </TooltipTrigger>
                                                {/* Show full name in tooltip, especially useful on mobile */}
                                                <TooltipContent><p>{dayLabel}</p></TooltipContent>
                                            </Tooltip>
                                        );
                                    })}
                                </TabsList>
                            </ScrollArea>
                            {/* Subtle bottom border */}
                            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-border/50 to-transparent"></div>
                        </div>

                        {/* Container for the content to be captured by html2canvas */}
                        <div ref={menuContentRef} id="menu-content" className="bg-background"> {/* Added ref and id, ensure background */}
                            {/* Render ONLY the TabsContent for the activeTab */}
                            {/* <AnimatePresence mode="wait"> */}
                                {daysOfWeek
                                    .filter(day => day === activeTab) // Filter to render only the active tab's content
                                    .map(day => {
                                    // Check if the specific day (which is the activeTab) has data
                                    const dayHasData = weeklyMenu[day] && Object.values(weeklyMenu[day]!).some(m => m && m.length > 0);

                                // Render only if it's the active tab AND has data
                                return dayHasData ? (
                                    <TabsContent
                                        key={day}
                                        value={day} // Value still needed for matching
                                        // forceMount // Removed forceMount
                                        className="mt-1 focus-visible:ring-0 focus-visible:ring-offset-0" // Added mt-1 back
                                    >
                                        {/* Removed motion.div wrapper */}
                                        <Card className="border-none shadow-none bg-transparent">
                                            <CardContent className="p-0">
                                                {/* ScrollArea added back inside each TabsContent */}
                                                <ScrollArea
                                                    style={{ height: `${scrollMaxHeight}px` }}
                                                    className="pr-3 -mr-3" // Padding for scrollbar
                                                >
                                                    <DayMealsSection
                                                        dayData={weeklyMenu[day]}
                                                        dayKey={day}
                                                        onEditItem={onEditItem}
                                                        onRemoveItem={onRemoveItem}
                                                    />
                                                </ScrollArea>
                                            </CardContent>
                                        </Card>
                                        {/* Removed motion.div wrapper */}
                                    </TabsContent>
                                    ) : null; // Fallback if active tab somehow has no data (shouldn't happen)
                                })}
                            {/* </AnimatePresence> */}
                        </div> {/* End of menu-content div */}
                    </Tabs>
                </TooltipProvider>
                {/* ================================================== */}
                {/* KẾT THÚC SỬA LỖI                                 */}
                {/* ================================================== */}

                {/* Feedback Request Area */}
                {feedbackRequest && (
                    <div className="mt-6 pt-4 border-t border-border/50 px-1">
                        <p className="text-sm text-muted-foreground italic flex items-start gap-2">
                            <Info size={16} className="mt-0.5 flex-shrink-0 opacity-80"/>
                            <span>{feedbackRequest}</span>
                        </p>
                    </div>
                )}
            </div>
        );
    }

    // --- Daily Menu View ---
    if (menuType === 'daily') {
        const dailyMenu = menu as DailyMenuData;
        // Check if any meal in the daily menu has items - Moved definition earlier
        const hasAnyDailyData = Object.values(dailyMenu).some(meal => meal && meal.length > 0);

        // Empty state specifically for daily view
        if (!hasAnyDailyData) {
            return (
                <Card className="w-full shadow-none border-none bg-transparent">
                    <CardContent className="pt-10">
                        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground min-h-[250px] bg-muted/30 rounded-lg border border-dashed">
                            <CalendarDays size={40} className="mb-4 opacity-40" />
                            <p className="text-base font-semibold">Thực đơn hôm nay trống</p>
                            <p className="text-sm mt-1">Chưa có món ăn nào được tạo cho hôm nay.</p>
                            {feedbackRequest && <p className="mt-5 text-xs italic border-t pt-3 w-full max-w-md">{feedbackRequest}</p>}
                        </div>
                    </CardContent>
                </Card>
            );
        }

        // Render Daily View
        return (
            <div className="w-full">
                <Card className="border-none shadow-none bg-transparent">
                    {/* Daily View Header & Actions */}
                    <CardHeader className="pb-4 pt-1 px-1 mb-2 border-b border-border/50 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                            <CalendarDays size={24} className="text-primary flex-shrink-0" />
                            <CardTitle className="text-xl md:text-2xl font-bold text-foreground truncate">
                                Thực Đơn Hôm Nay
                            </CardTitle>
                            {/* Optional: Add today's date */}
                            {/* <CardDescription>Thứ Ba, ngày 28 tháng 5</CardDescription> */}
                        </div>
                         {/* --- Menu Actions Dropdown (Corrected JSX) --- */}
                         {onExportIngredients && hasAnyDailyData && ( // Use hasAnyDailyData here
                            <div className="flex-shrink-0 ml-2">
                                <DropdownMenu>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted/80">
                                                        <MoreVertical className="h-4 w-4" />
                                                        <span className="sr-only">Tùy chọn Thực đơn Hôm nay</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" align="end"><p>Tùy chọn</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuItem onClick={handleExportIngredients}>
                                        <ShoppingBasket className="mr-2 h-4 w-4" /> Xuất Nguyên Liệu (Checklist)
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onClick={handleDownloadPdf} disabled={isGeneratingPdf}>
                                        {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                        {isGeneratingPdf ? "Đang tạo PDF..." : "Tải Thực Đơn (PDF)"}
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onClick={handleDownloadText} disabled={isGeneratingText}>
                                        {isGeneratingText ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                        {isGeneratingText ? "Đang tạo Văn bản..." : "Tải Thực Đơn (Văn bản)"}
                                    </DropdownMenuItem>
                                    {/* Add other actions like Save Menu later */}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                         )}
                    </CardHeader>
                    {/* Container for the content to be captured by html2canvas */}
                    <div ref={menuContentRef} id="menu-content" className="bg-background"> {/* Added ref and id, ensure background */}
                        {/* Make CardContent a flex container and apply calculated height */}
                        <CardContent className="p-0 flex flex-col" style={{ height: `${scrollMaxHeight}px` }}>
                            {/* Allow ScrollArea to grow and shrink */}
                            <ScrollArea
                                // Remove fixed height style from here
                                className="pr-3 -mr-3 flex-grow" // Add flex-grow
                            >
                                <DayMealsSection
                                    dayData={dailyMenu}
                                    dayKey={null} // Indicate it's the daily view
                                    onEditItem={onEditItem}
                                    onRemoveItem={onRemoveItem}
                                />
                            </ScrollArea>
                            {/* Nutrition Chart (should not grow or shrink) */}
                            <div className="mt-6 px-1 flex-shrink-0"> {/* Add flex-shrink-0 */}
                                <NutritionChart data={dailyMenu} />
                            </div>
                        </CardContent>
                    </div> {/* End of menu-content div */}
                </Card>

                {/* Feedback Request Area */}
                {feedbackRequest && (
                    <div className="mt-6 pt-4 border-t border-border/50 px-1">
                        <p className="text-sm text-muted-foreground italic flex items-start gap-2">
                            <Info size={16} className="mt-0.5 flex-shrink-0 opacity-80"/>
                            <span>{feedbackRequest}</span>
                        </p>
                    </div>
                    )}
                </div>
            );
    }

    // Fallback case - should ideally not be reached with current types
    return (
        <Card className="w-full shadow-none border-none bg-transparent">
            <CardContent className="pt-10">
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground min-h-[250px] bg-muted/30 rounded-lg border border-dashed">
                    <AlertCircle size={40} className="mb-4 opacity-40 text-destructive" />
                    <p className="text-base font-semibold">Lỗi hiển thị</p>
                    <p className="text-sm mt-1">Loại thực đơn không hợp lệ.</p>
                </div>
            </CardContent>
        </Card>
    );
}
