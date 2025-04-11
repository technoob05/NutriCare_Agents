"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button" // Corrected path
import { Input } from "@/components/ui/input" // Corrected path
import { Label } from "@/components/ui/label" // Corrected path
import { useToast } from "@/hooks/use-toast" // Corrected path
import { Eye, EyeOff } from "lucide-react"
import { motion } from "framer-motion" // Import directly
import { Logo } from "@/components/logo" // Corrected path

export default function LoginPage() {
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
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    // Ensure localStorage access is client-side only
    if (typeof window !== 'undefined') {
        try {
          const users = JSON.parse(localStorage.getItem("users") || "[]")
          const user = users.find((u: any) => u.email === email && u.password === password)

          if (user) {
            localStorage.setItem("currentUser", JSON.stringify(user))
            toast({ // Use toast function
              title: "Thành công",
              description: "Đăng nhập thành công!",
            })

            // Use router for navigation
            router.push("/")
            // No need for setTimeout with router.push generally, unless specific UI feedback requires it

          } else {
            toast({ // Use toast function
              title: "Lỗi",
              description: "Email hoặc mật khẩu không chính xác.",
              variant: "destructive",
            })
            setIsLoading(false)
          }
        } catch (error) {
          console.error("Login error:", error); // Log the actual error
          toast({ // Use toast function
            title: "Lỗi",
            description: "Có lỗi xảy ra trong quá trình đăng nhập.",
            variant: "destructive",
          })
          setIsLoading(false)
        }
    } else {
        // Should not happen if form submission is client-side, but good practice
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
          {/* Brand section */}
          <div className="relative z-20 flex items-center gap-2 text-lg font-medium text-primary-foreground"> {/* Adjusted text color */}
            <div className="h-8 w-8 rounded-full bg-white/20 p-1 backdrop-blur-sm"> {/* Adjusted bg */}
              <Logo className="text-white"/> {/* Ensure logo is visible */}
            </div>
             AI Dinh Dưỡng {/* Added App Name */}
          </div>
          <motion.div // Use imported motion
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative z-20 mt-auto"
          >
            <blockquote className="space-y-2 border-l-4 border-white/50 pl-4"> {/* Added border */}
              <p className="text-lg text-primary-foreground/90"> {/* Adjusted text color */}
                "Hệ thống AI này đã giúp tôi lập kế hoạch dinh dưỡng hiệu quả và khoa học hơn rất nhiều."
              </p>
              <footer className="text-sm text-primary-foreground/70">Sofia Davis - Chuyên gia dinh dưỡng</footer> {/* Adjusted text color */}
            </blockquote>
          </motion.div>
        </motion.div>

        {/* Login Form */}
        <div className="lg:p-8 flex items-center justify-center"> {/* Centered form */}
          <motion.div // Use imported motion
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[380px] bg-card p-8 rounded-lg shadow-lg" // Added card styling
          >
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-card-foreground"> {/* Use card text color */}
                Đăng nhập vào tài khoản
              </h1>
              <p className="text-sm text-muted-foreground">
                Nhập email và mật khẩu để đăng nhập
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
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
                {isLoading ? "Đang xử lý..." : "Đăng nhập"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground"> {/* Use card background */}
                  Hoặc tiếp tục với
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Placeholder buttons for OAuth */}
              <Button variant="outline" disabled>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}> {/* Use imported motion */}
                  Google
                </motion.div>
              </Button>
              <Button variant="outline" disabled>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}> {/* Use imported motion */}
                  Facebook
                </motion.div>
              </Button>
            </div>

            <p className="px-8 text-center text-sm text-muted-foreground">
              <Link href="/auth/register" className="hover:text-primary underline underline-offset-4">
                Chưa có tài khoản? Đăng ký ngay
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
