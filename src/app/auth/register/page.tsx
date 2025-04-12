"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, User as UserIcon, Mail, Lock, Sparkles, ArrowRight } from "lucide-react"; // Thêm icons cần thiết
import { motion, AnimatePresence } from "framer-motion"; // Import AnimatePresence
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

// Giữ nguyên interface User vì đang dùng localStorage
interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  createdAt?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Thêm state cho focus để làm hiệu ứng input
  const [focusedField, setFocusedField] = useState<'name' | 'email' | 'password' | null>(null);

  // Animation for the cybernetic particles (Lấy từ code login)
  const [particles, setParticles] = useState<Array<{ id: number, x: number, y: number }>>([]);

  useEffect(() => {
    setMounted(true);
    // === Chức năng gốc: Kiểm tra localStorage ===
    const currentUser = localStorage.getItem("currentUser");
    if (currentUser) {
      router.push("/");
    }
    // === Kết thúc chức năng gốc ===

     // === Hiệu ứng particles (Lấy từ code login) ===
    const initialParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100
    }));
    setParticles(initialParticles);

    const interval = setInterval(() => {
      setParticles(prev => prev.map(p => ({
        ...p,
        x: (p.x + (Math.random() - 0.5) * 1.5) % 100,
        y: (p.y + (Math.random() - 0.5) * 1.5) % 100
      })));
    }, 1800);

    return () => clearInterval(interval);
    // === Kết thúc hiệu ứng particles ===

  }, [router]); // Add router dependency

  // === Chức năng gốc: onSubmit với localStorage ===
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // Input validation basic (có thể thêm phức tạp hơn)
    if (!name || !email || !password) {
       toast({ title: "Lỗi", description: "Vui lòng điền đầy đủ thông tin.", variant: "destructive" });
       setIsLoading(false);
       return;
    }
    if (password.length < 6) {
        toast({ title: "Lỗi", description: "Mật khẩu phải có ít nhất 6 ký tự.", variant: "destructive" });
        setIsLoading(false);
        return;
    }


    // Đảm bảo chạy phía client
    if (typeof window !== 'undefined') {
       // Thêm delay nhỏ để giả lập thời gian xử lý
       await new Promise(resolve => setTimeout(resolve, 500));
      try {
        const users: User[] = JSON.parse(localStorage.getItem("users") || "[]");

        // Kiểm tra email tồn tại
        if (users.some((u) => u.email === email)) {
          toast({
            title: "Lỗi",
            description: "Email đã tồn tại. Vui lòng sử dụng email khác.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Tạo user mới
        const newUser: User = { // Thêm kiểu cho newUser
          id: Date.now().toString(),
          name,
          email,
          password, // !!! Cảnh báo: Lưu mật khẩu dạng plain text là RẤT KHÔNG AN TOÀN
          createdAt: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem("users", JSON.stringify(users));

        toast({
           title: "Thành công",
           description: "Đăng ký thành công! Đang chuyển đến trang đăng nhập...",
        });
        router.push("/auth/login"); // Chuyển hướng login

      } catch (error) {
        console.error("Registration error:", error);
        toast({
          title: "Lỗi",
          description: "Có lỗi xảy ra trong quá trình đăng ký.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    } else {
        setIsLoading(false); // Đảm bảo dừng loading nếu không ở client
    }
  }
  // === Kết thúc chức năng gốc: onSubmit ===

   const handleFocus = (field: 'name' | 'email' | 'password') => {
    setFocusedField(field);
  };

  const handleBlur = () => {
    setFocusedField(null);
  };


  // === Loading state ban đầu (Lấy từ code login) ===
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            <div className="absolute inset-2 rounded-full bg-primary/10 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            </div>
          </div>
          <p className="text-primary/70 font-light tracking-widest animate-pulse">KHỞI TẠO GIAO DIỆN</p>
        </div>
      </div>
    );
  }
  // === Kết thúc loading state ===

  // === Animation variants (Lấy từ code login) ===
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
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
  // === Kết thúc animation variants ===

  return (
    // === Layout và nền chính (Lấy từ code login) ===
     <div className="min-h-screen bg-gradient-to-br from-black via-background to-slate-900/80 overflow-hidden">
      {/* --- Hiệu ứng nền particles và grid --- */}
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
        {particles.map(particle => (
          <motion.div
            key={particle.id}
            className="absolute h-1 w-1 bg-primary rounded-full"
            style={{ left: `${particle.x}%`, top: `${particle.y}%` }}
            animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.5, 1] }}
            transition={{ duration: Math.random() * 3 + 2, repeat: Infinity, repeatType: "reverse" }}
          />
        ))}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293720_1px,transparent_1px),linear-gradient(to_bottom,#1f293720_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>
      {/* === Kết thúc hiệu ứng nền === */}

      <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0 z-10">
         {/* === Panel bên trái - Branding & Quote (Giao diện high-tech, nội dung đăng ký) === */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative hidden h-full flex-col p-10 text-white dark:border-r lg:flex overflow-hidden"
        >
          {/* Nền gradient động */}
          <motion.div
            animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
            transition={{ duration: 30, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
            className="absolute inset-0 bg-gradient-to-br from-primary/90 via-purple-600/80 to-indigo-800/90 bg-[length:200%_200%]" // Đổi màu gradient chút
          />

          {/* Hiệu ứng trang trí */}
           <div className="absolute inset-0 pointer-events-none">
             <motion.div
               initial={{ scale: 1, opacity: 0.5 }}
               animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }}
               transition={{ duration: 6, repeat: Infinity, repeatType: "loop" }}
              className="absolute top-[15%] left-[25%] w-72 h-72 rounded-full bg-white/10 blur-3xl" // Vị trí khác
            />
            <motion.div
              initial={{ scale: 1, opacity: 0.5 }}
               animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }}
               transition={{ duration: 8, repeat: Infinity, repeatType: "loop" }}
              className="absolute bottom-[15%] right-[15%] w-80 h-80 rounded-full bg-purple-500/20 blur-3xl" // Vị trí khác
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

          {/* Brand section */}
           <motion.div
            whileHover={{ scale: 1.05 }}
            className="relative z-20 flex items-center gap-4 text-xl font-medium text-primary-foreground cursor-pointer mb-12"
          >
            <div className="relative h-12 w-12 rounded-lg bg-white/10 p-1.5 backdrop-blur-lg flex items-center justify-center overflow-hidden border border-white/20">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 12, ease: "linear", repeat: Infinity }}
                className="absolute inset-0 bg-gradient-to-r from-primary/40 via-purple-500/40 to-primary/40 opacity-30" // Đổi màu gradient
              />
              <Logo className="text-white h-7 w-7 relative z-10" />
            </div>
            <div>
              <span className="font-bold tracking-wider text-2xl bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200">AI DINH DƯỠNG</span>
              <p className="text-xs font-light text-white/70 tracking-wider mt-0.5">HỆ THỐNG DINH DƯỠNG THÔNG MINH</p>
            </div>
          </motion.div>

          {/* Quote section (Thay thế testimonial) */}
           <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
              className="relative z-20 mt-auto bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-lg"
            >
              <blockquote className="space-y-3">
                 <Sparkles className="h-8 w-8 text-purple-300 mb-2"/> {/* Thêm icon trang trí */}
                 <p className="text-xl font-medium text-white/95 italic leading-relaxed">
                   "Bắt đầu hành trình sức khỏe tối ưu của bạn ngay hôm nay. Đăng ký để nhận phân tích dinh dưỡng cá nhân hóa bởi AI."
                 </p>
                <footer className="text-sm text-white/70">— Nhóm Phát triển AI Dinh Dưỡng</footer>
              </blockquote>
            </motion.div>

          {/* Footer */}
          <div className="relative z-20 mt-8 text-sm text-white/50">
            © {new Date().getFullYear()} AI Dinh Dưỡng. Mọi quyền được bảo lưu.
          </div>
        </motion.div>
        {/* === Kết thúc Panel bên trái === */}

        {/* === Panel bên phải - Register Form (Giao diện high-tech, chức năng gốc) === */}
        <div className="lg:p-8 flex items-center justify-center relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[420px] px-4 lg:px-0"
          >
             {/* Card container */}
            <motion.div
              variants={itemVariants}
              className="bg-black/40 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-slate-700/30 relative overflow-hidden"
            >
               {/* Hiệu ứng trang trí cho card */}
              <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-16 w-56 h-56 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
              <svg className="absolute bottom-0 left-0 w-full h-16 opacity-5 pointer-events-none" viewBox="0 0 200 50" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0,50 Q50,10 100,30 T200,10 L200,50 Z" fill="white"/>
              </svg>

              <div className="relative z-10">
                <div className="flex flex-col space-y-3 text-center mb-8">
                   {/* Icon đầu form */}
                   <motion.div
                    variants={itemVariants}
                    className="flex justify-center"
                  >
                     <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/80 to-purple-600/80 p-2.5 mb-2 relative shadow-lg border border-primary/30"> {/* Đổi màu gradient */}
                      <div className="absolute inset-0.5 rounded-lg bg-black/50 backdrop-blur-sm" />
                      <UserIcon className="h-full w-full text-white relative z-10" />
                    </div>
                  </motion.div>
                  {/* Tiêu đề form */}
                  <motion.h1
                    variants={itemVariants}
                    className="text-2xl font-bold tracking-tight text-white"
                  >
                     <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-white"> {/* Đổi màu gradient */}
                      Tạo tài khoản mới
                    </span>
                  </motion.h1>
                  <motion.p
                    variants={itemVariants}
                    className="text-sm text-slate-400"
                  >
                    Nhập thông tin của bạn để bắt đầu
                  </motion.p>
                </div>

                {/* --- Form (Chức năng gốc, styling high-tech) --- */}
                <form onSubmit={onSubmit} className="space-y-6">
                  {/* Name Input */}
                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label
                      htmlFor="name"
                      className={cn(
                        "text-slate-300 flex items-center gap-1.5 font-medium text-sm transition-colors",
                        focusedField === 'name' && "text-primary"
                      )}
                    >
                      <UserIcon className="h-4 w-4" /> Họ và tên
                    </Label>
                    <div className="relative">
                      <Input
                        id="name"
                        name="name"
                        type="text" // Type text cho tên
                        required
                        autoComplete="name" // Autocomplete
                        onFocus={() => handleFocus('name')}
                        onBlur={handleBlur}
                        placeholder="Nguyễn Văn A"
                        className={cn(
                          "pl-3 pr-3 py-3 text-base transition-all duration-200 bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-lg text-white placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none",
                          focusedField === 'name' && "border-primary ring-1 ring-primary/30"
                        )}
                      />
                       <div className={cn(
                        "absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary to-purple-400 transition-all duration-300", // Đổi màu gradient
                        focusedField === 'name' ? "w-full" : "w-0"
                      )} />
                    </div>
                  </motion.div>

                  {/* Email Input */}
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
                        className={cn(
                          "pl-3 pr-3 py-3 text-base transition-all duration-200 bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-lg text-white placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none",
                          focusedField === 'email' && "border-primary ring-1 ring-primary/30"
                        )}
                      />
                       <div className={cn(
                        "absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary to-purple-400 transition-all duration-300",
                        focusedField === 'email' ? "w-full" : "w-0"
                      )} />
                    </div>
                  </motion.div>

                  {/* Password Input */}
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
                        autoComplete="new-password" // Gợi ý trình duyệt đây là mật khẩu mới
                        onFocus={() => handleFocus('password')}
                        onBlur={handleBlur}
                        placeholder="•••••••• (ít nhất 6 ký tự)" // Thêm gợi ý độ dài
                        className={cn(
                          "pl-3 pr-10 py-3 text-base transition-all duration-200 bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-lg text-white placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none",
                          focusedField === 'password' && "border-primary ring-1 ring-primary/30"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1.25 text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                        aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                       <div className={cn(
                        "absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary to-purple-400 transition-all duration-300",
                        focusedField === 'password' ? "w-full" : "w-0"
                      )} />
                    </div>
                  </motion.div>

                  {/* Submit Button */}
                  <motion.div variants={itemVariants} className="pt-2"> {/* Thêm padding top */}
                    <Button
                      type="submit"
                      className="w-full font-semibold flex items-center justify-center gap-2 py-3 text-base bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white rounded-lg relative overflow-hidden group transition-all duration-300 ease-out hover:shadow-lg hover:shadow-primary/30 disabled:opacity-70 disabled:cursor-not-allowed" // Đổi màu gradient
                      disabled={isLoading}
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
                   {/* Không có divider và social login */}
                </form>
              </div>
            </motion.div>
            {/* === Kết thúc Card container === */}

             {/* Link to Login */}
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
          </motion.div>
        </div>
         {/* === Kết thúc Panel bên phải === */}
      </div>
    </div>
  );
}