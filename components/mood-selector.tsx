"use client"

import type React from "react"

import { useState } from "react"
import { moodModes, type MoodMode } from "@/lib/data"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Wallet, Dumbbell, Zap } from "lucide-react"

interface MoodSelectorProps {
  onModeChange: (mode: MoodMode) => void
}

const modeIcons: Record<string, React.ReactNode> = {
  budget: <Wallet className="h-4 w-4" />,
  healthy: <Dumbbell className="h-4 w-4" />,
  quick: <Zap className="h-4 w-4" />,
}

const modeColors: Record<string, { bg: string; activeBg: string; text: string }> = {
  budget: { bg: "bg-orange-50", activeBg: "bg-primary/15", text: "text-primary" },
  healthy: { bg: "bg-emerald-50", activeBg: "bg-emerald-500/15", text: "text-emerald-500" },
  quick: { bg: "bg-blue-50", activeBg: "bg-blue-500/15", text: "text-blue-500" },
}

export function MoodSelector({ onModeChange }: MoodSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<string>(moodModes[0].id)

  const handleModeChange = (mode: MoodMode) => {
    setSelectedMode(mode.id)
    onModeChange(mode)
  }

  const getModeTooltip = (modeId: string) => {
    const tooltips: Record<string, string> = {
      budget: "월말이시군요! 가성비 좋은 메뉴들로 준비했어요. 맛도 영양도 놓치지 마세요",
      healthy: "득근 모드 활성화! 단백질 높고 영양 균형 잡힌 메뉴들이에요. 운동 효과 UP!",
      quick: "배고플 때는 속도가 생명! 빠르게 배달되는 메뉴들을 추천해드릴게요",
    }
    return tooltips[modeId]
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">오늘의 상태</span>
        <div className="flex gap-1.5">
          {moodModes.map((mode) => {
            const colors = modeColors[mode.id] || modeColors.budget
            const isSelected = selectedMode === mode.id
            return (
              <Tooltip key={mode.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleModeChange(mode)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-center transition-all",
                      isSelected
                        ? `${colors.activeBg} ${colors.text} shadow-sm`
                        : `${colors.bg} text-muted-foreground hover:shadow-sm`,
                    )}
                  >
                    {modeIcons[mode.id] || <span className="text-sm">{mode.icon}</span>}
                    <span className="font-medium text-xs">{mode.name}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px] text-center rounded-xl">
                  <p className="text-xs">{mode.description}</p>
                  <p className="text-xs mt-1 text-muted-foreground">{getModeTooltip(mode.id)}</p>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}
