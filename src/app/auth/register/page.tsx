"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button" // Corrected path
import { Input } from "@/components/ui/input" // Corrected path
// Card components are not used in the register snippet, removing imports
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label" // Corrected path
import { useToast } from "@/hooks/use-toast" // Corrected path
import { Eye, EyeOff } from "lucide-react"
import { motion } from "framer-motion" // Import directly
import { Logo } from "@/components/logo" // Corrected path


export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast() // Corrected hook usage
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
     // Check if already logged in on mount (client-side)
    const currentUser = localStorage.getItem("currentUser")
    if (currentUser) {
      router.push("/")
    }
  }, [router]) // Add router to dependency array

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    // Ensure localStorage access is client-side only
     if (typeof window !== 'undefined') {
        try {
          const users = JSON.parse(localStorage.getItem("users") || "[]")

          if (users.some((u: any) => u.email === email)) {
            toast({ // Use toast function
              title: "Lỗi",
              description: "Email đã tồn tại.",
              variant: "destructive",
            })
            setIsLoading(false); // Stop loading on error
            return
          }

          const newUser = {
            id: Date.now().toString(), // Simple ID generation
            name,
            email,
            password, // Storing password directly (consider hashing in a real app)
            createdAt: new Date().toISOString()
          }

          users.push(newUser)
          localStorage.setItem("users", JSON.stringify(users))

          toast({ // Use toast function
             title: "Thành công",
             description: "Đăng ký thành công! Vui lòng đăng nhập.",
          })
          router.push("/auth/login") // Redirect to login after successful registration
        } catch (error) {
          console.error("Registration error:", error); // Log the actual error
          toast({ // Use toast function
            title: "Lỗi",
            description: "Có lỗi xảy ra trong quá trình đăng ký.",
            variant: "destructive",
          })
        } finally {
          setIsLoading(false)
        }
     } else {
         setIsLoading(false);
     }
  }

  if (!mounted) {
     // Optional: Render a basic loading state or null during mount
     return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
     );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10">
       {/* <ToastContainer /> removed, handled by <Toaster /> in layout */}
      <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">

        {/* Background Design */}
        <motion.div // Use imported motion
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-purple-600 opacity-80" /> {/* Enhanced gradient */}
          <div className="relative z-20 flex items-center gap-2 text-lg font-medium text-primary-foreground"> {/* Adjusted text color */}
            <div className="h-8 w-8 rounded-full bg-white/20 p-1 backdrop-blur-sm"> {/* Adjusted bg */}
              <Logo className="text-white"/> {/* Ensure logo is visible */}
            </div>
         
          </div>
          <motion.div // Use imported motion
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative z-20 mt-auto"
          >
            <blockquote className="space-y-2 border-l-4 border-white/50 pl-4"> {/* Added border */}
              <p className="text-lg text-primary-foreground/90"> {/* Adjusted text color */}
                "Tham gia cùng hàng nghìn người dùng khác để tối ưu hóa chế độ dinh dưỡng của bạn với sự hỗ trợ của AI."
              </p>
              <footer className="text-sm text-primary-foreground/70">Team NutriCare Agents</footer> {/* Adjusted text color */}
            </blockquote>
          </motion.div>
        </motion.div>

        {/* Register Form */}
        <div className="lg:p-8 flex items-center justify-center"> {/* Centered form */}
          <motion.div // Use imported motion
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[380px] bg-card p-8 rounded-lg shadow-lg" // Added card styling
          >
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-card-foreground"> {/* Use card text color */}
                Tạo tài khoản mới
              </h1>
              <p className="text-sm text-muted-foreground">
                Nhập thông tin của bạn để đăng ký
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-card-foreground">Họ tên</Label> {/* Use card text color */}
                <Input id="name" name="name" required placeholder="Nguyễn Văn A"/> {/* Added placeholder */}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-card-foreground">Email</Label> {/* Use card text color */}
                <Input id="email" name="email" type="email" required placeholder="email@example.com"/> {/* Added placeholder */}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-card-foreground">Mật khẩu</Label> {/* Use card text color */}
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    placeholder="••••••••" // Added placeholder
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"} // Accessibility
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <motion.div // Use imported motion
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"
                    aria-label="Loading" // Accessibility
                  />
                ) : null}
                {isLoading ? "Đang xử lý..." : "Đăng ký"}
              </Button>
            </form>

            <p className="px-8 text-center text-sm text-muted-foreground">
              Đã có tài khoản?{" "}
              <Link href="/auth/login" className="hover:text-primary underline underline-offset-4">
                Đăng nhập
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
