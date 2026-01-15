"use client"

import { useState, useEffect } from "react"
import { BottomNav } from "@/components/bottom-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Plus, Flame, Wallet, Heart, List, Calendar, Search, Filter, X } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { LoadingScreen } from "@/components/loading-screen"
import { AuthGuard } from "@/components/auth-guard"
import { useAuth } from "@/lib/auth-context"
import { menuItems, type MenuItem } from "@/lib/data"
import { getLocalDateString } from "@/lib/date-utils"

interface MealRecord {
  id: number
  user_id: number
  menu_name: string
  calories: number
  carbs: number
  protein: number
  fat: number
  cost: number
  meal_type: string
  meal_date: string
  created_at: string
}

const DAYS = ["일", "월", "화", "수", "목", "금", "토"]
const MONTHS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"]

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"]

type ViewMode = "calendar" | "list"

export default function CalendarPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedMealType, setSelectedMealType] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("calendar")
  const [isLoading, setIsLoading] = useState(false)
  const [meals, setMeals] = useState<MealRecord[]>([])
  const [allMeals, setAllMeals] = useState<MealRecord[]>([])
  const [likedMealIds, setLikedMealIds] = useState<Set<number>>(new Set())
  const [selectedDayMeals, setSelectedDayMeals] = useState<MealRecord[]>([])
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null)

  // 필터 및 검색 상태
  const [searchQuery, setSearchQuery] = useState("")
  const [dateRangeStart, setDateRangeStart] = useState<string>("")
  const [dateRangeEnd, setDateRangeEnd] = useState<string>("")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [statsRange, setStatsRange] = useState<"week" | "month" | "all">("month")

  // 메뉴 검색 및 선택 상태
  const [menuSearchQuery, setMenuSearchQuery] = useState("")
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null)
  const [isSavingMeal, setIsSavingMeal] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  useEffect(() => {
    if (user) {
      // 캘린더 뷰: 월별 데이터만 로드
      // 리스트 뷰: 전체 데이터도 로드
      if (viewMode === 'calendar') {
        Promise.all([
          fetchMeals(),
          fetchLikedMeals()
        ])
      } else {
        Promise.all([
          fetchMeals(),
          fetchAllMeals(),
          fetchLikedMeals()
        ])
      }
    }
  }, [user, currentDate, viewMode])

  // statsRange가 "all"로 변경되면 전체 데이터 로드
  useEffect(() => {
    if (user && statsRange === 'all' && viewMode === 'calendar' && allMeals.length === 0) {
      console.log('[캘린더] 전체 통계 선택 - 전체 데이터 로드')
      fetchAllMeals()
    }
  }, [user, statsRange, viewMode])

  const fetchMeals = async () => {
    if (!user) return

    try {
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
      const startTime = performance.now()

      const response = await fetch(`/api/meals?userId=${user.id}&month=${monthStr}`)
      const result = await response.json()

      const endTime = performance.now()
      console.log(`[캘린더] 월별 데이터 로드: ${result.data?.length || 0}개 (${(endTime - startTime).toFixed(0)}ms)`)

      if (response.ok && result.success) {
        setMeals(result.data)
      } else {
        console.error(`[캘린더] API 오류:`, result)
      }
    } catch (error) {
      console.error('[캘린더] 데이터 로드 실패:', error)
    }
  }

  const fetchAllMeals = async () => {
    if (!user) return

    try {
      const startTime = performance.now()
      const response = await fetch(`/api/meals?userId=${user.id}`)
      const result = await response.json()
      const endTime = performance.now()

      console.log(`[캘린더] 전체 데이터 로드: ${result.data?.length || 0}개 (${(endTime - startTime).toFixed(0)}ms)`)

      if (response.ok && result.success) {
        setAllMeals(result.data)
      } else {
        console.error(`[캘린더] 전체 데이터 API 오류:`, result)
      }
    } catch (error) {
      console.error('[캘린더] 전체 데이터 로드 실패:', error)
    }
  }

  const fetchLikedMeals = async () => {
    if (!user) return

    try {
      const startTime = performance.now()
      const response = await fetch(`/api/liked-meals?userId=${user.id}`)
      const result = await response.json()
      const endTime = performance.now()

      console.log(`[캘린더] 좋아요 데이터 로드: ${result.data?.length || 0}개 (${(endTime - startTime).toFixed(0)}ms)`)

      if (response.ok && result.success) {
        const likedIds = new Set(result.data.map((item: any) => item.id))
        setLikedMealIds(likedIds)
      }
    } catch (error) {
      console.error('Failed to fetch liked meals:', error)
    }
  }

  const toggleLike = async (mealId: number) => {
    if (!user) return

    try {
      const isLiked = likedMealIds.has(mealId)

      if (isLiked) {
        // 좋아요 취소
        const response = await fetch(`/api/liked-meals?userId=${user.id}&mealRecordId=${mealId}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          setLikedMealIds(prev => {
            const newSet = new Set(prev)
            newSet.delete(mealId)
            return newSet
          })
          toast({
            description: "좋아요가 취소되었습니다.",
          })
        }
      } else {
        // 좋아요 추가
        const response = await fetch('/api/liked-meals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            mealRecordId: mealId,
          }),
        })

        if (response.ok) {
          setLikedMealIds(prev => new Set(prev).add(mealId))
          toast({
            description: "좋아요 목록에 추가되었습니다.",
          })
        }
      }
    } catch (error) {
      console.error('Toggle like error:', error)
      toast({
        title: "오류",
        description: "좋아요 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const getRecordsForDate = (date: Date): MealRecord[] => {
    // 로컬 타임존 기준으로 날짜 문자열 생성
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`

    const filtered = meals.filter((meal) => {
      // API에서 meal_date는 이제 "YYYY-MM-DD" 문자열로 옴
      const mealDateStr = typeof meal.meal_date === 'string'
        ? meal.meal_date.split("T")[0]  // "2026-01-15" or "2026-01-15T00:00:00.000Z"
        : meal.meal_date

      return mealDateStr === dateStr
    })

    return filtered
  }

  const getSortedRecordsForDate = (date: Date): MealRecord[] => {
    const records = getRecordsForDate(date)
    return records.sort((a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type))
  }

  const hasRecords = (day: number): boolean => {
    const date = new Date(year, month, day)
    return getRecordsForDate(date).length > 0
  }

  const getTotalCaloriesForDate = (date: Date): number => {
    const records = getRecordsForDate(date)
    return records.reduce((sum, r) => sum + (r.calories || 0), 0)
  }

  const getTotalCostForDate = (date: Date): number => {
    const records = getRecordsForDate(date)
    return records.reduce((sum, r) => sum + (r.cost || 0), 0)
  }

  // 식단이 있는 날짜에 그레이 색상 적용
  const getDayColor = (day: number): { bg: string; border: string } | null => {
    const hasRecord = hasRecords(day)

    if (!hasRecord) return null

    // 부드럽고 보기 편한 그레이 색상
    return {
      bg: 'rgba(148, 163, 184, 0.18)',      // slate-400 배경
      border: 'rgba(100, 116, 139, 0.35)'   // slate-500 테두리
    }
  }

  const getMealTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      breakfast: "아침",
      lunch: "점심",
      dinner: "저녁",
      snack: "간식",
    }
    return labels[type] || type
  }

  const openRecordDialog = (date: Date) => {
    setSelectedDate(date)
    setSelectedMealType(null)
    setSelectedMenuItem(null)
    setMenuSearchQuery("")
    setIsDialogOpen(true)
  }

  const openDayDetailDialog = (date: Date) => {
    const records = getSortedRecordsForDate(date)
    // 기록이 있든 없든 해당 날짜 조회 다이얼로그 열기
    setSelectedDayMeals(records)
    setSelectedDayDate(date)
    setIsDetailDialogOpen(true)
  }

  const handleMealSelect = (mealType: string) => {
    setSelectedMealType(mealType)
  }

  const handleSaveRecord = async () => {
    if (!selectedDate || !selectedMealType || !selectedMenuItem || !user) {
      toast({
        title: "입력 확인",
        description: "날짜, 식사 종류, 메뉴를 모두 선택해주세요.",
        variant: "destructive",
      })
      return
    }

    setIsSavingMeal(true)
    try {
      // 날짜를 로컬 타임존으로 포맷팅
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const day = String(selectedDate.getDate()).padStart(2, '0')
      const mealDateStr = `${year}-${month}-${day}`

      console.log(`[캘린더] 저장할 날짜: ${mealDateStr}`)

      const response = await fetch('/api/save-meal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          menuName: selectedMenuItem.name,
          calories: selectedMenuItem.calories,
          carbs: selectedMenuItem.carbs,
          protein: selectedMenuItem.protein,
          fat: selectedMenuItem.fat,
          cost: selectedMenuItem.price,
          mealType: selectedMealType,
          mealDate: mealDateStr,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast({
          title: "저장 완료",
          description: `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 ${getMealTypeLabel(selectedMealType)} 식사가 기록되었습니다.`,
        })

        // 상태 초기화
        setIsDialogOpen(false)
        setSelectedMealType(null)
        setSelectedMenuItem(null)
        setMenuSearchQuery("")

        // 식사 목록 새로고침
        fetchMeals()
        if (viewMode === 'list') {
          fetchAllMeals()
        }
      } else {
        toast({
          title: "저장 실패",
          description: result.error || "식사 기록 저장에 실패했습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Save meal error:', error)
      toast({
        title: "오류",
        description: "식사 기록 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSavingMeal(false)
    }
  }

  // 필터링된 식사 목록 (최신순)
  const filteredMeals = allMeals
    .filter((meal) => {
      // 메뉴명 검색
      if (searchQuery && !meal.menu_name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }

      // 날짜 범위 필터
      if (dateRangeStart && meal.meal_date < dateRangeStart) {
        return false
      }
      if (dateRangeEnd && meal.meal_date > dateRangeEnd) {
        return false
      }

      return true
    })
    .sort((a, b) => {
      // 날짜 내림차순 (최신순)
      const dateCompare = b.meal_date.localeCompare(a.meal_date)
      if (dateCompare !== 0) return dateCompare
      // 같은 날짜면 식사 시간 순서대로
      return MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type)
    })

  // 통계 기간에 따른 식사 목록
  const getStatsRangeMeals = () => {
    const today = new Date()

    if (statsRange === "week") {
      const weekAgo = new Date(today)
      weekAgo.setDate(today.getDate() - 7)
      return meals.filter(m => new Date(m.meal_date) >= weekAgo)
    } else if (statsRange === "month") {
      return meals
    } else {
      return allMeals
    }
  }

  const statsRangeMeals = getStatsRangeMeals()

  const clearFilters = () => {
    setSearchQuery("")
    setDateRangeStart("")
    setDateRangeEnd("")
  }

  // 메뉴 검색 결과 필터링
  const filteredMenuItems = menuItems.filter(menu =>
    menu.name.toLowerCase().includes(menuSearchQuery.toLowerCase())
  ).slice(0, 5) // 최대 5개만 표시

  const weeklyStats = {
    avgCalories: statsRangeMeals.length > 0 ? Math.round(
      statsRangeMeals.reduce((sum, r) => sum + (r.calories || 0), 0) / statsRangeMeals.length
    ) : 0,
    avgCost: statsRangeMeals.length > 0 ? Math.round(
      statsRangeMeals.reduce((sum, r) => sum + (r.cost || 0), 0) / statsRangeMeals.length
    ) : 0,
    avgProtein: statsRangeMeals.length > 0 ? Math.round(
      statsRangeMeals.reduce((sum, r) => sum + (r.protein || 0), 0) / statsRangeMeals.length
    ) : 0,
    mealCount: statsRangeMeals.length,
    totalCalories: statsRangeMeals.reduce((sum, r) => sum + (r.calories || 0), 0),
    totalCost: statsRangeMeals.reduce((sum, r) => sum + (r.cost || 0), 0),
    totalProtein: statsRangeMeals.reduce((sum, r) => sum + (r.protein || 0), 0),
  }

  return (
    <AuthGuard>
    <div className="min-h-screen bg-background pb-24">
      {isLoading && <LoadingScreen message="데이터를 불러오는 중" subMessage="잠시만 기다려주세요" />}

      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-md px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">푸드 캘린더</h1>
              <p className="text-sm text-muted-foreground">나의 식사 기록</p>
            </div>
            <div className="flex gap-1">
              <Button
                variant={viewMode === "calendar" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("calendar")}
              >
                <Calendar className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-6 space-y-6">
        {viewMode === "calendar" ? (
          <>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between mb-2">
              <Button variant="ghost" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="text-center">
                <CardTitle>
                  {year}년 {MONTHS[month]}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground hover:text-foreground mt-1"
                  onClick={() => setCurrentDate(new Date())}
                >
                  오늘로 이동
                </Button>
              </div>
              <Button variant="ghost" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map((day, index) => (
                <div
                  key={day}
                  className={`text-center text-xs font-medium py-2 ${
                    index === 0 ? "text-red-500" : index === 6 ? "text-blue-500" : "text-muted-foreground"
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            <TooltipProvider delayDuration={200}>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfMonth }).map((_, index) => (
                  <div key={`empty-${index}`} className="aspect-square" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, index) => {
                  const day = index + 1
                  const date = new Date(year, month, day)
                  const isToday = new Date().toDateString() === date.toDateString()
                  const hasRecord = hasRecords(day)
                  const records = getSortedRecordsForDate(date)
                  const colorStyle = getDayColor(day)
                  const totalCost = getTotalCostForDate(date)
                  const totalCalories = getTotalCaloriesForDate(date)

                  return (
                    <Tooltip key={day}>
                      <TooltipTrigger asChild>
                        <div
                          onClick={() => openDayDetailDialog(date)}
                          className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all relative border-2 cursor-pointer hover:scale-105
                            ${isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}
                            ${!hasRecord ? "hover:bg-muted/50 border-border/30 text-muted-foreground" : ""}
                            ${hasRecord ? "text-foreground font-semibold shadow-sm hover:shadow-md" : ""}
                          `}
                          style={colorStyle ? {
                            backgroundColor: colorStyle.bg,
                            borderColor: colorStyle.border,
                            borderWidth: '2px'
                          } : {
                            borderColor: 'rgba(203, 213, 225, 0.3)'
                          }}
                        >
                          {day}
                          {hasRecord && (
                            <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                              {records.slice(0, 3).map((_, idx) => (
                                <div
                                  key={idx}
                                  className="w-1 h-1 rounded-full bg-slate-600 opacity-70"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      {records.length > 0 ? (
                        <TooltipContent side="top" className="max-w-[220px] p-3 bg-card border border-border shadow-lg">
                          <p className="font-semibold text-foreground mb-2">
                            {month + 1}월 {day}일
                          </p>
                          <div className="space-y-1.5">
                            {records.map((record) => (
                              <div key={record.id} className="flex items-center gap-2 group">
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                                  {getMealTypeLabel(record.meal_type)}
                                </Badge>
                                <span className="text-xs text-foreground truncate flex-1">{record.menu_name}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleLike(record.id)
                                  }}
                                  className="shrink-0 transition-colors"
                                >
                                  <Heart
                                    className={`h-3.5 w-3.5 ${
                                      likedMealIds.has(record.id)
                                        ? "fill-red-500 text-red-500"
                                        : "text-muted-foreground hover:text-red-400"
                                    }`}
                                  />
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-2 border-t border-border pt-1.5 space-y-0.5">
                            <p className="flex items-center gap-1">
                              <Flame className="h-3 w-3 text-primary" />
                              {totalCalories.toLocaleString()}kcal
                            </p>
                            {totalCost > 0 && (
                              <p className="flex items-center gap-1">
                                <Wallet className="h-3 w-3 text-teal-600" />
                                {totalCost.toLocaleString()}원
                              </p>
                            )}
                          </div>
                        </TooltipContent>
                      ) : (
                        <TooltipContent side="top" className="max-w-[180px] p-2 bg-card border border-border shadow-lg">
                          <p className="text-xs text-muted-foreground text-center">
                            {month + 1}월 {day}일<br />
                            클릭하여 날짜 정보 확인
                          </p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )
                })}
              </div>
            </TooltipProvider>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">통계 요약</CardTitle>
              <div className="flex gap-1">
                <Button
                  variant={statsRange === "week" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => setStatsRange("week")}
                >
                  주간
                </Button>
                <Button
                  variant={statsRange === "month" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => setStatsRange("month")}
                >
                  월간
                </Button>
                <Button
                  variant={statsRange === "all" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => setStatsRange("all")}
                >
                  전체
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="py-4">
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-foreground">{weeklyStats.avgCalories.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">평균 칼로리</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-teal-600">{weeklyStats.avgCost.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">평균 비용</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{weeklyStats.avgProtein}g</p>
                  <p className="text-xs text-muted-foreground">평균 단백질</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{weeklyStats.mealCount}</p>
                  <p className="text-xs text-muted-foreground">기록된 식사</p>
                </div>
              </div>

              <div className="pt-3 border-t border-border/50">
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div>
                    <p className="text-muted-foreground">총 칼로리</p>
                    <p className="font-semibold text-foreground">{weeklyStats.totalCalories.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">총 비용</p>
                    <p className="font-semibold text-teal-600">{weeklyStats.totalCost.toLocaleString()}원</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">총 단백질</p>
                    <p className="font-semibold text-foreground">{weeklyStats.totalProtein}g</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30 border-dashed">
          <CardContent className="py-3 text-center">
            <p className="text-xs text-muted-foreground">
              💡 <strong>그레이로 표시된 날짜</strong>를 클릭하면 식사 기록을 볼 수 있습니다
            </p>
          </CardContent>
        </Card>
          </>
        ) : (
          <>
            {/* 리스트 뷰 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <CardTitle>전체 식사 기록</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {filteredMeals.length > 0 ? `${filteredMeals.length}개의 기록` : '기록 없음'}
                      {filteredMeals.length !== allMeals.length && ` (전체 ${allMeals.length}개)`}
                    </p>
                  </div>
                  <Button
                    variant={(searchQuery || dateRangeStart || dateRangeEnd) ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className="gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    필터
                    {(searchQuery || dateRangeStart || dateRangeEnd) && (
                      <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                        ON
                      </Badge>
                    )}
                  </Button>
                </div>

                {/* 활성 필터 표시 */}
                {(searchQuery || dateRangeStart || dateRangeEnd) && !isFilterOpen && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {searchQuery && (
                      <Badge variant="secondary" className="text-xs">
                        검색: {searchQuery}
                      </Badge>
                    )}
                    {dateRangeStart && (
                      <Badge variant="secondary" className="text-xs">
                        시작: {dateRangeStart}
                      </Badge>
                    )}
                    {dateRangeEnd && (
                      <Badge variant="secondary" className="text-xs">
                        종료: {dateRangeEnd}
                      </Badge>
                    )}
                  </div>
                )}

                {/* 검색 및 필터 */}
                {isFilterOpen && (
                  <div className="space-y-3 pt-3 border-t border-border">
                    {/* 메뉴 검색 */}
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1 block">메뉴 검색</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="메뉴 이름 검색..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                    </div>

                    {/* 빠른 날짜 범위 선택 */}
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1 block">빠른 선택</label>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs h-8"
                          onClick={() => {
                            const today = new Date()
                            const weekAgo = new Date(today)
                            weekAgo.setDate(today.getDate() - 7)
                            setDateRangeStart(weekAgo.toISOString().split('T')[0])
                            setDateRangeEnd(today.toISOString().split('T')[0])
                          }}
                        >
                          최근 7일
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs h-8"
                          onClick={() => {
                            const today = new Date()
                            const monthAgo = new Date(today)
                            monthAgo.setDate(today.getDate() - 30)
                            setDateRangeStart(monthAgo.toISOString().split('T')[0])
                            setDateRangeEnd(today.toISOString().split('T')[0])
                          }}
                        >
                          최근 30일
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs h-8"
                          onClick={() => {
                            const today = new Date()
                            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
                            setDateRangeStart(firstDay.toISOString().split('T')[0])
                            setDateRangeEnd(today.toISOString().split('T')[0])
                          }}
                        >
                          이번 달
                        </Button>
                      </div>
                    </div>

                    {/* 날짜 범위 */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium text-foreground mb-1 block">시작일</label>
                        <input
                          type="date"
                          value={dateRangeStart}
                          onChange={(e) => setDateRangeStart(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-foreground mb-1 block">종료일</label>
                        <input
                          type="date"
                          value={dateRangeEnd}
                          onChange={(e) => setDateRangeEnd(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground"
                        />
                      </div>
                    </div>

                    {/* 필터 초기화 */}
                    {(searchQuery || dateRangeStart || dateRangeEnd) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="w-full text-xs"
                      >
                        필터 초기화
                      </Button>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredMeals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>
                      {allMeals.length === 0
                        ? "아직 기록된 식사가 없습니다."
                        : "검색 조건에 맞는 식사가 없습니다."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {filteredMeals.map((meal) => {
                      const mealDate = new Date(meal.meal_date)
                      return (
                        <Card key={meal.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {getMealTypeLabel(meal.meal_type)}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {mealDate.getFullYear()}.{String(mealDate.getMonth() + 1).padStart(2, '0')}.{String(mealDate.getDate()).padStart(2, '0')}
                                  </span>
                                </div>
                                <p className="font-medium text-foreground">{meal.menu_name}</p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Flame className="h-3 w-3 text-primary" />
                                    {meal.calories?.toLocaleString() || 0}kcal
                                  </span>
                                  {meal.cost > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Wallet className="h-3 w-3 text-teal-600" />
                                      {meal.cost.toLocaleString()}원
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-2 text-xs text-muted-foreground">
                                  <span>탄수화물 {meal.carbs}g</span>
                                  <span>단백질 {meal.protein}g</span>
                                  <span>지방 {meal.fat}g</span>
                                </div>
                              </div>
                              <button
                                onClick={() => toggleLike(meal.id)}
                                className="shrink-0 transition-colors p-1"
                              >
                                <Heart
                                  className={`h-5 w-5 ${
                                    likedMealIds.has(meal.id)
                                      ? "fill-red-500 text-red-500"
                                      : "text-muted-foreground hover:text-red-400"
                                  }`}
                                />
                              </button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            // 다이얼로그가 닫힐 때 상태 초기화
            setSelectedMealType(null)
            setSelectedMenuItem(null)
            setMenuSearchQuery("")
          }
        }}>
          <Card className="border-dashed">
            <CardContent className="py-6 text-center">
              <p className="text-muted-foreground mb-3">오늘 식사를 빠르게 기록하세요</p>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={() => {
                  setSelectedDate(new Date())
                  setSelectedMealType(null)
                  setSelectedMenuItem(null)
                  setMenuSearchQuery("")
                }}>
                  <Plus className="h-4 w-4" />
                  오늘 식사 기록하기
                </Button>
              </DialogTrigger>
            </CardContent>
          </Card>

          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>식사 기록하기</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">날짜 선택</label>
                <input
                  type="date"
                  value={selectedDate?.toISOString().split("T")[0] || ""}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">식사 종류</label>
                <div className="grid grid-cols-2 gap-2">
                  {MEAL_ORDER.map((mealType) => (
                    <Button
                      key={mealType}
                      variant={selectedMealType === mealType ? "default" : "outline"}
                      className="w-full"
                      onClick={() => handleMealSelect(mealType)}
                    >
                      {getMealTypeLabel(mealType)}
                    </Button>
                  ))}
                </div>
              </div>

              {selectedMealType && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">메뉴 검색</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="음식 이름을 입력하세요..."
                        value={menuSearchQuery}
                        onChange={(e) => setMenuSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>

                  {/* 선택된 메뉴 표시 */}
                  {selectedMenuItem && (
                    <Card className="bg-primary/5 border-primary/30">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{selectedMenuItem.name}</p>
                            <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Flame className="h-3 w-3 text-primary" />
                                {selectedMenuItem.calories}kcal
                              </span>
                              <span className="flex items-center gap-1">
                                <Wallet className="h-3 w-3 text-teal-600" />
                                {selectedMenuItem.price.toLocaleString()}원
                              </span>
                            </div>
                            <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                              <span>탄 {selectedMenuItem.carbs}g</span>
                              <span>단 {selectedMenuItem.protein}g</span>
                              <span>지 {selectedMenuItem.fat}g</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedMenuItem(null)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 메뉴 검색 결과 */}
                  {menuSearchQuery && !selectedMenuItem && (
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {filteredMenuItems.length > 0 ? (
                        filteredMenuItems.map((menu) => (
                          <button
                            key={menu.id}
                            onClick={() => {
                              setSelectedMenuItem(menu)
                              setMenuSearchQuery("")
                            }}
                            className="w-full p-3 text-left rounded-lg border border-border hover:bg-muted/50 transition-colors"
                          >
                            <p className="font-medium text-sm text-foreground">{menu.name}</p>
                            <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                              <span>{menu.calories}kcal</span>
                              <span>{menu.price.toLocaleString()}원</span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          검색 결과가 없습니다
                        </p>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground text-center">
                    {selectedDate && (
                      <span>
                        {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 {getMealTypeLabel(selectedMealType)}에 기록됩니다
                      </span>
                    )}
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                disabled={!selectedDate || !selectedMealType || !selectedMenuItem || isSavingMeal}
                onClick={handleSaveRecord}
              >
                {isSavingMeal ? "저장 중..." : "기록 저장하기"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 날짜 상세 다이얼로그 */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>
                  {selectedDayDate && (
                    <>
                      {selectedDayDate.getFullYear()}년 {selectedDayDate.getMonth() + 1}월 {selectedDayDate.getDate()}일
                    </>
                  )}
                </span>
                {selectedDayMeals.length === 0 && (
                  <Badge variant="secondary" className="text-xs">기록 없음</Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            {selectedDayMeals.length === 0 ? (
              // 기록이 없는 경우
              <div className="space-y-4">
                <div className="text-center py-12">
                  <div className="rounded-full bg-muted w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-foreground font-medium mb-2">
                    {selectedDayDate && (
                      <>
                        {selectedDayDate.getMonth() + 1}월 {selectedDayDate.getDate()}일
                      </>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">
                    이 날짜에 기록된 식사가 없습니다
                  </p>
                  <Button
                    onClick={() => {
                      setIsDetailDialogOpen(false)
                      if (selectedDayDate) {
                        openRecordDialog(selectedDayDate)
                      }
                    }}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    식사 기록 추가하기
                  </Button>
                </div>
              </div>
            ) : (
              // 기록이 있는 경우
              <div className="space-y-4">
              {/* 하루 요약 통계 */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="py-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Flame className="h-4 w-4 text-primary" />
                        <p className="text-xs text-muted-foreground">총 칼로리</p>
                      </div>
                      <p className="text-xl font-bold text-foreground">
                        {selectedDayMeals.reduce((sum, m) => sum + (m.calories || 0), 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">kcal</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Wallet className="h-4 w-4 text-teal-600" />
                        <p className="text-xs text-muted-foreground">총 비용</p>
                      </div>
                      <p className="text-xl font-bold text-teal-600">
                        {selectedDayMeals.reduce((sum, m) => sum + (m.cost || 0), 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">원</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="text-xs text-muted-foreground">식사 횟수</span>
                      </div>
                      <p className="text-xl font-bold text-foreground">
                        {selectedDayMeals.length}
                      </p>
                      <p className="text-xs text-muted-foreground">회</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 영양소 정보 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">영양소 정보</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-blue-600">
                        {selectedDayMeals.reduce((sum, m) => sum + (m.carbs || 0), 0)}g
                      </p>
                      <p className="text-xs text-muted-foreground">탄수화물</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-600">
                        {selectedDayMeals.reduce((sum, m) => sum + (m.protein || 0), 0)}g
                      </p>
                      <p className="text-xs text-muted-foreground">단백질</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-yellow-600">
                        {selectedDayMeals.reduce((sum, m) => sum + (m.fat || 0), 0)}g
                      </p>
                      <p className="text-xs text-muted-foreground">지방</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 식사 목록 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-foreground">상세 식사 내역</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsDetailDialogOpen(false)
                      if (selectedDayDate) {
                        openRecordDialog(selectedDayDate)
                      }
                    }}
                    className="gap-1 h-7 text-xs"
                  >
                    <Plus className="h-3 w-3" />
                    추가
                  </Button>
                </div>
                {selectedDayMeals.map((meal) => (
                  <Card key={meal.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {getMealTypeLabel(meal.meal_type)}
                            </Badge>
                          </div>
                          <p className="font-medium text-foreground">{meal.menu_name}</p>

                          <div className="space-y-1">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Flame className="h-3 w-3 text-primary" />
                                {meal.calories?.toLocaleString() || 0}kcal
                              </span>
                              {meal.cost > 0 && (
                                <span className="flex items-center gap-1">
                                  <Wallet className="h-3 w-3 text-teal-600" />
                                  {meal.cost.toLocaleString()}원
                                </span>
                              )}
                            </div>
                            <div className="flex gap-3 text-xs">
                              <span className="text-blue-600">탄 {meal.carbs}g</span>
                              <span className="text-red-600">단 {meal.protein}g</span>
                              <span className="text-yellow-600">지 {meal.fat}g</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleLike(meal.id)}
                          className="shrink-0 transition-colors p-1"
                        >
                          <Heart
                            className={`h-5 w-5 ${
                              likedMealIds.has(meal.id)
                                ? "fill-red-500 text-red-500"
                                : "text-muted-foreground hover:text-red-400"
                            }`}
                          />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            )}
          </DialogContent>
        </Dialog>
      </main>

      <BottomNav />
    </div>
    </AuthGuard>
  )
}
