import Link from "next/link";
import { cn } from "@/lib/utils"; // Assuming you have this utility

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      <Link
        href="/"
        className="text-lg font-semibold text-primary"
      >
        AI Dinh Dưỡng
      </Link>
      {/* Add other navigation links here if needed */}
      {/* Example:
      <Link
        href="/dashboard"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Dashboard
      </Link>
       */}
    </nav>
  );
}
