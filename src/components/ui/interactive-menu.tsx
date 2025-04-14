'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area"; // Keep for TabsList
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
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import NearbyRestaurantsMap from '@/components/NearbyRestaurantsMap';
import { // Restore the lucide-react import structure
    MoreVertical, Image as ImageIcon, Edit, Trash2, ChevronDown, ChevronUp,
    UtensilsCrossed, Cookie, Soup, Sandwich, Loader2, Coins, CalendarDays, Info,
    AlertCircle, ChefHat, ShoppingBasket, Download, Sparkles, Salad, MapPin,
    MessageSquareQuote,
} from 'lucide-react';
import { // Ensure DropdownMenu imports are correct
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
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
        trace?: StepTrace[]; // Correct trace type to array
    };
    isLoading?: boolean;
    onEditItem?: (day: string | null, mealType: string, itemIndex: number) => void;
    onRemoveItem?: (day: string | null, mealType: string, itemIndex: number) => void;
    onExportIngredients?: (markdown: string) => void;
    onPromptClick?: (prompt: string) => void; // Add prop for prompt clicks
    // Add other props as needed
}


// --- Helper Components ---

// Nutrition Chart Component (Unchanged)
const NutritionChart: React.FC<{ data: DailyMenuData | undefined }> = ({ data }) => {
    // ... (code y hệt như trong câu hỏi) ...
     if (!data) return null;

    const chartData = useMemo(() => {
        const meals: (keyof DailyMenuData)[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
        return meals.map(mealKey => {
            const totalCalories = data[mealKey]?.reduce((sum, item) => sum + (item.calories ?? 0), 0) ?? 0;
            return totalCalories > 0 ? {
                meal: mealKey.charAt(0).toUpperCase() + mealKey.slice(1),
                calories: totalCalories,
            } : null;
        }).filter(item => item !== null) as { meal: string; calories: number }[]; // Added type assertion
    }, [data]);

    if (!chartData || chartData.length === 0) {
        return (
             <div className="text-xs text-center text-muted-foreground italic py-4">
                Không đủ dữ liệu dinh dưỡng để vẽ biểu đồ.
            </div>
        );
    }

    const chartConfig = {
        calories: { label: "Calo (kcal)", color: "hsl(var(--chart-1))" },
    } satisfies ChartConfig;

    return (
        <Card className="border-dashed bg-muted/30">
            <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-base font-semibold">Tổng quan Calo Ước tính</CardTitle>
                <CardDescription className="text-xs">Tổng lượng calo ước tính cho mỗi bữa ăn.</CardDescription>
            </CardHeader>
            <CardContent className="pb-4 px-2">
                <ChartContainer config={chartConfig} className="w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        {/* Adjusted margin, removed fixed YAxis width */}
                        <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }} accessibilityLayer>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="meal" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => value.substring(0, 3)} style={{ fontSize: '10px' }} />
                            <YAxis tickLine={false} axisLine={false} tickMargin={4} style={{ fontSize: '10px' }} />
                            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                            {/* Removed fixed barSize */}
                            <Bar dataKey="calories" fill="var(--color-calories)" radius={4} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    );
};

// MenuItemCard Component (Unchanged except minor Dialog content/footer structure)
const MenuItemCard: React.FC<{
    item: MenuItemData;
    itemIndex: number;
    dayKey: string | null;
    mealType: string;
    onEdit?: InteractiveMenuProps['onEditItem'];
    onRemove?: InteractiveMenuProps['onRemoveItem'];
}> = ({ item, itemIndex, dayKey, mealType, onEdit, onRemove }) => {
    // ... (state declarations - unchanged) ...
    const [isPrepExpanded, setIsPrepExpanded] = useState(false);
    const [isIngredientsExpanded, setIsIngredientsExpanded] = useState(false);
    const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
    const [isLoadingImage, setIsLoadingImage] = useState(false);
    const [imageData, setImageData] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);
    const [isMapDialogOpen, setIsMapDialogOpen] = useState(false);
    const [isEditImageDialogOpen, setIsEditImageDialogOpen] = useState(false);
    const [editPrompt, setEditPrompt] = useState<string>('');
    const [isEditingImage, setIsEditingImage] = useState(false);
    const [isNutritionExpanded, setIsNutritionExpanded] = useState(false);
    const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false); // State for enhancing prompt
    const [enhanceError, setEnhanceError] = useState<string | null>(null); // State for enhancement errors

    // ... (handlers - unchanged) ...
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
                body: JSON.stringify({ dishName: item.name }),
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (data.imageData) setImageData(data.imageData);
            else throw new Error("API did not return valid image data.");
        } catch (error) {
            console.error("Failed to generate image:", error);
            setImageError(true);
        } finally {
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
                body: JSON.stringify({
                    imageData: imageData,
                    editPrompt: editPrompt,
                }),
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            if (data.imageData) {
                setImageData(data.imageData);
                setIsEditImageDialogOpen(false);
            } else {
                throw new Error("API did not return valid image data.");
            }
        } catch (error) {
            console.error("Failed to edit image:", error);
            setImageError(true);
        } finally {
            setIsEditingImage(false);
        }
    }, [imageData, editPrompt, isEditingImage]);

    // Handler for enhancing the prompt
    const handleEnhancePrompt = useCallback(async () => {
        if (!editPrompt || isEnhancingPrompt) return;

        setIsEnhancingPrompt(true);
        setEnhanceError(null); // Clear previous errors
        setImageError(false); // Also clear image errors

        try {
            const response = await fetch('/api/enhance-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: editPrompt }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.enhancedPrompt) {
                setEditPrompt(data.enhancedPrompt); // Update the textarea with the enhanced prompt
            } else {
                throw new Error("API did not return an enhanced prompt.");
            }
        } catch (error: any) {
            console.error("Failed to enhance prompt:", error);
            setEnhanceError(error.message || "Không thể cải thiện gợi ý.");
            // Optionally clear the image error if enhance fails, or keep it if relevant
            // setImageError(true);
        } finally {
            setIsEnhancingPrompt(false);
        }
    }, [editPrompt, isEnhancingPrompt]);


    const hasNutritionData = item.calories !== undefined || item.protein !== undefined || item.carbs !== undefined || item.fat !== undefined || (item.healthBenefits && item.healthBenefits.length > 0);

    return (
        <TooltipProvider delayDuration={300}>
            {/* Image Dialog */}
            <Dialog open={isImageDialogOpen} onOpenChange={handleDialogChange}>
                <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <Sparkles size={20} className="text-primary" /> Hình ảnh cho: {item.name}
                        </DialogTitle>
                        <DialogDescription>Xem trước hình ảnh được tạo bởi AI cho món ăn này.</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center items-center min-h-[300px] md:min-h-[400px] bg-muted/40 dark:bg-muted/20 rounded-lg p-4 border border-dashed border-border/50 my-4 relative overflow-hidden">
                    
                        <AnimatePresence mode="wait">
                            {isLoadingImage && ( <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground text-center bg-background/80 backdrop-blur-sm z-10"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="text-base font-medium mt-2">Đang tạo ảnh...</p><p className="text-xs">Vui lòng chờ trong giây lát.</p></motion.div> )}
                            {!isLoadingImage && imageData && ( <motion.img key="image" src={`data:image/png;base64,${imageData}`} alt={`Generated image of ${item.name}`} className="max-w-full max-h-[450px] object-contain rounded-md shadow-md z-0" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} /> )}
                            {!isLoadingImage && imageError && ( <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center p-4 z-10"><Alert variant="destructive" className="w-full max-w-md bg-background/90 backdrop-blur-sm"><AlertCircle className="h-5 w-5" /><AlertTitle>Lỗi!</AlertTitle><AlertDescription className="text-xs">{imageError}</AlertDescription></Alert></motion.div> )}
                            {!isLoadingImage && !imageData && !imageError && ( <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-muted-foreground p-6"><ImageIcon size={48} className="mx-auto mb-4 opacity-30" /><p className="text-sm font-medium">Chưa có hình ảnh</p><p className="text-xs mt-1">Nhấn nút "Tạo ảnh" trong menu tùy chọn <MoreVertical size={12} className="inline -mt-0.5"/> để tạo.</p></motion.div> )}
                        </AnimatePresence>
                    </div>
                    <DialogFooter className="mt-2 flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2 gap-2">
                        <DialogClose asChild><Button type="button" variant="outline" className="w-full sm:w-auto">Đóng</Button></DialogClose>
                        {/* Group generate buttons together */}
                        <div className="flex flex-col sm:flex-row sm:justify-end gap-2 w-full sm:w-auto">
                            {imageData && !isLoadingImage && (
                                <Button type="button" variant="secondary" onClick={handleGenerateImage} className="w-full sm:w-auto">
                                    <Sparkles size={16} className="mr-2" /> Tạo lại ảnh khác
                                </Button>
                            )}
                            {imageData && !isLoadingImage && (
                                <Button type="button" variant="secondary" onClick={handleEditImage} className="w-full sm:w-auto">
                                    <Edit size={16} className="mr-2" /> Chỉnh sửa ảnh
                                </Button>
                            )}
                            {imageError && !isLoadingImage && (
                                <Button type="button" variant="secondary" onClick={handleGenerateImage} className="w-full sm:w-auto">
                                    <Sparkles size={16} className="mr-2" /> Thử lại
                                </Button>
                            )}
                            {!imageData && !imageError && !isLoadingImage && (
                                <Button type="button" variant="default" onClick={handleGenerateImage} className="w-full sm:w-auto">
                                    <Sparkles size={16} className="mr-2" /> Tạo ảnh lần đầu
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Image Dialog */}
            <Dialog open={isEditImageDialogOpen} onOpenChange={setIsEditImageDialogOpen}>
                <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <Edit size={20} className="text-primary" /> Chỉnh sửa ảnh: {item.name}
                        </DialogTitle>
                        <DialogDescription>Nhập mô tả để chỉnh sửa ảnh hiện tại.</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center items-center min-h-[300px] md:min-h-[400px] bg-muted/40 dark:bg-muted/20 rounded-lg p-4 border border-dashed border-border/50 my-4 relative overflow-hidden">
                        <AnimatePresence mode="wait">
                            {isEditingImage && (
                                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground text-center bg-background/80 backdrop-blur-sm z-10">
                                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                    <p className="text-base font-medium mt-2">Đang chỉnh sửa ảnh...</p>
                                    <p className="text-xs">Vui lòng chờ trong giây lát.</p>
                                </motion.div>
                            )}
                            {!isEditingImage && imageData && (
                                <motion.img key="image" src={`data:image/png;base64,${imageData}`} alt={`Generated image of ${item.name}`} className="max-w-full max-h-[450px] object-contain rounded-md shadow-md z-0" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} />
                            )}
                            {!isEditingImage && imageError && (
                                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center p-4 z-10">
                                    <Alert variant="destructive" className="w-full max-w-md bg-background/90 backdrop-blur-sm">
                                        <AlertCircle className="h-5 w-5" />
                                        <AlertTitle>Lỗi!</AlertTitle>
                                        <AlertDescription className="text-xs">{imageError}</AlertDescription>
                                    </Alert>
                                </motion.div>
                            )}
                            {!isEditingImage && !imageData && !imageError && (
                                <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-muted-foreground p-6">
                                    <ImageIcon size={48} className="mx-auto mb-4 opacity-30" />
                                    <p className="text-sm font-medium">Chưa có hình ảnh</p>
                                    <p className="text-xs mt-1">Nhấn nút "Tạo ảnh" trong menu tùy chọn <MoreVertical size={12} className="inline -mt-0.5" /> để tạo.</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    {/* Enhance Prompt Error Alert */}
                    {enhanceError && (
                        <Alert variant="destructive" className="mb-3">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Lỗi Cải Thiện Gợi Ý</AlertTitle>
                            <AlertDescription className="text-xs">{enhanceError}</AlertDescription>
                        </Alert>
                    )}
                    {/* Textarea and Enhance Button */}
                    <div className="relative mb-3">
                        <Textarea
                            placeholder="Nhập mô tả chỉnh sửa ảnh (ví dụ: thêm con lợn bay, biến thành phong cách anime, ...)"
                            value={editPrompt}
                            onChange={handleEditPromptChange}
                            className="resize-none text-sm pr-10 py-2 border rounded-md dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0"
                            rows={3}
                        />
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                        onClick={handleEnhancePrompt}
                                        disabled={isEnhancingPrompt || !editPrompt}
                                    >
                                        {isEnhancingPrompt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                        <span className="sr-only">Cải thiện gợi ý</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    <p>Cải thiện gợi ý (Dùng AI)</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <DialogFooter className="mt-2 flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2 gap-2">
                        <DialogClose asChild>
                            <Button type="button" variant="outline" className="w-full sm:w-auto">
                                Đóng
                            </Button>
                        </DialogClose>
                        <Button type="button" variant="default" onClick={handleApplyEdit} disabled={isEditingImage || !editPrompt}>
                            {isEditingImage ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Đang chỉnh sửa...
                                </>
                            ) : (
                                <>
                                    <Edit size={16} className="mr-2" />
                                    Áp dụng chỉnh sửa
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Map Dialog */}
            <Dialog open={isMapDialogOpen} onOpenChange={handleMapDialogChange}>
                <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
                     <DialogHeader className="p-4 border-b shrink-0"> {/* Added shrink-0 */}
                        <DialogTitle className="flex items-center gap-2 text-lg"><MapPin size={18} className="text-primary" /> Tìm quán ăn gần đây cho: {item.name}</DialogTitle>
                        <DialogDescription className="text-xs">Kết quả từ Google Maps. Vị trí của bạn được dùng để tìm kiếm (nếu được phép).</DialogDescription>
                    </DialogHeader>
                    {/* Use flex-grow and overflow-hidden */}
                    <div className="flex-grow overflow-y-auto p-4">
                        {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                            <NearbyRestaurantsMap keyword={item.name} apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY} />
                        ) : (
                            <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Lỗi Cấu Hình</AlertTitle><AlertDescription>API Key của Google Maps chưa được cấu hình (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).</AlertDescription></Alert>
                        )}
                    </div>
                    <DialogFooter className="p-4 border-t shrink-0"><DialogClose asChild><Button type="button" variant="outline">Đóng</Button></DialogClose></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* The actual card */}
            <motion.div
                layout initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="group relative overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm hover:shadow-md transition-shadow duration-300 ease-in-out" // Reduced hover shadow intensity
            >
                {/* Adjusted padding for mobile */}
                <div className="p-3 md:p-4">
                    <div className="flex justify-between items-start gap-3">
                        {/* Title and Cost - Added min-w-0 for better flex truncation */}
                        <div className="flex-grow overflow-hidden mr-2 min-w-0">
                            <h4 className="font-semibold text-sm md:text-base text-foreground mb-1 truncate" title={item.name}>{item.name}</h4>
                            {item.estimatedCost && (
                                <Badge variant="outline" className="text-xs flex items-center gap-1 px-2 py-0.5 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 font-medium">
                                    <Coins size={13} /> {item.estimatedCost}
                                </Badge>
                            )}
                        </div>
                        {/* Dropdown Menu */}
                        <div className="flex-shrink-0">
                            <DropdownMenu>
                                {/* Increased touch target size on mobile */}
                                <Tooltip><TooltipTrigger asChild><DropdownMenuTrigger asChild><Button variant="ghost" className="h-9 w-9 p-1.5 md:h-8 md:w-8 md:p-0 rounded-full text-muted-foreground hover:bg-muted/80"><MoreVertical className="h-4 w-4" /><span className="sr-only">Tùy chọn</span></Button></DropdownMenuTrigger></TooltipTrigger><TooltipContent side="left"><p>Tùy chọn</p></TooltipContent></Tooltip>
                                <DropdownMenuContent align="end" className="w-40 sm:w-48">
                                    <DropdownMenuItem onClick={handleGenerateImage} disabled={isLoadingImage}>{isLoadingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />} {imageData ? "Xem/Tạo lại ảnh" : "Tạo ảnh món ăn"}</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleEditImage} disabled={!imageData}><Edit className="mr-2 h-4 w-4" /> Chỉnh sửa ảnh</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setIsMapDialogOpen(true)}><MapPin className="mr-2 h-4 w-4" /> Tìm quán gần đây</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {onEdit && <DropdownMenuItem onClick={handleEdit}><Edit className="mr-2 h-4 w-4" /> Chỉnh sửa</DropdownMenuItem>}
                                    {onRemove && <DropdownMenuItem onClick={handleRemove} className="text-red-600 focus:text-red-600 focus:bg-red-100 dark:focus:bg-red-900/50"><Trash2 className="mr-2 h-4 w-4" /> Xóa món</DropdownMenuItem>}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Ingredients Section */}
                    {item.ingredients && item.ingredients.length > 0 && (
                        <div className="mt-3">
                            {/* Added px-2 for better touch target */}
                            <button onClick={toggleIngredients} className="flex items-center justify-between w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1 px-2 group/toggle">
                                <span className="flex items-center gap-1.5"><ShoppingBasket size={15} /> Nguyên liệu ({item.ingredients.length})</span>
                                {isIngredientsExpanded ? <ChevronUp size={16} className="group-hover/toggle:text-foreground"/> : <ChevronDown size={16} className="group-hover/toggle:text-foreground"/>}
                            </button>
                            <AnimatePresence initial={false}>
                                {isIngredientsExpanded && (
                                    <motion.div key="ingredients-content" initial="collapsed" animate="open" exit="collapsed" variants={{ open: { opacity: 1, height: 'auto', marginTop: '8px' }, collapsed: { opacity: 0, height: 0, marginTop: '0px' } }} transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }} className="overflow-hidden">
                                        <div className="flex flex-wrap gap-1.5 pt-1 pb-1 w-full">
                                            {/* Added break-all to Badge content */}
                                            {item.ingredients.map((ing, idx) => <Badge key={idx} variant="secondary" className="text-xs px-2 py-0.5 font-normal break-all">{ing}</Badge>)}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                     {/* Preparation Section */}
                    {item.preparation && (
                        <div className="mt-2">
                             {/* Added px-2 for better touch target */}
                            <button onClick={togglePrep} className="flex items-center justify-between w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1 px-2 group/toggle">
                                <span className="flex items-center gap-1.5"><ChefHat size={15} /> Cách chế biến</span>
                                 {isPrepExpanded ? <ChevronUp size={16} className="group-hover/toggle:text-foreground"/> : <ChevronDown size={16} className="group-hover/toggle:text-foreground"/>}
                            </button>
                            <AnimatePresence initial={false}>
                                {isPrepExpanded && (
                                    <motion.div key="prep-content" initial="collapsed" animate="open" exit="collapsed" variants={{ open: { opacity: 1, height: 'auto', marginTop: '8px' }, collapsed: { opacity: 0, height: 0, marginTop: '0px' } }} transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }} className="overflow-hidden">
                                        {/* Added break-words to preparation text */}
                                        <p className="text-xs md:text-sm text-muted-foreground whitespace-pre-line break-words leading-relaxed pt-1 pb-1 pl-2 border-l-2 border-primary/30">{item.preparation}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Nutrition Section */}
                    {hasNutritionData && (
                        <div className="mt-2">
                             {/* Added px-2 for better touch target */}
                             <button onClick={toggleNutrition} className="flex items-center justify-between w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1 px-2 group/toggle">
                                <span className="flex items-center gap-1.5"><Info size={15} /> Dinh dưỡng & Lợi ích</span>
                                 {isNutritionExpanded ? <ChevronUp size={16} className="group-hover/toggle:text-foreground"/> : <ChevronDown size={16} className="group-hover/toggle:text-foreground"/>}
                            </button>
                             <AnimatePresence initial={false}>
                                {isNutritionExpanded && (
                                    <motion.div key="nutrition-content" initial="collapsed" animate="open" exit="collapsed" variants={{ open: { opacity: 1, height: 'auto', marginTop: '8px' }, collapsed: { opacity: 0, height: 0, marginTop: '0px' } }} transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }} className="overflow-hidden">
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
                </div>
            </motion.div>
        </TooltipProvider>
    );
};

// MealPlaceholder Component (Unchanged)
const MealPlaceholder: React.FC<{ mealLabel: string }> = ({ mealLabel }) => (
    <div className="px-4 py-6 text-center text-sm text-muted-foreground border border-dashed rounded-lg bg-muted/20">
        Chưa có món ăn nào được lên kế hoạch cho {mealLabel.toLowerCase()}.
    </div>
);

// DayMealsSection Component (Unchanged, sticky header retained)
const DayMealsSection: React.FC<{
    dayData: DailyMenuData | undefined;
    dayKey: string | null; // null for daily view
    onEditItem?: InteractiveMenuProps['onEditItem'];
    onRemoveItem?: InteractiveMenuProps['onRemoveItem'];
}> = ({ dayData, dayKey, onEditItem, onRemoveItem }) => {
    const allMealTypes: { key: keyof DailyMenuData; label: string; icon: React.ElementType; isOptional?: boolean }[] = [
        { key: 'breakfast', label: 'Bữa Sáng', icon: Sandwich },
        { key: 'lunch', label: 'Bữa Trưa', icon: Soup },
        { key: 'dinner', label: 'Bữa Tối', icon: UtensilsCrossed },
        { key: 'snacks', label: 'Bữa Phụ / Ăn Vặt', icon: Cookie, isOptional: true },
    ];
    const hasAnyDataForDay = dayData && Object.values(dayData).some(meal => meal && meal.length > 0);

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
        // Add padding here if needed, previously was in CardContent/ScrollArea
        <div className="space-y-6 md:space-y-8 px-1 pb-1">
            {allMealTypes.map(({ key, label, icon: Icon, isOptional }) => {
                const items = dayData?.[key] ?? [];
                const hasItems = items.length > 0;
                // Skip optional sections if they have no items
                if (isOptional && !hasItems) return null;

                // Generate a unique ID for potential anchor links
                const sectionId = `${dayKey ?? 'daily'}-${key}`;

                return (
                    <section key={key} className="scroll-mt-16" id={sectionId}>
                        {/* Sticky Header for Meal Type - Adjusted padding */}
                        <div className="flex items-center gap-3 mb-4 sticky top-0 bg-background/90 backdrop-blur-sm py-2 z-10 -mx-3 px-3 md:-mx-4 md:px-4 border-b border-border/50">
                            <div className="p-2 bg-primary/10 rounded-full flex-shrink-0"><Icon size={20} className="text-primary" /></div>
                            <h3 className="text-lg md:text-xl font-semibold text-foreground flex-grow truncate pr-2">{label}</h3>
                            {hasItems && <Badge variant="outline" className="ml-auto flex-shrink-0">{items.length} món</Badge>}
                        </div>
                        {/* Meal Items - Adjusted padding to match card */}
                        <div className="space-y-4"> {/* Removed pl-1 pr-1, padding handled by card now */}
                            {hasItems ? (
                                items.map((item, itemIdx) => (
                                    <MenuItemCard
                                        key={`${sectionId}-${itemIdx}-${item.name.slice(0,10)}`} // More robust key
                                        item={item}
                                        itemIndex={itemIdx}
                                        dayKey={dayKey}
                                        mealType={key}
                                        onEdit={onEditItem}
                                        onRemove={onRemoveItem}
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

// --- Suggested Prompts Component ---
const SuggestedPrompts: React.FC<{
    menu?: AnyMenuData;
    onPromptClick?: (prompt: string) => void;
}> = ({ menu, onPromptClick }) => {
    if (!onPromptClick || !menu) return null; // Only show if handler exists and menu is loaded

    // Define the base prompts
    const basePrompts = [
        "Món nào tốt cho sức khỏe trong thực đơn này?",
        "Gợi ý món chay và không chứa gluten?",
        "Món nào được đánh giá cao nhất?",
        "Tạo lại thực đơn này cho người tập gym."
    ];

    // Attempt to find a sample dish name for the dynamic prompt
    let sampleDishName: string | undefined;
    if (menu) {
        if ('breakfast' in menu) { // Daily menu check
            const dailyMenu = menu as DailyMenuData;
            sampleDishName = dailyMenu.breakfast?.[0]?.name ?? dailyMenu.lunch?.[0]?.name ?? dailyMenu.dinner?.[0]?.name;
        } else { // Weekly menu check
            const weeklyMenu = menu as WeeklyMenuData;
            for (const day of daysOfWeek) { // Use the globally defined daysOfWeek
                const dayData = weeklyMenu[day];
                if (dayData) {
                    sampleDishName = dayData.breakfast?.[0]?.name ?? dayData.lunch?.[0]?.name ?? dayData.dinner?.[0]?.name;
                    if (sampleDishName) break;
                }
            }
        }
    }

    const finalPrompts = [...basePrompts];
    if (sampleDishName) {
        // Insert the dynamic prompt at a specific position (e.g., before the last one)
        finalPrompts.splice(finalPrompts.length - 1, 0, `Cho tôi biết thêm về "${sampleDishName}".`);
    }

    return (
        <div className="mt-6 pt-4 border-t border-border/50 px-1">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
                <MessageSquareQuote size={16} /> Gợi ý cho bạn:
            </h4>
            <div className="flex flex-wrap gap-2">
                {finalPrompts.map((prompt, index) => (
                    <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="text-xs h-auto py-1 px-2.5 text-left font-normal text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors duration-150 ease-in-out"
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
const daysOfWeek: (keyof WeeklyMenuData)[] = [ "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday" ];
const dayTranslations: Record<string, string> = { "Monday": "Thứ Hai", "Tuesday": "Thứ Ba", "Wednesday": "Thứ Tư", "Thursday": "Thứ Năm", "Friday": "Thứ Sáu", "Saturday": "Thứ Bảy", "Sunday": "Chủ Nhật", };

/**
 * InteractiveMenu: The main component to display daily or weekly menus.
 * Refactored for better responsiveness and natural page scrolling.
 */
export function InteractiveMenu({ menuData, isLoading, onEditItem, onRemoveItem, onExportIngredients, onPromptClick }: InteractiveMenuProps) { // Add onPromptClick here
    const { menu, menuType, feedbackRequest, trace } = menuData;
    const isMobile = useIsMobile();
    // Ref points to the container whose content will be exported
    const menuContentRef = useRef<HTMLDivElement>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isGeneratingText, setIsGeneratingText] = useState(false);
    const [activeTab, setActiveTab] = useState<string | undefined>(undefined);

    // Determine default active tab for weekly view
    const defaultWeeklyTab = useMemo(() => {
        if (menuType !== 'weekly' || !menu) return undefined;
        const weeklyMenu = menu as WeeklyMenuData;
        return daysOfWeek.find(day => weeklyMenu[day] && Object.values(weeklyMenu[day]!).some(meal => meal && meal.length > 0)) || daysOfWeek[0];
    }, [menu, menuType]);

    // Set initial active tab for weekly view
    useEffect(() => {
        if (menuType === 'weekly' && defaultWeeklyTab && !activeTab) {
            setActiveTab(defaultWeeklyTab);
        }
        // Reset tab if menu type changes or menu is cleared
        if (menuType !== 'weekly' || !menu) {
             setActiveTab(undefined);
        }
    }, [defaultWeeklyTab, menuType, menu, activeTab]); // Ensure activeTab is in deps

    // --- Ingredient Export Handler (Unchanged) ---
    const handleExportIngredients = useCallback(() => {
        if (!menu || !onExportIngredients) return;
        let allIngredients: string[] = [];
        if (menuType === 'daily') {
            const dailyMenu = menu as DailyMenuData;
            Object.values(dailyMenu).forEach(mealItems => { mealItems?.forEach(item => { if (item.ingredients) allIngredients.push(...item.ingredients); }); });
        } else if (menuType === 'weekly') {
            const weeklyMenu = menu as WeeklyMenuData;
            daysOfWeek.forEach(day => {
                const dayData = weeklyMenu[day];
                if (dayData) Object.values(dayData).forEach(mealItems => { mealItems?.forEach(item => { if (item.ingredients) allIngredients.push(...item.ingredients); }); });
            });
        }
        const uniqueIngredients = [...new Set(allIngredients)].sort((a, b) => a.localeCompare(b));
        const markdown = uniqueIngredients.length > 0
            ? `# Danh sách Nguyên liệu (${menuType === 'weekly' ? 'Tuần' : 'Hôm nay'})\n\n${uniqueIngredients.map(ing => `- [ ] ${ing}`).join('\n')}`
            : `# Danh sách Nguyên liệu (${menuType === 'weekly' ? 'Tuần' : 'Hôm nay'})\n\n(Không có nguyên liệu nào)`;
        onExportIngredients(markdown);
    }, [onExportIngredients, menuType, menu]);


    // --- PDF Download Handler (Improved with background setting) ---
    const handleDownloadPdf = useCallback(async () => {
        const elementToCapture = menuContentRef.current;
        if (!elementToCapture || isGeneratingPdf) return;

        setIsGeneratingPdf(true);
        console.log("Starting PDF generation...");

        // --- Temporarily set background for capture ---
        const originalBg = elementToCapture.style.backgroundColor;
        // Use a light background for better PDF readability, respecting theme if possible
        const computedStyle = getComputedStyle(elementToCapture);
        const themeBg = computedStyle.getPropertyValue('--background') || '#ffffff'; // Fallback to white
        elementToCapture.style.backgroundColor = themeBg.trim(); // Use CSS variable if available

        await new Promise(resolve => setTimeout(resolve, 150)); // Small delay for styles

        try {
            const canvas = await html2canvas(elementToCapture, {
                scale: 2, // Higher scale for better quality
                useCORS: true,
                logging: false,
                backgroundColor: null, // Use the element's background we just set
                // Remove scroll related options as the container shouldn't scroll internally
                // windowHeight: elementToCapture.scrollHeight, // No longer needed
                // scrollY: 0, // No longer needed
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width, canvas.height] // Use canvas dimensions initially
            });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight(); // Reference height

            // Simple multi-page logic based on aspect ratio
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const effectivePdfHeight = pdfWidth * (imgHeight / imgWidth); // Proportional height in PDF units

            const pageHeightLimit = pdfWidth * 1.4; // Approximate A4 aspect ratio in pixels

            if (effectivePdfHeight > pageHeightLimit) {
                 // Multi-page: slice the image vertically
                let position = 0;
                const pageHeightInUnits = pdfWidth * Math.sqrt(2); // A4 height roughly

                while (position < effectivePdfHeight) {
                    if (position > 0) {
                        pdf.addPage();
                        // Set current page size? Optional, might default ok.
                        // pdf.internal.pageSize.setWidth(pdfWidth);
                        // pdf.internal.pageSize.setHeight(pageHeightInUnits);
                    }
                    // Add the image slice for the current page
                    pdf.addImage(imgData, 'PNG', 0, -position, pdfWidth, effectivePdfHeight);
                    position += pageHeightInUnits;
                }
            } else {
                // Single page: add the whole image scaled to width
                 pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, effectivePdfHeight);
            }


            pdf.save(`thuc-don-${menuType}-${(menuType === 'weekly' ? activeTab : 'hom-nay') ?? 'export'}.pdf`);
            console.log("PDF generated successfully.");
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Đã xảy ra lỗi khi tạo file PDF. Vui lòng thử lại.");
        } finally {
             // --- Restore original background ---
            if (menuContentRef.current) {
                menuContentRef.current.style.backgroundColor = originalBg;
            }
            setIsGeneratingPdf(false);
        }
    }, [isGeneratingPdf, menuType, activeTab]); // menuContentRef is stable


    // --- Text Download Handler (Unchanged logic, but depends on correct menu structure) ---
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
            return text + "\n";
        };
        const formatMeal = (mealKey: keyof DailyMenuData, mealData: MenuItemData[] | undefined, indent = "") => {
            if (!mealData || mealData.length === 0) return "";
            const mealLabels: Record<string, string> = { breakfast: "Bữa Sáng", lunch: "Bữa Trưa", dinner: "Bữa Tối", snacks: "Bữa Phụ / Ăn Vặt" };
            let text = `${indent}--- ${mealLabels[mealKey]} ---\n\n`;
            mealData.forEach(item => text += formatItem(item, indent + "  "));
            return text;
         };

        if (menuType === 'daily') {
            const dailyMenu = menu as DailyMenuData;
            menuText += "===========================\n";
            menuText += "    THỰC ĐƠN HÔM NAY\n";
            menuText += "===========================\n\n";
            // Removed incorrect access to trace.output.title and trace.output.description
            // if (trace?.output?.title) menuText += `Tiêu đề: ${trace.output.title}\n`;
            // if (trace?.output?.description) menuText += `Mô tả: ${trace.output.description}\n\n`;
            menuText += formatMeal('breakfast', dailyMenu.breakfast);
            menuText += formatMeal('lunch', dailyMenu.lunch);
            menuText += formatMeal('dinner', dailyMenu.dinner);
            menuText += formatMeal('snacks', dailyMenu.snacks);
        } else if (menuType === 'weekly') {
            const weeklyMenu = menu as WeeklyMenuData;
            menuText += "===========================\n";
            menuText += "     THỰC ĐƠN TUẦN\n";
            menuText += "===========================\n\n";
            // Removed incorrect access to trace.output.title and trace.output.description
            // if (trace?.output?.title) menuText += `Tiêu đề: ${trace.output.title}\n`;
            // if (trace?.output?.description) menuText += `Mô tả: ${trace.output.description}\n\n`;
            daysOfWeek.forEach(day => {
                const dayData = weeklyMenu[day];
                if (dayData && Object.values(dayData).some(m => m && m.length > 0)) {
                    menuText += `=== ${dayTranslations[day] || day} ===\n\n`;
                    menuText += formatMeal('breakfast', dayData.breakfast, "  ");
                    menuText += formatMeal('lunch', dayData.lunch, "  ");
                    menuText += formatMeal('dinner', dayData.dinner, "  ");
                    menuText += formatMeal('snacks', dayData.snacks, "  ");
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
            console.log("Text file generated successfully.");
        } catch (error) { console.error("Error generating text file:", error); alert("Lỗi tạo file văn bản."); }
        finally { setIsGeneratingText(false); }
    }, [menu, menuType, activeTab, isGeneratingText, trace]);


    // --- Loading State (Unchanged) ---
    if (isLoading) {
        return (
            <Card className="w-full shadow-none border-none bg-transparent">
                <CardHeader className="px-1 pt-1 pb-3">
                     {menuType === 'weekly' ? ( <div className="flex space-x-2 pb-2 border-b border-border/50">{[...Array(isMobile ? 4 : 7)].map((_, i) => <Skeleton key={i} className="h-9 w-16 rounded-md" />)}</div> ) : ( <div className="flex items-center gap-3 pb-4 border-b border-border/50"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-6 w-40" /></div> )}
                </CardHeader>
                <CardContent className="pt-4 space-y-6 px-1">
                    {[...Array(2)].map((_, i) => ( <div key={i} className="space-y-4"><div className="flex items-center gap-3 mb-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-5 w-1/4" /></div><Skeleton className="h-24 w-full rounded-lg" /><Skeleton className="h-24 w-full rounded-lg" /></div> ))}
                </CardContent>
            </Card>
        );
    }

    // --- Empty State (Unchanged) ---
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
        const hasAnyWeeklyData = daysOfWeek.some(day => weeklyMenu[day] && Object.values(weeklyMenu[day]!).some(meal => meal && meal.length > 0));

        // Empty state for weekly view
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

        // If activeTab hasn't been set yet (e.g., loading finished), show minimal loading
        if (!activeTab) {
            return (
                 <Card className="w-full shadow-none border-none bg-transparent">
                    <CardHeader className="px-1 pt-1 pb-3">
                        <div className="flex space-x-2 pb-2 border-b border-border/50">
                            {[...Array(isMobile ? 4 : 7)].map((_, i) => <Skeleton key={i} className="h-9 w-16 rounded-md" />)}
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 px-1">
                         <Skeleton className="h-40 w-full rounded-lg" />
                    </CardContent>
                 </Card>
            );
        }


        return (
            <div className="w-full">
                {/* Menu Actions Dropdown */}
                 {onExportIngredients && hasAnyWeeklyData && (
                    <div className="flex justify-end mb-3 -mt-1">
                        <DropdownMenu>
                            <TooltipProvider><Tooltip><TooltipTrigger asChild><DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="text-xs"><MoreVertical className="h-4 w-4 mr-1.5 -ml-0.5" />Tùy chọn Thực đơn Tuần</Button></DropdownMenuTrigger></TooltipTrigger><TooltipContent side="bottom" align="end"><p>Hành động cho thực đơn tuần</p></TooltipContent></Tooltip></TooltipProvider>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuItem onClick={handleExportIngredients}><ShoppingBasket className="mr-2 h-4 w-4" /> Xuất Nguyên Liệu (Checklist)</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadPdf} disabled={isGeneratingPdf}>{isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} {isGeneratingPdf ? "Đang tạo PDF..." : `Tải ${dayTranslations[activeTab] ?? activeTab} (PDF)`}</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadText} disabled={isGeneratingText}>{isGeneratingText ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} {isGeneratingText ? "Đang tạo Văn bản..." : "Tải Thực Đơn (Văn bản)"}</DropdownMenuItem>
                                    {/* Option to download entire week as text still makes sense */}
                                    {/* Maybe add PDF for entire week later if needed - complex */}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                 )}

                <TooltipProvider>
                    {/* Tabs component controlling the active day */}
                    <Tabs
                        value={activeTab} // Controlled state
                        onValueChange={setActiveTab} // Update state on change
                        className="w-full"
                        // activationMode="manual" // Consider if auto-activation on arrow keys is desired
                    >
                        {/* Scrollable Tabs List */}
                        <div className="relative mb-4 border-b border-border/50">
                            <ScrollArea className="w-full pb-2 -mx-1 px-1">
                                <TabsList className="inline-flex h-auto p-1 bg-muted rounded-lg gap-1 w-max">
                                    {daysOfWeek.map(day => {
                                        const dayHasData = weeklyMenu[day] && Object.values(weeklyMenu[day]!).some(m => m && m.length > 0);
                                        const dayLabel = dayTranslations[day] || day;
                                        const displayLabel = isMobile ? dayLabel.substring(0, 3) : dayLabel;
                                        return (
                                            <Tooltip key={day} delayDuration={isMobile ? 1000 : 300}>
                                                <TooltipTrigger asChild>
                                                    <TabsTrigger
                                                        value={day}
                                                        disabled={!dayHasData}
                                                        className={cn(
                                                          /* Adjusted padding for mobile touch */
                                                          "px-3 py-2 sm:py-1.5 text-xs sm:text-sm rounded-md transition-all duration-200",
                                                          "data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:font-semibold",
                                                          "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted-foreground/10 data-[state=inactive]:hover:text-foreground",
                                                          "data-[disabled]:opacity-40 data-[disabled]:pointer-events-none"
                                                        )}
                                                    >
                                                        {displayLabel}
                                                    </TabsTrigger>
                                                </TooltipTrigger>
                                                <TooltipContent><p>{dayLabel}</p></TooltipContent>
                                            </Tooltip>
                                        );
                                    })}
                                </TabsList>
                            </ScrollArea>
                            {/* Optional subtle gradient/divider under tabs */}
                            {/* <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-border/50 to-transparent"></div> */}
                        </div>

                        {/* Container for PDF/Text capture - wraps only the active tab's content */}
                        {/* Added bg-background for clean PDF export */}
                        <div ref={menuContentRef} id="menu-content-weekly" className="bg-background rounded-md">
                            {/* Render ONLY the active TabsContent for performance and correct export */}
                            {daysOfWeek.map(day => {
                                const dayHasData = weeklyMenu[day] && Object.values(weeklyMenu[day]!).some(m => m && m.length > 0);
                                // Only render if it's the active tab AND has data
                                return (day === activeTab && dayHasData) ? (
                                    <TabsContent
                                        key={day}
                                        value={day}
                                        // No forceMount needed, it's conditionally rendered
                                        className="mt-1 focus-visible:ring-0 focus-visible:ring-offset-0" // Shadcn default class
                                    >
                                        {/* DayMealsSection renders directly, no internal scroll */}
                                        <DayMealsSection
                                            dayData={weeklyMenu[day]}
                                            dayKey={day}
                                            onEditItem={onEditItem}
                                            onRemoveItem={onRemoveItem}
                                        />
                                    </TabsContent>
                                ) : null; // Render nothing if not active or no data
                            })}
                        </div> {/* End menuContentRef div */}

                    </Tabs>
                </TooltipProvider>

                {/* Feedback Request Area - appears AFTER Tabs content */}
                {feedbackRequest && (
                    <div className="mt-6 pt-4 border-t border-border/50 px-1">
                        <p className="text-sm text-muted-foreground italic flex items-start gap-2">
                            <Info size={16} className="mt-0.5 flex-shrink-0 opacity-80"/>
                            <span>{feedbackRequest}</span>
                        </p>
                    </div>
                )}
                {/* Render Suggested Prompts */}
                <SuggestedPrompts menu={menu} onPromptClick={onPromptClick} />
            </div>
        );
    }

    // --- Daily Menu View ---
    if (menuType === 'daily') {
        const dailyMenu = menu as DailyMenuData;
        const hasAnyDailyData = Object.values(dailyMenu).some(meal => meal && meal.length > 0);

        // Empty state for daily view
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

        return (
            <div className="w-full">
                {/* Removed outer Card wrapper, using div directly */}
                <div className="bg-transparent">
                    {/* Daily View Header & Actions */}
                    <div className="pb-4 pt-1 px-1 mb-4 border-b border-border/50 flex flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0"> {/* Added min-w-0 for flex shrink */}
                            <CalendarDays size={24} className="text-primary flex-shrink-0" />
                            <h2 className="text-xl md:text-2xl font-bold text-foreground truncate">Thực Đơn Hôm Nay</h2>
                        </div>
                         {onExportIngredients && hasAnyDailyData && (
                            <div className="flex-shrink-0">
                                <DropdownMenu>
                                    <TooltipProvider><Tooltip><TooltipTrigger asChild><DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /><span className="sr-only">Tùy chọn</span></Button></DropdownMenuTrigger></TooltipTrigger><TooltipContent side="bottom" align="end"><p>Tùy chọn</p></TooltipContent></Tooltip></TooltipProvider>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuItem onClick={handleExportIngredients}><ShoppingBasket className="mr-2 h-4 w-4" /> Xuất Nguyên Liệu (Checklist)</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadPdf} disabled={isGeneratingPdf}>{isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} {isGeneratingPdf ? "Đang tạo PDF..." : "Tải Thực Đơn (PDF)"}</DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadText} disabled={isGeneratingText}>{isGeneratingText ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} {isGeneratingText ? "Đang tạo Văn bản..." : "Tải Thực Đơn (Văn bản)"}</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                         )}
                    </div>

                    {/* Container for PDF/Text capture */}
                    {/* Added bg-background for clean PDF export */}
                    <div ref={menuContentRef} id="menu-content-daily" className="bg-background rounded-md">
                        {/* No CardContent or ScrollArea needed here */}
                        {/* DayMealsSection renders directly, determining its own height */}
                        <DayMealsSection
                            dayData={dailyMenu}
                            dayKey={null} // Indicate daily view
                            onEditItem={onEditItem}
                            onRemoveItem={onRemoveItem}
                        />
                        {/* Nutrition Chart appears after the meals section */}
                        {/* Added padding consistent with DayMealsSection */}
                        <div className="mt-6 px-1 pb-1">
                            <NutritionChart data={dailyMenu} />
                        </div>
                    </div> {/* End menuContentRef div */}

                </div> {/* End main div wrapper */}

                {/* Feedback Request Area - appears AFTER main content */}
                {feedbackRequest && (
                    <div className="mt-6 pt-4 border-t border-border/50 px-1">
                        <p className="text-sm text-muted-foreground italic flex items-start gap-2">
                            <Info size={16} className="mt-0.5 flex-shrink-0 opacity-80"/>
                            <span>{feedbackRequest}</span>
                        </p>
                    </div>
                    )}
                 {/* Render Suggested Prompts */}
                <SuggestedPrompts menu={menu} onPromptClick={onPromptClick} />
                </div>
            );
    }

    // Fallback case (Unchanged)
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
