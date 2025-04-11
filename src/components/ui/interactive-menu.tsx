'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import {
    Dialog, // Import Dialog components
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert
import {
    MoreVertical,
    Image as ImageIcon, // Icon tạo ảnh
    Edit,
    Trash2,
    ChevronDown,
    ChevronUp,
    UtensilsCrossed,
    Cookie,
    Soup,
    Salad,
    Sandwich,
    List,
    ClipboardList,
    Loader2, // Icon Loading
    Coins,
    CalendarDays,
    Info,
    AlertCircle, // Icon Lỗi
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from '@/hooks/use-mobile';
import { type DailyMenuData, type WeeklyMenuData, type AnyMenuData } from '@/ai/flows/generate-menu-from-preferences';
import { cn } from '@/lib/utils';

// --- Types ---
interface MenuItemData {
    name: string;
    ingredients: string[];
    preparation: string;
    estimatedCost?: string;
}

interface InteractiveMenuProps {
    menuData: {
        menu?: AnyMenuData;
        menuType: 'daily' | 'weekly';
        feedbackRequest?: string;
    };
    onEditItem?: (day: string | null, mealType: string, itemIndex: number) => void;
    onRemoveItem?: (day: string | null, mealType: string, itemIndex: number) => void;
}

// --- Helper Components ---

// Component hiển thị một món ăn với tương tác và tạo ảnh
const MenuItemCard: React.FC<{
    item: MenuItemData;
    itemIndex: number;
    dayKey: string | null;
    mealType: string;
    onEdit?: InteractiveMenuProps['onEditItem'];
    onRemove?: InteractiveMenuProps['onRemoveItem'];
}> = ({ item, itemIndex, dayKey, mealType, onEdit, onRemove }) => {
    const [isPrepExpanded, setIsPrepExpanded] = useState(false);
    const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
    const [isLoadingImage, setIsLoadingImage] = useState(false);
    const [imageData, setImageData] = useState<string | null>(null); // Store base64 image data
    const [imageError, setImageError] = useState<string | null>(null);
    const MAX_INGREDIENTS_VISIBLE = 4;

    const handleEdit = () => {
        console.log(`Edit item: ${dayKey ?? 'daily'} - ${mealType} - ${itemIndex}`);
        onEdit?.(dayKey, mealType, itemIndex);
    };

    const handleRemove = () => {
        console.log(`Remove item: ${dayKey ?? 'daily'} - ${mealType} - ${itemIndex}`);
        onRemove?.(dayKey, mealType, itemIndex);
    };

    // Hàm gọi API backend để tạo ảnh
    const handleGenerateImage = useCallback(async () => {
        // Không cần set isImageDialogOpen(true) vì DialogTrigger sẽ làm việc đó
        if (!item.name || isLoadingImage) return; // Không gọi nếu đang load hoặc không có tên

        setIsLoadingImage(true);
        setImageData(null);
        setImageError(null);

        console.log(`Requesting image for: ${item.name}`); // Log for debugging

        try {
            const response = await fetch('/api/generate-image', { // Đảm bảo endpoint đúng
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Gửi tên món ăn lên backend
                body: JSON.stringify({ dishName: item.name }),
            });

            if (!response.ok) {
                let errorMsg = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg;
                } catch (e) { /* Ignore parsing error */ }
                throw new Error(errorMsg);
            }

            const data = await response.json();
            if (data.imageData) {
                setImageData(data.imageData); // Lưu dữ liệu ảnh base64
                console.log(`Image received for: ${item.name}`);
            } else {
                throw new Error("API did not return image data.");
            }
        } catch (error) {
            console.error("Failed to generate image:", error);
            const errorMsg = error instanceof Error ? error.message : "An unknown error occurred while generating the image.";
            setImageError(errorMsg);
        } finally {
            setIsLoadingImage(false);
        }
    }, [item.name, isLoadingImage]); // Phụ thuộc vào item.name và isLoadingImage

    // Reset state khi dialog đóng
    const handleDialogChange = (open: boolean) => {
        setIsImageDialogOpen(open);
        if (!open) {
            // Delay reset để animation đóng dialog hoàn thành
            setTimeout(() => {
                setIsLoadingImage(false);
                setImageData(null);
                setImageError(null);
            }, 300);
        }
    };

    return (
        // Bọc toàn bộ card trong Dialog
        <Dialog open={isImageDialogOpen} onOpenChange={handleDialogChange}>
            <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="group relative p-3 md:p-4 rounded-lg border border-border/70 bg-card/80 dark:bg-card/50 hover:shadow-md transition-shadow duration-200 backdrop-blur-sm"
            >
                <div className="flex justify-between items-start gap-3">
                    {/* Bên trái */}
                    <div className="flex-grow overflow-hidden">
                        {/* Tên món ăn và nút trigger tạo ảnh */}
                        <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm md:text-base text-foreground truncate flex-1">{item.name}</p>
                            <DialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-primary flex-shrink-0 rounded-full"
                                    onClick={handleGenerateImage} // Gọi API khi nhấn
                                    title={`Tạo ảnh cho ${item.name}`}
                                    disabled={isLoadingImage} // Disable khi đang load
                                >
                                    {isLoadingImage ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                                    <span className="sr-only">Tạo ảnh</span>
                                </Button>
                            </DialogTrigger>
                        </div>

                        {/* Nguyên liệu */}
                        {item.ingredients && item.ingredients.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                                <List size={14} className="text-muted-foreground mr-1 flex-shrink-0" />
                                {item.ingredients.slice(0, MAX_INGREDIENTS_VISIBLE).map((ing, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs px-1.5 py-0.5">
                                        {ing}
                                    </Badge>
                                ))}
                                {item.ingredients.length > MAX_INGREDIENTS_VISIBLE && (
                                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                                        +{item.ingredients.length - MAX_INGREDIENTS_VISIBLE} more
                                    </Badge>
                                )}
                            </div>
                        )}

                        {/* Chế biến */}
                        {item.preparation && (
                            <div className="mt-2">
                                <AnimatePresence initial={false}>
                                    {isPrepExpanded && (
                                        <motion.p
                                            key="prep-content"
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.25 }}
                                            className="text-xs text-muted-foreground whitespace-pre-line overflow-hidden"
                                        >
                                            <ClipboardList size={14} className="inline-block mr-1 mb-0.5 text-muted-foreground/80" />
                                            {item.preparation}
                                        </motion.p>
                                    )}
                                </AnimatePresence>
                                <Button
                                    variant="link"
                                    className="text-xs h-auto p-0 mt-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                    onClick={() => setIsPrepExpanded(!isPrepExpanded)}
                                >
                                    {isPrepExpanded ? (
                                        <> <ChevronUp size={14} className="mr-0.5" /> Thu gọn</>
                                    ) : (
                                        <> <ChevronDown size={14} className="mr-0.5" /> Xem chế biến</>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Bên phải */}
                    <div className="flex flex-col items-end space-y-1 flex-shrink-0">
                        {item.estimatedCost && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1 px-1.5 py-0.5 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30">
                                <Coins size={12} />
                                {item.estimatedCost}
                            </Badge>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-7 w-7 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="sr-only">Item Actions</span>
                                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={handleEdit}>
                                    <Edit className="mr-2 h-4 w-4" /> Chỉnh sửa
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleRemove} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/50">
                                    <Trash2 className="mr-2 h-4 w-4" /> Xóa món
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </motion.div>

            {/* Nội dung Dialog Tạo Ảnh */}
            <DialogContent className="sm:max-w-[550px] md:max-w-[650px]"> {/* Tăng kích thước dialog */}
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ImageIcon size={18} /> Hình ảnh cho: {item.name}
                    </DialogTitle>
                </DialogHeader>
                <div className="flex justify-center items-center min-h-[350px] bg-muted/30 dark:bg-muted/10 rounded-lg p-4 border border-dashed border-border/50">
                    {isLoadingImage && (
                        <div className="flex flex-col items-center gap-3 text-muted-foreground text-center">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            <p className="text-sm font-medium">Đang tạo ảnh...</p>
                            <p className="text-xs">Quá trình này có thể mất vài giây.</p>
                            <Skeleton className="h-[280px] w-[450px] rounded-md mt-2" />
                        </div>
                    )}
                    {!isLoadingImage && imageData && (
                        <motion.img
                            key={imageData} // Key để trigger animation khi ảnh thay đổi
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            src={`data:image/png;base64,${imageData}`}
                            alt={`Generated image of ${item.name}`}
                            className="max-w-full max-h-[450px] object-contain rounded-md shadow-md"
                        />
                    )}
                    {!isLoadingImage && imageError && (
                         <Alert variant="destructive" className="w-full max-w-md">
                             <AlertCircle className="h-4 w-4" />
                             <AlertTitle>Lỗi tạo ảnh</AlertTitle>
                             <AlertDescription className="text-xs">
                                 {imageError}
                             </AlertDescription>
                         </Alert>
                    )}
                    {/* Trạng thái mặc định khi dialog mở nhưng chưa làm gì */}
                    {!isLoadingImage && !imageData && !imageError && (
                        <div className="text-center text-muted-foreground">
                            <p>Nhấn nút <ImageIcon size={14} className="inline-block mx-1" /> lần nữa để tạo ảnh.</p>
                        </div>
                    )}
                </div>
                <DialogFooter className="mt-2">
                    <DialogClose asChild>
                        <Button type="button" variant="outline">
                            Đóng
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog> // Đóng Dialog wrapper
    );
};


// Component hiển thị các bữa ăn trong một ngày (Giữ nguyên)
const DayMealsSection: React.FC<{
    dayData: DailyMenuData | undefined;
    dayKey: string | null;
    onEditItem?: InteractiveMenuProps['onEditItem'];
    onRemoveItem?: InteractiveMenuProps['onRemoveItem'];
}> = ({ dayData, dayKey, onEditItem, onRemoveItem }) => {
    if (!dayData || Object.values(dayData).every(meal => !meal || meal.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground min-h-[150px]">
                <Salad size={32} className="mb-2 opacity-50" />
                <p className="text-sm">Không có kế hoạch bữa ăn nào cho ngày này.</p>
            </div>
        );
    }

    const mealTypes: { key: keyof DailyMenuData; label: string; icon: React.ElementType }[] = [
        { key: 'breakfast', label: 'Bữa Sáng', icon: Sandwich },
        { key: 'lunch', label: 'Bữa Trưa', icon: Soup },
        { key: 'dinner', label: 'Bữa Tối', icon: UtensilsCrossed },
        { key: 'snacks', label: 'Bữa Phụ', icon: Cookie },
    ];

    return (
        <div className="space-y-5 md:space-y-6 p-1">
            {mealTypes.map(({ key, label, icon: Icon }, index) => {
                const items = dayData[key];
                if (!items || items.length === 0) return null;

                const isLastSection = index === mealTypes.filter(mt => dayData[mt.key] && dayData[mt.key]!.length > 0).length - 1;

                return (
                    <section key={key}>
                        <h3 className="flex items-center gap-2 text-base md:text-lg font-semibold mb-3 text-foreground">
                            <Icon size={20} className="text-primary" />
                            {label}
                        </h3>
                        <div className="space-y-3">
                            {items.map((item, itemIdx) => (
                                <MenuItemCard
                                    key={`${key}-${itemIdx}`}
                                    item={item}
                                    itemIndex={itemIdx}
                                    dayKey={dayKey}
                                    mealType={key}
                                    onEdit={onEditItem}
                                    onRemove={onRemoveItem}
                                />
                            ))}
                        </div>
                        {!isLastSection && <Separator className="my-5 md:my-6 opacity-50" />}
                    </section>
                );
            })}
        </div>
    );
};

// --- Main Component (Giữ nguyên) ---
const daysOfWeek: (keyof WeeklyMenuData)[] = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
];

export function InteractiveMenu({ menuData, onEditItem, onRemoveItem }: InteractiveMenuProps) {
    const { menu, menuType, feedbackRequest } = menuData;
    const isMobile = useIsMobile();

    const scrollMaxHeight = useMemo(() => {
        const headerHeight = 60;
        const footerHeight = feedbackRequest ? 80 : 40;
        const padding = 40;
        const weeklyTabsHeight = menuType === 'weekly' ? 50 : 0;
        const cardHeaderHeight = menuType === 'daily' ? 60 : 0;
        const availableHeight = typeof window !== 'undefined'
            ? window.innerHeight - headerHeight - footerHeight - padding - weeklyTabsHeight - cardHeaderHeight
            : 400;
        return Math.max(250, availableHeight);
    }, [isMobile, menuType, feedbackRequest]);

    if (!menu || Object.keys(menu).length === 0) {
        return (
            <Card className="w-full shadow-none border-none bg-transparent">
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground min-h-[200px]">
                        <Info size={32} className="mb-2 opacity-50" />
                        <p className="text-sm">Không có dữ liệu thực đơn để hiển thị.</p>
                        {feedbackRequest && <p className="mt-4 text-xs italic">{feedbackRequest}</p>}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (menuType === 'weekly') {
        const weeklyMenu = menu as WeeklyMenuData;
        const hasAnyWeeklyData = daysOfWeek.some(day => {
            const dayData = weeklyMenu[day];
            return dayData && Object.values(dayData).some(meal => meal && meal.length > 0);
        });

        if (!hasAnyWeeklyData) {
            return (
                <Card className="w-full shadow-none border-none bg-transparent">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground min-h-[200px]">
                            <Info size={32} className="mb-2 opacity-50" />
                            <p className="text-sm">Không có món ăn nào được tạo cho tuần này.</p>
                            {feedbackRequest && <p className="mt-4 text-xs italic">{feedbackRequest}</p>}
                        </div>
                    </CardContent>
                </Card>
            );
        }

        const defaultActiveTab = daysOfWeek.find(day => {
            const dayData = weeklyMenu[day];
            return dayData && Object.values(dayData).some(meal => meal && meal.length > 0);
        }) || daysOfWeek[0];

        return (
            <div className="w-full">
                <Tabs defaultValue={defaultActiveTab} className="w-full">
                    <ScrollArea className="w-full pb-2 -mx-1 px-1">
                        <TabsList className="inline-flex h-auto p-1 bg-muted/60 rounded-lg gap-1 w-max">
                            {daysOfWeek.map(day => (
                                <TabsTrigger
                                    key={day}
                                    value={day}
                                    disabled={!weeklyMenu[day] || Object.values(weeklyMenu[day]!).every(m => !m || m.length === 0)}
                                    className={cn(
                                        "px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors duration-150",
                                        "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
                                        "data-[state=inactive]:text-muted-foreground data-[disabled]:opacity-50 data-[disabled]:pointer-events-none"
                                    )}
                                >
                                    {isMobile ? day.substring(0, 3) : day}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        <div className="h-[1px] w-full bg-border/50 mt-1"></div>
                    </ScrollArea>

                    <AnimatePresence mode="wait">
                        {daysOfWeek.map(day => (
                            (weeklyMenu[day] && Object.values(weeklyMenu[day]!).some(m => m && m.length > 0)) && (
                                <TabsContent
                                    key={day}
                                    value={day}
                                    forceMount
                                    className="mt-2 focus-visible:ring-0 focus-visible:ring-offset-0"
                                >
                                    <motion.div
                                        initial={{ opacity: 0, x: -15 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 15 }}
                                        transition={{ duration: 0.25, ease: "easeInOut" }}
                                    >
                                        <Card className="border-none shadow-none bg-transparent">
                                            <CardContent className="p-0">
                                                <ScrollArea style={{ maxHeight: `${scrollMaxHeight}px` }} className="pr-2 -mr-2">
                                                    <DayMealsSection
                                                        dayData={weeklyMenu[day]}
                                                        dayKey={day}
                                                        onEditItem={onEditItem}
                                                        onRemoveItem={onRemoveItem}
                                                    />
                                                </ScrollArea>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                </TabsContent>
                            )
                        ))}
                    </AnimatePresence>
                </Tabs>

                {feedbackRequest && (
                    <div className="mt-4 pt-4 border-t border-border/50 px-1">
                        <p className="text-sm text-muted-foreground italic">{feedbackRequest}</p>
                    </div>
                )}
            </div>
        );
    }

    // --- Chế độ xem Thực đơn Hàng ngày ---
    const dailyMenu = menu as DailyMenuData;
    const hasAnyDailyData = Object.values(dailyMenu).some(meal => meal && meal.length > 0);

    if (!hasAnyDailyData) {
        return (
            <Card className="w-full shadow-none border-none bg-transparent">
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground min-h-[200px]">
                        <Info size={32} className="mb-2 opacity-50" />
                        <p className="text-sm">Không có món ăn nào được tạo cho hôm nay.</p>
                        {feedbackRequest && <p className="mt-4 text-xs italic">{feedbackRequest}</p>}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="w-full">
            <Card className="border-none shadow-none bg-transparent">
                <CardHeader className="pb-4 pt-1 px-1">
                    <CardTitle className="text-lg md:text-xl font-bold flex items-center gap-2 text-foreground">
                        <CalendarDays size={22} className="text-primary" />
                        Thực Đơn Hôm Nay
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea style={{ maxHeight: `${scrollMaxHeight}px` }} className="pr-2 -mr-2">
                        <DayMealsSection
                            dayData={dailyMenu}
                            dayKey={null}
                            onEditItem={onEditItem}
                            onRemoveItem={onRemoveItem}
                        />
                    </ScrollArea>
                </CardContent>
            </Card>

            {feedbackRequest && (
                <div className="mt-4 pt-4 border-t border-border/50 px-1">
                    <p className="text-sm text-muted-foreground italic">{feedbackRequest}</p>
                </div>
            )}
        </div>
    );
}