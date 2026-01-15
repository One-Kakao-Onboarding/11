"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { menuItems, type MenuItem } from "@/lib/data"
import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface MenuRouletteProps {
  onResult: (menu: MenuItem) => void
}

export function MenuRoulette({ onResult }: MenuRouletteProps) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null)
  const [rotation, setRotation] = useState(0)
  const wheelRef = useRef<HTMLDivElement>(null)

  const spin = () => {
    if (isSpinning) return

    setIsSpinning(true)
    setSelectedMenu(null)

    // 랜덤 회전 각도 (최소 5바퀴 + 랜덤)
    const spins = 5 + Math.random() * 3
    const extraDegrees = Math.random() * 360
    const totalRotation = rotation + spins * 360 + extraDegrees

    setRotation(totalRotation)

    // 결과 계산
    setTimeout(() => {
      const normalizedRotation = totalRotation % 360
      const segmentAngle = 360 / menuItems.length
      const selectedIndex = Math.floor(((360 - normalizedRotation + segmentAngle / 2) % 360) / segmentAngle)
      const result = menuItems[selectedIndex % menuItems.length]

      setSelectedMenu(result)
      setIsSpinning(false)
      onResult(result)
    }, 3000)
  }

  const colors = [
    "bg-primary",
    "bg-chart-2",
    "bg-chart-3",
    "bg-chart-4",
    "bg-chart-5",
    "bg-primary/80",
    "bg-chart-2/80",
    "bg-chart-3/80",
  ]

  return (
    <div className="flex flex-col items-center gap-6">
      {/* 룰렛 휠 */}
      <div className="relative">
        {/* 포인터 */}
        <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2">
          <div className="h-0 w-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary drop-shadow-lg" />
        </div>

        {/* 휠 */}
        <div
          ref={wheelRef}
          className="relative h-64 w-64 overflow-hidden rounded-full border-4 border-primary shadow-xl"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? "transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
          }}
        >
          {menuItems.map((item, index) => {
            const angle = (360 / menuItems.length) * index
            const skewAngle = 90 - 360 / menuItems.length

            return (
              <div
                key={item.id}
                className={cn("absolute left-1/2 top-0 h-1/2 origin-bottom", colors[index % colors.length])}
                style={{
                  width: "50%",
                  transform: `rotate(${angle}deg) skewY(${skewAngle}deg)`,
                  transformOrigin: "bottom left",
                }}
              >
                <span
                  className="absolute left-1/2 top-4 -translate-x-1/2 text-xs font-bold text-card drop-shadow-sm"
                  style={{
                    transform: `skewY(${-skewAngle}deg) rotate(${180 / menuItems.length}deg)`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.name.length > 6 ? item.name.slice(0, 6) + ".." : item.name}
                </span>
              </div>
            )
          })}

          {/* 중앙 원 */}
          <div className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-card border-4 border-primary shadow-lg">
            <span className="text-2xl">🍽️</span>
          </div>
        </div>
      </div>

      {/* 스핀 버튼 */}
      <Button
        onClick={spin}
        disabled={isSpinning}
        size="lg"
        className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-8"
      >
        <Sparkles className={cn("h-5 w-5", isSpinning && "animate-spin")} />
        {isSpinning ? "돌아가는 중..." : "룰렛 돌리기!"}
      </Button>

      {/* 결과 표시 */}
      {selectedMenu && !isSpinning && (
        <div className="animate-in fade-in slide-in-from-bottom-4 rounded-xl border-2 border-primary bg-primary/10 p-4 text-center">
          <p className="text-sm text-muted-foreground">오늘의 메뉴는</p>
          <p className="text-xl font-bold text-foreground">{selectedMenu.name}</p>
          <p className="text-primary font-semibold">{selectedMenu.price.toLocaleString()}원</p>
        </div>
      )}
    </div>
  )
}
