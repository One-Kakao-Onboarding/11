"use client"

import { useState, useCallback, useEffect, useTransition, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { BottomNav } from "@/components/bottom-nav"
import { MoodSelector } from "@/components/mood-selector"
import { MenuCard } from "@/components/menu-card"
import { KakaoCharacter } from "@/components/kakao-character"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { menuItems, moodModes, type MoodMode, type MenuItem, getRestaurantById } from "@/lib/data"
import { Dices, Trophy, Check } from "lucide-react"
import Link from "next/link"
import { AuthGuard } from "@/components/auth-guard"
import { useAuth } from "@/lib/auth-context"
import { usePathname } from "next/navigation"
import { getLocalDateString } from "@/lib/date-utils"

interface RecommendedMenu extends MenuItem {
  score?: number
  reasoning?: string
  restaurant?: any
}

export default function HomePage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [currentMode, setCurrentMode] = useState<MoodMode>(moodModes[0])
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null)
  const [likedMenuNames, setLikedMenuNames] = useState<Set<string>>(new Set())
  const [recommendedMenus, setRecommendedMenus] = useState<RecommendedMenu[]>([])
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  const [isFromCache, setIsFromCache] = useState(false)
  const [showQuickRecommendations, setShowQuickRecommendations] = useState(true)
  const [isLoadingPopular, setIsLoadingPopular] = useState(false)
  const [recommendationController, setRecommendationController] = useState<AbortController | null>(null)
  const [quickRecommendations, setQuickRecommendations] = useState<MenuItem[]>([])
  const [aiRecommendations, setAiRecommendations] = useState<RecommendedMenu[]>([])

  // 모든 fetch 요청을 관리하는 전역 AbortController
  const globalAbortController = useRef(new AbortController())
  const isMountedRef = useRef(true)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollAttemptsRef = useRef(0)
  const likeThrottleRef = useRef<number>(0) // 좋아요 버튼 스로틀링

  const handleMenuSelect = (menu: MenuItem) => {
    setSelectedMenu(menu)
  }

  const selectedRestaurant = selectedMenu ? getRestaurantById(selectedMenu.restaurantId) : null

  // pathname 변경 감지 및 cleanup (페이지 이동 시 즉시 실행)
  useEffect(() => {
    isMountedRef.current = true

    // 홈 페이지로 돌아올 때는 초기 로딩 로직에서 처리됨

    // 페이지 이동 감지 및 즉시 cleanup
    const cleanupAllTasks = () => {
      // 모든 진행 중인 작업 즉시 중단
      isMountedRef.current = false

      globalAbortController.current.abort()

      if (recommendationController) {
        recommendationController.abort()
      }

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }

      // 상태 즉시 리셋 (렌더링 블로킹 방지)
      setIsLoadingRecommendations(false)
      setIsLoadingPopular(false)
    }

    return cleanupAllTasks
  }, [pathname, user, recommendationController])

  // 로그인 직후 초기 로딩 (한 번만 실행)
  const isInitialMount = useRef(true)
  const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const statusCheckCountRef = useRef(0)

  useEffect(() => {
    if (user && currentMode && isInitialMount.current) {
      isInitialMount.current = false

      // 빠른 추천 TOP3 즉시 로드 (최우선)
      fetchPopularMenus()

      // 좋아요 목록 즉시 로드
      fetchLikedMenus()

      // AI 추천 백그라운드 로드 (캐시가 있으면 바로 반환, 없으면 생성)
      console.log('✅ User logged in, loading AI recommendations in background...')
      loadAiRecommendations(false) // 빠른 추천 유지하면서 백그라운드 로드
    }

    return () => {
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current)
        statusCheckIntervalRef.current = null
      }
    }
  }, [user, currentMode])


  // 모드 변경 전 값을 저장하기 위한 ref
  const prevModeRef = useRef<string | null>(null)

  useEffect(() => {
    if (user) {
      // 모드가 변경된 경우에만 상태 초기화
      if (prevModeRef.current !== null && prevModeRef.current !== currentMode.id) {
        console.log(`🔄 Mode changed from ${prevModeRef.current} to ${currentMode.id}`)

        // 빠른 추천 표시
        setShowQuickRecommendations(true)
        fetchPopularMenus()

        // AI 추천 백그라운드 로드 (캐시가 있으면 바로 반환)
        loadAiRecommendations(false) // 빠른 추천 유지하면서 백그라운드 로드
      }

      // 현재 모드 저장
      prevModeRef.current = currentMode.id
    }

  }, [user, currentMode])

  const fetchPopularMenus = () => {
    if (!isMountedRef.current) return

    // 고정된 빠른 추천 TOP3 (즉시 표시)
    const popularMenuNames = ['김치찌개', '치킨 버거 세트', '제육볶음 정식']
    const selectedMenus = popularMenuNames
      .map(name => menuItems.find(menu => menu.name === name))
      .filter((menu): menu is MenuItem => menu !== undefined)

    // 빠른 추천을 별도로 저장
    setQuickRecommendations(selectedMenus)

    // 초기에는 빠른 추천을 표시
    if (showQuickRecommendations) {
      setRecommendedMenus(selectedMenus)
    }

    setIsLoadingPopular(false)
    console.log('✅ Popular menus loaded (fixed TOP3)')
  }


  const fetchLikedMenus = () => {
    if (!user || !isMountedRef.current) return

    // fetch 즉시 실행
    fetch(`/api/liked-meals?userId=${user.id}`, {
      signal: globalAbortController.current.signal
    })
      .then(response => response.json())
      .then(result => {
        if (!isMountedRef.current) return

        if (result.success) {
          const menuNames = new Set<string>(result.data.map((item: any) => item.menu_name as string))
          setLikedMenuNames(menuNames)
        }
      })
      .catch(error => {
        if (error.name === 'AbortError') {
          console.log('Liked menus request cancelled')
          return
        }
        console.error('Failed to fetch liked menus:', error)
      })
  }

  const loadAiRecommendations = (switchToAi: boolean = false) => {
    if (!user || !isMountedRef.current) return

    console.log(`🤖 [AI 추천] 로딩 시작 - userId: ${user.id}, mode: ${currentMode.id}, switchToAi: ${switchToAi}`)

    // 이전 요청 취소
    if (recommendationController) {
      recommendationController.abort()
    }

    // switchToAi가 true일 때만 AI 추천으로 전환
    if (switchToAi) {
      setShowQuickRecommendations(false)
    }
    setIsLoadingRecommendations(true)

    const controller = new AbortController()
    setRecommendationController(controller)
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30초 타임아웃

    // API 호출 (캐시가 있으면 즉시 반환, 없으면 생성)
    fetch('/api/recommend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user.id,
        mode: currentMode.id,
      }),
      signal: controller.signal,
    })
      .then(response => {
        clearTimeout(timeoutId)
        return response.json()
      })
      .then(result => {
        if (!isMountedRef.current) return

        setRecommendationController(null)

        if (result.success) {
          console.log(`✅ [AI 추천] 로드 완료 - fromCache: ${result.fromCache}`)

          const aiData = result.data || []
          setAiRecommendations(aiData)
          setRecommendedMenus(aiData)
          setIsFromCache(result.fromCache || false)
          setIsLoadingRecommendations(false)

          const message = result.fromCache
            ? "🤖 저장된 AI 추천 메뉴를 불러왔습니다!"
            : "🤖 새로운 AI 추천 메뉴를 생성했습니다!"

          toast({
            description: message,
          })
        } else {
          console.error('❌ [AI 추천] 로드 실패:', result.error)
          setIsLoadingRecommendations(false)

          // 실패 시: switchToAi가 true였다면 빠른 추천으로 복귀
          if (switchToAi) {
            setShowQuickRecommendations(true)
          }

          toast({
            title: "추천 로딩 실패",
            description: switchToAi ? "빠른 추천을 표시합니다." : "잠시 후 다시 시도해주세요.",
            variant: "destructive",
          })
        }
      })
      .catch(error => {
        clearTimeout(timeoutId)
        setRecommendationController(null)

        if (error.name === 'AbortError') {
          console.warn('⚠️ [AI 추천] 요청 취소 또는 타임아웃')
        } else {
          console.error('❌ [AI 추천] 에러:', error)
        }

        if (isMountedRef.current) {
          setIsLoadingRecommendations(false)

          // 실패 시: switchToAi가 true였다면 빠른 추천으로 복귀
          if (switchToAi) {
            setShowQuickRecommendations(true)
          }
        }
      })
  }

  const handleLike = async (menu: MenuItem, isCurrentlyLiked: boolean) => {
    if (!user) return

    // 100ms 스로틀링 체크
    const now = Date.now()
    if (now - likeThrottleRef.current < 100) {
      return
    }
    likeThrottleRef.current = now

    if (isCurrentlyLiked) {
      // 좋아요 취소
      try {
        const response = await fetch(`/api/liked-meals?userId=${user.id}&menuName=${encodeURIComponent(menu.name)}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          setLikedMenuNames(prev => {
            const newSet = new Set(prev)
            newSet.delete(menu.name)
            return newSet
          })
          toast({
            description: "좋아요가 취소되었습니다.",
          })
        }
      } catch (error) {
        console.error('Remove like error:', error)
      }
    } else {
      // 좋아요 추가 - meal_records 없이 직접 저장
      try {
        const restaurant = getRestaurantById(menu.restaurantId)

        const likeResponse = await fetch('/api/liked-meals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            menuName: menu.name,
            calories: menu.calories,
            carbs: menu.carbs,
            protein: menu.protein,
            fat: menu.fat,
            price: menu.price,
            deliveryTime: restaurant?.deliveryTime,
            restaurantName: restaurant?.name,
            imageUrl: menu.image,
          }),
        })

        const result = await likeResponse.json()

        if (likeResponse.ok && result.success) {
          setLikedMenuNames(prev => new Set(prev).add(menu.name))
          toast({
            description: "좋아요 목록에 추가되었습니다.",
          })
        } else {
          // 이미 좋아요한 경우
          if (result.error?.includes('이미')) {
            toast({
              description: result.error,
            })
          } else {
            throw new Error(result.error)
          }
        }
      } catch (error) {
        console.error('Add like error:', error)
        toast({
          title: "오류",
          description: "좋아요 추가 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      }
    }
  }

  const getCharacterMessage = (modeId: string) => {
    const messages: Record<string, string> = {
      budget: "알뜰하게 맛있는 거 먹자!",
      healthy: "오늘도 건강하게!",
      quick: "빨리 먹고 싶어!",
    }
    return messages[modeId] || "뭐 먹을까?"
  }

  return (
    <AuthGuard>
    <div className="min-h-screen bg-gradient-sky pb-24">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-border/50">
        <div className="mx-auto max-w-md px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <KakaoCharacter type="ryan" size="sm" />
              <div>
                <h1 className="text-xl font-bold text-foreground">오늘 뭐 먹지?</h1>
                <p className="text-sm text-muted-foreground">{user?.nickname}님</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="mx-auto max-w-md px-4 py-6 space-y-6">
        <div className="flex items-center gap-4 p-4 bg-white rounded-3xl shadow-sm border border-border/50">
          <KakaoCharacter
            type={currentMode.id === "budget" ? "muzi" : currentMode.id === "healthy" ? "apeach" : "ryan"}
            size="md"
          />
          <div className="flex-1">
            <p className="text-lg font-bold text-foreground">{getCharacterMessage(currentMode.id)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {currentMode.id === "budget" && "가성비 좋은 메뉴를 추천해드릴게요"}
              {currentMode.id === "healthy" && "건강한 메뉴로 준비했어요"}
              {currentMode.id === "quick" && "빠르게 배달되는 메뉴예요"}
            </p>
          </div>
        </div>

        <div className="sticky top-[73px] z-30 py-2 -mx-4 px-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-3 shadow-sm border border-border/50">
            <MoodSelector onModeChange={setCurrentMode} />
          </div>
        </div>

        {/* 추천 메뉴 */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
              <Trophy className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              {showQuickRecommendations ? "빠른 추천 TOP 3" : "AI 추천 TOP 3"}
            </h2>
            {isLoadingRecommendations && (
              <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200">
                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                AI 분석 중...
              </div>
            )}
          </div>

          {/* AI 추천 보기 버튼 (빠른 추천이 표시될 때) */}
          {showQuickRecommendations && (
            <div className={`border-2 rounded-2xl p-4 ${
              aiRecommendations.length > 0
                ? 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30'
                : 'bg-gradient-to-r from-blue-50 to-blue-25 border-blue-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🤖</span>
                    <h3 className="font-bold text-foreground">
                      {aiRecommendations.length > 0
                        ? 'AI 맞춤 추천도 확인해보세요!'
                        : 'AI 맞춤 추천 준비 중...'}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {aiRecommendations.length > 0
                      ? '당신의 선호도를 분석한 AI 추천 메뉴'
                      : isLoadingRecommendations
                      ? '선호도, 좋아요 목록, 최근 식사를 분석하고 있습니다'
                      : 'AI가 당신만을 위한 메뉴를 준비하고 있습니다'}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    console.log(`🔘 [AI 추천] 버튼 클릭`)
                    setShowQuickRecommendations(false)
                    setRecommendedMenus(aiRecommendations)
                  }}
                  disabled={aiRecommendations.length === 0}
                  className={`rounded-xl h-10 px-6 gap-2 ${
                    aiRecommendations.length > 0
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  {isLoadingRecommendations && aiRecommendations.length === 0 && (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  )}
                  <span className="font-semibold">
                    {aiRecommendations.length > 0 ? '보기' : '준비 중'}
                  </span>
                </Button>
              </div>
            </div>
          )}

          {/* 빠른 추천 보기 버튼 (AI 추천이 표시될 때) */}
          {!showQuickRecommendations && (
            <div className="border-2 rounded-2xl p-4 bg-gradient-to-r from-green-50 to-green-25 border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">⚡</span>
                    <h3 className="font-bold text-foreground">빠른 추천도 확인해보세요!</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    간단하고 빠르게 선택할 수 있는 인기 메뉴
                  </p>
                </div>
                <Button
                  onClick={() => {
                    console.log(`🔘 [빠른 추천] 버튼 클릭`)
                    setShowQuickRecommendations(true)
                    setRecommendedMenus(quickRecommendations)
                  }}
                  className="rounded-xl h-10 px-6 gap-2 bg-green-600 text-white hover:bg-green-700"
                >
                  <span className="font-semibold">보기</span>
                </Button>
              </div>
            </div>
          )}

          {(isLoadingRecommendations || isLoadingPopular) ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-border/50 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-20 h-20 bg-muted rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {recommendedMenus.map((menu, index) => (
                <MenuCard
                  key={menu.id}
                  menu={menu}
                  rank={index + 1}
                  onSelect={handleMenuSelect}
                  mode={currentMode.id as "budget" | "healthy" | "quick"}
                  isLiked={likedMenuNames.has(menu.name)}
                  onLike={handleLike}
                />
              ))}
            </div>
          )}
        </section>

        {/* 랜덤 메뉴 뽑기 버튼 */}
        <section className="space-y-3 pt-2">
          <p className="text-center text-sm text-muted-foreground">마음에 드는 메뉴가 없나요?</p>
          <Link href="/game">
            <Button
              variant="outline"
              className="w-full gap-2 border-2 border-dashed border-primary/50 hover:border-primary hover:bg-primary/5 bg-white/80 rounded-2xl h-12"
            >
              <Dices className="h-5 w-5 text-primary" />
              <span className="font-semibold">랜덤 메뉴 뽑기로 결정하기!</span>
            </Button>
          </Link>
        </section>
      </main>

      {/* 메뉴 선택 완료 다이얼로그 */}
      <Dialog open={!!selectedMenu} onOpenChange={() => setSelectedMenu(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-center">메뉴 선택 완료!</DialogTitle>
          </DialogHeader>
          {selectedMenu && (
            <div className="text-center space-y-4 py-4">
              <div className="flex justify-center">
                <KakaoCharacter type="apeach" size="lg" />
              </div>
              <div>
                {selectedRestaurant && <p className="text-sm text-primary font-medium">{selectedRestaurant.name}</p>}
                <p className="text-xl font-bold">{selectedMenu.name}</p>
                <p className="text-primary font-semibold text-lg">{selectedMenu.price.toLocaleString()}원</p>
                {selectedRestaurant && (
                  <p className="text-xs text-muted-foreground mt-1">
                    예상 배달 시간: {selectedRestaurant.deliveryTime}분
                  </p>
                )}
              </div>
              <p className="text-sm text-muted-foreground">맛있는 식사 되세요!</p>
              <div className="space-y-2">
                <Button
                  onClick={() => setSelectedMenu(null)}
                  className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl h-12"
                >
                  <Check className="h-4 w-4" />
                  확인
                </Button>
                <Button
                  disabled
                  className="w-full gap-2 bg-muted text-muted-foreground rounded-2xl h-12 cursor-not-allowed opacity-60"
                >
                  <span>🚀</span>
                  주문하러가기
                  <span className="ml-2 text-xs">(준비중)</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
    </AuthGuard>
  )
}
