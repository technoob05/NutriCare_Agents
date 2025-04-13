"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react"; // Vẫn giữ import signIn cho nút Google
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Lock, Mail, ArrowRight, Sparkles } from "lucide-react"; // Thêm Sparkles cho loading
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/logo"; // Giả sử bạn có component này
import { cn } from "@/lib/utils";

// Giữ nguyên interface User vì đang dùng localStorage
interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  createdAt?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

  // Animation for the cybernetic particles (Lấy từ code high-tech)
  const [particles, setParticles] = useState<Array<{ id: number, x: number, y: number }>>([]);

  useEffect(() => {
    setMounted(true);
    // === Chức năng gốc: Kiểm tra localStorage ===
    const currentUser = localStorage.getItem("currentUser");
    if (currentUser) {
      router.push("/");
    }
    // === Kết thúc chức năng gốc ===

    // === Hiệu ứng particles (Lấy từ code high-tech) ===
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

  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFocus = (field: 'email' | 'password') => {
    setFocusedField(field);
  };

  const handleBlur = () => {
    setFocusedField(null);
  };

  // === Chức năng gốc: onSubmit với localStorage ===
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const { email, password } = formData;

    // Đảm bảo chạy phía client
    if (typeof window !== 'undefined') {
      // Thêm delay nhỏ để giả lập thời gian xử lý
      await new Promise(resolve => setTimeout(resolve, 500));
      try {
        const users: User[] = JSON.parse(localStorage.getItem("users") || "[]");
        const user = users.find((u) => u.email === email && u.password === password);

        if (user) {
          localStorage.setItem("currentUser", JSON.stringify(user));
          toast({
            title: "Thành công",
            description: "Đăng nhập thành công!",
          });
          router.push("/"); // Chuyển hướng
        } else {
          toast({
            title: "Lỗi",
            description: "Email hoặc mật khẩu không chính xác.",
            variant: "destructive",
          });
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Login error:", error);
        toast({
          title: "Lỗi",
          description: "Có lỗi xảy ra trong quá trình đăng nhập.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    }
  }
  // === Kết thúc chức năng gốc: onSubmit ===

  // === Loading state ban đầu (Lấy từ code high-tech) ===
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

  // === Animation variants (Lấy từ code high-tech) ===
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08 // Điều chỉnh tốc độ xuất hiện
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
    // === Layout và nền chính (Lấy từ code high-tech) ===
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
        {/* === Panel bên trái - Branding & Testimonials (Giao diện high-tech, nội dung gốc) === */}
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
            className="absolute inset-0 bg-gradient-to-br from-blue-600/80 via-primary/70 to-indigo-800/80 bg-[length:200%_200%]"
          />

          {/* Hiệu ứng trang trí */}
          <div className="absolute inset-0 pointer-events-none">
             {/* Glowing orbs */}
            <motion.div
               initial={{ scale: 1, opacity: 0.5 }}
               animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }}
               transition={{ duration: 5, repeat: Infinity, repeatType: "loop" }}
              className="absolute top-[10%] left-[20%] w-64 h-64 rounded-full bg-white/10 blur-3xl"
            />
            <motion.div
              initial={{ scale: 1, opacity: 0.5 }}
               animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }}
               transition={{ duration: 7, repeat: Infinity, repeatType: "loop" }} // Thay đổi duration chút
              className="absolute bottom-[20%] right-[10%] w-96 h-96 rounded-full bg-blue-500/20 blur-3xl"
            />
             {/* Grid pattern nhẹ */}
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
            className="relative z-20 flex items-center gap-4 text-xl font-medium text-primary-foreground cursor-pointer mb-12" // Thêm margin bottom
          >
            <div className="relative h-12 w-12 rounded-lg bg-white/10 p-1.5 backdrop-blur-lg flex items-center justify-center overflow-hidden border border-white/20">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 12, ease: "linear", repeat: Infinity }}
                className="absolute inset-0 bg-gradient-to-r from-primary/40 via-blue-500/40 to-primary/40 opacity-30"
              />
              <Logo className="text-white h-7 w-7 relative z-10" />
            </div>
            <div>
              <span className="font-bold tracking-wider text-2xl bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">AI DINH DƯỠNG</span>
              <p className="text-xs font-light text-white/70 tracking-wider mt-0.5">HỆ THỐNG DINH DƯỠNG THÔNG MINH</p>
            </div>
          </motion.div>

          {/* Testimonials (Lấy từ code gốc của bạn, styling lại) */}
          <div className="relative z-20 mt-auto space-y-8">
             <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-5 shadow-lg"
            >
              <blockquote className="space-y-2">
                <p className="text-lg text-white/90 italic leading-relaxed">
                  "Hệ thống AI này đã giúp tôi lập kế hoạch dinh dưỡng hiệu quả và khoa học hơn rất nhiều."
                </p>
                <footer className="text-sm text-white/70 font-medium">Sofia Davis - Chuyên gia dinh dưỡng</footer>
              </blockquote>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }} // Delay khác đi
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-5 shadow-lg"
            >
              <blockquote className="space-y-2">
                <p className="text-lg text-white/90 italic leading-relaxed">
                  "Đơn giản, hiệu quả và chính xác. Tôi đã đạt được mục tiêu sức khỏe của mình nhanh hơn dự kiến."
                </p>
                <footer className="text-sm text-white/70 font-medium">Minh Tuấn - Huấn luyện viên thể hình</footer>
              </blockquote>
            </motion.div>
          </div>

          {/* Footer */}
          <div className="relative z-20 mt-8 text-sm text-white/50">
            © {new Date().getFullYear()} AI Dinh Dưỡng. Mọi quyền được bảo lưu.
          </div>
        </motion.div>
        {/* === Kết thúc Panel bên trái === */}

        {/* === Panel bên phải - Login Form (Giao diện high-tech, chức năng gốc) === */}
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
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-32 -left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              <svg className="absolute top-0 right-0 w-full h-24 opacity-10 pointer-events-none" viewBox="0 0 200 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0,50 Q50,10 100,50 T200,50" stroke="white" strokeWidth="1" fill="none" />
                <circle cx="50" cy="30" r="2" fill="white" />
                <circle cx="150" cy="30" r="2" fill="white" />
              </svg>

              <div className="relative z-10">
                <div className="flex flex-col space-y-3 text-center mb-8">
                   {/* Icon đầu form */}
                  <motion.div
                    variants={itemVariants}
                    className="flex justify-center"
                  >
                     <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/80 to-blue-600/80 p-2.5 mb-2 relative shadow-lg border border-primary/30">
                      <div className="absolute inset-0.5 rounded-lg bg-black/50 backdrop-blur-sm" />
                      <Lock className="h-full w-full text-white relative z-10" />
                    </div>
                  </motion.div>
                  {/* Tiêu đề form (Giữ từ code gốc của bạn) */}
                  <motion.h1
                    variants={itemVariants}
                    className="text-2xl font-bold tracking-tight text-white"
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

                {/* --- Form (Chức năng gốc, styling high-tech) --- */}
                <form onSubmit={onSubmit} className="space-y-6">
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
                        value={formData.email}
                        onChange={handleInputChange}
                        onFocus={() => handleFocus('email')}
                        onBlur={handleBlur}
                        placeholder="email@example.com"
                        className={cn(
                          "pl-3 pr-3 py-3 text-base transition-all duration-200 bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-lg text-white placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none", // Style input high-tech
                          focusedField === 'email' && "border-primary ring-1 ring-primary/30"
                        )}
                      />
                       <div className={cn( // Hiệu ứng gạch chân focus
                        "absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary to-blue-400 transition-all duration-300",
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
                        autoComplete="current-password"
                        value={formData.password}
                        onChange={handleInputChange}
                        onFocus={() => handleFocus('password')}
                        onBlur={handleBlur}
                        placeholder="••••••••"
                        className={cn(
                          "pl-3 pr-10 py-3 text-base transition-all duration-200 bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-lg text-white placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none", // Style input high-tech
                          focusedField === 'password' && "border-primary ring-1 ring-primary/30"
                        )}
                      />
                      {/* Nút ẩn/hiện mật khẩu (Giữ chức năng gốc, style high-tech) */}
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                        aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <div className={cn( // Hiệu ứng gạch chân focus
                        "absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary to-blue-400 transition-all duration-300",
                        focusedField === 'password' ? "w-full" : "w-0"
                      )} />
                    </div>
                  </motion.div>

                  {/* Remember Me & Forgot Password (Giữ từ code gốc) */}
                  <div className="flex items-center justify-between text-sm">
                     <motion.div variants={itemVariants} className="flex items-center">
                       <input
                         id="remember"
                         type="checkbox"
                         // Style checkbox cho nền tối
                         className="h-4 w-4 rounded border-slate-600 text-primary focus:ring-primary/50 bg-slate-800 focus:ring-offset-black cursor-pointer"
                       />
                       <label htmlFor="remember" className="ml-2 block text-slate-400 cursor-pointer">
                         Nhớ đăng nhập
                       </label>
                     </motion.div>
                    <motion.a
                      variants={itemVariants}
                      href="#" // Thay bằng link thật
                      className="font-medium text-primary hover:text-primary/80 transition-colors hover:underline underline-offset-4"
                    >
                      Quên mật khẩu?
                    </motion.a>
                  </div>

                  {/* Submit Button (Chức năng gốc, style high-tech) */}
                  <motion.div variants={itemVariants}>
                    <Button
                      type="submit"
                      className="w-full font-semibold flex items-center justify-center gap-2 py-3 text-base bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white rounded-lg relative overflow-hidden group transition-all duration-300 ease-out hover:shadow-lg hover:shadow-primary/30 disabled:opacity-70 disabled:cursor-not-allowed"
                      disabled={isLoading}
                    >
                      {/* Hiệu ứng sáng chạy qua */}
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
                            Đăng nhập
                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Button>
                  </motion.div>

                  {/* Divider (Style high-tech) */}
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

                  {/* Social Logins (Giữ nút gốc, style high-tech) */}
                   <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
                     {/* Google Button */}
                     <Button
                       type="button"
                       variant="outline"
                       className="w-full bg-slate-800/50 text-slate-300 hover:bg-slate-700/70 border-slate-700 hover:border-slate-600 disabled:opacity-70 transition-colors" // Style outline nền tối
                       disabled={isLoading}
                       onClick={() => signIn("google", { callbackUrl: "/" })} // Vẫn dùng signIn cho Google
                     >
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center justify-center gap-2 font-medium"
                      >
                        {/* Google Icon SVG */}
                        <svg className="h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 110.3 512 0 398.8 0 256S110.3 0 244 0c72.5 0 134.4 24.4 184.1 64.8l-67.6 67.2C314.5 101.1 282.6 84 244 84c-79.2 0-144 64.3-144 143.4s64.8 143.4 144 143.4c88.5 0 110.2-65.3 113.4-96.2H244v-78.8h144.6c1.9 8.6 3.1 17.5 3.1 26.7z"></path></svg>
                        Google
                      </motion.div>
                    </Button>
                    {/* Facebook Button (Giữ nguyên từ code gốc, không có onClick cụ thể) */}
                     <Button
                       type="button" // Quan trọng: type="button"
                       variant="outline"
                       className="w-full bg-slate-800/50 text-slate-300 hover:bg-slate-700/70 border-slate-700 hover:border-slate-600 disabled:opacity-70 transition-colors" // Style outline nền tối
                       disabled={isLoading}
                       // Không có onClick cho Facebook trong code gốc của bạn
                     >
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center justify-center gap-2 font-medium"
                      >
                        {/* Facebook Icon SVG */}
                        <svg className="h-5 w-5 text-blue-500" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="facebook-f" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><path fill="currentColor" d="M279.1 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.4 0 225.4 0c-73.22 0-121.1 44.38-121.1 124.7v70.62H22.89V288h81.39v224h100.2V288z"></path></svg>
                        Facebook
                      </motion.div>
                    </Button>
                  </motion.div>
                </form>
              </div>
            </motion.div>
            {/* === Kết thúc Card container === */}

            {/* Link to Register (Giữ nguyên) */}
            <motion.p
              variants={itemVariants}
              className="px-8 text-center text-sm text-slate-400" // Điều chỉnh màu text
            >
              Chưa có tài khoản?{" "}
              <Link
                href="/auth/register" // Đảm bảo link đúng
                className="font-medium text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
              >
                Đăng ký ngay
              </Link>
            </motion.p>
          </motion.div>
        </div>
        {/* === Kết thúc Panel bên phải === */}
      </div>
    </div>
  );
}