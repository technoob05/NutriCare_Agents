// src/components/ui/interactive-menu.tsx
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
                    <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Ingredients: {item.ingredients.join(', ')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Preparation: {item.preparation}
                        </p>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0 ml-2">{item.estimatedCost}</Badge>
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
        <Accordion type="multiple" defaultValue={mealSections} className="w-full mt-2">
            {dayData.breakfast && dayData.breakfast.length > 0 && (
                <AccordionItem value="breakfast" className="border-b">
                    <AccordionTrigger className="py-2 hover:no-underline">Breakfast</AccordionTrigger>
                    <AccordionContent>{renderMenuItems(dayData.breakfast)}</AccordionContent>
                </AccordionItem>
            )}
            {dayData.lunch && dayData.lunch.length > 0 && (
                <AccordionItem value="lunch" className="border-b">
                    <AccordionTrigger className="py-2 hover:no-underline">Lunch</AccordionTrigger>
                    <AccordionContent>{renderMenuItems(dayData.lunch)}</AccordionContent>
                </AccordionItem>
            )}
            {dayData.dinner && dayData.dinner.length > 0 && (
                <AccordionItem value="dinner" className="border-b">
                    <AccordionTrigger className="py-2 hover:no-underline">Dinner</AccordionTrigger>
                    <AccordionContent>{renderMenuItems(dayData.dinner)}</AccordionContent>
                </AccordionItem>
            )}
            {dayData.snacks && dayData.snacks.length > 0 && (
                <AccordionItem value="snacks" className="border-b">
                    <AccordionTrigger className="py-2 hover:no-underline">Snacks</AccordionTrigger>
                    <AccordionContent>{renderMenuItems(dayData.snacks)}</AccordionContent>
                </AccordionItem>
            )}
        </Accordion>
    );
};

const daysOfWeek: (keyof WeeklyMenuData)[] = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
];

export function InteractiveMenu({ menuData }: InteractiveMenuProps) {
    const { menu, menuType, feedbackRequest } = menuData;

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
                                {day.substring(0,3)}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {daysOfWeek.map(day => (
                        <TabsContent key={day} value={day}>
                            {renderDayMeals(weeklyMenu[day])}
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
            {renderDayMeals(dailyMenu)}

            {feedbackRequest && (
                <>
                    <Separator className="my-4" />
                    <p className="px-4 pb-4 text-sm text-muted-foreground italic">{feedbackRequest}</p>
                </>
            )}
        </div>
    );
}