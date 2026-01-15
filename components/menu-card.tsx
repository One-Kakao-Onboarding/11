"use client"

import { useState } from "react"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Flame, Heart, Clock, Info, Beef, Wheat, Droplets, X, Check } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { MenuItem } from "@/lib/data"
import { getRestaurantById } from "@/lib/data"
import { cn } from "@/lib/utils"

interface MenuCardProps {
  menu: MenuItem & { reasoning?: string; score?: number }
  rank?: number
  onSelect?: (menu: MenuItem) => void
  mode?: "budget" | "healthy" | "quick" | "monthly"
  isLiked?: boolean
  onLike?: (menu: MenuItem, isCurrentlyLiked: boolean) => Promise<void>
}

export function MenuCard({ menu, rank, onSelect, mode = "budget", isLiked = false, onLike }: MenuCardProps) {
  const [showSidebar, setShowSidebar] = useState(false)
  const [isLikeLoading, setIsLikeLoading] = useState(false)

  const handleLikeClick = async () => {
    if (isLikeLoading) return

    setIsLikeLoading(true)
    try {
      await onLike?.(menu, isLiked)
    } finally {
      setIsLikeLoading(false)
    }
  }

  const restaurant = getRestaurantById(menu.restaurantId)

  const modeBaseColors: Record<string, { light: string; medium: string; dark: string }> = {
    budget: {
      light: "bg-gradient-to-r from-amber-300 to-amber-200",
      medium: "bg-gradient-to-r from-amber-400 to-amber-300",
      dark: "bg-gradient-to-r from-amber-500 to-amber-400",
    },
    monthly: {
      light: "bg-gradient-to-r from-amber-300 to-amber-200",
      medium: "bg-gradient-to-r from-amber-400 to-amber-300",
      dark: "bg-gradient-to-r from-amber-500 to-amber-400",
    },
    healthy: {
      light: "bg-gradient-to-r from-emerald-300 to-emerald-200",
      medium: "bg-gradient-to-r from-emerald-400 to-emerald-300",
      dark: "bg-gradient-to-r from-emerald-500 to-emerald-400",
    },
    quick: {
      light: "bg-gradient-to-r from-blue-300 to-blue-200",
      medium: "bg-gradient-to-r from-blue-400 to-blue-300",
      dark: "bg-gradient-to-r from-blue-500 to-blue-400",
    },
  }

  const getRankColor = (rank: number, modeId: string) => {
    const colors = modeBaseColors[modeId] || modeBaseColors.budget
    if (rank === 1) return colors.dark
    if (rank === 2) return colors.medium
    return colors.light
  }

  const modeBorderColors: Record<string, string> = {
    budget: "border-r-primary",
    monthly: "border-r-amber-500",
    healthy: "border-r-emerald-500",
    quick: "border-r-blue-500",
  }

  return (
    <TooltipProvider>
      <div className="relative">
        <Card
          className={cn(
            "overflow-hidden rounded-2xl border-0 shadow-md bg-white hover:shadow-lg transition-all border-r-4",
            modeBorderColors[mode],
          )}
        >
          <div className="flex h-36">
            <div className="relative w-28 h-full flex-shrink-0 overflow-hidden rounded-l-2xl">
              {rank && (
                <div
                  className={cn(
                    "absolute top-2 left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white shadow-md",
                    getRankColor(rank, mode),
                  )}
                >
                  {rank}
                </div>
              )}
              <Image
                src={menu.image || "/placeholder.svg"}
                alt={menu.name}
                fill
                className="object-cover object-center"
              />
            </div>

            <div className="flex-1 p-3 flex flex-col justify-center min-w-0 border-x border-border/30">
              <div>
                {restaurant && <p className="text-xs text-primary font-semibold truncate">{restaurant.name}</p>}
                <h3 className="font-bold text-base leading-tight truncate text-foreground">{menu.name}</h3>
                <p className="text-xs text-muted-foreground">{menu.category}</p>
              </div>

              <div className="mt-2">
                {mode === "healthy" ? (
                  <div className="space-y-1">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Flame className="h-3 w-3" />
                      {menu.calories}kcal
                    </span>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-red-50 rounded-full text-red-500">
                        <Beef className="h-3 w-3" />
                        {menu.protein}g
                      </span>
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 rounded-full text-amber-500">
                        <Wheat className="h-3 w-3" />
                        {menu.carbs}g
                      </span>
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 rounded-full text-blue-500">
                        <Droplets className="h-3 w-3" />
                        {menu.fat}g
                      </span>
                    </div>
                  </div>
                ) : mode === "quick" ? (
                  restaurant && (
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-full text-sm font-bold text-blue-500">
                      <Clock className="h-4 w-4" />
                      <span>{restaurant.deliveryTime}분</span>
                    </div>
                  )
                ) : (
                  <span className="font-bold text-primary text-lg">{menu.price.toLocaleString()}원</span>
                )}
              </div>
            </div>

            <div className="w-20 flex-shrink-0 p-2 flex flex-col items-center justify-between">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowSidebar(true)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/50 transition-colors hover:bg-muted"
                  >
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>상세 정보</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleLikeClick}
                    disabled={isLikeLoading}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full bg-muted/50 transition-colors hover:bg-muted",
                      isLikeLoading && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4 transition-colors",
                        isLiked ? "fill-red-500 text-red-500" : "text-muted-foreground",
                      )}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{isLiked ? "좋아요 취소" : "좋아요"}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onSelect?.(menu)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-primary transition-colors hover:bg-primary/90"
                  >
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>결정</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </Card>

        {showSidebar && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setShowSidebar(false)}>
            <div
              className="w-80 h-full bg-white shadow-2xl animate-in slide-in-from-right duration-300 pb-20 rounded-l-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                  <h3 className="font-bold text-lg">상세 정보</h3>
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden">
                    <Image
                      src={menu.image || "/placeholder.svg"}
                      alt={menu.name}
                      fill
                      className="object-cover object-center"
                    />
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-xl">{menu.name}</h4>
                    <p className="text-sm text-muted-foreground">{menu.category}</p>
                  </div>

                  {menu.reasoning && (
                    <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20">
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-xs">AI</span>
                        </div>
                        <div className="flex-1">
                          <h5 className="font-semibold text-sm text-primary mb-1">추천 이유</h5>
                          <p className="text-sm text-foreground/80 leading-relaxed">{menu.reasoning}</p>
                          {menu.score && (
                            <p className="text-xs text-muted-foreground mt-2">추천 점수: {menu.score}/100</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {restaurant && (
                    <div className="p-4 bg-secondary rounded-2xl space-y-2">
                      <h5 className="font-semibold text-sm text-primary">식당 정보</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">식당명</span>
                          <span className="font-medium">{restaurant.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">배달 시간</span>
                          <span className="font-medium">{restaurant.deliveryTime}분</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">배달비</span>
                          <span className="font-medium">{restaurant.deliveryFee.toLocaleString()}원</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-primary/10 rounded-2xl">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">가격</span>
                      <span className="font-bold text-2xl text-primary">{menu.price.toLocaleString()}원</span>
                    </div>
                  </div>

                  <div className="p-4 bg-secondary rounded-2xl">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Flame className="h-4 w-4" />
                        칼로리
                      </span>
                      <span className="font-bold text-lg">{menu.calories}kcal</span>
                    </div>
                  </div>

                  <div className="p-4 bg-secondary rounded-2xl space-y-3">
                    <h5 className="font-semibold text-sm">영양 성분</h5>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-3 bg-red-50 rounded-xl">
                        <Beef className="h-5 w-5 mx-auto text-red-500 mb-1" />
                        <p className="text-red-500 font-bold text-lg">{menu.protein}g</p>
                        <p className="text-muted-foreground text-xs">단백질</p>
                      </div>
                      <div className="text-center p-3 bg-amber-50 rounded-xl">
                        <Wheat className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                        <p className="text-amber-500 font-bold text-lg">{menu.carbs}g</p>
                        <p className="text-muted-foreground text-xs">탄수화물</p>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-xl">
                        <Droplets className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                        <p className="text-blue-500 font-bold text-lg">{menu.fat}g</p>
                        <p className="text-muted-foreground text-xs">지방</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-border/50">
                  <Button
                    onClick={() => {
                      onSelect?.(menu)
                      setShowSidebar(false)
                    }}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl h-12"
                  >
                    이 메뉴로 결정!
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
