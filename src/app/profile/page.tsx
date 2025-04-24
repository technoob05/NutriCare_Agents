'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  LogOut, 
  Settings, 
  TrendingUp, 
  Calendar, 
  User, 
  Coffee, 
  Utensils, 
  Droplet, 
  Apple, 
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase/config';
import { signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, 
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, Cell
} from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
// Removed Sheet imports as they are no longer used
import { HealthInformationForm } from '@/components/HealthInformationForm';
import { SettingsDialogContent, SpeechSettings } from '@/components/SettingsDialogContent';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MainNav } from '@/components/main-nav';

// Mẫu dữ liệu cho biểu đồ
const caloriesData = [
  { date: 'T2', target: 2000, actual: 1850 },
  { date: 'T3', target: 2000, actual: 2100 },
  { date: 'T4', target: 2000, actual: 1920 },
  { date: 'T5', target: 2000, actual: 1750 },
  { date: 'T6', target: 2000, actual: 2200 },
  { date: 'T7', target: 2000, actual: 1900 },
  { date: 'CN', target: 2000, actual: 2050 },
];

const nutrientData = [
  { name: 'Protein', value: 30 },
  { name: 'Carbs', value: 45 },
  { name: 'Fat', value: 25 },
];

const waterIntakeData = [
  { time: '8h', amount: 250 },
  { time: '10h', amount: 200 },
  { time: '12h', amount: 300 },
  { time: '14h', amount: 250 },
  { time: '16h', amount: 200 },
  { time: '18h', amount: 300 },
  { time: '20h', amount: 150 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

// Component hiển thị tin tức về dinh dưỡng
const NutritionNews = () => {
  const newsItems = [
    {
      title: "5 thực phẩm tăng cường miễn dịch mùa covid",
      date: "Hôm nay"
    },
    {
      title: "Chế độ ăn Keto có thực sự hiệu quả?",
      date: "Hôm qua"
    },
    {
      title: "Cách nấu ăn giữ nguyên chất dinh dưỡng",
      date: "3 ngày trước"
    }
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Tin tức dinh dưỡng</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-2">
          {newsItems.map((item, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div>
                <h4 className="font-medium">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.date}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Component hiển thị bữa ăn trong ngày
const DailyMeals = () => {
  const meals = [
    {
      type: "Sáng",
      name: "Phở gà",
      calories: 450,
      time: "7:30",
      completed: true
    },
    {
      type: "Trưa",
      name: "Cơm tấm sườn bì chả",
      calories: 700,
      time: "12:00",
      completed: true
    },
    {
      type: "Chiều",
      name: "Sữa chua hoa quả",
      calories: 250,
      time: "15:30",
      completed: false
    },
    {
      type: "Tối",
      name: "Bún chả cá",
      calories: 550,
      time: "19:00",
      completed: false
    }
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Kế hoạch bữa ăn hôm nay</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-1">
          {meals.map((meal, index) => (
            <div 
              key={index}
              className={cn(
                "flex items-center justify-between p-4 border-b last:border-0 hover:bg-muted/50 transition-colors",
                meal.completed ? "opacity-70" : ""
              )}
            >
              <div className="flex items-center">
                <div className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center mr-3",
                  meal.completed ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                )}>
                  <Utensils className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium">{meal.name}</h4>
                  <div className="flex space-x-2 text-sm text-muted-foreground">
                    <span>{meal.type}</span>
                    <span>•</span>
                    <span>{meal.calories} kcal</span>
                    <span>•</span>
                    <span>{meal.time}</span>
                  </div>
                </div>
              </div>
              {meal.completed ? (
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Đã ăn</Badge>
              ) : (
                <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Sắp tới</Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Component hiển thị thống kê tổng quan
const StatCard = ({ icon: Icon, title, value, footer, color }) => {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col p-6">
          <div className={`flex items-center justify-between mb-3`}>
            <div className={`h-10 w-10 rounded-full flex items-center justify-center bg-${color}-100 text-${color}-600`}>
              <Icon className="h-5 w-5" />
            </div>
            <span className={`text-${color}-600 font-semibold text-sm`}>{footer}</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold">{value}</h3>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; // Added missing closing brace for StatCard component

// Function để lấy chữ viết tắt cho avatar
function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [progressValue, setProgressValue] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  // Animation cho thanh progress
  useEffect(() => {
    const timer = setTimeout(() => setProgressValue(78), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Thông báo",
        description: "Đăng xuất thành công.",
      });
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout failed:", error);
      toast({
        title: "Lỗi",
        description: "Đăng xuất thất bại. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <p className="mb-4">Bạn cần đăng nhập để xem trang này.</p>
        <Button onClick={() => router.push('/auth/login')}>Đi đến trang đăng nhập</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      {/* Main Content */}
      <div className="pb-6"> {/* Removed pt-16 and md:ml-64 */}
        <div className="container mx-auto px-4">
          <div className="my-6 pt-16"> {/* Added pt-16 here to maintain spacing */}
            <h1 className="text-2xl font-bold mb-1">Xin chào, {user.displayName || 'bạn'}!</h1>
            <p className="text-muted-foreground">Hãy xem tiến độ ăn uống và dinh dưỡng hôm nay của bạn</p>
          </div>

          {/* Profile Header Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="mb-6 overflow-hidden">
              <CardContent className="p-0">
                <div className="md:flex">
                  <div className="p-6 md:flex-1">
                    <div className="flex items-center space-x-4 mb-4">
                      <Avatar className="h-20 w-20 ring-4 ring-primary/10">
                        <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || "User"} />
                        <AvatarFallback>{getInitials(user.displayName || user.email)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h2 className="text-2xl font-bold">{user.displayName || 'Người dùng'}</h2>
                        <p className="text-muted-foreground">{user.email || 'Không có email'}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <p className="text-sm font-medium">Mục tiêu hôm nay</p>
                          <p className="text-sm text-primary font-medium">78%</p>
                        </div>
                        <Progress value={progressValue} className="h-2" />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-green-50 p-2 rounded-lg">
                          <p className="text-xs text-green-700">Calo</p>
                          <p className="font-bold text-green-700">1450/2000</p>
                        </div>
                        <div className="bg-blue-50 p-2 rounded-lg">
                          <p className="text-xs text-blue-700">Nước</p>
                          <p className="font-bold text-blue-700">1.5/2.5L</p>
                        </div>
                        <div className="bg-purple-50 p-2 rounded-lg">
                          <p className="text-xs text-purple-700">Protein</p>
                          <p className="font-bold text-purple-700">45/75g</p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-3">
                        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="flex-1">
                              <Settings className="mr-2 h-4 w-4"/>
                              Cài đặt
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                              <DialogTitle>Cài đặt (Settings)</DialogTitle>
                              <DialogDescription>
                                Quản lý thông tin sức khỏe và cấu hình AI của bạn.
                              </DialogDescription>
                            </DialogHeader>
                            <Tabs defaultValue="ai-config" className="mt-4">
                              <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="ai-config">Cấu hình AI</TabsTrigger>
                                <TabsTrigger value="health-info">Thông tin sức khỏe</TabsTrigger>
                                <TabsTrigger value="speech">Speech</TabsTrigger>
                              </TabsList>
                              <TabsContent value="ai-config" className="mt-4">
                                <SettingsDialogContent/>
                              </TabsContent>
                              <TabsContent value="health-info" className="mt-4">
                                <HealthInformationForm/>
                              </TabsContent>
                              <TabsContent value="speech" className="mt-4">
                                <SpeechSettings/>
                              </TabsContent>
                            </Tabs>
                          </DialogContent>
                        </Dialog>

                        <Button variant="destructive" onClick={handleLogout} className="flex-1">
                          <LogOut className="mr-2 h-4 w-4"/>
                          Đăng xuất
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="hidden md:block md:w-1/3 bg-primary/5 p-6">
                    <h3 className="font-medium mb-2">Thống kê tuần</h3>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={caloriesData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line 
                            type="monotone" 
                            dataKey="actual" 
                            stroke="#8884d8" 
                            strokeWidth={2}
                            activeDot={{ r: 8 }} 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="target" 
                            stroke="#82ca9d" 
                            strokeWidth={2}
                            strokeDasharray="5 5" 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Dashboard Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Lượng calo</CardTitle>
                  <CardDescription>7 ngày qua</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={caloriesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="actual" fill="#8884d8" name="Đã tiêu thụ" />
                        <Bar dataKey="target" fill="#82ca9d" name="Mục tiêu" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Tỷ lệ dinh dưỡng</CardTitle>
                  <CardDescription>Hôm nay</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-60 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={nutrientData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {nutrientData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Lượng nước uống</CardTitle>
                  <CardDescription>Hôm nay</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={waterIntakeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="amount" fill="#3b82f6" name="ml" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              <StatCard 
                icon={Utensils} 
                title="Tổng calo" 
                value="1,450 kcal" 
                footer="Còn 550 kcal" 
                color="purple"
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              <StatCard 
                icon={Droplet} 
                title="Nước đã uống" 
                value="1.5 L" 
                footer="Mục tiêu: 2.5 L" 
                color="blue"
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.6 }}
            >
              <StatCard 
                icon={TrendingUp} 
                title="Protein" 
                value="45g" 
                footer="60% mục tiêu" 
                color="green"
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.7 }}
            >
              <StatCard 
                icon={Coffee} 
                title="Bữa ăn" 
                value="2/4" 
                footer="Hoàn thành 50%" 
                color="amber"
              />
            </motion.div>
          </div>

          {/* Daily Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <DailyMeals />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
            >
              <NutritionNews />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
