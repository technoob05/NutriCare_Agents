"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar"
import {
  LogOut,
  MessageSquare,
  TrendingUp,
  Apple,
  Utensils,
  Brain,
  ChevronRight,
  Search,
  Filter,
  ArrowRight,
  Heart,
  BookOpen,
  UserCircle,
  Settings, // Added Settings icon
} from "lucide-react";
import { MainNav } from "@/components/main-nav";
import { useToast } from "@/hooks/use-toast";
// Import useAuth hook and signOut
import { useAuth } from "@/context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger, // Added DialogTrigger
} from "@/components/ui/dialog"
import { motion, AnimatePresence } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import QuickActions from "@/components/QuickActions" // Added import
import PersonalizedInsights from "@/components/PersonalizedInsights" // Added import
import DailyTip from "@/components/DailyTip" // Added import
import AiShowcase from "@/components/AiShowcase" // Added import
import { SettingsDialogContent } from "@/components/SettingsDialogContent"; // Added import for settings
import recommendationsData from "../../public/data/recommendations.json" // Import JSON data
import { useTranslation } from "react-i18next";

// Cập nhật giao diện Meal để khớp với recommendations.json
interface Meal {
  name: string
  ingredients: string[]
  nutrition: {
    calories: number
    protein: number
    carbs: number
    fat: number
    sodium: number // Đã thêm sodium
  }
  preparation: string
  price: number
}

// Các biến thể hoạt ảnh
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 }
  }
}

export default function HomePage() {
  const router = useRouter();
  // Use auth context for user and loading state
  const { user, loading } = useAuth();
  // Initialize meals state directly from imported data
  const [meals, setMeals] = useState<Meal[]>(recommendationsData.meals || []);
  const { toast } = useToast();
  const { t } = useTranslation();

  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false); // State for settings dialog

  // Effect for redirecting if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  // Effect for loading favorites from localStorage
  useEffect(() => {
    // Tải danh sách yêu thích từ localStorage
    if (typeof window !== "undefined") {
      const savedFavorites = localStorage.getItem("favorites");
      if (savedFavorites) {
        try {
          setFavorites(JSON.parse(savedFavorites))
        } catch (error) {
          console.error("Lỗi khi phân tích cú pháp mục yêu thích từ localStorage:", error)
          localStorage.removeItem("favorites") // Xóa dữ liệu không hợp lệ
        }
      }
    }
    // Only run this effect once on mount
  }, []);

  // Removed checkAuth function
  // Removed loadMeals function

  // Updated handleLogout to use Firebase signOut
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // AuthProvider's onAuthStateChanged will handle user state update
      toast({
        title: "Thông báo",
        description: "Đăng xuất thành công.",
      });
      // No need to manually push, the redirect effect will handle it
      // router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Lỗi",
        description: "Đã xảy ra lỗi khi đăng xuất.",
        variant: "destructive",
      });
    }
  };

  const toggleFavorite = (mealName: string) => {
    let newFavorites = [...favorites]
    if (favorites.includes(mealName)) {
      newFavorites = favorites.filter(name => name !== mealName)
    } else {
      newFavorites.push(mealName)
    }
    setFavorites(newFavorites)

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem("favorites", JSON.stringify(newFavorites))
      } catch (error) {
        console.error("Lỗi khi lưu mục yêu thích vào localStorage:", error)
        toast({
          title: "Lỗi",
          description: "Không thể lưu trạng thái yêu thích.",
          variant: "destructive",
        })
      }
    }

    toast({
      title: favorites.includes(mealName) ? "Đã xóa khỏi danh sách yêu thích" : "Đã thêm vào danh sách yêu thích",
      description: mealName,
    })
  }

  // Lọc món ăn dựa trên tìm kiếm và tab
  const filteredMeals = meals.filter(meal => {
    // Kiểm tra xem meal và các thuộc tính cần thiết có tồn tại không
    if (!meal || !meal.name || !Array.isArray(meal.ingredients) || !meal.nutrition) {
        return false;
    }

    const lowerCaseQuery = searchQuery.toLowerCase();
    const matchesSearch = meal.name.toLowerCase().includes(lowerCaseQuery) ||
      meal.ingredients.some(ing => typeof ing === 'string' && ing.toLowerCase().includes(lowerCaseQuery));

    if (!matchesSearch) return false;

    switch (activeTab) {
      case "all":
        return true;
      case "favorites":
        // Đảm bảo meal.name là string trước khi kiểm tra includes
        return typeof meal.name === 'string' && favorites.includes(meal.name);
      case "highProtein":
        // Kiểm tra meal.nutrition.protein là number
        return typeof meal.nutrition.protein === 'number' && meal.nutrition.protein > 20;
      case "lowCalorie":
        // Kiểm tra meal.nutrition.calories là number
        return typeof meal.nutrition.calories === 'number' && meal.nutrition.calories < 500;
      default:
        return true; // Mặc định hiển thị nếu tab không khớp
    }
  });

  // Use loading state from useAuth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        {/* Sử dụng Skeleton cho trạng thái tải */}
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center space-x-4 mb-8">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
          <div className="mb-8">
            <Skeleton className="h-8 w-1/4 mb-4" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-10 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // The redirect effect handles the case where there's no user after loading
  // If loading is false and user exists, render the content
  if (!loading && !user) {
    // Should have been redirected by the effect, return null to prevent rendering flicker
    return null;
  }

  // Render content only when loading is complete and user exists
  return (
    <div className="min-h-screen bg-background">
      {/* Header với hiệu ứng Glassmorphism */}
      <header className="border-b sticky top-0 bg-background/90 backdrop-blur-md z-50 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <MainNav />
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="hidden md:flex"
                onClick={() => router.push("/chat")}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                {t('chat_with_ai')}
              </Button>

              <div className="flex items-center gap-1">
                <Avatar className="h-8 w-8 border border-primary/10">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {/* Use user.displayName or email initial */}
                    {user?.displayName
                      ? user.displayName[0].toUpperCase()
                      : user?.email
                      ? user.email[0].toUpperCase()
                      : "?"}
                  </div>
                </Avatar>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Đăng xuất" // Thêm aria-label
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Phần Hero với thiết kế trực quan cải tiến */}
        <section className="py-20 px-4 text-center relative overflow-hidden bg-gradient-to-b from-background via-background to-muted/20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="container mx-auto relative z-10"
          >
            <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              {t('ai_nutrition')}
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/90 to-purple-500">
              {t('welcome')}
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              {t('hero_subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  onClick={() => router.push("/chat")}
                  className="shadow-lg relative group overflow-hidden"
                >
                  <span className="relative z-10 flex items-center">
                    {t('start_now')} <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-r from-primary to-primary-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary/20 hover:border-primary/30"
                  onClick={() => {
                    const element = document.getElementById('recommendations');
                    element?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  {t('explore_meals')}
                </Button>
              </motion.div>
            </div>
          </motion.div>

            {/* Thẻ Hồ sơ người dùng */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Card className="overflow-hidden shadow-md border-primary/10">
                <div className="bg-gradient-to-r from-primary/5 via-purple-500/5 to-background p-8">
                  <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
                    <Avatar className="h-24 w-24 ring-4 ring-background shadow-md">
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-500 text-4xl font-semibold text-primary-foreground">
                        {/* Use user.displayName or email initial */}
                        {user?.displayName
                          ? user.displayName[0].toUpperCase()
                          : user?.email
                          ? user.email[0].toUpperCase()
                          : "?"}
                      </div>
                    </Avatar>
                    <div className="text-center sm:text-left">
                      {/* Use user.displayName or 'Người dùng' */}
                      <CardTitle className="text-3xl mb-2">
                        {user?.displayName || "Người dùng"}
                      </CardTitle>
                      <p className="text-muted-foreground">
                        {user?.email || "Không có email"}
                      </p>
                      <div className="mt-4 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8"
                          onClick={() => router.push("/profile")}
                        >
                          <UserCircle className="mr-1 h-3 w-3" />
                           {t('profile')}
                         </Button>
                         {/* Updated Settings Button to open Dialog */}
                         <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setIsSettingsDialogOpen(true)}>
                           <Settings className="mr-1 h-3 w-3" /> {/* Added icon */}
                           {t('settings')}
                         </Button>
                       </div>
                     </div> {/* Inner div for text-center/left */}
                   </div> {/* Inner div for flex */}
                 </div> {/* This is the correct closing tag for the div starting on line 294 */}
                 <CardContent className="p-6">
                   {/* Cập nhật các số liệu thống kê này bằng dữ liệu thực tế nếu có */}
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { icon: BookOpen, label: "Thực đơn đã tạo", value: "0" }, // Placeholder
                      // Assuming targetCalories might come from user profile data later, not directly from Firebase auth user object
                      { icon: Apple, label: "Calories mục tiêu", value: "N/A" }, // Placeholder, adjust if profile data is fetched
                      {
                        icon: Heart,
                        label: "Món ăn yêu thích",
                        value: favorites.length.toString(),
                      },
                      { icon: Brain, label: "Tương tác AI", value: "0" }, // Placeholder
                    ].map((stat, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className="flex flex-col items-center p-6 rounded-xl bg-muted/30 text-center hover:bg-muted/50 transition-colors"
                      >
                        <div className="p-3 rounded-full bg-primary/10 mb-3">
                          <stat.icon className="h-5 w-5 text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                        <p className="text-2xl font-bold">{stat.value}</p>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.section>

            {/* Gợi ý món ăn với bộ lọc và tìm kiếm cải tiến */}
            <motion.section
              id="recommendations"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <div className="flex flex-col space-y-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-2">
                  <div>
                    <h2 className="text-3xl font-bold">{t('suggested_meals')}</h2>
                    <p className="text-muted-foreground mt-1">
                      {t('suggested_meals_subtitle')}
                    </p>
                  </div>
                  {/* Ensure button doesn't take full width on small screens when stacked */}
                  <Button onClick={() => router.push("/chat")} className="shrink-0 w-full md:w-auto">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {t('customize_menu')}
                  </Button>
                </div>

                {/* Tìm kiếm và Lọc */}
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center mb-4">
                  <div className="relative flex-grow w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('search_placeholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      aria-label={t('search_placeholder')}
                    />
                  </div>

                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full md:w-auto"
                  >
                    <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full md:w-auto">
                      <TabsTrigger value="all">{t('all')}</TabsTrigger>
                      <TabsTrigger value="favorites">{t('favorites')}</TabsTrigger>
                      <TabsTrigger value="highProtein">{t('high_protein')}</TabsTrigger>
                      <TabsTrigger value="lowCalorie">{t('low_calorie')}</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              {/* Thông báo không có kết quả */}
              {filteredMeals.length === 0 && searchQuery && ( // Chỉ hiển thị nếu có tìm kiếm và không có kết quả
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                    <Filter className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">Không tìm thấy kết quả</h3>
                  <p className="text-muted-foreground">Thử tìm kiếm với từ khóa khác hoặc thay đổi bộ lọc</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setSearchQuery('');
                      setActiveTab('all');
                    }}
                  >
                    Xóa bộ lọc
                  </Button>
                </div>
              )}

              {/* Lưới các thẻ món ăn */}
              <motion.div
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <AnimatePresence>
                  {filteredMeals.map((meal) => (
                    <motion.div
                      key={meal.name} // Sử dụng tên món ăn làm key
                      variants={itemVariants}
                      layout
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <Card className="group relative overflow-hidden h-full flex flex-col hover:shadow-lg transition-all duration-300 border-primary/10">
                        {/* Phần đầu thẻ món ăn */}
                        <CardHeader className="p-4 pb-2 flex flex-row justify-between items-start">
                          <CardTitle className="text-lg font-semibold">{meal.name}</CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 rounded-full ${favorites.includes(meal.name) ? 'text-red-500 hover:bg-red-100' : 'text-muted-foreground hover:bg-accent'}`}
                            onClick={(e) => {
                              e.stopPropagation(); // Ngăn sự kiện click vào card
                              toggleFavorite(meal.name)
                            }}
                            aria-label={favorites.includes(meal.name) ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
                          >
                            <Heart className={`h-4 w-4 ${favorites.includes(meal.name) ? 'fill-current' : ''}`} />
                          </Button>
                        </CardHeader>

                        {/* Nội dung thẻ món ăn */}
                        <CardContent className="p-4 pt-2 flex-grow flex flex-col">
                          {/* Huy hiệu dinh dưỡng */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-200 border-none">
                              {meal.nutrition.calories} kcal
                            </Badge>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">
                              {meal.nutrition.protein}g P
                            </Badge>
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none">
                              {meal.nutrition.carbs}g C
                            </Badge>
                            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200 border-none">
                              {meal.nutrition.fat}g F
                            </Badge>
                          </div>

                          {/* Nguyên liệu */}
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Nguyên liệu:</h4>
                            <div className="flex flex-wrap gap-1">
                              {meal.ingredients.slice(0, 4).map((ingredient, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-0.5 bg-primary/5 text-primary rounded-full text-xs"
                                >
                                  {ingredient}
                                </span>
                              ))}
                              {meal.ingredients.length > 4 && (
                                <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs">
                                  +{meal.ingredients.length - 4}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Giá và Hành động */}
                          <div className="flex items-center justify-between mt-auto pt-4 border-t">
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl font-bold">{meal.price?.toLocaleString() ?? 'N/A'}</span>
                              <span className="text-sm text-muted-foreground">đ</span>
                            </div>
                            <Button
                              size="sm"
                              className="rounded-full"
                              onClick={() => {
                                setSelectedMeal(meal)
                                setShowDetails(true)
                              }}
                            >
                              {t('details')}
                              <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </motion.section>

          {/* Các mẫu nền hoạt hình */}
          <div className="absolute inset-0 -z-10 opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"></div>
          </div>
        </section>

        {/* Nội dung chính */}
        <div className="container mx-auto px-4 py-12">
          {/* Quick Actions Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="mb-12" // Add margin below Quick Actions
          >
            <QuickActions />
          </motion.section>

          <div className="grid gap-16">
             {/* Insights and Tip Section */}
             <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8" // Grid for side-by-side layout on medium screens and up
            >
              <PersonalizedInsights />
              <DailyTip />
            </motion.section>

             {/* AI Showcase Section */}
             <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }} // Slightly later delay
            >
              <AiShowcase />
            </motion.section>
          </div>
        </div>

        {/* Dialog chi tiết món ăn nâng cao */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          {/* Responsive Dialog Width: narrower on small screens, max-width on larger screens */}
          <DialogContent className="w-[90vw] sm:max-w-3xl p-0">
            {selectedMeal && (
              <>
                <DialogHeader className="p-6 pb-4 border-b">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <DialogTitle className="text-2xl mb-1">{selectedMeal.name}</DialogTitle>
                      <DialogDescription>
                        Chi tiết về món ăn và dinh dưỡng
                      </DialogDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-10 w-10 rounded-full flex-shrink-0 ${favorites.includes(selectedMeal.name) ? 'text-red-500 hover:bg-red-100' : 'text-muted-foreground hover:bg-accent'}`}
                      onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(selectedMeal.name);
                      }}
                      aria-label={favorites.includes(selectedMeal.name) ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
                    >
                      <Heart className={`h-5 w-5 ${favorites.includes(selectedMeal.name) ? 'fill-current' : ''}`} />
                    </Button>
                  </div>
                </DialogHeader>

                <ScrollArea className="max-h-[65vh] h-auto">
                  <div className="grid gap-8 p-6">
                    {/* Thông tin chính - Tóm tắt dinh dưỡng */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <Card className="bg-muted/30">
                        <CardContent className="p-4 text-center">
                          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-red-100 text-red-500 mx-auto mb-2">
                            <Apple className="h-4 w-4" />
                          </div>
                          <p className="text-sm text-muted-foreground">Calories</p>
                          <p className="text-2xl font-bold">{selectedMeal.nutrition.calories}</p>
                          <p className="text-xs text-muted-foreground">kcal</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-muted/30">
                        <CardContent className="p-4 text-center">
                          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-500 mx-auto mb-2">
                            <Utensils className="h-4 w-4" />
                          </div>
                          <p className="text-sm text-muted-foreground">Protein</p>
                          <p className="text-2xl font-bold">{selectedMeal.nutrition.protein}</p>
                          <p className="text-xs text-muted-foreground">gram</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-muted/30">
                        <CardContent className="p-4 text-center">
                          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-100 text-amber-500 mx-auto mb-2">
                            <Brain className="h-4 w-4" />
                          </div>
                          <p className="text-sm text-muted-foreground">Carbs</p>
                          <p className="text-2xl font-bold">{selectedMeal.nutrition.carbs}</p>
                          <p className="text-xs text-muted-foreground">gram</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-muted/30">
                        <CardContent className="p-4 text-center">
                          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-100 text-green-500 mx-auto mb-2">
                            <TrendingUp className="h-4 w-4" />
                          </div>
                          <p className="text-sm text-muted-foreground">Chất béo</p>
                          <p className="text-2xl font-bold">{selectedMeal.nutrition.fat}</p>
                          <p className="text-xs text-muted-foreground">gram</p>
                        </CardContent>
                      </Card>
                       <Card className="bg-muted/30">
                        <CardContent className="p-4 text-center">
                          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-purple-100 text-purple-500 mx-auto mb-2">
                            <Filter className="h-4 w-4" /> {/* Icon có thể thay đổi */}
                          </div>
                          <p className="text-sm text-muted-foreground">Natri</p>
                          {/* Đảm bảo selectedMeal.nutrition.sodium tồn tại */}
                          <p className="text-2xl font-bold">{selectedMeal.nutrition.sodium ?? 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">mg</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Phần nguyên liệu */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center">
                        <Utensils className="h-5 w-5 mr-2 text-primary" />
                        Nguyên liệu
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {selectedMeal.ingredients.map((ingredient, idx) => (
                          <div
                            key={idx}
                            className="px-4 py-3 bg-muted/30 text-foreground rounded-lg text-sm flex items-center gap-2"
                          >
                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></span>
                            <span>{ingredient}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Phần chế biến */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center">
                        <BookOpen className="h-5 w-5 mr-2 text-primary" />
                        Cách chế biến
                      </h3>
                      <Card className="bg-muted/30 border-primary/10">
                        <CardContent className="p-6">
                          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            {selectedMeal.preparation}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </ScrollArea>

                <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border-t mt-0">
                  <div className="text-center sm:text-left">
                    <p className="text-sm text-muted-foreground">Giá tham khảo</p>
                    <p className="text-3xl font-bold">{selectedMeal.price?.toLocaleString() ?? 'N/A'}đ</p>
                  </div>
                  <div className="flex gap-3 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      className="flex-1 sm:flex-auto"
                      onClick={() => setShowDetails(false)}
                    >
                      {t('close')}
                    </Button>
                    {/* ---- PHẦN ĐƯỢC HOÀN THIỆN ---- */}
                    <Button
                      className="flex-1 sm:flex-auto"
                      onClick={() => router.push(`/chat?meal=${encodeURIComponent(selectedMeal.name)}`)}
                    >
                      {t('chat_about_meal')} <MessageSquare className="ml-2 h-4 w-4" />
                    </Button>
                     {/* ---- KẾT THÚC PHẦN HOÀN THIỆN ---- */}
                  </div>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Settings Dialog */}
        <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]"> {/* Adjust width as needed */}
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>{t('settings')}</span>
              </DialogTitle>
              <DialogDescription>
                {t('settings_description')}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 max-h-[70vh] overflow-y-auto px-1"> {/* Added scroll for content */}
              <SettingsDialogContent />
            </div>
            {/* Optional: Add a close button in the footer if needed */}
            {/* <DialogFooter>
              <Button variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>Đóng</Button>
            </DialogFooter> */}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
