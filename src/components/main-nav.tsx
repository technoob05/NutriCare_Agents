"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, User, LogOut, LogIn, Home, ShoppingBasket, Coffee, MessageCircle, Info, FileText, ClipboardList } from "lucide-react"; // Added FileText, ClipboardList
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Animation variants
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } }
};

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Navigation links with icons for better visual hierarchy
  const navLinks = [
    { href: "/", icon: <Home className="h-4 w-4 mr-2" />, label: "Home" },
    { href: "/pantry-tracker", icon: <ShoppingBasket className="h-4 w-4 mr-2" />, label: "Pantry Tracker" },
    { href: "/recognize-meal", icon: <Coffee className="h-4 w-4 mr-2" />, label: "Recognize Meal" },
    { href: "/ai-explainer", icon: <Info className="h-4 w-4 mr-2" />, label: "AI Explainer" },
    { href: "/chat-mobi", icon: <MessageCircle className="h-4 w-4 mr-2" />, label: "Chat" },
    { href: "/journey", icon: <ClipboardList className="h-4 w-4 mr-2" />, label: "Journey" }, // Added Journey link
    { href: "/policy", icon: <FileText className="h-4 w-4 mr-2" />, label: "Chính sách" }, // Added Policy link
  ];

  // Handle scroll effect for sticky nav
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
      setIsSheetOpen(false);
    } catch (error) {
      console.error("Logout failed:", error);
      // Add toast notification here for error feedback
    }
  };

  // Get user initials for avatar fallback
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <motion.header
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-all duration-200",
        scrolled ? "bg-background/80 backdrop-blur-md shadow-sm" : "bg-background",
        className
      )}
    >
      <div className="container mx-auto px-4">
        <div className={cn("flex h-16 items-center justify-between", className)} {...props}>
          {/* Logo/Brand Name with animation */}
          <Link
            href="/"
            className="flex items-center text-lg font-bold text-primary hover:text-primary/90 transition-colors"
            onClick={() => setIsSheetOpen(false)}
          >
            <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              AI Dinh Dưỡng
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <TooltipProvider>
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Tooltip key={link.href} delayDuration={300}>
                    <TooltipTrigger asChild>
                      <Link
                        href={link.href}
                        className={cn(
                          "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all",
                          isActive
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                        aria-current={isActive ? "page" : undefined}
                      >
                        {link.icon}
                        <span>{link.label}</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {link.label}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </nav>

          {/* Auth Section */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                {/* User dropdown menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="p-1 h-9 w-9 rounded-full" aria-label="User menu">
                      <Avatar className="h-8 w-8 border-2 border-primary/20">
                        <AvatarImage 
                          src={user.photoURL || undefined} 
                          alt={user.displayName || user.email || "User profile"} 
                        />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(user.displayName || user.email)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.displayName || "User"}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Button asChild variant="default" size="sm" className="gap-2">
                <Link href="/auth/login">
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Login</span>
                </Link>
              </Button>
            )}

            {/* Mobile Menu Trigger */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden"
                  aria-label="Menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 sm:w-80">
                <SheetHeader className="mb-6">
                  <SheetTitle className="text-left">
                    <SheetClose asChild>
                      <Link href="/" className="flex items-center text-lg font-bold text-primary">
                        AI Dinh Dưỡng
                      </Link>
                    </SheetClose>
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col space-y-1">
                  {navLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                      <SheetClose asChild key={link.href}>
                        <Link
                          href={link.href}
                          className={cn(
                            "flex items-center px-3 py-3 text-base font-medium rounded-md transition-colors",
                            isActive
                              ? "text-primary bg-primary/10"
                              : "text-foreground hover:text-primary hover:bg-primary/5"
                          )}
                          aria-current={isActive ? "page" : undefined}
                        >
                          {link.icon}
                          <span>{link.label}</span>
                        </Link>
                      </SheetClose>
                    );
                  })}
                  <div className="pt-4 mt-4 border-t">
                    {user ? (
                      <>
                        <div className="flex items-center px-3 mb-4">
                          <Avatar className="h-9 w-9 mr-3">
                            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || "User"} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(user.displayName || user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <p className="text-sm font-medium leading-none">{user.displayName || "User"}</p>
                            <p className="text-xs text-muted-foreground mt-1 truncate max-w-[180px]">{user.email}</p>
                          </div>
                        </div>
                        <SheetClose asChild>
                          <Link 
                            href="/profile" 
                            className="flex items-center px-3 py-3 text-base font-medium rounded-md transition-colors text-foreground hover:text-primary hover:bg-primary/5"
                          >
                            <User className="mr-2 h-4 w-4" /> Profile
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Button 
                            variant="ghost" 
                            onClick={handleLogout} 
                            className="w-full justify-start px-3 py-3 text-base font-medium rounded-md transition-colors text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <LogOut className="mr-2 h-4 w-4" /> Log out
                          </Button>
                        </SheetClose>
                      </>
                    ) : (
                      <SheetClose asChild>
                        <Button asChild variant="default" className="w-full">
                          <Link href="/auth/login" className="flex items-center justify-center">
                            <LogIn className="mr-2 h-4 w-4" /> Login
                          </Link>
                        </Button>
                      </SheetClose>
                    )}
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
