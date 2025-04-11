import { Brain } from 'lucide-react'
import { cn } from '@/lib/utils' // Corrected import path

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const sizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  }

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  }

  return (
    <div className={cn('flex items-center gap-2 logo-container relative z-10', className)}>
      <div className="relative logo-icon bg-background rounded-full p-0.5">
        <Brain
          className={cn(
            sizes[size],
            "relative z-10 text-brand-primary"
          )}
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-brand-primary to-brand-secondary opacity-20 rounded-full"
        />
      </div>
      {showText && (
        <span className={cn(
          textSizes[size],
          "font-bold",
          "text-foreground dark:text-white"
        )}>
          NutriCare Agents {/* Changed text as requested */}
        </span>
      )}
    </div>
  )
}
