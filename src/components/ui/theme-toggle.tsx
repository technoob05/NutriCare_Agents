"use client"

"use client"

import * as React from "react"
import { Moon, Sun, Palette } from "lucide-react" // Added Palette icon
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu" // Import Dropdown components

export function ThemeToggle() {
  const { setTheme } = useTheme() // Only need setTheme now

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          {/* Using Palette icon as a generic theme indicator */}
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("ghibli")}>
          Ghibli
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("pink")}>
          Pink
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("elderly")}>
          Elderly
        </DropdownMenuItem>
        {/* Optionally add system theme option if needed */}
        {/* <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem> */}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
