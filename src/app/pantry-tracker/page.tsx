'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { MainNav } from '@/components/main-nav';
import { Sidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardFooter,
    CardDescription
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion"; // Add framer-motion for animations

// Icons
import {
    Loader2,
    Link as LinkIcon,
    Youtube,
    BookOpen,
    ChefHat,
    AlertTriangle,
    SearchX,
    Share2,
    ExternalLink,
    Clock,
    MapPin,
    ThermometerSnowflake,
    ThermometerSun,
    Thermometer,
    Tag,
    History,
    Copy,
    Check,
    Search,
    Plus,
    X,
    ChevronDown,
    Info,
    Star,
    StarHalf,
    Filter,
    Bookmark,
    Zap,
    MessageSquare,
    Settings,
    Heart,
    Camera,
    RefreshCw,
    Sliders
} from 'lucide-react';
import { cn } from "@/lib/utils";

// Enhanced Interfaces
interface RecipeSuggestion {
    id: string;
    name: string;
    description: string;
    tags: {
        region?: string;
        difficulty?: string;
        time?: string;
        type?: string;
        cuisineType?: string;
        health?: string[];
        rating?: number;
    };
    ingredients?: string[];
    imageUrl?: string;
    citation: {
        sourceName: string;
        sourceUrl?: string;
        isVideo?: boolean;
    };
    isFavorite?: boolean;
}

interface IngredientChip {
    name: string;
    isOptional?: boolean;
}

// Helper Functions
const getDifficultyAttributes = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
        case 'easy':
        case 'dễ':
            return {
                colorClasses: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700",
                Icon: ThermometerSnowflake
            };
        case 'medium':
        case 'trung bình':
            return {
                colorClasses: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700",
                Icon: ThermometerSun
            };
        case 'hard':
        case 'khó':
            return {
                colorClasses: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700",
                Icon: Thermometer
            };
        default:
            return { colorClasses: "border-border", Icon: Thermometer };
    }
};

// Rating Stars Component
const RatingStars = ({ rating }: { rating: number }) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return (
        <div className="flex items-center">
            {[...Array(fullStars)].map((_, i) => (
                <Star key={`full-${i}`} className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            ))}
            {hasHalfStar && <StarHalf className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
            {[...Array(emptyStars)].map((_, i) => (
                <Star key={`empty-${i}`} className="h-4 w-4 text-muted-foreground" />
            ))}
            <span className="ml-1 text-sm text-muted-foreground">{rating.toFixed(1)}</span>
        </div>
    );
};

// Ingredient Chips Component
const IngredientChips = ({ ingredients, highlightedIngredients = [] }: { ingredients: string[], highlightedIngredients?: string[] }) => {
    return (
        <div className="flex flex-wrap gap-1.5 mt-2">
            {ingredients.map((ingredient, index) => {
                const isHighlighted = highlightedIngredients.some(
                    h => ingredient.toLowerCase().includes(h.toLowerCase())
                );
                return (
                    <Badge 
                        key={index} 
                        variant={isHighlighted ? "default" : "outline"}
                        className={cn(
                            isHighlighted && "bg-primary/20 text-primary border-primary/30",
                            "text-xs"
                        )}
                    >
                        {ingredient}
                    </Badge>
                );
            })}
        </div>
    );
};

// Enhanced Skeleton Card
const SkeletonCard = () => (
    <Card className="flex flex-col overflow-hidden h-full">
        <Skeleton className="aspect-video w-full rounded-t-md rounded-b-none" />
        <CardHeader className="pb-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-1" />
        </CardHeader>
        <CardContent className="flex-grow space-y-3 pb-3">
            <div className="flex flex-wrap gap-1 mb-3">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-5 w-10 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
        </CardContent>
        <CardFooter className="bg-muted/50 p-3 border-t">
            <div className="flex justify-between w-full">
                <Skeleton className="h-4 w-1/3" />
                <div className="flex gap-1">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                </div>
            </div>
        </CardFooter>
    </Card>
);

// Advanced Filters Component
const AdvancedFilters = ({ 
    onApplyFilters 
}: { 
    onApplyFilters: (filters: any) => void 
}) => {
    const [difficulty, setDifficulty] = useState<string[]>([]);
    const [timeRange, setTimeRange] = useState<[number, number]>([0, 120]);
    const [cuisineTypes, setCuisineTypes] = useState<string[]>([]);
    const [healthTags, setHealthTags] = useState<string[]>([]);
    
    const handleApply = () => {
        onApplyFilters({
            difficulty,
            timeRange,
            cuisineTypes,
            healthTags
        });
    };
    
    return (
        <div className="p-4 space-y-5">
            <div className="space-y-2">
                <h4 className="font-medium">Độ khó</h4>
                <div className="flex flex-wrap gap-2">
                    {["Dễ", "Trung bình", "Khó"].map(level => (
                        <Badge 
                            key={level}
                            variant={difficulty.includes(level) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => {
                                setDifficulty(prev => 
                                    prev.includes(level)
                                        ? prev.filter(d => d !== level)
                                        : [...prev, level]
                                );
                            }}
                        >
                            {level}
                        </Badge>
                    ))}
                </div>
            </div>
            
            <div className="space-y-2">
                <h4 className="font-medium">Loại ẩm thực</h4>
                <div className="flex flex-wrap gap-2">
                    {["Miền Bắc", "Miền Trung", "Miền Nam", "Á đông", "Tây", "Chay"].map(type => (
                        <Badge 
                            key={type}
                            variant={cuisineTypes.includes(type) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => {
                                setCuisineTypes(prev => 
                                    prev.includes(type)
                                        ? prev.filter(t => t !== type)
                                        : [...prev, type]
                                );
                            }}
                        >
                            {type}
                        </Badge>
                    ))}
                </div>
            </div>
            
            <div className="space-y-2">
                <h4 className="font-medium">Chỉ số dinh dưỡng</h4>
                <div className="flex flex-wrap gap-2">
                    {["Ít calo", "Giàu protein", "Ít carb", "Nhiều chất xơ", "Không gluten"].map(tag => (
                        <Badge 
                            key={tag}
                            variant={healthTags.includes(tag) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => {
                                setHealthTags(prev => 
                                    prev.includes(tag)
                                        ? prev.filter(t => t !== tag)
                                        : [...prev, tag]
                                );
                            }}
                        >
                            {tag}
                        </Badge>
                    ))}
                </div>
            </div>
            
            <div className="space-y-2">
                <div className="flex justify-between">
                    <h4 className="font-medium">Thời gian nấu</h4>
                    <span className="text-sm text-muted-foreground">{timeRange[0]} - {timeRange[1]} phút</span>
                </div>
                {/* This is a simplified range input. In production, use a proper range slider component */}
                <div className="flex items-center gap-2">
                    <Input 
                        type="range" 
                        min={0} 
                        max={120} 
                        value={timeRange[0]} 
                        onChange={(e) => setTimeRange([parseInt(e.target.value), timeRange[1]])}
                        className="w-full"
                    />
                    <Input 
                        type="range" 
                        min={0} 
                        max={120} 
                        value={timeRange[1]} 
                        onChange={(e) => setTimeRange([timeRange[0], parseInt(e.target.value)])}
                        className="w-full"
                    />
                </div>
            </div>
            
            <div className="pt-2 flex gap-2 justify-end">
                <Button variant="outline" onClick={() => {
                    setDifficulty([]);
                    setTimeRange([0, 120]);
                    setCuisineTypes([]);
                    setHealthTags([]);
                }}>
                    Reset
                </Button>
                <Button onClick={handleApply}>
                    Áp dụng bộ lọc
                </Button>
            </div>
        </div>
    );
};

// Main Component
export default function PantryTrackerPage() {
    const [ingredientsInput, setIngredientsInput] = useState('');
    const [ingredientsList, setIngredientsList] = useState<IngredientChip[]>([]);
    const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('all');
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [copiedLinkIndex, setCopiedLinkIndex] = useState<number | null>(null);
    const [favoriteRecipes, setFavoriteRecipes] = useState<string[]>([]);
    const [activeFilters, setActiveFilters] = useState<any>({});
    const [showCameraOption, setShowCameraOption] = useState(false);
    const [searchInputValue, setSearchInputValue] = useState('');
    
    const { toast } = useToast();

    // Load saved data from localStorage
    useEffect(() => {
        const storedSearches = localStorage.getItem('recentRecipeSearches');
        if (storedSearches) {
            setRecentSearches(JSON.parse(storedSearches));
        }
        
        const storedFavorites = localStorage.getItem('favoriteRecipes');
        if (storedFavorites) {
            setFavoriteRecipes(JSON.parse(storedFavorites));
        }
    }, []);

    // Save to localStorage when data changes
    useEffect(() => {
        localStorage.setItem('recentRecipeSearches', JSON.stringify(recentSearches));
    }, [recentSearches]);
    
    useEffect(() => {
        localStorage.setItem('favoriteRecipes', JSON.stringify(favoriteRecipes));
    }, [favoriteRecipes]);

    // Handle adding ingredients as chips/tags
    const handleAddIngredient = () => {
        if (!searchInputValue.trim()) return;
        
        const newIngredient: IngredientChip = {
            name: searchInputValue.trim(),
            isOptional: false
        };
        
        setIngredientsList(prev => [...prev, newIngredient]);
        setSearchInputValue('');
    };
    
    const handleRemoveIngredient = (index: number) => {
        setIngredientsList(prev => prev.filter((_, i) => i !== index));
    };
    
    const handleToggleOptional = (index: number) => {
        setIngredientsList(prev => 
            prev.map((ing, i) => 
                i === index 
                    ? { ...ing, isOptional: !ing.isOptional } 
                    : ing
            )
        );
    };

    // Handle adding to recent searches
    const addRecentSearch = (searchTerm: string) => {
        if (!searchTerm) return;
        setRecentSearches(prev => {
            const lowerCaseTerm = searchTerm.toLowerCase();
            const filtered = prev.filter(s => s.toLowerCase() !== lowerCaseTerm);
            const updated = [searchTerm, ...filtered].slice(0, 5);
            return updated;
        });
    };

    // Handle favorite toggling
    const handleToggleFavorite = (recipeId: string) => {
        setFavoriteRecipes(prev => {
            if (prev.includes(recipeId)) {
                toast({ 
                    title: "Đã bỏ yêu thích",
                    description: "Món ăn đã được xóa khỏi danh sách yêu thích của bạn.",
                    variant: "default"
                });
                return prev.filter(id => id !== recipeId);
            } else {
                toast({ 
                    title: "Đã thêm vào yêu thích",
                    description: "Món ăn đã được thêm vào danh sách yêu thích của bạn.",
                    variant: "default"
                });
                return [...prev, recipeId];
            }
        });
    };

    // Handle recipe suggestion request
    const handleSuggestRecipes = useCallback(async (searchQuery?: string) => {
        let ingredients: string[];
        
        if (ingredientsList.length === 0 && (!searchInputValue || searchInputValue.trim() === '')) {
            setError('Vui lòng nhập nguyên liệu để tìm kiếm công thức.');
            return;
        }
        
        if (ingredientsList.length > 0) {
            // Use the ingredients list if we have chips
            ingredients = ingredientsList.map(i => i.name);
        } else {
            // Otherwise use the current input value or provided searchQuery
            const currentInput = searchQuery ?? searchInputValue;
            if (!currentInput.trim()) {
                setError('Vui lòng nhập nguyên liệu để tìm kiếm công thức.');
                return;
            }
            
            ingredients = currentInput
                .split(',')
                .map(ing => ing.trim())
                .filter(ing => ing.length > 0);
        }
        
        if (ingredients.length === 0) {
            setError('Vui lòng nhập ít nhất một nguyên liệu để tìm kiếm công thức.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuggestions([]);
        setHasSearched(true);
        setExpandedCardId(null);
        setActiveTab('all');

        // Add to recent searches
        const searchTerm = ingredients.join(', ');
        addRecentSearch(searchTerm);

        try {
            const response = await fetch('/api/suggest-recipes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ingredients: ingredients,
                    enableWebSearch: isWebSearchEnabled,
                    filters: activeFilters // Pass filters to API
                }),
            });

            if (!response.ok) {
                let errorMsg = `Yêu cầu API thất bại (mã lỗi: ${response.status})`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg;
                } catch (e) {
                    // Ignore if response is not JSON
                }
                throw new Error(errorMsg);
            }

            const data = await response.json();

            // Process suggestions
            const validatedSuggestions = (data.suggestions || [])
                .filter(
                    (s: any): s is Omit<RecipeSuggestion, 'id'> =>
                        typeof s.name === 'string' &&
                        typeof s.description === 'string' &&
                        typeof s.tags === 'object' &&
                        typeof s.citation === 'object' &&
                        typeof s.citation.sourceName === 'string'
                )
                .map((s: Omit<RecipeSuggestion, 'id'>, index: number) => ({
                    ...s,
                    id: `${s.name.replace(/\s+/g, '-')}-${index}`,
                    // Add sample ingredients if not provided by API
                    ingredients: s.ingredients || [
                        "Gạo", "Nước mắm", "Hành lá", "Tỏi", "Dầu ăn", "Ớt"
                    ],
                    // Add random rating for demo purposes
                    tags: {
                        ...s.tags,
                        rating: s.tags.rating || (Math.random() * 2 + 3)
                    }
                }));

            setSuggestions(validatedSuggestions);
            
            // Show success message
            toast({ 
                title: `Tìm thấy ${validatedSuggestions.length} công thức`,
                description: "Dựa trên nguyên liệu bạn đã cung cấp",
                variant: "default" 
            });

        } catch (err: any) {
            console.error("API Error:", err);
            setError(`Lỗi khi tìm công thức: ${err.message || 'Đã xảy ra lỗi không mong muốn.'}`);
        } finally {
            setIsLoading(false);
        }
    }, [ingredientsList, searchInputValue, isWebSearchEnabled, activeFilters, toast]);

    const handleRecentSearchClick = (searchTerm: string) => {
        setSearchInputValue(searchTerm);
        const chips = searchTerm
            .split(',')
            .map(term => ({ 
                name: term.trim(), 
                isOptional: false 
            }))
            .filter(chip => chip.name !== '');
            
        setIngredientsList(chips);
        handleSuggestRecipes(searchTerm);
    };
    
    const handleApplyFilters = (filters: any) => {
        setActiveFilters(filters);
        // Re-fetch recipes with new filters if we've already searched
        if (hasSearched) {
            handleSuggestRecipes();
        }
    };

    // Detect if camera is available
    useEffect(() => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            setShowCameraOption(true);
        }
    }, []);

    // --- Filtering Logic ---
    const recipeCategories = useMemo(() => {
        const categories = new Set<string>(['all']);
        suggestions.forEach(s => {
            if (s.tags.type) categories.add(s.tags.type);
        });
        return Array.from(categories);
    }, [suggestions]);

    const filteredSuggestions = useMemo(() => {
        if (activeTab === 'all') {
            return suggestions;
        }
        return suggestions.filter(s => s.tags.type === activeTab);
    }, [suggestions, activeTab]);

    // --- Share Logic ---
    const handleShare = async (suggestion: RecipeSuggestion, index: number) => {
        const shareData = {
            title: `Công thức: ${suggestion.name}`,
            text: `Xem công thức món "${suggestion.name}" tôi tìm được nè! ${suggestion.description.substring(0, 100)}...`,
            url: suggestion.citation.sourceUrl || window.location.href,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                toast({ title: "Đã chia sẻ thành công!" });
            } catch (err) {
                console.error("Share failed:", err);
            }
        } else {
            try {
                await navigator.clipboard.writeText(shareData.url);
                setCopiedLinkIndex(index);
                toast({ title: "Đã sao chép liên kết!" });
                setTimeout(() => setCopiedLinkIndex(null), 2000);
            } catch (err) {
                console.error("Copy failed:", err);
                toast({ title: "Sao chép liên kết thất bại", variant: "destructive" });
            }
        }
    };

    // Count active filters
    const activeFilterCount = useMemo(() => {
        if (!activeFilters) return 0;
        let count = 0;
        if (activeFilters.difficulty?.length > 0) count++;
        if (activeFilters.cuisineTypes?.length > 0) count++;
        if (activeFilters.healthTags?.length > 0) count++;
        if (activeFilters.timeRange && 
            (activeFilters.timeRange[0] > 0 || activeFilters.timeRange[1] < 120)) count++;
        return count;
    }, [activeFilters]);

    // --- Render Logic ---
    return (
        <TooltipProvider delayDuration={100}>
            {/* Add md:flex to hide sidebar on mobile, navigation handled by MainNav sheet */}
            <div className="flex h-screen bg-background">
                <div className="hidden md:flex"> {/* Wrap Sidebar */}
                    <Sidebar />
                </div>
                <div className="flex-1 flex flex-col overflow-hidden"> {/* Added overflow-hidden */}
                    <MainNav />
                    {/* Adjusted padding for mobile */}
                    <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-8"> 
                        <div className="container mx-auto max-w-7xl">
                            {/* Hero Section with Visual Enhancement */}
                            <header className="mb-8 relative overflow-hidden rounded-lg">
                                <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-6 md:p-8 rounded-lg shadow-sm">
                                    <div className="max-w-3xl">
                                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-primary">
                                            Trợ Lý Bếp Việt
                                        </h1>
                                        <p className="text-muted-foreground text-lg">
                                            Nhập nguyên liệu bạn có, AI sẽ gợi ý món ăn Việt Nam phù hợp!
                                        </p>
                                        <div className="flex items-center mt-4 space-x-2">
                                            <Badge variant="outline" className="bg-background/70 backdrop-blur-sm">
                                                <Zap className="h-3 w-3 mr-1 text-yellow-500" />
                                                Powered by AI
                                            </Badge>
                                            <Badge variant="outline" className="bg-background/70 backdrop-blur-sm">
                                                <MapPin className="h-3 w-3 mr-1 text-red-500" />
                                                Ẩm thực Việt
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </header>

                            {/* Enhanced Input Section */}
                            <Card className="mb-6 shadow-sm border-primary/20">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-xl flex items-center">
                                        <Search className="h-5 w-5 mr-2 text-primary" />
                                        Tìm kiếm công thức
                                    </CardTitle>
                                    <CardDescription>
                                        Nhập nguyên liệu bạn có sẵn và tìm công thức phù hợp
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Modern Search Input with Chips */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="ingredients-input" className="text-sm font-medium">
                                            Nguyên liệu của bạn
                                        </Label>
                                        <div className="flex flex-wrap items-center gap-2 p-2 border rounded-md focus-within:ring-1 focus-within:ring-primary focus-within:border-primary bg-background min-h-[80px]">
                                            {/* Ingredient Chips */}
                                            {ingredientsList.map((ingredient, idx) => (
                                                <Badge 
                                                    key={idx} 
                                                    variant={ingredient.isOptional ? "outline" : "default"}
                                                    className={cn(
                                                        "pl-2 h-7",
                                                        ingredient.isOptional && "border-primary/40 text-primary bg-primary/10"
                                                    )}
                                                >
                                                    {ingredient.name}
                                                    <div className="flex ml-1">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-5 w-5 p-0 hover:bg-transparent"
                                                            onClick={() => handleToggleOptional(idx)}
                                                        >
                                                            {ingredient.isOptional ? (
                                                                <Info className="h-3 w-3 text-primary" />
                                                            ) : (
                                                                <Star className="h-3 w-3 text-primary" />
                                                            )}
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-5 w-5 p-0 hover:bg-transparent"
                                                            onClick={() => handleRemoveIngredient(idx)}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </Badge>
                                            ))}
                                            
                                            {/* Input for new ingredient */}
                                            <div className="flex-1 min-w-[120px]">
                                                <Input
                                                    id="ingredients-input"
                                                    value={searchInputValue}
                                                    onChange={(e) => setSearchInputValue(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleAddIngredient();
                                                        }
                                                    }}
                                                    placeholder={ingredientsList.length ? "Thêm nguyên liệu..." : "VD: thịt gà, trứng, hành tây..."}
                                                    className="border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 h-7 px-0"
                                                    disabled={isLoading}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center pt-1">
                                            <div className="text-xs text-muted-foreground">
                                                {ingredientsList.length > 0 ? 
                                                    `${ingredientsList.length} nguyên liệu` : 
                                                    "Nhập và nhấn Enter để thêm nguyên liệu"}
                                            </div>
                                            {showCameraOption && (
                                                <Button variant="ghost" size="sm" className="h-8 px-2">
                                                    <Camera className="h-4 w-4 mr-1" />
                                                    <span className="text-xs">Chụp nguyên liệu</span>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Recent Searches with Animation */}
                                    <AnimatePresence>
                                        {recentSearches.length > 0 && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                className="pt-1"
                                            >
                                                <Label className="text-xs text-muted-foreground font-medium mb-1.5 block">
                                                    Tìm kiếm gần đây
                                                </Label>
                                                <ScrollArea className="whitespace-nowrap max-w-full pb-2">
                                                    <div className="flex gap-2">
                                                        {recentSearches.map((term, i) => (
                                                            <Tooltip key={i}>
                                                                <TooltipTrigger asChild>
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="cursor-pointer hover:bg-primary/10"
                                                                        onClick={() => handleRecentSearchClick(term)}
                                                                    >
                                                                        <History className="h-3 w-3 mr-1" />
                                                                        {term}
                                                                    </Badge>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Tìm lại với: "{term}"</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        ))}
                                                    </div>
                                                </ScrollArea>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    
                                    {/* Settings Row - Adjusted for mobile stacking */}
                                    {/* Changed flex-wrap to flex-col sm:flex-row, adjusted alignment and gap */}
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pt-2">
                                        {/* Grouped toggles and filters */}
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2"> 
                                            <div className="flex items-center space-x-2">
                                                <Switch
                                                    id="web-search-toggle"
                                                    checked={isWebSearchEnabled}
                                                    onCheckedChange={setIsWebSearchEnabled}
                                                    disabled={isLoading}
                                                />
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Label htmlFor="web-search-toggle" className="text-sm font-normal cursor-pointer">
                                                            Tìm kiếm web
                                                        </Label>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Tìm kiếm công thức từ internet (có thể chậm hơn)</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                            
                                            {/* Removed vertical separator for mobile stacking */}
                                            {/* <Separator orientation="vertical" className="h-5" /> */}
                                            
                                            {/* Advanced Filters */}
                                            <Sheet>
                                                <SheetTrigger asChild>
                                                    <Button variant="outline" size="sm" className="gap-1.5 h-8">
                                                        <Filter className="h-3.5 w-3.5" />
                                                        Bộ lọc
                                                        {activeFilterCount > 0 && (
                                                            <Badge variant="secondary" className="ml-1 h-5 px-1 bg-primary/20">
                                                                {activeFilterCount}
                                                            </Badge>
                                                        )}
                                                    </Button>
                                                </SheetTrigger>
                                                <SheetContent side="right" className="w-full sm:max-w-md">
                                                    <SheetHeader className="mb-4">
                                                        <SheetTitle>Bộ lọc nâng cao</SheetTitle>
                                                        <SheetDescription>
                                                            Lọc công thức theo nhu cầu của bạn
                                                        </SheetDescription>
                                                    </SheetHeader>
                                                    <AdvancedFilters onApplyFilters={handleApplyFilters} />
                                                </SheetContent>
                                            </Sheet>
                                        </div>
                                        
                                        {/* Search Button - Takes full width on mobile, auto on sm+ */}
                                        <Button
                                            onClick={() => handleSuggestRecipes()}
                                            disabled={isLoading || (ingredientsList.length === 0 && !searchInputValue.trim())}
                                            className="w-full sm:w-auto gap-2 mt-2 sm:mt-0" // Added margin top for mobile stacking
                                        >
                                            {isLoading ? (
                                                <> <Loader2 className="h-4 w-4 animate-spin" /> Đang tìm... </>
                                            ) : (
                                                <> <Search className="h-4 w-4" /> Gợi ý món ăn </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Error Display with Animation */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <Alert variant="destructive" className="mb-6">
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertTitle>Lỗi</AlertTitle>
                                            <AlertDescription>{error}</AlertDescription>
                                        </Alert>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Results Section with Animation */}
                            <div className="results-section min-h-[300px]">
                                {/* --- Loading State --- */}
                                {isLoading && (
                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <Skeleton className="h-8 w-48" />
                                            <Skeleton className="h-9 w-36" />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {[...Array(6)].map((_, index) => (
                                                <motion.div 
                                                    key={index}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ 
                                                        opacity: 1, 
                                                        y: 0,
                                                        transition: { delay: index * 0.05 }
                                                    }}
                                                >
                                                    <SkeletonCard />
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* --- Content Display (Suggestions or Empty State) --- */}
                                {!isLoading && hasSearched && (
                                    <>
                                        {/* Tabs and Header (only if suggestions exist) */}
                                        {suggestions.length > 0 && (
                                            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                                                <div>
                                                    <h2 className="text-2xl font-semibold tracking-tight mb-1">
                                                        Kết quả gợi ý
                                                    </h2>
                                                    <p className="text-sm text-muted-foreground">
                                                        {filteredSuggestions.length} món {activeTab !== 'all' ? `thuộc "${activeTab}"` : ''}
                                                        {ingredientsList.length > 0 && ` với ${ingredientsList.filter(i => !i.isOptional).length} nguyên liệu chính`}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {activeFilterCount > 0 && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            onClick={() => {
                                                                setActiveFilters({});
                                                                handleSuggestRecipes();
                                                            }}
                                                            className="h-8"
                                                        >
                                                            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                                                            Bỏ bộ lọc
                                                        </Button>
                                                    )}
                                                    
                                                    {recipeCategories.length > 1 && (
                                                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                                                            <TabsList className="grid grid-cols-3 sm:inline-flex h-8">
                                                                {recipeCategories.map(category => (
                                                                    <TabsTrigger key={category} value={category} className="text-xs capitalize">
                                                                        {category === 'all' ? 'Tất cả' : category}
                                                                    </TabsTrigger>
                                                                ))}
                                                            </TabsList>
                                                        </Tabs>
                                                    )}
                                                    
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" size="sm" className="h-8">
                                                                <Sliders className="h-3.5 w-3.5 mr-1.5" /> Sắp xếp
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem>
                                                                Đánh giá cao nhất
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem>
                                                                Thời gian nấu ngắn nhất
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem>
                                                                Nhiều nguyên liệu khớp nhất
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        )}

                                        {/* Grid or Empty State */}
                                        {filteredSuggestions.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {filteredSuggestions.map((suggestion, index) => {
                                                    const { colorClasses: difficultyColor, Icon: DifficultyIcon } = getDifficultyAttributes(suggestion.tags.difficulty);
                                                    const isExpanded = expandedCardId === suggestion.id;
                                                    const isFavorite = favoriteRecipes.includes(suggestion.id);
                                                    
                                                    // Prepare list of user ingredients to highlight in recipe
                                                    const userIngredients = ingredientsList.map(ing => ing.name);

                                                    return (
                                                        <motion.div
                                                            key={suggestion.id}
                                                            initial={{ opacity: 0, y: 20 }}
                                                            animate={{ 
                                                                opacity: 1, 
                                                                y: 0,
                                                                transition: { delay: index * 0.05 }
                                                            }}
                                                        >
                                                            <Card
                                                                className={cn(
                                                                    "flex flex-col overflow-hidden h-full transition-all duration-300 ease-in-out",
                                                                    isExpanded ? "shadow-lg ring-1 ring-primary/20" : "hover:shadow-md",
                                                                    isFavorite && "ring-1 ring-primary/30"
                                                                )}
                                                            >
                                                                <CardHeader className="p-0 relative">
                                                                    {/* Image */}
                                                                    <div
                                                                        className="relative w-full aspect-video bg-muted flex items-center justify-center rounded-t-md cursor-pointer overflow-hidden"
                                                                        onClick={() => setExpandedCardId(isExpanded ? null : suggestion.id)}
                                                                    >
                                                                        {suggestion.imageUrl ? (
                                                                            <Image
                                                                                src={suggestion.imageUrl}
                                                                                alt={`Hình ảnh ${suggestion.name}`}
                                                                                layout="fill"
                                                                                objectFit="cover"
                                                                                className="transition-transform duration-300 ease-in-out hover:scale-105"
                                                                                unoptimized
                                                                            />
                                                                        ) : (
                                                                            <ChefHat className="h-12 w-12 text-muted-foreground" />
                                                                        )}
                                                                        
                                                                        {/* Favorite Button */}
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleToggleFavorite(suggestion.id);
                                                                            }}
                                                                            className="absolute top-2 right-2 h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background/90 z-10 shadow-sm"
                                                                        >
                                                                            <Heart 
                                                                                className={cn(
                                                                                    "h-4 w-4 transition-colors",
                                                                                    isFavorite ? "fill-primary text-primary" : "text-muted-foreground"
                                                                                )} 
                                                                            />
                                                                        </Button>
                                                                        
                                                                        {/* Region Badge on Image */}
                                                                        {suggestion.tags.region && (
                                                                            <Badge variant="secondary" className="absolute top-2 left-2 z-10 shadow bg-background/80 backdrop-blur-sm">
                                                                                <MapPin className="h-3 w-3 mr-1" /> {suggestion.tags.region}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </CardHeader>
                                                                <CardContent
                                                                    className="p-4 flex flex-col flex-grow cursor-pointer"
                                                                    onClick={() => setExpandedCardId(isExpanded ? null : suggestion.id)}
                                                                >
                                                                    <div className="mb-1.5">
                                                                        {suggestion.tags.rating && (
                                                                            <RatingStars rating={suggestion.tags.rating} />
                                                                        )}
                                                                    </div>
                                                                    
                                                                    {/* Adjusted title size for mobile */}
                                                                    <CardTitle className="text-lg sm:text-xl font-bold mb-1.5">{suggestion.name}</CardTitle>
                                                                    
                                                                    {/* Enhanced Tags */}
                                                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                                                        {suggestion.tags.difficulty && (
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <Badge variant="outline" className={cn("border", difficultyColor)}>
                                                                                        <DifficultyIcon className="h-3.5 w-3.5 mr-1" /> {suggestion.tags.difficulty}
                                                                                    </Badge>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent><p>Độ khó: {suggestion.tags.difficulty}</p></TooltipContent>
                                                                            </Tooltip>
                                                                        )}
                                                                        {suggestion.tags.time && (
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <Badge variant="outline"><Clock className="h-3.5 w-3.5 mr-1" /> {suggestion.tags.time}</Badge>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent><p>Thời gian nấu: {suggestion.tags.time}</p></TooltipContent>
                                                                            </Tooltip>
                                                                        )}
                                                                        {suggestion.tags.type && (
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <Badge variant="outline"><Tag className="h-3.5 w-3.5 mr-1" /> {suggestion.tags.type}</Badge>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent><p>Loại món: {suggestion.tags.type}</p></TooltipContent>
                                                                            </Tooltip>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    {/* Description (Expandable) */}
                                                                    <p className={cn(
                                                                        "text-sm text-muted-foreground mb-4 flex-grow transition-all duration-300 ease-in-out",
                                                                        !isExpanded && "line-clamp-3"
                                                                    )}>
                                                                        {suggestion.description}
                                                                    </p>
                                                                    
                                                                    {/* Ingredients display (only when expanded) */}
                                                                    {(isExpanded && suggestion.ingredients) && (
                                                                        <div className="mt-1 mb-2">
                                                                            <h4 className="text-sm font-medium mb-1">Nguyên liệu:</h4>
                                                                            <IngredientChips 
                                                                                ingredients={suggestion.ingredients}
                                                                                highlightedIngredients={userIngredients}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {!isExpanded && suggestion.description.length > 100 && (
                                                                        <span className="text-xs text-primary hover:underline">Xem thêm...</span>
                                                                    )}
                                                                </CardContent>
                                                                <CardFooter className="bg-muted/50 p-3 border-t mt-auto flex justify-between items-center">
                                                                    {/* Citation */}
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <div className="flex items-center gap-1.5 text-muted-foreground overflow-hidden cursor-default">
                                                                                {suggestion.citation.isVideo ? <Youtube className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
                                                                                    : suggestion.citation.sourceName === 'AI Creative Suggestion' ? <ChefHat className="h-3.5 w-3.5 flex-shrink-0" />
                                                                                        : suggestion.citation.sourceName === 'Wikipedia' ? <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
                                                                                            : <LinkIcon className="h-3.5 w-3.5 flex-shrink-0" />}
                                                                                <span className="truncate">{suggestion.citation.sourceName}</span>
                                                                            </div>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>Nguồn: {suggestion.citation.sourceName}</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>

                                                                    {/* Action Buttons */}
                                                                    <div className="flex items-center gap-1">
                                                                        {/* Comment Button */}
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                {/* Increased button size slightly for touch */}
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-8 w-8" 
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                >
                                                                                    <MessageSquare className="h-4 w-4" /> 
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                                <TooltipContent><p>Bình luận</p></TooltipContent>
                                                                        </Tooltip>
                                                                        
                                                                        {/* View Recipe Button */}
                                                                        {suggestion.citation.sourceUrl && (
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    {/* Increased button size slightly for touch */}
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className="h-8 w-8" 
                                                                                        onClick={(e) => { 
                                                                                            e.stopPropagation(); 
                                                                                            window.open(suggestion.citation.sourceUrl, '_blank'); 
                                                                                        }}
                                                                                    >
                                                                                        <ExternalLink className="h-4 w-4" /> 
                                                                                    </Button>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent><p>Xem công thức gốc</p></TooltipContent>
                                                                            </Tooltip>
                                                                        )}
                                                                        
                                                                        {/* Share Button */}
                                                                        <Popover>
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <PopoverTrigger asChild>
                                                                                        {/* Increased button size slightly for touch */}
                                                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                                                                            <Share2 className="h-4 w-4" /> 
                                                                                        </Button>
                                                                                    </PopoverTrigger>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent><p>Chia sẻ</p></TooltipContent>
                                                                            </Tooltip>
                                                                            <PopoverContent className="w-auto p-2" side="top" align="end">
                                                                                <div className="flex gap-2">
                                                                                    {/* Kept popover button size as is */}
                                                                                    <Button 
                                                                                        variant="outline" 
                                                                                        size="sm" 
                                                                                        onClick={(e) => { 
                                                                                            e.stopPropagation(); 
                                                                                            handleShare(suggestion, index); 
                                                                                        }}
                                                                                    >
                                                                                        {/* Corrected check for navigator.share existence */}
                                                                                        {navigator.share ? ( 
                                                                                            <>
                                                                                                <Share2 className="h-4 w-4 mr-1.5" />
                                                                                                Chia sẻ
                                                                                            </>
                                                                                        ) : (
                                                                                            <>
                                                                                                {copiedLinkIndex === index ? (
                                                                                                    <>
                                                                                                        <Check className="h-4 w-4 mr-1.5 text-green-500" />
                                                                                                        Đã chép
                                                                                                    </>
                                                                                                ) : (
                                                                                                    <>
                                                                                                        <Copy className="h-4 w-4 mr-1.5" />
                                                                                                        Sao chép link
                                                                                                    </>
                                                                                                )}
                                                                                            </>
                                                                                        )}
                                                                                    </Button>
                                                                                </div>
                                                                            </PopoverContent>
                                                                        </Popover>
                                                                        
                                                                        {/* Save/Bookmark Button */}
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                {/* Increased button size slightly for touch */}
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-8 w-8" 
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                >
                                                                                    <Bookmark className="h-4 w-4" /> 
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent><p>Lưu công thức</p></TooltipContent>
                                                                        </Tooltip>
                                                                    </div>
                                                                </CardFooter>
                                                            </Card>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            /* --- Enhanced Empty State --- */
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                <div className="mt-8 text-center py-12 px-6 border border-dashed rounded-lg bg-muted/50 flex flex-col items-center">
                                                    <SearchX className="h-14 w-14 text-muted-foreground mb-4" />
                                                    <h3 className="text-xl font-semibold mb-2">
                                                        {activeTab === 'all'
                                                            ? "Không tìm thấy công thức phù hợp"
                                                            : `Không có công thức "${activeTab}" nào`}
                                                    </h3>
                                                    <p className="text-muted-foreground max-w-md mx-auto">
                                                        {activeTab === 'all'
                                                            ? "Chúng tôi không tìm thấy món ăn nào với nguyên liệu bạn cung cấp. Hãy thử:"
                                                            : `Không tìm thấy món ăn nào thuộc loại "${activeTab}" với nguyên liệu này. Bạn có thể:`}
                                                    </p>
                                                    <ul className="list-disc list-inside text-muted-foreground mt-4 text-sm text-left inline-block space-y-1">
                                                        <li>Kiểm tra lại lỗi chính tả nguyên liệu.</li>
                                                        <li>Thử thêm hoặc bớt nguyên liệu.</li>
                                                        <li>{activeTab !== 'all' ? 'Chọn mục "Tất cả" để xem các loại khác.' : 'Đánh dấu một số nguyên liệu là tùy chọn.'}</li>
                                                        <li>Bật tùy chọn "Tìm kiếm web" nếu chưa bật.</li>
                                                    </ul>
                                                    <div className="mt-6 flex gap-3">
                                                        {activeTab !== 'all' && (
                                                            <Button variant="outline" size="sm" onClick={() => setActiveTab('all')}>
                                                                Xem tất cả loại món
                                                            </Button>
                                                        )}
                                                        <Button 
                                                            variant={activeTab === 'all' ? "default" : "outline"} 
                                                            size="sm"
                                                            onClick={() => {
                                                                // Reset filters and try again
                                                                setActiveFilters({});
                                                                if (activeTab !== 'all') setActiveTab('all');
                                                                handleSuggestRecipes();
                                                            }}
                                                        >
                                                            <RefreshCw className="h-4 w-4 mr-1.5" />
                                                            Thử lại
                                                        </Button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </>
                                )}
                                
                                {/* First-time user prompt */}
                                {!isLoading && !hasSearched && (
                                    <div className="flex justify-center mt-16">
                                        <Card className="max-w-md w-full bg-muted/40">
                                            <CardHeader>
                                                <CardTitle className="flex items-center">
                                                    <Info className="h-5 w-5 mr-2 text-primary" />
                                                    Hướng dẫn sử dụng
                                                </CardTitle>
                                                <CardDescription>
                                                    Cách tìm công thức phù hợp với nguyên liệu của bạn
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="space-y-2">
                                                    <h4 className="font-medium">Bắt đầu với 3 bước đơn giản:</h4>
                                                    <ol className="list-decimal list-inside space-y-2 text-sm">
                                                        <li>Nhập các nguyên liệu bạn có sẵn (ví dụ: thịt gà, cà rốt)</li>
                                                        <li>Tùy chọn bật tìm kiếm web để mở rộng kết quả</li>
                                                        <li>Nhấn nút "Gợi ý món ăn" để nhận gợi ý công thức</li>
                                                    </ol>
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <h4 className="font-medium">Mẹo tìm kiếm hiệu quả:</h4>
                                                    <ul className="list-disc list-inside text-sm space-y-1.5">
                                                        <li>Đánh dấu nguyên liệu "tùy chọn" nếu không bắt buộc phải có</li>
                                                        <li>Sử dụng bộ lọc để tìm món ăn phù hợp với chế độ ăn</li>
                                                        <li>Chụp ảnh nguyên liệu thay vì gõ (nếu thiết bị hỗ trợ)</li>
                                                    </ul>
                                                </div>
                                            </CardContent>
                                            <CardFooter>
                                                <Button 
                                                    className="w-full"
                                                    onClick={() => {
                                                        // Pre-fill with example ingredients
                                                        const examples = [
                                                            { name: "thịt gà", isOptional: false },
                                                            { name: "hành tây", isOptional: false },
                                                            { name: "cà rốt", isOptional: true }
                                                        ];
                                                        setIngredientsList(examples);
                                                    }}
                                                >
                                                    Thử với mẫu nguyên liệu
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    </div>
                                )}
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </TooltipProvider>
    );
}
