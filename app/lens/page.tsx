"use client"

import type React from "react"

import { useState, useRef } from "react"
import { BottomNav } from "@/components/bottom-nav"
import { AIComment } from "@/components/ai-comment"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Camera, Upload, X, Loader2, RefreshCw, Sun, Coffee, Moon, Cookie, Wallet } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { AuthGuard } from "@/components/auth-guard"
import { useAuth } from "@/lib/auth-context"
import { getLocalDateString } from "@/lib/date-utils"

interface AnalysisResult {
  menu_name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  estimated_price?: number
  accuracy?: number
  description: string
}

export default function LensPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [selectedMealType, setSelectedMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack" | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [cost, setCost] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setSelectedImage(reader.result as string)
        analyzeImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const analyzeImage = async (imageData: string) => {
    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageData }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setAnalysisResult(result.data)

        // 추론된 가격이 있으면 자동으로 설정
        if (result.data.estimated_price) {
          setCost(Number(result.data.estimated_price).toLocaleString())
        }
      } else {
        toast({
          title: "분석 실패",
          description: result.error || "음식 분석에 실패했습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Analyze error:', error)
      toast({
        title: "오류",
        description: "음식 분석 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleReupload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
      fileInputRef.current.click()
    }
  }

  const clearImage = () => {
    setSelectedImage(null)
    setAnalysisResult(null)
    setSelectedMealType(null)
    setCost("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSaveMeal = async () => {
    if (!selectedMealType || !analysisResult || !user) return

    setIsSaving(true)
    try {
      const todayDate = getLocalDateString()
      console.log(`[렌즈] 저장할 날짜: ${todayDate}`)
      console.log(`[렌즈] 현재 시간:`, new Date())
      console.log(`[렌즈] 현재 날짜 정보:`, {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        day: new Date().getDate(),
        hours: new Date().getHours(),
        minutes: new Date().getMinutes()
      })

      const response = await fetch('/api/save-meal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          menuName: analysisResult.menu_name,
          calories: analysisResult.calories,
          carbs: analysisResult.carbs,
          protein: analysisResult.protein,
          fat: analysisResult.fat,
          cost: cost ? parseInt(cost.replace(/,/g, '')) : 0,
          mealType: selectedMealType,
          mealDate: todayDate,
          imageUrl: selectedImage,
        }),
      })

      const result = await response.json()

      console.log(`[렌즈] API 응답:`, result)
      if (result.success && result.data) {
        console.log(`[렌즈] DB에 저장된 날짜: ${result.data.meal_date}`)
      }

      if (response.ok && result.success) {
        const mealLabels = {
          breakfast: "아침",
          lunch: "점심",
          dinner: "저녁",
          snack: "간식",
        }
        toast({
          title: "저장 완료",
          description: `${mealLabels[selectedMealType]} 식사로 기록되었습니다!`,
        })
        clearImage()
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
      setIsSaving(false)
    }
  }

  const todayIntake = {
    calories: { current: 1250, target: 2000 },
    protein: { current: 65, target: 100 },
    carbs: { current: 180, target: 250 },
  }

  const DonutChart = ({
    current,
    target,
    color,
    label,
    unit,
  }: {
    current: number
    target: number
    color: string
    label: string
    unit: string
  }) => {
    const percentage = Math.min((current / target) * 100, 100)
    const radius = 40
    const circumference = 2 * Math.PI * radius
    const strokeDasharray = circumference
    const strokeDashoffset = circumference - (percentage / 100) * circumference

    return (
      <div className="flex flex-col items-center">
        <div className="relative w-20 h-20">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-bold">{percentage.toFixed(0)}%</span>
          </div>
        </div>
        <p className="text-xs font-medium mt-1">{label}</p>
        <p className="text-xs text-muted-foreground">
          {current}/{target}
          {unit}
        </p>
      </div>
    )
  }

  return (
    <AuthGuard>
    <div className="min-h-screen bg-gradient-sky pb-24">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-md px-4 py-4">
          <h1 className="text-xl font-bold text-foreground">푸드 렌즈</h1>
          <p className="text-sm text-muted-foreground">음식 사진으로 영양 분석</p>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-6 space-y-4">
        {/* 음식 업로드 영역 */}
        <Card className="border-2 border-dashed border-border overflow-hidden rounded-2xl bg-white">
          {selectedImage ? (
            <div className="relative h-48 bg-gray-100">
              <button
                onClick={clearImage}
                className="absolute top-2 right-2 z-10 rounded-full bg-white/80 p-1.5 backdrop-blur"
              >
                <X className="h-4 w-4" />
              </button>
              <Image src={selectedImage || "/placeholder.svg"} alt="업로드된 음식" fill className="object-contain" />
              {isAnalyzing && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-xs font-medium">분석 중...</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-full bg-primary/10 p-4">
                  <Camera className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-base font-medium text-foreground">음식 사진 업로드</p>
                  <p className="text-sm text-muted-foreground mt-1">AI가 영양 성분을 분석해드려요</p>
                </div>
                <Button
                  size="default"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
                >
                  <Upload className="h-4 w-4" />
                  사진 선택
                </Button>
              </div>
            </CardContent>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </Card>

        {/* 재업로드 버튼 */}
        {selectedImage && !isAnalyzing && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReupload}
            className="w-full gap-2 rounded-xl bg-transparent"
          >
            <RefreshCw className="h-4 w-4" />
            다른 사진 분석하기
          </Button>
        )}

        {/* 오늘의 섭취 현황 */}
        <Card className="rounded-2xl bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">오늘의 섭취 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-around">
              <DonutChart
                current={todayIntake.calories.current}
                target={todayIntake.calories.target}
                color="#FF6B00"
                label="칼로리"
                unit="kcal"
              />
              <DonutChart
                current={todayIntake.protein.current}
                target={todayIntake.protein.target}
                color="#22c55e"
                label="단백질"
                unit="g"
              />
              <DonutChart
                current={todayIntake.carbs.current}
                target={todayIntake.carbs.target}
                color="#3b82f6"
                label="탄수화물"
                unit="g"
              />
            </div>
          </CardContent>
        </Card>

        {/* 분석 결과 영역 */}
        {!selectedImage && !analysisResult ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-primary/10 p-6 mb-4">
              <Camera className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">음식 사진을 업로드해주세요</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              위의 업로드 영역에서 음식 사진을 선택하면
              <br />
              AI가 영양 성분을 분석해드려요
            </p>
          </div>
        ) : isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-2">분석 중...</h3>
            <p className="text-sm text-muted-foreground">AI가 음식을 분석하고 있어요</p>
          </div>
        ) : analysisResult ? (
          <div className="space-y-4">
            <AIComment
              comment={analysisResult.description}
              type="suggestion"
            />

            <Card className="rounded-2xl bg-white">
              <CardHeader>
                <CardTitle>분석 결과</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{analysisResult.menu_name}</p>
                  <p className="text-3xl font-bold text-primary">{analysisResult.calories} kcal</p>
                  {analysisResult.accuracy && (
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm">
                      <span className="font-medium">정확도</span>
                      <span className="font-bold">{analysisResult.accuracy}%</span>
                    </div>
                  )}
                </div>

                {/* 영양 성분 도넛 */}
                <div className="flex justify-around py-4">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-chart-3/20 flex items-center justify-center mb-2">
                      <span className="text-lg font-bold text-chart-3">{analysisResult.protein}g</span>
                    </div>
                    <p className="text-xs text-muted-foreground">단백질</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                      <span className="text-lg font-bold text-primary">{analysisResult.carbs}g</span>
                    </div>
                    <p className="text-xs text-muted-foreground">탄수화물</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-chart-2/20 flex items-center justify-center mb-2">
                      <span className="text-lg font-bold text-chart-2">{analysisResult.fat}g</span>
                    </div>
                    <p className="text-xs text-muted-foreground">지방</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-center text-muted-foreground">어떤 식사로 기록할까요?</p>
                  <div className="grid grid-cols-4 gap-2">
                    <Button
                      variant={selectedMealType === "breakfast" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedMealType("breakfast")}
                      className={cn(
                        "flex-col gap-1 h-auto py-2 rounded-xl",
                        selectedMealType === "breakfast" && "bg-primary text-primary-foreground",
                      )}
                    >
                      <Sun className="h-4 w-4" />
                      <span className="text-xs">아침</span>
                    </Button>
                    <Button
                      variant={selectedMealType === "lunch" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedMealType("lunch")}
                      className={cn(
                        "flex-col gap-1 h-auto py-2 rounded-xl",
                        selectedMealType === "lunch" && "bg-primary text-primary-foreground",
                      )}
                    >
                      <Coffee className="h-4 w-4" />
                      <span className="text-xs">점심</span>
                    </Button>
                    <Button
                      variant={selectedMealType === "dinner" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedMealType("dinner")}
                      className={cn(
                        "flex-col gap-1 h-auto py-2 rounded-xl",
                        selectedMealType === "dinner" && "bg-primary text-primary-foreground",
                      )}
                    >
                      <Moon className="h-4 w-4" />
                      <span className="text-xs">저녁</span>
                    </Button>
                    <Button
                      variant={selectedMealType === "snack" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedMealType("snack")}
                      className={cn(
                        "flex-col gap-1 h-auto py-2 rounded-xl",
                        selectedMealType === "snack" && "bg-primary text-primary-foreground",
                      )}
                    >
                      <Cookie className="h-4 w-4" />
                      <span className="text-xs">간식</span>
                    </Button>
                  </div>
                </div>

                {selectedMealType && (
                  <div className="space-y-2">
                    <Label htmlFor="cost" className="text-sm font-medium">
                      비용 (선택사항)
                    </Label>
                    <div className="relative">
                      <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="cost"
                        type="text"
                        value={cost}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '')
                          if (value) {
                            setCost(Number(value).toLocaleString())
                          } else {
                            setCost('')
                          }
                        }}
                        placeholder="0"
                        className="pl-10 pr-8 rounded-xl"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">원</span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSaveMeal}
                  disabled={!selectedMealType || isSaving}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl h-12 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      저장 중...
                    </>
                  ) : selectedMealType ? (
                    "식사 기록에 추가하기"
                  ) : (
                    "식사 종류를 선택해주세요"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </main>

      <BottomNav />
    </div>
    </AuthGuard>
  )
}
