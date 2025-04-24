"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  AuthError,
} from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Eye, 
  EyeOff, 
  User, 
  Mail, 
  Lock, 
  Sparkles, 
  ArrowRight, 
  Check, 
  X,
  ShieldCheck,
  Leaf,
  Apple
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [focusedField, setFocusedField] = useState<
    "name" | "email" | "password" | null
  >(null);
  
  // Form validation states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // Password strength indicators
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState("");

  // Animated elements
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number; size: number; speed: number }>
  >([]);
  
  // Floating nutrition icons
  const [nutritionIcons, setNutritionIcons] = useState<
    Array<{ id: number; x: number; y: number; icon: string; rotate: number; delay: number }>
  >([]);

  useEffect(() => {
    setMounted(true);

    // Create more dynamic particles with varying sizes and speeds
    const initialParticles = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.5 + 0.5, // Varying sizes
      speed: Math.random() * 2 + 1, // Varying speeds
    }));
    setParticles(initialParticles);

    // Create floating nutrition icons
    const icons = [
      { icon: "apple", rotationRange: 15 },
      { icon: "leaf", rotationRange: 20 },
      { icon: "shield", rotationRange: 10 },
    ];
    
    const initialIcons = Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80,
      icon: icons[i % icons.length].icon,
      rotate: (Math.random() - 0.5) * icons[i % icons.length].rotationRange,
      delay: i * 0.8,
    }));
    setNutritionIcons(initialIcons);

    // Animate particles
    const interval = setInterval(() => {
      setParticles((prev) =>
        prev.map((p) => ({
          ...p,
          x: (p.x + (Math.random() - 0.5) * p.speed) % 100,
          y: (p.y + (Math.random() - 0.5) * p.speed) % 100,
        }))
      );
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  // Password strength checker
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      setPasswordFeedback("");
      return;
    }

    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 1;
    
    // Complexity checks
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    setPasswordStrength(strength);
    
    // Feedback messages
    switch(strength) {
      case 0:
        setPasswordFeedback("Rất yếu");
        break;
      case 1:
        setPasswordFeedback("Yếu");
        break;
      case 2:
        setPasswordFeedback("Trung bình");
        break;
      case 3:
        setPasswordFeedback("Khá mạnh");
        break;
      case 4:
        setPasswordFeedback("Rất mạnh");
        break;
      default:
        setPasswordFeedback("");
    }
  }, [password]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    // Basic validation
    if (!name || !email || !password) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    if (password.length < 6) {
      toast({
        title: "Lỗi",
        description: "Mật khẩu phải có ít nhất 6 ký tự.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    if (!agreedToTerms) {
      toast({
        title: "Lỗi",
        description: "Bạn cần đồng ý với Điều khoản dịch vụ.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        email, 
        password
      );

      // Update user profile with display name
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: name,
        });
      }

      toast({
        title: "Thành công",
        description: "Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.",
      });
      
      // Show welcome animation before redirect
      setTimeout(() => {
        router.push("/auth/login");
      }, 1500);

    } catch (error) {
      console.error("Registration error:", error);
      let description = "Có lỗi xảy ra trong quá trình đăng ký.";
      
      if (error instanceof Error) {
        const authError = error as AuthError;
        if (authError.code === 'auth/email-already-in-use') {
          description = "Địa chỉ email này đã được sử dụng.";
        } else if (authError.code === 'auth/invalid-email') {
          description = "Địa chỉ email không hợp lệ.";
        } else if (authError.code === 'auth/weak-password') {
          description = "Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.";
        }
      }
      
      toast({
        title: "Lỗi đăng ký",
        description: description,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }

  const handleFocus = (field: "name" | "email" | "password") => {
    setFocusedField(field);
  };

  const handleBlur = () => {
    setFocusedField(null);
  };

  // Loading state while checking auth or initial mount
  if (authLoading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            <div className="absolute inset-2 rounded-full bg-primary/10 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            </div>
          </div>
          <p className="text-primary/70 font-light tracking-widest animate-pulse">
            KHỞI TẠO GIAO DIỆN
          </p>
        </div>
      </div>
    );
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  };

  // Password strength indicator styles
  const strengthColors = [
    "bg-red-500",           // Very weak
    "bg-orange-500",        // Weak
    "bg-yellow-500",        // Medium
    "bg-green-400",         // Strong
    "bg-emerald-400"        // Very strong
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-background to-slate-900/80 overflow-hidden">
      {/* Enhanced background effects */}
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
        {/* Animated particles */}
        {particles.map(particle => (
          <motion.div
            key={particle.id}
            className="absolute bg-primary rounded-full"
            style={{ 
              left: `${particle.x}%`, 
              top: `${particle.y}%`,
              height: `${particle.size}px`,
              width: `${particle.size}px`,
            }}
            animate={{ 
              opacity: [0.3, 0.8, 0.3], 
              scale: [1, 1.5, 1],
              boxShadow: [
                "0 0 0px rgba(139, 92, 246, 0)",
                "0 0 8px rgba(139, 92, 246, 0.5)",
                "0 0 0px rgba(139, 92, 246, 0)"
              ]
            }}
            transition={{ 
              duration: Math.random() * 3 + 2, 
              repeat: Infinity, 
              repeatType: "reverse" 
            }}
          />
        ))}
        
        {/* Background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293720_1px,transparent_1px),linear-gradient(to_bottom,#1f293720_1px,transparent_1px)] bg-[size:50px_50px]" />
        
        {/* Floating nutrition icons (visible only on larger screens) */}
        <div className="hidden lg:block">
          {nutritionIcons.map(item => (
            <motion.div
              key={item.id}
              className="absolute text-primary/10"
              style={{ left: `${item.x}%`, top: `${item.y}%` }}
              initial={{ opacity: 0, scale: 0.5, rotate: item.rotate }}
              animate={{ 
                opacity: [0.05, 0.2, 0.05], 
                scale: [0.8, 1.2, 0.8],
                y: [0, -15, 0] 
              }}
              transition={{ 
                duration: 5 + Math.random() * 2,
                delay: item.delay,
                repeat: Infinity,
                repeatType: "reverse" 
              }}
            >
              {item.icon === "apple" && <Apple size={50} />}
              {item.icon === "leaf" && <Leaf size={50} />}
              {item.icon === "shield" && <ShieldCheck size={50} />}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0 z-10">
        {/* Left panel - Branding & Information */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative hidden h-full flex-col p-10 text-white dark:border-r lg:flex overflow-hidden"
        >
          {/* Dynamic gradient background */}
          <motion.div
            animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
            transition={{ duration: 30, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
            className="absolute inset-0 bg-gradient-to-br from-primary/90 via-purple-600/80 to-indigo-800/90 bg-[length:200%_200%]"
          />

          {/* Decorative effects */}
          <div className="absolute inset-0 pointer-events-none">
            <motion.div
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 6, repeat: Infinity, repeatType: "loop" }}
              className="absolute top-[15%] left-[25%] w-72 h-72 rounded-full bg-white/10 blur-3xl"
            />
            <motion.div
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 8, repeat: Infinity, repeatType: "loop" }}
              className="absolute bottom-[15%] right-[15%] w-80 h-80 rounded-full bg-purple-500/20 blur-3xl"
            />
            <svg className="absolute opacity-5 w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="subtleGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.2" />
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#subtleGrid)" />
            </svg>
          </div>

          {/* Enhanced brand section */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="relative z-20 flex items-center gap-4 text-xl font-medium text-primary-foreground cursor-pointer mb-12"
          >
            <div className="relative h-12 w-12 rounded-lg bg-white/10 p-1.5 backdrop-blur-lg flex items-center justify-center overflow-hidden border border-white/20">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 12, ease: "linear", repeat: Infinity }}
                className="absolute inset-0 bg-gradient-to-r from-primary/40 via-purple-500/40 to-primary/40 opacity-30"
              />
              <Logo className="text-white h-7 w-7 relative z-10" />
            </div>
            <div>
              <span className="font-bold tracking-wider text-2xl bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200">NUTRICARE</span>
              <p className="text-xs font-light text-white/70 tracking-wider mt-0.5">TRỢ LÝ DINH DƯỠNG AI CÁ NHÂN HÓA</p>
            </div>
          </motion.div>

          {/* Features highlight section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
            className="relative z-20 mt-auto"
          >
            <h3 className="text-xl font-semibold mb-6 flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-purple-300" />
              Gia nhập cộng đồng NutriCare
            </h3>
            
            <div className="space-y-4">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-lg">
                <h4 className="font-medium text-white/95 mb-2 flex items-center">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="mr-2 text-emerald-400"
                  >
                    <Check size={18} />
                  </motion.div>
                  Phân tích dinh dưỡng thông minh
                </h4>
                <p className="text-sm text-white/70">
                  AI của chúng tôi phân tích chế độ ăn uống và đưa ra lời khuyên cá nhân hóa cho bạn.
                </p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-lg">
                <h4 className="font-medium text-white/95 mb-2 flex items-center">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}
                    className="mr-2 text-emerald-400"
                  >
                    <Check size={18} />
                  </motion.div>
                  Kế hoạch bữa ăn tự động
                </h4>
                <p className="text-sm text-white/70">
                  Nhận thực đơn hàng tuần phù hợp với mục tiêu và sở thích cá nhân của bạn.
                </p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-lg">
                <h4 className="font-medium text-white/95 mb-2 flex items-center">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 1.4 }}
                    className="mr-2 text-emerald-400"
                  >
                    <Check size={18} />
                  </motion.div>
                  Theo dõi tiến độ trực quan
                </h4>
                <p className="text-sm text-white/70">
                  Xem biểu đồ tiến độ và đạt được mục tiêu sức khỏe của bạn dễ dàng hơn.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Footer */}
          <div className="relative z-20 mt-8 text-sm text-white/50">
            © {new Date().getFullYear()} NutriCare. Mọi quyền được bảo lưu.
          </div>
        </motion.div>

        {/* Right panel - Register Form */}
        <div className="lg:p-8 flex items-center justify-center relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[420px] px-4 lg:px-0"
          >
            {/* Card container with enhanced design */}
            <motion.div
              variants={itemVariants}
              className="bg-black/40 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-slate-700/30 relative overflow-hidden"
            >
              {/* Decorative card effects */}
              <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-16 w-56 h-56 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
              <svg className="absolute bottom-0 left-0 w-full h-16 opacity-5 pointer-events-none" viewBox="0 0 200 50" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0,50 Q50,10 100,30 T200,10 L200,50 Z" fill="white"/>
              </svg>

              <div className="relative z-10">
                <div className="flex flex-col space-y-3 text-center mb-8">
                  {/* Form icon */}
                  <motion.div
                    variants={itemVariants}
                    className="flex justify-center"
                  >
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/80 to-purple-600/80 p-2.5 mb-2 relative shadow-lg border border-primary/30">
                      <div className="absolute inset-0.5 rounded-lg bg-black/50 backdrop-blur-sm" />
                      <User className="h-full w-full text-white relative z-10" />
                    </div>
                  </motion.div>
                  
                  {/* Form title */}
                  <motion.h1
                    variants={itemVariants}
                    className="text-2xl font-bold tracking-tight text-white"
                  >
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-white">
                      Tạo tài khoản mới
                    </span>
                  </motion.h1>
                  
                  <motion.p
                    variants={itemVariants}
                    className="text-sm text-slate-400"
                  >
                    Bắt đầu hành trình dinh dưỡng cá nhân hóa
                  </motion.p>
                </div>

                {/* Enhanced registration form */}
                <form onSubmit={onSubmit} className="space-y-6">
                  {/* Name Input with improved validation */}
                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label
                      htmlFor="name"
                      className={cn(
                        "text-slate-300 flex items-center gap-1.5 font-medium text-sm transition-colors",
                        focusedField === 'name' && "text-primary"
                      )}
                    >
                      <User className="h-4 w-4" /> Họ và tên
                    </Label>
                    <div className="relative">
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        required
                        autoComplete="name"
                        onFocus={() => handleFocus('name')}
                        onBlur={handleBlur}
                        placeholder="Nguyễn Văn A"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={cn(
                          "pl-3 pr-3 py-3 text-base transition-all duration-200 bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-lg text-white placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none",
                          focusedField === 'name' && "border-primary ring-1 ring-primary/30"
                        )}
                      />
                      <div className={cn(
                        "absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary to-purple-400 transition-all duration-300",
                        focusedField === 'name' ? "w-full" : "w-0"
                      )} />
                      
                      {/* Validation icons */}
                      {name && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {name.length >= 2 ? (
                            <Check className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <X className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {name && name.length < 2 && (
                      <p className="text-xs text-red-400 mt-1">Tên phải có ít nhất 2 ký tự</p>
                    )}
                  </motion.div>

                  {/* Email Input with improved validation */}
                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label
                      htmlFor="email"
                      className={cn(
                        "text-slate-300 flex items-center gap-1.5 font-medium text-sm transition-colors",
                        focusedField === 'email' && "text-primary"
                      )}
                    >
                      <Mail className="h-4 w-4" /> Email
                    </Label>
                    <div className="relative">
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        onFocus={() => handleFocus('email')}
                        onBlur={handleBlur}
                        placeholder="email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={cn(
                          "pl-3 pr-3 py-3 text-base transition-all duration-200 bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-lg text-white placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none",
                          focusedField === 'email' && "border-primary ring-1 ring-primary/30"
                        )}
                      />
                      <div className={cn(
                        "absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary to-purple-400 transition-all duration-300",
                        focusedField === 'email' ? "w-full" : "w-0"
                      )} />
                      
                      {/* Validation icons */}
                      {email && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? (
                            <Check className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <X className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                      <p className="text-xs text-red-400 mt-1">Email không hợp lệ</p>
                    )}
                  </motion.div>

                  {/* Password Input with strength meter */}
                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label
                      htmlFor="password"
                      className={cn(
                        "text-slate-300 flex items-center gap-1.5 font-medium text-sm transition-colors",
                        focusedField === 'password' && "text-primary"
                      )}
                    >
                      <Lock className="h-4 w-4" /> Mật khẩu
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        name="password"
                        required
                        autoComplete="new-password"
                        onFocus={() => handleFocus('password')}
                        onBlur={handleBlur}
                        placeholder="•••••••• (ít nhất 6 ký tự)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={cn(
                          "pl-3 pr-10 py-3 text-base transition-all duration-200 bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-lg text-white placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none",
                          focusedField === 'password' && "border-primary ring-1 ring-primary/30"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                        aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <div className={cn(
                        "absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary to-purple-400 transition-all duration-300",
                        focusedField === 'password' ? "w-full" : "w-0"
                      )} />
                    </div>
                    
                    {/* Password strength meter */}
                    {password && (
                      <div className="mt-2 space-y-1">
                        <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-700/50">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(passwordStrength / 4) * 100}%` }}
                            transition={{ duration: 0.5 }}
                            className={`${strengthColors[passwordStrength]} transition-all duration-300`}
                          />
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className={cn(
                            "transition-colors duration-300",
                            passwordStrength === 0 ? "text-red-500" :
                            passwordStrength === 1 ? "text-orange-500" :
                            passwordStrength === 2 ? "text-yellow-500" :
                            passwordStrength === 3 ? "text-green-400" :
                            "text-emerald-400"
                          )}>
                            {passwordFeedback}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${password.length >= 8 ? "bg-emerald-500" : "bg-slate-600"}`} />
                            <span className={`text-xs ${password.length >= 8 ? "text-slate-200" : "text-slate-500"}`}>8+ ký tự</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>

                  {/* Terms and Conditions Checkbox */}
                  <motion.div variants={itemVariants} className="flex items-start space-x-2">
                    <Checkbox 
                      id="terms" 
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                      className="mt-0.5 bg-slate-900/70 border-slate-700 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <Label 
                      htmlFor="terms" 
                      className="text-sm font-normal text-slate-300 leading-tight"
                    >
                      Tôi đồng ý với{" "}
                      <Link 
                        href="/terms" 
                        className="font-medium text-primary hover:text-primary/80 underline underline-offset-2"
                      >
                        Điều khoản dịch vụ
                      </Link>
                      {" "}và{" "}
                      <Link 
                        href="/privacy" 
                        className="font-medium text-primary hover:text-primary/80 underline underline-offset-2"
                      >
                        Chính sách bảo mật
                      </Link>
                    </Label>
                  </motion.div>

                  {/* Enhanced Submit Button */}
                  <motion.div variants={itemVariants} className="pt-2">
                    <Button
                      type="submit"
                      className="w-full font-semibold flex items-center justify-center gap-2 py-3 text-base bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white rounded-lg relative overflow-hidden group transition-all duration-300 ease-out hover:shadow-lg hover:shadow-primary/30 disabled:opacity-70 disabled:cursor-not-allowed"
                      disabled={isLoading || !agreedToTerms || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || (name && name.length < 2) || !password}
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.3)_50%,transparent_100%)] opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-700 ease-in-out pointer-events-none" />
                      <AnimatePresence mode="wait" initial={false}>
                        {isLoading ? (
                          <motion.div
                            key="loading"
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2 }}
                            className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin"
                            aria-label="Đang xử lý"
                          />
                        ) : (
                          <motion.span
                            key="text"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center gap-2"
                          >
                            Đăng ký
                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Button>
                  </motion.div>
                </form>
              </div>
            </motion.div>

            {/* Already have account link */}
            <motion.p
              variants={itemVariants}
              className="px-8 text-center text-sm text-slate-400"
            >
              Đã có tài khoản?{" "}
              <Link
                href="/auth/login"
                className="font-medium text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
              >
                Đăng nhập ngay
              </Link>
            </motion.p>
            
            {/* Trust indicators */}
            <motion.div
              variants={itemVariants}
              className="flex items-center justify-center gap-2 text-xs text-slate-500"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Bảo mật thông tin 100%</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}