"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff, Lock, Mail, ArrowRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Logo } from "@/components/logo"
import { cn } from "@/lib/utils" // Import utility for conditional classNames

// Define a simple User interface
interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Password might not always be present depending on context
  createdAt?: string;
}

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null) // Add type for state

  useEffect(() => {
    setMounted(true)
    // Check if already logged in on mount (client-side)
    const currentUser = localStorage.getItem("currentUser")
    if (currentUser) {
      router.push("/")
    }
  }, [router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { // Add type for event
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleFocus = (field: 'email' | 'password' | null) => { // Add type for field
    setFocusedField(field)
  }

  const handleBlur = () => {
    setFocusedField(null)
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) { // Add type for event
    e.preventDefault()
    setIsLoading(true)

    const { email, password } = formData

    // Ensure localStorage access is client-side only
    if (typeof window !== 'undefined') {
      try {
        const users: User[] = JSON.parse(localStorage.getItem("users") || "[]") // Type the parsed users
        const user = users.find((u: User) => u.email === email && u.password === password) // Add type for user parameter

        if (user) {
          localStorage.setItem("currentUser", JSON.stringify(user))
          toast({
            title: "Thành công",
            description: "Đăng nhập thành công!",
          })

          router.push("/")
        } else {
          toast({
            title: "Lỗi",
            description: "Email hoặc mật khẩu không chính xác.",
            variant: "destructive",
          })
          setIsLoading(false)
        }
      } catch (error) {
        console.error("Login error:", error)
        toast({
          title: "Lỗi",
          description: "Có lỗi xảy ra trong quá trình đăng nhập.",
          variant: "destructive",
        })
        setIsLoading(false)
      }
    }
  }

  // Loading state during hydration
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground animate-pulse">Đang tải...</p>
        </div>
      </div>
    )
  }

  // Animation variants
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
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5 }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10">
      <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        {/* Left Panel - Branding & Testimonial */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="relative hidden h-full flex-col p-10 text-white dark:border-r lg:flex overflow-hidden"
        >
          {/* Enhanced gradient background with subtle animation */}
          <motion.div 
            animate={{ 
              backgroundPosition: ['0% 0%', '100% 100%'],
            }}
            transition={{ 
              duration: 20,
              ease: "linear",
              repeat: Infinity,
              repeatType: "reverse"
            }}
            className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/80 to-purple-600/90 bg-[length:200%_200%]"
          />
          
          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-[10%] left-[20%] w-64 h-64 rounded-full bg-white/10 blur-3xl"/>
            <div className="absolute bottom-[20%] right-[10%] w-96 h-96 rounded-full bg-purple-500/20 blur-3xl"/>
          </div>

          {/* Brand section with subtle hover effect */}
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="relative z-20 flex items-center gap-3 text-xl font-medium text-primary-foreground cursor-pointer"
          >
            <div className="h-10 w-10 rounded-full bg-white/20 p-1.5 backdrop-blur-sm flex items-center justify-center">
              <Logo className="text-white h-6 w-6" />
            </div>
            {/* <span className="font-bold tracking-tight">AI Dinh Dưỡng</span> */}
          </motion.div>

          {/* Multiple floating testimonials */}
          <div className="relative z-20 mt-auto space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <blockquote className="space-y-2 border-l-4 border-white/50 pl-4 py-2">
                <p className="text-lg text-primary-foreground/90 italic">
                  "Hệ thống AI này đã giúp tôi lập kế hoạch dinh dưỡng hiệu quả và khoa học hơn rất nhiều."
                </p>
                <footer className="text-sm text-primary-foreground/70 font-medium">Sofia Davis - Chuyên gia dinh dưỡng</footer>
              </blockquote>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
            >
              <blockquote className="space-y-2 border-l-4 border-white/30 pl-4 py-2">
                <p className="text-lg text-primary-foreground/90 italic">
                  "Đơn giản, hiệu quả và chính xác. Tôi đã đạt được mục tiêu sức khỏe của mình nhanh hơn dự kiến."
                </p>
                <footer className="text-sm text-primary-foreground/70 font-medium">Minh Tuấn - Huấn luyện viên thể hình</footer>
              </blockquote>
            </motion.div>
          </div>

          {/* Footer branding */}
          <div className="relative z-20 mt-6 text-sm text-primary-foreground/50">
            © 2025 AI Dinh Dưỡng. Mọi quyền được bảo lưu.
          </div>
        </motion.div>

        {/* Login Form Area */}
        <div className="lg:p-8 flex items-center justify-center">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[420px]"
          >
            {/* Card container with enhanced shadow and subtle background */}
            <motion.div 
              variants={itemVariants}
              className="bg-card/80 backdrop-blur-sm p-8 rounded-xl shadow-xl border border-muted/20"
            >
              <div className="flex flex-col space-y-3 text-center mb-6">
                <motion.h1 
                  variants={itemVariants}
                  className="text-2xl font-bold tracking-tight text-card-foreground"
                >
                  Chào mừng trở lại
                </motion.h1>
                <motion.p 
                  variants={itemVariants}
                  className="text-sm text-muted-foreground"
                >
                  Đăng nhập để tiếp tục hành trình dinh dưỡng của bạn
                </motion.p>
              </div>

              <form onSubmit={onSubmit} className="space-y-5">
                <motion.div variants={itemVariants} className="space-y-2">
                  <Label 
                    htmlFor="email" 
                    className={cn(
                      "text-card-foreground flex items-center gap-1.5 font-medium",
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
                      value={formData.email}
                      onChange={handleInputChange}
                      onFocus={() => handleFocus('email')}
                      onBlur={handleBlur}
                      placeholder="email@example.com"
                      className={cn(
                        "pl-3 pr-3 py-2 transition-all duration-200 border-muted",
                        focusedField === 'email' && "border-primary ring-1 ring-primary/20"
                      )}
                    />
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-2">
                  <Label 
                    htmlFor="password" 
                    className={cn(
                      "text-card-foreground flex items-center gap-1.5 font-medium",
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
                      value={formData.password}
                      onChange={handleInputChange}
                      onFocus={() => handleFocus('password')}
                      onBlur={handleBlur}
                      placeholder="••••••••"
                      className={cn(
                        "pl-3 pr-10 py-2 transition-all duration-200 border-muted",
                        focusedField === 'password' && "border-primary ring-1 ring-primary/20"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </motion.div>

                <div className="flex items-center justify-between">
                  <motion.div variants={itemVariants} className="flex items-center">
                    <input
                      type="checkbox"
                      id="remember"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="remember" className="ml-2 block text-sm text-muted-foreground">
                      Nhớ đăng nhập
                    </label>
                  </motion.div>
                  
                  <motion.a 
                    variants={itemVariants}
                    href="#" 
                    className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Quên mật khẩu?
                  </motion.a>
                </div>

                <motion.div variants={itemVariants}>
                  <Button 
                    type="submit" 
                    className="w-full font-medium flex items-center justify-center gap-2 py-6"
                    disabled={isLoading}
                  >
                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin"
                          aria-label="Đang tải"
                        />
                      ) : (
                        <motion.span
                          key="text"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2"
                        >
                          Đăng nhập
                          <ArrowRight className="h-4 w-4" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                </motion.div>

                <motion.div variants={itemVariants} className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-muted" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      Hoặc tiếp tục với
                    </span>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    className="bg-white/80 hover:bg-white/90 transition-colors" 
                    disabled={isLoading}
                  >
                    <motion.div 
                      whileHover={{ scale: 1.02 }} 
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M8 12h8M12 8v8"></path>
                      </svg>
                      Google
                    </motion.div>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="bg-white/80 hover:bg-white/90 transition-colors" 
                    disabled={isLoading}
                  >
                    <motion.div 
                      whileHover={{ scale: 1.02 }} 
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                      </svg>
                      Facebook
                    </motion.div>
                  </Button>
                </motion.div>
              </form>
            </motion.div>

            <motion.p 
              variants={itemVariants}
              className="text-center text-sm text-muted-foreground"
            >
              Chưa có tài khoản?{" "}
              <Link 
                href="/auth/register" 
                className="font-medium text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-all"
              >
                Đăng ký ngay
              </Link>
            </motion.p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
