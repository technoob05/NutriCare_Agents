'use client';

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { type DailyMenuData, type WeeklyMenuData, type AnyMenuData } from '@/ai/flows/generate-menu-from-preferences';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, Trash2 } from 'lucide-react'; // Added icons for interaction
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from '@/hooks/use-mobile'; //Check Mobile

interface MenuItem {
    name: string;
    ingredients: string[];
    preparation: string;
    estimatedCost: string;
}

interface InteractiveMenuProps {
    menuData: {
        menu?: AnyMenuData;
        menuType: 'daily' | 'weekly';
        feedbackRequest?: string;
    };
}

const renderMenuItems = (items: MenuItem[] | undefined) => {
    if (!items || items.length === 0) {
        return <p className="text-sm text-muted-foreground px-4 pb-4">No dishes planned for this meal.</p>;
    }
    return (
        <ul className="space-y-3 px-4 pb-4">
            {items.map((item, index) => (
                <li key={index} className="flex justify-between items-start p-3 rounded-md shadow-sm border bg-card text-card-foreground">
                    <div className="flex-grow">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Ingredients: {item.ingredients.join(', ')}
                        </p>
                        <ScrollArea className="h-24 w-full mt-1">
                            <p className="text-xs text-muted-foreground">
                                Preparation: {item.preparation}
                            </p>
                        </ScrollArea>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                        <Badge variant="secondary" className="text-xs shrink-0">{item.estimatedCost}</Badge>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
                                    <span className="sr-only">Open menu</span>
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Trash2 className="mr-2 h-4 w-4" /> Remove
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </li>
            ))}
        </ul>
    );
};

const renderDayMeals = (dayData: DailyMenuData | undefined) => {
    if (!dayData) {
        return <p className="text-sm text-muted-foreground p-4">No meals planned for this day.</p>;
    }
    const mealSections = Object.entries(dayData)
        .filter(([_, items]) => items && items.length > 0)
        .map(([mealType]) => mealType);

    if (mealSections.length === 0) {
        return <p className="text-sm text-muted-foreground p-4">No meals planned for this day.</p>;
    }

    return (
        <div className="space-y-4">
            {dayData.breakfast && dayData.breakfast.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Breakfast</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {renderMenuItems(dayData.breakfast)}
                    </CardContent>
                </Card>
            )}
            {dayData.lunch && dayData.lunch.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Lunch</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {renderMenuItems(dayData.lunch)}
                    </CardContent>
                </Card>
            )}
            {dayData.dinner && dayData.dinner.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Dinner</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {renderMenuItems(dayData.dinner)}
                    </CardContent>
                </Card>
            )}
            {dayData.snacks && dayData.snacks.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Snacks</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {renderMenuItems(dayData.snacks)}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

const daysOfWeek: (keyof WeeklyMenuData)[] = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
];

export function InteractiveMenu({ menuData }: InteractiveMenuProps) {
    const { menu, menuType, feedbackRequest } = menuData;
    const isMobile = useIsMobile();

    // Dynamically calculate max height
    const calculateMaxHeight = () => {
        const baseHeight = isMobile ? 50 : 300; // Reduced base height for mobile
        return `calc(100vh - ${baseHeight}px)`;
    };

    if (!menu) {
        return (
            <div className="p-4 text-muted-foreground">
                No menu data available.
                {feedbackRequest && <p className="mt-4 text-sm italic">{feedbackRequest}</p>}
            </div>
        )
    }

    if (menuType === 'weekly') {
        const weeklyMenu = menu as WeeklyMenuData;
        const hasAnyWeeklyData = daysOfWeek.some(day => weeklyMenu[day] && Object.keys(weeklyMenu[day]!).length > 0);

        if (!hasAnyWeeklyData) {
            return (
                <div className="p-4 text-muted-foreground">
                    No weekly menu items were generated.
                    {feedbackRequest && <p className="mt-4 text-sm italic">{feedbackRequest}</p>}
                </div>
            )
        }

        return (
            <div className="w-full">
                <Tabs defaultValue={daysOfWeek[0]} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 md:grid-cols-7 h-auto mb-2">
                        {daysOfWeek.map(day => (
                            <TabsTrigger key={day} value={day} className="py-1.5 text-xs sm:text-sm">
                                {day.substring(0, 3)}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {daysOfWeek.map(day => (
                        <TabsContent key={day} value={day}>
                            <Card>
                                <CardHeader>
                                    <CardTitle>{day}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {renderDayMeals(weeklyMenu[day])}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    ))}
                </Tabs>

                {feedbackRequest && (
                    <>
                        <Separator className="my-4" />
                        <p className="px-4 pb-4 text-sm text-muted-foreground italic">{feedbackRequest}</p>
                    </>
                )}
            </div>
        );
    }

    const dailyMenu = menu as DailyMenuData;
    const mealSections = Object.entries(dailyMenu)
        .filter(([_, items]) => items && items.length > 0)
        .map(([mealType]) => mealType);

    if (mealSections.length === 0) {
        return (
            <div className="p-4 text-muted-foreground">
                No daily menu items were generated.
                {feedbackRequest && <p className="mt-4 text-sm italic">{feedbackRequest}</p>}
            </div>
        )
    }

    return (
        <div className="w-full">
            <Card>
                <CardHeader>
                    <CardTitle>Daily Menu</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className={ `max-h-[${calculateMaxHeight()}]` }>
                        {renderDayMeals(dailyMenu)}
                    </ScrollArea>
                </CardContent>
            </Card>

            {feedbackRequest && (
                <>
                    <Separator className="my-4" />
                    <p className="px-4 pb-4 text-sm text-muted-foreground italic">{feedbackRequest}</p>
                </>
            )}
        </div>
    );
}
