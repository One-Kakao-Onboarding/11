"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { BottomNav } from "@/components/bottom-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Wallet,
  Heart,
  AlertTriangle,
  LogOut,
  X,
  Edit2,
  Camera,
  Plus,
  UtensilsCrossed,
  ChevronDown,
} from "lucide-react"
import { menuItems, getRestaurantById } from "@/lib/data"
import { AuthGuard } from "@/components/auth-guard"
import { useAuth } from "@/lib/auth-context"

interface UserPreferences {
  name: string
  favoriteCategories: string[]
  dislikedIngredients: string[]
  budget: number
  priorities: {
    price: number
    nutrition: number
    delivery: number
  }
}

const defaultPreferences: UserPreferences = {
  name: "김민준",
  favoriteCategories: ["한식", "일식", "샐러드"],
  dislikedIngredients: ["고수", "파프리카"],
  budget: 300000,
  priorities: {
    price: 40,
    nutrition: 30,
    delivery: 30,
  },
}

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [preferences, setPreferences] = useState<UserPreferences>({
    ...defaultPreferences,
    name: user?.nickname || "사용자",
  })
  const [showBudgetDialog, setShowBudgetDialog] = useState(false)
  const [newBudget, setNewBudget] = useState("")
  const [showPriorityDialog, setShowPriorityDialog] = useState(false)
  const [tempPriorities, setTempPriorities] = useState(defaultPreferences.priorities)
  const [showNameDialog, setShowNameDialog] = useState(false)
  const [newName, setNewName] = useState("")
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [tempProfileImage, setTempProfileImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false)
  const [showAddIngredientDialog, setShowAddIngredientDialog] = useState(false)
  const [newCategory, setNewCategory] = useState("")
  const [newIngredient, setNewIngredient] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([])

  const [likedMeals, setLikedMeals] = useState<any[]>([])
  const [isLikedMenuOpen, setIsLikedMenuOpen] = useState(false)
  const [menuSortOption, setMenuSortOption] = useState<"menu" | "date" | "calories">("date")

  const getSortedMenus = () => {
    const menus = [...likedMeals]
    switch (menuSortOption) {
      case "menu":
        return menus.sort((a, b) => a.menu_name.localeCompare(b.menu_name, "ko"))
      case "calories":
        return menus.sort((a, b) => (b.calories || 0) - (a.calories || 0))
      case "date":
      default:
        return menus.sort((a, b) => new Date(b.liked_at).getTime() - new Date(a.liked_at).getTime())
    }
  }

  const fetchLikedMeals = async () => {
    if (!user) return

    try {
      console.log('Fetching liked meals for user:', user.id)
      const response = await fetch(`/api/liked-meals?userId=${user.id}`)
      const result = await response.json()

      console.log('Liked meals response:', result)

      if (response.ok && result.success) {
        console.log('Liked meals data:', result.data)
        setLikedMeals(result.data)
      } else {
        console.error('Failed to fetch liked meals:', result)
      }
    } catch (error) {
      console.error('Failed to fetch liked meals:', error)
    }
  }

  useEffect(() => {
    if (user) {
      fetchLikedMeals()
      fetchPreferences()
    }
  }, [user])

  const fetchPreferences = async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/preferences?userId=${user.id}`)
      const result = await response.json()

      if (response.ok && result.success) {
        const data = result.data
        setPreferences({
          name: user.nickname,
          favoriteCategories: data.favorite_categories || [],
          dislikedIngredients: data.disliked_ingredients || [],
          budget: data.monthly_budget || 300000,
          priorities: {
            price: data.priority_price || 33,
            nutrition: data.priority_nutrition || 33,
            delivery: data.priority_delivery || 34,
          },
        })
        setTempPriorities({
          price: data.priority_price || 33,
          nutrition: data.priority_nutrition || 33,
          delivery: data.priority_delivery || 34,
        })
        setNewBudget((data.monthly_budget || 300000).toLocaleString())
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error)
    }
  }

  const savePreferences = async (updatedPreferences: Partial<UserPreferences>) => {
    if (!user) return

    try {
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          favoriteCategories: updatedPreferences.favoriteCategories ?? preferences.favoriteCategories,
          dislikedIngredients: updatedPreferences.dislikedIngredients ?? preferences.dislikedIngredients,
          priorityPrice: updatedPreferences.priorities?.price ?? preferences.priorities.price,
          priorityNutrition: updatedPreferences.priorities?.nutrition ?? preferences.priorities.nutrition,
          priorityDelivery: updatedPreferences.priorities?.delivery ?? preferences.priorities.delivery,
          monthlyBudget: updatedPreferences.budget ?? preferences.budget,
        }),
      })

      if (response.ok) {
        console.log('Preferences saved successfully')
      }
    } catch (error) {
      console.error('Failed to save preferences:', error)
    }
  }

  const removeCategory = (cat: string) => {
    const updatedPreferences = {
      favoriteCategories: preferences.favoriteCategories.filter((c) => c !== cat),
    }
    setPreferences((prev) => ({
      ...prev,
      ...updatedPreferences,
    }))
    savePreferences(updatedPreferences)
  }

  const removeIngredient = (ing: string) => {
    const updatedPreferences = {
      dislikedIngredients: preferences.dislikedIngredients.filter((i) => i !== ing),
    }
    setPreferences((prev) => ({
      ...prev,
      ...updatedPreferences,
    }))
    savePreferences(updatedPreferences)
  }

  const removeLikedMenu = async (mealId: number) => {
    if (!user) return

    try {
      const response = await fetch(`/api/liked-meals?userId=${user.id}&mealRecordId=${mealId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setLikedMeals((prev) => prev.filter((m) => m.id !== mealId))
        toast({
          description: "좋아요 목록에서 제거되었습니다.",
        })
      }
    } catch (error) {
      console.error('Remove liked meal error:', error)
      toast({
        title: "오류",
        description: "제거 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const spentBudget = 187500
  const remainingBudget = preferences.budget - spentBudget
  const budgetPercentage = (spentBudget / preferences.budget) * 100

  const gourmetLevel = Math.min(5, Math.floor(likedMeals.length / 2) + 1)
  const levelNames = ["입문자", "미식가", "요리사", "셰프", "마스터 셰프"]

  const handleBudgetUpdate = () => {
    const budget = Number.parseInt(newBudget.replace(/,/g, ""))
    if (!isNaN(budget) && budget > 0) {
      const updatedPreferences = { budget }
      setPreferences((prev) => ({ ...prev, ...updatedPreferences }))
      savePreferences(updatedPreferences)
      setShowBudgetDialog(false)
      setNewBudget("")
      toast({
        description: "예산이 수정되었습니다.",
      })
    }
  }

  const handleNameUpdate = () => {
    if (newName.trim()) {
      setPreferences((prev) => ({ ...prev, name: newName.trim() }))
      if (tempProfileImage !== null) {
        setProfileImage(tempProfileImage)
      }
      setShowNameDialog(false)
      setNewName("")
      setTempProfileImage(null)
      toast({
        description: "프로필이 수정되었습니다.",
      })
    }
  }

  const tempPriorityTotal = Object.values(tempPriorities).reduce((a, b) => a + b, 0)
  const currentPriorityTotal = Object.values(preferences.priorities).reduce((a, b) => a + b, 0)

  const handlePriorityChange = (key: string, newValue: number) => {
    const otherTotal = Object.entries(tempPriorities)
      .filter(([k]) => k !== key)
      .reduce((sum, [, v]) => sum + v, 0)

    const maxAllowed = 100 - otherTotal
    const clampedValue = Math.min(newValue, maxAllowed)

    setTempPriorities((prev) => ({
      ...prev,
      [key]: clampedValue,
    }))
  }

  const handlePrioritySave = () => {
    if (tempPriorityTotal === 100) {
      const updatedPreferences = { priorities: tempPriorities }
      setPreferences((prev) => ({ ...prev, ...updatedPreferences }))
      savePreferences(updatedPreferences)
      setShowPriorityDialog(false)
      toast({
        description: "우선순위가 수정되었습니다.",
      })
    }
  }

  const openPriorityDialog = () => {
    setTempPriorities(preferences.priorities)
    setShowPriorityDialog(true)
  }

  const handleSaveAll = () => {
    console.log("[v0] Saving to DB:", {
      name: preferences.name,
      budget: preferences.budget,
      favoriteCategories: preferences.favoriteCategories,
      dislikedIngredients: preferences.dislikedIngredients,
      priorities: preferences.priorities,
      profileImage,
      likedMenuIds,
    })
    alert("설정이 저장되었습니다!")
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setTempProfileImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddCategory = () => {
    // 직접 입력한 카테고리 추가 (쉼표로 구분된 여러 개 지원)
    const categoriesToAdd = [...selectedCategories]
    if (newCategory.trim()) {
      // 쉼표로 분리하고 각 항목을 trim
      const inputCategories = newCategory
        .split(',')
        .map(cat => cat.trim())
        .filter(cat => cat.length > 0)

      categoriesToAdd.push(...inputCategories)
    }

    // 이미 추가된 카테고리는 제외
    const uniqueCategories = categoriesToAdd.filter(
      (cat) => !preferences.favoriteCategories.includes(cat)
    )

    if (uniqueCategories.length > 0) {
      const updatedPreferences = {
        favoriteCategories: [...preferences.favoriteCategories, ...uniqueCategories],
      }
      setPreferences((prev) => ({
        ...prev,
        ...updatedPreferences,
      }))
      savePreferences(updatedPreferences)
      setNewCategory("")
      setSelectedCategories([])
      setShowAddCategoryDialog(false)
      toast({
        description: `음식 취향 ${uniqueCategories.length}개가 추가되었습니다.`,
      })
    }
  }

  const toggleCategorySelection = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    )
  }

  const handleAddIngredient = () => {
    // 직접 입력한 식재료 추가 (쉼표로 구분된 여러 개 지원)
    const ingredientsToAdd = [...selectedIngredients]
    if (newIngredient.trim()) {
      // 쉼표로 분리하고 각 항목을 trim
      const inputIngredients = newIngredient
        .split(',')
        .map(ing => ing.trim())
        .filter(ing => ing.length > 0)

      ingredientsToAdd.push(...inputIngredients)
    }

    // 이미 추가된 식재료는 제외
    const uniqueIngredients = ingredientsToAdd.filter(
      (ing) => !preferences.dislikedIngredients.includes(ing)
    )

    if (uniqueIngredients.length > 0) {
      const updatedPreferences = {
        dislikedIngredients: [...preferences.dislikedIngredients, ...uniqueIngredients],
      }
      setPreferences((prev) => ({
        ...prev,
        ...updatedPreferences,
      }))
      savePreferences(updatedPreferences)
      setNewIngredient("")
      setSelectedIngredients([])
      setShowAddIngredientDialog(false)
      toast({
        description: `기피 식재료 ${uniqueIngredients.length}개가 추가되었습니다.`,
      })
    }
  }

  const toggleIngredientSelection = (ingredient: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(ingredient) ? prev.filter((i) => i !== ingredient) : [...prev, ingredient]
    )
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
    toast({
      description: "로그아웃되었습니다.",
    })
  }

  const priorityLabels: Record<string, string> = {
    price: "💰 가격",
    nutrition: "🥗 영양",
    delivery: "🚀 배달 소요시간",
  }

  return (
    <AuthGuard>
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-md px-4 py-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">마이페이지</h1>
            <p className="text-sm text-muted-foreground">미식 취향 설정</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-6 space-y-6">
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profileImage || "/korean-man-professional-avatar.jpg"} />
                <AvatarFallback>{preferences.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">{preferences.name}</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      setNewName(preferences.name)
                      setTempProfileImage(profileImage)
                      setShowNameDialog(true)
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Lv.{gourmetLevel}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              이번 달 식비 예산
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>사용: {spentBudget.toLocaleString()}원</span>
                <span className="text-muted-foreground">남은 예산: {remainingBudget.toLocaleString()}원</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    budgetPercentage > 80 ? "bg-destructive" : "bg-primary"
                  }`}
                  style={{ width: `${budgetPercentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">목표: {preferences.budget.toLocaleString()}원 / 월</p>
            </div>

            {budgetPercentage > 70 && (
              <div className="flex items-center gap-2 rounded-lg bg-chart-2/10 p-3 text-sm">
                <AlertTriangle className="h-4 w-4 text-chart-2" />
                <span>예산의 {budgetPercentage.toFixed(0)}%를 사용했어요!</span>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full bg-transparent"
              onClick={() => {
                setNewBudget(preferences.budget.toLocaleString())
                setShowBudgetDialog(true)
              }}
            >
              예산 수정하기
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              음식 취향
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">좋아하는 음식</p>
              <div className="flex flex-wrap gap-2">
                {preferences.favoriteCategories.map((cat) => (
                  <Badge
                    key={cat}
                    className="bg-primary/10 text-primary border-0 cursor-pointer group relative pr-6 hover:bg-primary/20 transition-colors"
                    onClick={() => removeCategory(cat)}
                  >
                    {cat}
                    <X className="h-3 w-3 absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Badge>
                ))}
                <Badge
                  variant="outline"
                  className="border-dashed cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => setShowAddCategoryDialog(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  추가
                </Badge>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">기피 식재료</p>
              <div className="flex flex-wrap gap-2">
                {preferences.dislikedIngredients.map((ing) => (
                  <Badge
                    key={ing}
                    variant="destructive"
                    className="bg-destructive/10 text-destructive border-0 cursor-pointer group relative pr-6 hover:bg-destructive/20 transition-colors"
                    onClick={() => removeIngredient(ing)}
                  >
                    🚫 {ing}
                    <X className="h-3 w-3 absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Badge>
                ))}
                <Badge
                  variant="outline"
                  className="border-dashed cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => setShowAddIngredientDialog(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  추가
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>추천 우선순위</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(preferences.priorities).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{priorityLabels[key]}</span>
                  <span className="text-muted-foreground">{value}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground text-center">총합: {currentPriorityTotal}%</p>
            <Button variant="outline" className="w-full bg-transparent" onClick={openPriorityDialog}>
              우선순위 수정하기
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" fill="currentColor" />
              좋아요 관리
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Collapsible open={isLikedMenuOpen} onOpenChange={setIsLikedMenuOpen}>
              <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 p-0 h-auto hover:bg-transparent">
                    <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                    <span className="text-sm font-medium">좋아요한 메뉴 ({likedMeals.length})</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isLikedMenuOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                {isLikedMenuOpen && likedMeals.length > 0 && (
                  <Select value={menuSortOption} onValueChange={(v) => setMenuSortOption(v as typeof menuSortOption)}>
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">최신순</SelectItem>
                      <SelectItem value="menu">메뉴 가나다순</SelectItem>
                      <SelectItem value="calories">칼로리 높은순</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <CollapsibleContent className="mt-3">
                {likedMeals.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {getSortedMenus().map((meal) => (
                      <div
                        key={meal.id}
                        className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 cursor-pointer group hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors relative"
                        onClick={() => removeLikedMenu(meal.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{meal.menu_name}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>{meal.calories}kcal</span>
                              <span>•</span>
                              <span>{new Date(meal.meal_date).toLocaleDateString('ko-KR')}</span>
                            </div>
                          </div>
                          <X className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">좋아요한 메뉴가 없습니다.</p>
                )}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        <Button
          variant="outline"
          className="w-full gap-2 text-muted-foreground hover:text-destructive bg-transparent"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </Button>
      </main>

      <Dialog open={showBudgetDialog} onOpenChange={setShowBudgetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>월 예산 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="budget">월 식비 예산 (원)</Label>
              <Input
                id="budget"
                type="text"
                value={newBudget}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, "")
                  setNewBudget(Number(value).toLocaleString())
                }}
                placeholder="예: 300,000"
              />
            </div>
            <Button onClick={handleBudgetUpdate} className="w-full bg-primary text-primary-foreground">
              저장하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPriorityDialog} onOpenChange={setShowPriorityDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>추천 우선순위 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {Object.entries(tempPriorities).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{priorityLabels[key]}</span>
                  <span className="text-muted-foreground">{value}%</span>
                </div>
                <Slider
                  value={[value]}
                  onValueChange={([v]) => handlePriorityChange(key, v)}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
            ))}
            <div className={`text-center text-sm ${tempPriorityTotal === 100 ? "text-green-600" : "text-destructive"}`}>
              총합: {tempPriorityTotal}%{" "}
              {tempPriorityTotal !== 100 && (tempPriorityTotal < 100 ? `(${100 - tempPriorityTotal}% 부족)` : "(초과)")}
            </div>
            <Button
              onClick={handlePrioritySave}
              disabled={tempPriorityTotal !== 100}
              className="w-full bg-primary text-primary-foreground disabled:opacity-50"
            >
              저장하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>프로필 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={tempProfileImage || profileImage || "/korean-man-professional-avatar.jpg"} />
                  <AvatarFallback>{preferences.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input id="name" type="text" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <Button onClick={handleNameUpdate} className="w-full bg-primary text-primary-foreground">
              저장하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddCategoryDialog} onOpenChange={(open) => {
        setShowAddCategoryDialog(open)
        if (!open) {
          setSelectedCategories([])
          setNewCategory("")
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>좋아하는 음식 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category">음식 종류 직접 입력 (쉼표로 구분)</Label>
              <Input
                id="category"
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="예: 중식, 양식, 디저트"
                onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
              />
              <p className="text-xs text-muted-foreground">쉼표(,)로 구분하여 여러 개를 한 번에 입력할 수 있어요</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <p className="text-xs text-muted-foreground w-full mb-1">추천 태그 (여러 개 선택 가능):</p>
              {["중식", "양식", "분식", "디저트", "치킨", "피자", "베트남", "태국"].map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedCategories.includes(tag) ? "default" : "outline"}
                  className={`cursor-pointer transition-colors ${
                    selectedCategories.includes(tag)
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-primary/10"
                  }`}
                  onClick={() => toggleCategorySelection(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
            {(selectedCategories.length > 0 || newCategory.trim()) && (
              <div className="text-xs text-muted-foreground">
                {selectedCategories.length > 0 && `선택됨: ${selectedCategories.join(", ")}`}
                {selectedCategories.length > 0 && newCategory.trim() && " + "}
                {newCategory.trim() && `입력: ${newCategory.split(',').map(c => c.trim()).filter(c => c).join(", ")}`}
              </div>
            )}
            <Button
              onClick={handleAddCategory}
              disabled={selectedCategories.length === 0 && !newCategory.trim()}
              className="w-full bg-primary text-primary-foreground disabled:opacity-50"
            >
              추가하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddIngredientDialog} onOpenChange={(open) => {
        setShowAddIngredientDialog(open)
        if (!open) {
          setSelectedIngredients([])
          setNewIngredient("")
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>기피 식재료 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ingredient">식재료 직접 입력 (쉼표로 구분)</Label>
              <Input
                id="ingredient"
                type="text"
                value={newIngredient}
                onChange={(e) => setNewIngredient(e.target.value)}
                placeholder="예: 땅콩, 새우, 버섯"
                onKeyDown={(e) => e.key === "Enter" && handleAddIngredient()}
              />
              <p className="text-xs text-muted-foreground">쉼표(,)로 구분하여 여러 개를 한 번에 입력할 수 있어요</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <p className="text-xs text-muted-foreground w-full mb-1">추천 태그 (여러 개 선택 가능):</p>
              {["땅콩", "새우", "버섯", "양파", "유제품", "글루텐", "해산물", "계란"].map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedIngredients.includes(tag) ? "default" : "outline"}
                  className={`cursor-pointer transition-colors ${
                    selectedIngredients.includes(tag)
                      ? "bg-destructive text-destructive-foreground"
                      : "hover:bg-destructive/10"
                  }`}
                  onClick={() => toggleIngredientSelection(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
            {(selectedIngredients.length > 0 || newIngredient.trim()) && (
              <div className="text-xs text-muted-foreground">
                {selectedIngredients.length > 0 && `선택됨: ${selectedIngredients.join(", ")}`}
                {selectedIngredients.length > 0 && newIngredient.trim() && " + "}
                {newIngredient.trim() && `입력: ${newIngredient.split(',').map(i => i.trim()).filter(i => i).join(", ")}`}
              </div>
            )}
            <Button
              onClick={handleAddIngredient}
              disabled={selectedIngredients.length === 0 && !newIngredient.trim()}
              className="w-full bg-primary text-primary-foreground disabled:opacity-50"
            >
              추가하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
    </AuthGuard>
  )
}
