"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  signInWithEmailAndPassword,
  signInWithRedirect,
  GoogleAuthProvider,
  AuthError,
} from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  ArrowRight, 
  Sparkles, 
  AlertCircle 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(null);
  const [formErrors, setFormErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [hasInteracted, setHasInteracted] = useState({
    email: false,
    password: false,
  });

  // Motion particles for background effect
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; speed: number }>>([]);

  // Generate particles with different sizes and speeds
  useEffect(() => {
    setMounted(true);

    // Create particles with varied sizes and speeds
    const initialParticles = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 0.8 + 0.2, // Varied sizes between 0.2 and 1
      speed: Math.random() * 0.8 + 0.4, // Varied speeds
    }));
    setParticles(initialParticles);

    const interval = setInterval(() => {
      setParticles((prev) =>
        prev.map((p) => ({
          ...p,
          x: (p.x + (Math.random() - 0.5) * p.speed) % 100,
          y: (p.y + (Math.random() - 0.5) * p.speed) % 100,
        }))
      );
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  // Redirect after login
  useEffect(() => {
    if (!loading && user) {
      router.push("/"); // Changed to dashboard for better UX
    }
  }, [user, loading, router]);

  // Form validation
  const validateField = (name: string, value: string) => {
    let error = "";
    
    if (name === "email") {
      if (!value) {
        error = "Email là bắt buộc";
      } else if (!/\S+@\S+\.\S+/.test(value)) {
        error = "Email không hợp lệ";
      }
    } else if (name === "password") {
      if (!value) {
        error = "Mật khẩu là bắt buộc";
      } else if (value.length < 6) {
        error = "Mật khẩu phải có ít nhất 6 ký tự";
      }
    }
    
    return error;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Mark field as interacted
    setHasInteracted(prev => ({
      ...prev,
      [name]: true
    }));
    
    // Validate on change, but only show errors if user has interacted
    const error = validateField(name, value);
    setFormErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleFocus = (field: 'email' | 'password') => {
    setFocusedField(field);
  };

  const handleBlur = (field: 'email' | 'password') => {
    setFocusedField(null);
    
    // Validate on blur
    const error = validateField(field, formData[field]);
    setFormErrors(prev => ({
      ...prev,
      [field]: error
    }));
    
    // Mark as interacted
    setHasInteracted(prev => ({
      ...prev,
      [field]: true
    }));
  };

  // Firebase Email/Password Login
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    // Validate all fields before submission
    const emailError = validateField("email", formData.email);
    const passwordError = validateField("password", formData.password);
    
    setFormErrors({
      email: emailError,
      password: passwordError,
    });
    
    // Set all fields as interacted
    setHasInteracted({
      email: true,
      password: true,
    });
    
    // Check if there are any errors
    if (emailError || passwordError) {
      return;
    }
    
    if (isGoogleLoading) return;
    
    setIsLoading(true);
    const { email, password } = formData;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Thành công",
        description: "Đăng nhập thành công! Đang chuyển hướng...",
      });
    } catch (error) {
      console.error("Login error:", error);
      let description = "Có lỗi xảy ra trong quá trình đăng nhập.";
      
      if (error instanceof Error) {
        const authError = error as AuthError;
        if (
          authError.code === "auth/user-not-found" ||
          authError.code === "auth/wrong-password" ||
          authError.code === "auth/invalid-credential"
        ) {
          description = "Email hoặc mật khẩu không chính xác.";
        } else if (authError.code === "auth/invalid-email") {
           description = "Địa chỉ email không hợp lệ.";
        } else if (authError.code === "auth/too-many-requests") {
           description = "Quá nhiều lần thử không thành công. Vui lòng thử lại sau.";
        }
      }
      
      toast({
        title: "Lỗi đăng nhập",
        description,
        variant: "destructive",
      });
      
      setIsLoading(false);
    }
  }

  // Firebase Google Sign-In
  async function handleGoogleSignIn() {
     if (isLoading) return;
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    
    try {
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("Google Sign-In Redirect error:", error);
      let description = "Lỗi trong quá trình chuyển hướng đăng nhập Google.";
      
      if (error instanceof Error) {
        const authError = error as AuthError;
        if (authError.code === 'auth/operation-not-allowed') {
          description = "Đăng nhập bằng Google chưa được bật cho ứng dụng này.";
        } else if (authError.code === 'auth/cancelled-popup-request') {
          description = "Yêu cầu đăng nhập đã bị hủy.";
        }
      }
      
      toast({
        title: "Lỗi Google Sign-In",
        description,
        variant: "destructive",
      });
      
      setIsGoogleLoading(false);
    }
  }

  // Loading state
  if (loading || !mounted) {
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
            ĐANG TẢI...
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
        staggerChildren: 0.07
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
    }
  };

  const infoCardVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: (custom: number) => ({
      opacity: 1,
      x: 0,
      transition: { 
        delay: 0.3 + custom * 0.2, 
        duration: 0.7, 
        ease: "easeOut" 
      }
    })
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-background to-slate-900/90 overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
        {/* Particles with varied sizes and animations */}
        {particles.map(particle => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full bg-primary"
            style={{ 
              left: `${particle.x}%`, 
              top: `${particle.y}%`,
              height: `${particle.size * 2}px`,
              width: `${particle.size * 2}px`,
            }}
            animate={{ 
              opacity: [0.3, 0.8, 0.3], 
              scale: [1, 1.5, 1],
              boxShadow: [
                '0 0 0px rgba(56, 189, 248, 0.3)',
                '0 0 10px rgba(56, 189, 248, 0.5)',
                '0 0 0px rgba(56, 189, 248, 0.3)'
              ]
            }}
            transition={{ 
              duration: Math.random() * 3 + 2, 
              repeat: Infinity, 
              repeatType: "reverse" 
            }}
          />
        ))}
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293720_1px,transparent_1px),linear-gradient(to_bottom,#1f293720_1px,transparent_1px)] bg-[size:50px_50px]" />
        
        {/* Radial gradient overlay */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/80 pointer-events-none" />
      </div>

      <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0 z-10">
        {/* Left Panel - Brand info & Testimonials */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative hidden h-full flex-col p-10 text-white dark:border-r lg:flex overflow-hidden"
        >
          {/* Dynamic gradient background */}
          <motion.div
            animate={{ 
              backgroundPosition: ['0% 0%', '100% 100%'],
              backgroundSize: ['100% 100%', '120% 120%', '100% 100%'],
            }}
            transition={{ 
              backgroundPosition: { duration: 35, ease: "linear", repeat: Infinity, repeatType: "reverse" },
              backgroundSize: { duration: 15, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }
            }}
            className="absolute inset-0 bg-gradient-to-br from-blue-600/80 via-primary/70 to-indigo-800/80"
          />

          {/* Glass effect overlay */}
          <div className="absolute inset-0 backdrop-blur-[2px] bg-black/5 pointer-events-none" />

          {/* Decorative effects */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Glowing orbs with parallax effect */}
            <motion.div
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ 
                scale: [1, 1.05, 1], 
                opacity: [0.5, 0.8, 0.5],
                y: [-5, 5, -5]
              }}
              transition={{ 
                duration: 5, 
                repeat: Infinity, 
                repeatType: "loop",
              }}
              className="absolute top-[15%] left-[20%] w-64 h-64 rounded-full bg-white/10 blur-3xl"
            />
            <motion.div
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ 
                scale: [1, 1.05, 1], 
                opacity: [0.5, 0.8, 0.5],
                x: [5, -5, 5]
              }}
              transition={{ 
                duration: 7, 
                repeat: Infinity, 
                repeatType: "loop" 
              }}
              className="absolute bottom-[20%] right-[10%] w-96 h-96 rounded-full bg-blue-500/20 blur-3xl"
            />
            
            {/* Subtle flowing lines */}
            <svg className="absolute w-full h-full opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
              <motion.path
                d="M0,50 Q25,30 50,50 T100,50"
                stroke="white"
                strokeWidth="0.2"
                fill="none"
                animate={{ 
                  d: [
                    "M0,50 Q25,30 50,50 T100,50",
                    "M0,45 Q25,65 50,45 T100,45",
                    "M0,50 Q25,30 50,50 T100,50"
                  ]
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.path
                d="M0,70 Q25,50 50,70 T100,70"
                stroke="white"
                strokeWidth="0.2"
                fill="none"
                animate={{ 
                  d: [
                    "M0,70 Q25,50 50,70 T100,70",
                    "M0,65 Q25,85 50,65 T100,65",
                    "M0,70 Q25,50 50,70 T100,70"
                  ]
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              />
            </svg>
          </div>

          {/* Brand Logo & Name */}
          <motion.div
            whileHover={{ scale: 1.03 }}
            className="relative z-20 flex items-center gap-4 text-xl font-medium text-primary-foreground cursor-pointer mb-12 group"
          >
            <div className="relative h-14 w-14 rounded-xl bg-white/10 p-2 backdrop-blur-lg flex items-center justify-center overflow-hidden border border-white/20 shadow-lg">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, ease: "linear", repeat: Infinity }}
                className="absolute inset-0 bg-gradient-to-r from-primary/40 via-blue-500/40 to-primary/40 opacity-30"
              />
              <motion.div
                animate={{ 
                  boxShadow: [
                    '0 0 0 0 rgba(255,255,255,0)',
                    '0 0 20px 10px rgba(255,255,255,0.3)',
                    '0 0 0 0 rgba(255,255,255,0)'
                  ] 
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute inset-0 rounded-xl"
              />
              <Logo className="text-white h-8 w-8 relative z-10 group-hover:text-blue-200 transition-colors duration-300" />
            </div>
            <div>
              <motion.span 
                className="font-bold tracking-wider text-2xl bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200"
                animate={{ 
                  backgroundPosition: ['0% center', '100% center', '0% center']
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              >
                AI DINH DƯỠNG
              </motion.span>
              <p className="text-xs font-light text-white/70 tracking-wider mt-0.5 group-hover:text-white/90 transition-colors duration-300">
                HỆ THỐNG DINH DƯỠNG THÔNG MINH
              </p>
            </div>
          </motion.div>

          {/* App Highlights Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="relative z-20 mb-10"
          >
            <h2 className="text-xl font-semibold text-white/90 mb-4">
              Vì sao chọn <span className="text-blue-300">AI Dinh Dưỡng</span>?
            </h2>
            
            <div className="grid grid-cols-1 gap-4 mt-5">
              {[
                {
                  icon: "✓",
                  title: "Cá nhân hóa 100%",
                  desc: "Dựa trên sở thích, nhu cầu và mục tiêu cá nhân của bạn",
                },
                {
                  icon: "✓",
                  title: "Theo dõi dinh dưỡng thông minh",
                  desc: "Tự động phân tích bữa ăn qua hình ảnh",
                },
                {
                  icon: "✓",
                  title: "AI trợ lý mọi lúc",
                  desc: "Hỗ trợ tức thì qua chat và giọng nói",
                }
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  className="flex items-start gap-3 group"
                  variants={infoCardVariants}
                  initial="hidden"
                  animate="visible"
                  custom={index}
                  whileHover={{ x: 5, transition: { duration: 0.2 } }}
                >
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 backdrop-blur-sm flex items-center justify-center text-blue-300 border border-blue-400/30">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-white group-hover:text-blue-200 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
                      {feature.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Testimonials */}
          <div className="relative z-20 mt-auto space-y-4">
            <motion.h3
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.7 }}
              className="text-lg font-medium text-white/90 mb-4"
            >
              Người dùng nói gì về chúng tôi
            </motion.h3>
            
            <motion.div
              variants={infoCardVariants}
              initial="hidden"
              animate="visible"
              custom={0}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-5 shadow-lg hover:bg-white/10 transition-colors duration-300"
            >
              <div className="flex items-center gap-2 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <blockquote className="space-y-2">
                <p className="text-white/90 leading-relaxed">
                  "Hệ thống AI này đã giúp tôi lập kế hoạch dinh dưỡng hiệu quả và khoa học hơn rất nhiều. Đơn giản mà vẫn chính xác."
                </p>
                <footer className="text-sm text-white/70 font-medium flex items-center gap-2 mt-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/30 flex items-center justify-center text-blue-200 font-semibold">S</div>
                  <div>
                    <p className="font-medium">Sofia Davis</p>
                    <p className="text-xs text-white/50">Chuyên gia dinh dưỡng</p>
                  </div>
                </footer>
              </blockquote>
            </motion.div>

            <motion.div
              variants={infoCardVariants}
              initial="hidden"
              animate="visible"
              custom={1}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-5 shadow-lg hover:bg-white/10 transition-colors duration-300"
            >
              <div className="flex items-center gap-2 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <blockquote className="space-y-2">
                <p className="text-white/90 leading-relaxed">
                  "Đơn giản, hiệu quả và chính xác. Tôi đã đạt được mục tiêu sức khỏe của mình nhanh hơn dự kiến nhờ AI tư vấn."
                </p>
                <footer className="text-sm text-white/70 font-medium flex items-center gap-2 mt-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/30 flex items-center justify-center text-green-200 font-semibold">M</div>
                  <div>
                    <p className="font-medium">Minh Tuấn</p>
                    <p className="text-xs text-white/50">Huấn luyện viên thể hình</p>
                  </div>
                </footer>
              </blockquote>
            </motion.div>
          </div>

          {/* Footer */}
          <div className="relative z-20 mt-8 text-sm text-white/50 flex justify-between items-center">
            <p>© {new Date().getFullYear()} AI Dinh Dưỡng</p>
            <div className="flex gap-3">
              <Link href="#" className="text-white/50 hover:text-white/90 transition-colors">
                Điều khoản
              </Link>
              <Link href="#" className="text-white/50 hover:text-white/90 transition-colors">
                Quyền riêng tư
              </Link>
            </div>
          </div>
        </motion.div>
        
        {/* Right Panel - Login Form */}
        <div className="lg:p-8 flex items-center justify-center relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[430px] px-5 lg:px-0"
          >
            {/* Card container with glassmorphism */}
            <motion.div
              variants={itemVariants}
              className="relative bg-black/40 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-slate-700/30 overflow-hidden"
            >
              {/* Decorative effects */}
              <div className="absolute -top-28 -right-28 w-56 h-56 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-40 -left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              
              {/* Animated highlights */}
              <motion.div
                className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent"
                animate={{ 
                  opacity: [0, 1, 0],
                  backgroundPosition: ['100% 0%', '0% 0%', '-100% 0%'],
                }}
                transition={{ 
                  duration: 4,
                  repeat: Infinity,
                  repeatType: "loop",
                  ease: "easeInOut"
                }}
              />
              
              <div className="relative z-10">
                {/* Login Form Header */}
                <div className="flex flex-col space-y-3 text-center mb-8">
                  <motion.div
                    variants={itemVariants}
                    className="flex justify-center"
                  >
                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/80 to-blue-600/80 p-2.5 mb-2 relative shadow-lg border border-primary/30 group">
                      <motion.div 
                        className="absolute inset-0.5 rounded-lg bg-black/50 backdrop-blur-sm" 
                        animate={{ 
                          boxShadow: ['inset 0 0 0px rgba(56,189,248,0)', 'inset 0 0 15px rgba(56,189,248,0.3)', 'inset 0 0 0px rgba(56,189,248,0)']
                        }}
                        transition={{ duration: 3, repeat: Infinity, repeatType: "loop" }}
                      />
                      <Lock className="h-full w-full text-white relative z-10 group-hover:text-blue-200 transition-colors duration-300" />
                    </div>
                  </motion.div>
                  
                  <motion.h1
                    variants={itemVariants}
                    className="text-2xl font-bold tracking-tight"
                  >
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-primary-foreground to-white">
                      Chào mừng trở lại
                    </span>
                  </motion.h1>
                  
                  <motion.p
                    variants={itemVariants}
                    className="text-sm text-slate-400"
                  >
                    Đăng nhập để tiếp tục hành trình dinh dưỡng của bạn
                  </motion.p>
                </div>

                {/* Login Form */}
                <form onSubmit={onSubmit} className="space-y-5">
                  {/* Email Input */}
                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label
                      htmlFor="email"
                      className={cn(
                        "text-slate-300 flex items-center gap-1.5 text-sm transition-colors duration-200",
                        focusedField === 'email' ? "text-primary" : ""
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
                        value={formData.email}
                        onChange={handleInputChange}
                        onFocus={() => handleFocus('email')}
                        onBlur={() => handleBlur('email')}
                        placeholder="email@example.com"
                        className={cn(
                          "pl-3 pr-3 py-3 text-base transition-all duration-200 bg-slate-900/50 backdrop-blur-sm border rounded-lg text-white placeholder:text-slate-500 focus:outline-none", 
                          focusedField === 'email' 
                            ? "border-primary ring-2 ring-primary/20" 
                            : formErrors.email && hasInteracted.email 
                              ? "border-red-500/70 ring-2 ring-red-500/20" 
                              : "border-slate-700/50 focus:border-primary focus:ring-2 focus:ring-primary/30"
                        )}
                        aria-invalid={!!(formErrors.email && hasInteracted.email)}
                      />
                      
                      {/* Animated underline effect */}
                      <div className={cn(
                        "absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary to-blue-400 transition-all duration-300",
                        focusedField === 'email' ? "w-full" : "w-0"
                      )} />
                      
                      {/* Error message */}
                      {formErrors.email && hasInteracted.email && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-1.5 mt-1.5 text-red-500 text-xs"
                        >
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.email}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>

                  {/* Password Input */}
                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label
                      htmlFor="password"
                      className={cn(
                        "text-slate-300 flex items-center gap-1.5 text-sm transition-colors duration-200",
                        focusedField === 'password' ? "text-primary" : ""
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
                        autoComplete="current-password"
                        value={formData.password}
                        onChange={handleInputChange}
                        onFocus={() => handleFocus('password')}
                        onBlur={() => handleBlur('password')}
                        placeholder="••••••••"
                        className={cn(
                          "pl-3 pr-10 py-3 text-base transition-all duration-200 bg-slate-900/50 backdrop-blur-sm border rounded-lg text-white placeholder:text-slate-500 focus:outline-none", 
                          focusedField === 'password' 
                            ? "border-primary ring-2 ring-primary/20" 
                            : formErrors.password && hasInteracted.password 
                              ? "border-red-500/70 ring-2 ring-red-500/20" 
                              : "border-slate-700/50 focus:border-primary focus:ring-2 focus:ring-primary/30"
                        )}
                        aria-invalid={!!(formErrors.password && hasInteracted.password)}
                      />
                      
                      {/* Password visibility toggle */}
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                        aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      
                      {/* Animated underline effect */}
                      <div className={cn(
                        "absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary to-blue-400 transition-all duration-300",
                        focusedField === 'password' ? "w-full" : "w-0"
                      )} />
                      
                      {/* Error message */}
                      {formErrors.password && hasInteracted.password && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-1.5 mt-1.5 text-red-500 text-xs"
                        >
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.password}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>

                  {/* Forgot Password Link */}
                  <div className="flex items-center justify-end text-sm">
                    <motion.a
                      variants={itemVariants}
                      href="#"
                      className="font-medium text-primary hover:text-primary/80 transition-colors hover:underline underline-offset-4"
                    >
                      Quên mật khẩu?
                    </motion.a>
                  </div>

                  {/* Submit Button */}
                  <motion.div 
                    variants={itemVariants}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      type="submit"
                      className="w-full font-medium flex items-center justify-center gap-2 py-5 text-base bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white rounded-lg relative overflow-hidden group transition-all duration-300 ease-out hover:shadow-lg hover:shadow-primary/30 disabled:opacity-70 disabled:cursor-not-allowed"
                      disabled={isLoading || isGoogleLoading || (hasInteracted.email && !!formErrors.email) || (hasInteracted.password && !!formErrors.password)}
                    >
                      {/* Animated shine effect */}
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.3)_50%,transparent_100%)] opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-700 ease-in-out -z-10" />
                      
                      {/* Pulsing glow effect for idle state */}
                      <motion.div
                        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-0"
                        animate={{ 
                          boxShadow: [
                            '0 0 0 0 rgba(56, 189, 248, 0)',
                            '0 0 0 4px rgba(56, 189, 248, 0.3)',
                            '0 0 0 0 rgba(56, 189, 248, 0)'
                          ]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          repeatType: "loop"
                        }}
                      />
                      
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
                            Đăng nhập
                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Button>
                  </motion.div>

                  {/* Divider */}
                  <motion.div variants={itemVariants} className="relative my-6">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <span className="w-full border-t border-slate-700/70" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-black/40 px-3 text-slate-400 backdrop-blur-sm rounded-md">
                        Hoặc tiếp tục với
                      </span>
                    </div>
                  </motion.div>

                  {/* Google Sign-In Button */}
                  <motion.div 
                    variants={itemVariants}
                    whileTap={{ scale: 0.98 }}
                    className="grid grid-cols-1 gap-4"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full bg-slate-800/50 hover:bg-slate-700/70 text-slate-300 border-slate-700 hover:border-slate-600 disabled:opacity-70 transition-all py-5 text-base rounded-lg relative overflow-hidden"
                      disabled={isLoading || isGoogleLoading}
                      onClick={handleGoogleSignIn}
                    >
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center justify-center gap-3 font-medium"
                      >
                        {/* Loading spinner for Google button */}
                        {isGoogleLoading ? (
                          <motion.div
                            key="google-loading"
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2 }}
                            className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin"
                            aria-label="Đang đăng nhập Google"
                          />
                        ) : (
                          <>
                            {/* Google Icon with enhanced appearance */}
                            <div className="h-5 w-5 bg-white rounded-full flex items-center justify-center">
                              <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path fill="#EA4335" d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0545455,0 12,0 C7.27006974,0 3.1977497,2.69829785 1.23999023,6.65002441 L5.26620003,9.76452941 Z" />
                                <path fill="#34A853" d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,17.3349879 C3.19279051,21.2936293 7.26500293,24 12,24 C14.9328362,24 17.7353462,22.9573905 19.834192,20.9995801 L16.0407269,18.0125889 Z" />
                                <path fill="#4A90E2" d="M19.834192,20.9995801 C22.0291676,18.9520994 23.4545455,15.903663 23.4545455,12 C23.4545455,11.2909091 23.3454545,10.5272727 23.1818182,9.81818182 L12,9.81818182 L12,14.4545455 L18.4363636,14.4545455 C18.1187732,16.013626 17.2662994,17.2212117 16.0407269,18.0125889 L19.834192,20.9995801 Z" />
                                <path fill="#FBBC05" d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,6.65002441 C0.43658717,8.26043162 0,10.0753848 0,12 C0,13.9195484 0.444780743,15.7301709 1.23746264,17.3349879 L5.27698177,14.2678769 Z" />
                              </svg>
                            </div>
                            <span>Đăng nhập với Google</span>
                          </>
                        )}
                      </motion.div>
                    </Button>
                  </motion.div>
                </form>
              </div>
            </motion.div>

            {/* Sign-up Link */}
            <motion.p
              variants={itemVariants}
              className="text-center text-sm text-slate-400"
            >
              Chưa có tài khoản?{" "}
              <Link
                href="/auth/register"
                className="font-medium text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
              >
                Đăng ký ngay
              </Link>
            </motion.p>
            
            {/* Security Badge */}
            <motion.div
              variants={itemVariants}
              className="flex items-center justify-center gap-2 text-xs text-slate-500"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Kết nối bảo mật SSL 256-bit
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}