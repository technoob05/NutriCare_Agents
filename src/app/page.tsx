"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button" // Corrected path
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card" // Corrected path
import { Avatar } from "@/components/ui/avatar" // Corrected path
import {
  LogOut,
  MessageSquare,
  TrendingUp,
  Apple,
  Utensils,
  Brain,
  ChevronRight
} from "lucide-react"
import { MainNav } from "@/components/main-nav" // Corrected path
import { useToast } from "@/hooks/use-toast" // Corrected path
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog" // Corrected path
import { motion, AnimatePresence } from "framer-motion" // Import directly

// Update the Meal interface to match recommendations.json
interface Meal {
  name: string
  ingredients: string[]
  nutrition: {
    calories: number
    protein: number
    carbs: number
    fat: number
    sodium: number
  }
  preparation: string
  price: number
}

export default function HomePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [meals, setMeals] = useState<Meal[]>([])
  const { toast } = useToast() // Correct destructuring

  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    checkAuth()
    loadMeals()
  }, [])

  const checkAuth = () => {
    // Ensure localStorage is accessed only on the client side
    if (typeof window !== 'undefined') {
        const currentUser = localStorage.getItem("currentUser")
        if (!currentUser) {
          // Use router.push for client-side navigation within Next.js app
          router.push("/auth/login")
          return
        }

        try {
          const userData = JSON.parse(currentUser)
          setUser(userData)
        } catch (error) {
          localStorage.removeItem("currentUser")
          router.push("/auth/login")
        } finally {
          setIsLoading(false)
        }
    } else {
        // Handle server-side or initial render case if necessary
        // For this logic, we primarily rely on client-side check
        setIsLoading(false); // Assume not logged in if localStorage is unavailable initially
    }
  }

  const loadMeals = async () => {
    try {
      // Ensure the path is correct for fetching from public folder
      const response = await fetch('/data/recommendations.json')
      if (!response.ok) throw new Error('Failed to load meals')
      const data = await response.json()
      setMeals(data.meals)
    } catch (error) {
      console.error('Error loading meals:', error)
      // Use toast function with appropriate structure
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách món ăn.",
        variant: "destructive",
      })
    }
  }

  const handleLogout = () => {
     if (typeof window !== 'undefined') {
        localStorage.removeItem("currentUser")
        // Use toast function for success message
        toast({
            title: "Thông báo",
            description: "Đăng xuất thành công.",
            // variant: "default", // Default variant is usually sufficient for success
        })
        router.push("/auth/login")
     }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    )
  }

  // Redirect if loading is done but user is still null (failed auth check)
  if (!user && typeof window !== 'undefined') {
     // Check window again to prevent server-side redirect loop if checkAuth runs server-side initially
     router.push("/auth/login");
     return ( // Render loading indicator during redirect
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
     );
  }

  // Render page only if user is confirmed
  return user ? (
    <div className="min-h-screen bg-background">
      {/* <ToastContainer /> removed as <Toaster/> is in layout.tsx */}

      {/* Enhanced Header */}
      <header className="border-b sticky top-0 bg-background/80 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <MainNav />
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.push("/chat")}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Chat với AI
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="py-20 px-4 text-center relative overflow-hidden bg-gradient-to-b from-background to-muted/30">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="container mx-auto relative z-10"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500"> {/* Adjusted gradient */}
              AI Dinh Dưỡng Thông Minh
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Tối ưu hóa chế độ ăn của bạn với công nghệ AI tiên tiến.
              Nhận gợi ý thực đơn được cá nhân hóa dựa trên nhu cầu của bạn.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="lg"
                onClick={() => router.push("/chat")}
                className="shadow-lg" // Added shadow
              >
                Bắt đầu ngay <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>

          {/* Animated background patterns - subtle */}
          <div className="absolute inset-0 -z-10 opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"></div>
          </div>
        </section>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="grid gap-12"> {/* Increased gap */}
            {/* Enhanced User Profile */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Card className="overflow-hidden shadow-md">
                <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 p-6"> {/* Adjusted gradient */}
                  <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
                    <Avatar className="h-20 w-20 ring-4 ring-background shadow-sm">
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-3xl font-semibold text-primary-foreground">
                        {user?.name ? user.name[0].toUpperCase() : '?'}
                      </div>
                    </Avatar>
                    <div className="text-center sm:text-left">
                      <CardTitle className="text-2xl mb-1">{user?.name || 'Người dùng'}</CardTitle>
                      <p className="text-muted-foreground">{user?.email || 'Không có email'}</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { icon: TrendingUp, label: "Thực đơn đã tạo", value: "12" }, // Placeholder values
                      { icon: Apple, label: "Calories mục tiêu", value: "2000" }, // Placeholder values
                      { icon: Utensils, label: "Món ăn yêu thích", value: "8" }, // Placeholder values
                      { icon: Brain, label: "Tương tác AI", value: "24" }, // Placeholder values
                    ].map((stat, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className="flex flex-col items-center p-4 rounded-lg bg-muted/50 text-center"
                      >
                        <stat.icon className="h-6 w-6 mb-2 text-primary" />
                        <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                        <p className="text-xl font-bold">{stat.value}</p>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.section>

            {/* Enhanced Meal Recommendations */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-3xl font-bold">Món ăn gợi ý</h2>
                  <p className="text-muted-foreground mt-1">
                    Khám phá các món ăn đa dạng và dinh dưỡng được đề xuất cho bạn
                  </p>
                </div>
                <Button variant="outline" onClick={() => router.push("/chat")}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Tùy chỉnh thực đơn
                </Button>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"> {/* Added xl column */}
                {meals.map((meal, i) => (
                  <motion.div
                    key={meal.name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.05 }} // Staggered animation
                  >
                    <Card className="group relative overflow-hidden h-full flex flex-col hover:shadow-lg transition-shadow duration-300">
                      {/* Added relative and h-full */}
                      <CardContent className="p-4 flex-grow flex flex-col"> {/* Added flex-grow */}
                        <h3 className="text-lg font-semibold mb-3">{meal.name}</h3>

                        {/* Ingredients */}
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-muted-foreground mb-2">Nguyên liệu:</h4>
                          <div className="flex flex-wrap gap-1">
                            {meal.ingredients.slice(0, 5).map((ingredient, index) => ( // Limit ingredients shown initially
                              <span
                                key={index}
                                className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs"
                              >
                                {ingredient}
                              </span>
                            ))}
                            {meal.ingredients.length > 5 && (
                               <span className="text-xs text-muted-foreground ml-1">...</span>
                            )}
                          </div>
                        </div>

                        {/* Nutrition Info Simplified */}
                        <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                           <div className="flex items-center gap-1"><Apple className="w-3 h-3 text-red-500"/> {meal.nutrition.calories} kcal</div>
                           <div className="flex items-center gap-1"><Utensils className="w-3 h-3 text-blue-500"/> {meal.nutrition.protein}g P</div>
                           <div className="flex items-center gap-1"><Brain className="w-3 h-3 text-yellow-500"/> {meal.nutrition.carbs}g C</div>
                           <div className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-green-500"/> {meal.nutrition.fat}g F</div>
                        </div>

                        {/* Price and Action */}
                        <div className="flex items-center justify-between mt-auto pt-4 border-t"> {/* mt-auto pushes to bottom */}
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold">{meal.price.toLocaleString()}</span>
                            <span className="text-sm text-muted-foreground">đ</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost" // Changed variant
                            className="text-primary hover:bg-primary/10"
                            onClick={() => {
                              setSelectedMeal(meal)
                              setShowDetails(true)
                            }}
                          >
                            Chi tiết
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        </div>

                        {/* Hover Info - Removed for simplicity, details in Dialog */}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.section> {/* Add missing closing tag */}
          </div>
        </div>

        {/* Meal Details Dialog */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-2xl">
            {selectedMeal && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{selectedMeal.name}</DialogTitle>
                  <DialogDescription>
                    Chi tiết về món ăn và dinh dưỡng
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                  {/* Ingredients Section */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Nguyên liệu</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedMeal.ingredients.map((ingredient, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-muted text-foreground rounded-md text-sm" // Adjusted style
                        >
                          {ingredient}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Nutrition Section */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Thông tin dinh dưỡng</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <Card className="bg-muted/50">
                        <CardContent className="p-4 text-center">
                          <p className="text-sm text-muted-foreground">Calories</p>
                          <p className="text-2xl font-bold">{selectedMeal.nutrition.calories}</p>
                          <p className="text-xs text-muted-foreground">kcal</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-muted/50">
                        <CardContent className="p-4 text-center">
                          <p className="text-sm text-muted-foreground">Protein</p>
                          <p className="text-2xl font-bold">{selectedMeal.nutrition.protein}</p>
                          <p className="text-xs text-muted-foreground">gram</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-muted/50">
                        <CardContent className="p-4 text-center">
                          <p className="text-sm text-muted-foreground">Carbs</p>
                          <p className="text-2xl font-bold">{selectedMeal.nutrition.carbs}</p>
                          <p className="text-xs text-muted-foreground">gram</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-muted/50">
                        <CardContent className="p-4 text-center">
                          <p className="text-sm text-muted-foreground">Chất béo</p>
                          <p className="text-2xl font-bold">{selectedMeal.nutrition.fat}</p>
                          <p className="text-xs text-muted-foreground">gram</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-muted/50">
                        <CardContent className="p-4 text-center">
                          <p className="text-sm text-muted-foreground">Natri</p>
                          <p className="text-2xl font-bold">{selectedMeal.nutrition.sodium}</p>
                          <p className="text-xs text-muted-foreground">mg</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Preparation Section */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Cách chế biến</h3>
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed"> {/* Improved readability */}
                          {selectedMeal.preparation}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Price Section */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">Giá tham khảo</p>
                      <p className="text-3xl font-bold">{selectedMeal.price.toLocaleString()}đ</p>
                    </div>
                    <Button onClick={() => router.push("/chat")} size="lg"> {/* Larger button */}
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Chat với AI về món này
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

      </main>

       {/* Footer */}
        <footer className="py-6 mt-12 border-t bg-muted/50">
            <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                © {new Date().getFullYear()} AI Dinh Dưỡng. All rights reserved.
            </div>
        </footer>
    </div>
  ) : null; // Render null if user is not yet confirmed (avoids brief flash of content before redirect)
}
