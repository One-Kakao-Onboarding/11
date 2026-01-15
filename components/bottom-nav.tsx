"use client"

import { Home, Camera, Calendar, User, Dices } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", icon: Home, label: "홈" },
  { href: "/game", icon: Dices, label: "게임" },
  { href: "/lens", icon: Camera, label: "렌즈" },
  { href: "/calendar", icon: Calendar, label: "기록" },
  { href: "/profile", icon: User, label: "MY" },
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (pathname !== href) {
      e.preventDefault()
      // 즉시 페이지 전환 (진행 중인 작업 무시)
      router.push(href)
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-2">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-around py-2 bg-white rounded-2xl shadow-lg border border-border/50">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={(e) => handleNavClick(e, item.href)}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
