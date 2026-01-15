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
  const [aiRecommendationStatus, setAiRecommendationStatus] = useState<'none' | 'generating' | 'ready'>('none')
  const [showAiRecommendations, setShowAiRecommendations] = useState(false)
  const [isLoadingPopular, setIsLoadingPopular] = useState(false)
  const [recommendationController, setRecommendationController] = useState<AbortController | null>(null)

  // 모든 fetch 요청을 관리하는 전역 AbortController
  const globalAbortController = useRef(new AbortController())
  const isMountedRef = useRef(true)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollAttemptsRef = useRef(0)

  const handleMenuSelect = (menu: MenuItem) => {
    setSelectedMenu(menu)
  }

  const selectedRestaurant = selectedMenu ? getRestaurantById(selectedMenu.restaurantId) : null

  // pathname 변경 감지 및 cleanup (페이지 이동 시 즉시 실행)
  useEffect(() => {
    isMountedRef.current = true

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
  }, [pathname, recommendationController])

  useEffect(() => {
    if (user) {
      // 빠른 추천 TOP3 즉시 로드 (최우선)
      fetchPopularMenus()

      // 좋아요 목록 즉시 로드
      fetchLikedMenus()

      // AI 추천 상태 즉시 확인 (로그인 페이지에서 시작한 추천 확인)
      console.log('✅ User logged in, checking AI recommendation status...')
      checkAiRecommendationStatus()
    }
  }, [user])

  // AI 추천 상태 변경 감지 (디버깅용)
  useEffect(() => {
    console.log(`🎯 [AI 추천] 상태 변경: ${aiRecommendationStatus}`)
  }, [aiRecommendationStatus])

  // 모드 변경 시 AI 추천 상태 재확인
  useEffect(() => {
    if (user && currentMode) {
      console.log(`🔄 [AI 추천] 모드 변경됨: ${currentMode.id}`)

      // 기존 폴링 중단
      if (pollIntervalRef.current) {
        console.log('🛑 [AI 추천] 기존 폴링 중단')
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      pollAttemptsRef.current = 0

      // 상태 초기화 후 재확인
      setAiRecommendationStatus('none')

      // 짧은 딜레이 후 상태 확인 (상태 초기화가 완료된 후)
      setTimeout(() => {
        checkAiRecommendationStatus()
      }, 100)
    }
  }, [currentMode, user])

  // 페이지 포커스 시 상태 재확인 (탭 전환 후 복귀 시)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && aiRecommendationStatus === 'generating') {
        console.log('👀 [AI 추천] 페이지 포커스 - 상태 재확인')
        checkAiRecommendationStatus()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user, aiRecommendationStatus])

  const preloadAllModeRecommendations = () => {
    if (!user || !isMountedRef.current) return

    const modes = ['budget', 'healthy', 'quick']
    console.log('🚀 Starting AI recommendations for all modes (background)...')

    // 백그라운드 생성 시작 (완전히 비동기, fire-and-forget)
    modes.forEach((mode, index) => {
      // 각 모드별로 약간의 딜레이를 주어 메인 스레드 블로킹 방지
      setTimeout(() => {
        // 컴포넌트가 언마운트되었으면 요청 중단
        if (!isMountedRef.current) {
          console.log(`⚠️ Component unmounted, skipping ${mode} mode request`)
          return
        }

        fetch('/api/recommend', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            mode,
          }),
          signal: globalAbortController.current.signal, // 취소 가능하도록 signal 추가
          keepalive: true, // 페이지가 닫혀도 요청 계속
        })
        .then(() => {
          if (isMountedRef.current) {
            console.log(`✅ AI recommendation completed for ${mode} mode`)

            // 현재 모드의 추천이 완료되면 즉시 상태 확인
            if (mode === currentMode.id) {
              console.log(`🔄 Checking status for current mode: ${mode}`)
              checkAiRecommendationStatus()
            }
          }
        })
        .catch(error => {
          if (error.name === 'AbortError') {
            console.log(`⚠️ ${mode} mode request cancelled`)
          } else {
            console.error(`Failed to start ${mode} mode:`, error)
          }
        })
      }, index * 100) // 각 요청을 100ms씩 지연
    })
  }

  // 모드 변경 전 값을 저장하기 위한 ref
  const prevModeRef = useRef<string | null>(null)

  useEffect(() => {
    if (user) {
      // 모드가 변경된 경우에만 상태 초기화
      if (prevModeRef.current !== null && prevModeRef.current !== currentMode.id) {
        console.log(`🔄 Mode changed from ${prevModeRef.current} to ${currentMode.id}`)
        setShowAiRecommendations(false)
        setAiRecommendationStatus('none')

        // 인기 메뉴 즉시 표시
        fetchPopularMenus()

        // AI 추천 상태 확인도 즉시 실행
        checkAiRecommendationStatus()
      }

      // 현재 모드 저장
      prevModeRef.current = currentMode.id
    }

    // Cleanup
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [user, currentMode])

  const fetchPopularMenus = () => {
    if (!isMountedRef.current) return

    // 고정된 빠른 추천 TOP3 (즉시 표시)
    const popularMenuNames = ['김치찌개', '치킨 버거 세트', '제육볶음 정식']
    const selectedMenus = popularMenuNames
      .map(name => menuItems.find(menu => menu.name === name))
      .filter(menu => menu !== undefined)

    // 즉시 상태 업데이트
    setRecommendedMenus(selectedMenus)
    setIsLoadingPopular(false)
    console.log('✅ Popular menus loaded (fixed TOP3)')
  }

  const pollForCacheReady = useCallback(() => {
    if (!user || !isMountedRef.current) return

    // 이미 폴링 중이면 기존 폴링 중단 후 새로 시작
    if (pollIntervalRef.current) {
      console.log('⚠️ [AI 추천] 기존 폴링 중단 후 재시작')
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }

    console.log(`🔄 [AI 추천] 폴링 시작 - mode: ${currentMode.id}`)
    pollAttemptsRef.current = 0
    const maxAttempts = 120 // 2분 (1초 * 120)

    const checkStatus = () => {
      if (!isMountedRef.current) {
        console.log('🛑 [AI 추천] 컴포넌트 언마운트로 폴링 중지')
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
        return
      }

      pollAttemptsRef.current++
      const attempts = pollAttemptsRef.current
      console.log(`🔄 [AI 추천] 폴링 시도 ${attempts}/${maxAttempts}`)

      if (attempts > maxAttempts) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
        console.warn(`⚠️ [AI 추천] 타임아웃 (${maxAttempts}초 경과)`)
        setAiRecommendationStatus('none')
        return
      }

      fetch(`/api/recommend/status?userId=${user.id}&mode=${currentMode.id}`, {
        signal: globalAbortController.current.signal
      })
        .then(response => response.json())
        .then(result => {
          if (!isMountedRef.current) return

          console.log(`📊 [AI 추천] 폴링 응답 (${attempts}회):`, { hasCache: result.hasCache })

          if (result.hasCache) {
            console.log(`✅ [AI 추천] 캐시 준비 완료! ready 상태로 전환 (${attempts}초 소요)`)

            // 폴링 중단
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }

            // 상태 즉시 업데이트
            setAiRecommendationStatus(() => {
              console.log(`📍 [AI 추천] 상태를 'ready'로 변경`)
              return 'ready'
            })

            // 확인 로그
            setTimeout(() => {
              console.log(`🔍 [AI 추천] 상태 변경 후 1초 경과 - 버튼 활성화 확인`)
            }, 1000)
          }
        })
        .catch(error => {
          if (error.name === 'AbortError') {
            console.log('🛑 [AI 추천] 폴링 요청 취소됨')
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
            return
          }
          console.error('❌ [AI 추천] 폴링 에러:', error)
        })
    }

    // setInterval로 정기적으로 체크
    pollIntervalRef.current = setInterval(checkStatus, 1000)
  }, [user, currentMode])

  const checkAiRecommendationStatus = useCallback(() => {
    if (!user || !isMountedRef.current) return

    console.log(`🔍 [AI 추천] 상태 확인 시작 - mode: ${currentMode.id}`)

    fetch(`/api/recommend/status?userId=${user.id}&mode=${currentMode.id}`, {
      signal: globalAbortController.current.signal
    })
      .then(response => response.json())
      .then(result => {
        if (!isMountedRef.current) return

        console.log(`📊 [AI 추천] 상태 확인 결과:`, result)

        if (result.success) {
          if (result.hasCache) {
            // 캐시가 있으면 즉시 'ready' 상태로
            console.log(`✅ [AI 추천] 캐시 발견! 즉시 ready 상태로 전환`)

            setAiRecommendationStatus(() => {
              console.log(`📍 [AI 추천] 상태를 'ready'로 변경 (캐시 존재)`)
              return 'ready'
            })

            // 버튼 활성화 확인용 타이머
            setTimeout(() => {
              console.log(`🔍 [AI 추천] 캐시 발견 후 1초 경과 - 버튼 상태 확인`)
            }, 1000)
          } else {
            // 캐시가 없으면 'generating' 상태로
            console.log(`⏳ [AI 추천] 캐시 없음. generating 상태로 전환 및 폴링 시작`)
            setAiRecommendationStatus('generating')
            // 폴링으로 캐시 생성 완료 대기
            pollForCacheReady()
          }
        }
      })
      .catch(error => {
        if (error.name === 'AbortError') {
          console.log('Status check request cancelled')
          return
        }
        console.error('❌ [AI 추천] 상태 확인 실패:', error)
      })
  }, [user, currentMode, pollForCacheReady])

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
          const menuNames = new Set(result.data.map((item: any) => item.menu_name))
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

  const loadAiRecommendations = () => {
    if (!user || !isMountedRef.current) return

    // 이전 요청 취소
    if (recommendationController) {
      recommendationController.abort()
    }

    // 상태 업데이트만 즉시 처리 (UI 반응성 유지)
    setShowAiRecommendations(true)
    setIsLoadingRecommendations(true)

    // 실제 fetch는 완전히 분리하여 다음 이벤트 루프에서 실행
    setTimeout(() => {
      if (!isMountedRef.current) return

      const controller = new AbortController()
      setRecommendationController(controller)
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      // 완전히 비동기로 실행 (메인 스레드 블로킹 없음)
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
        keepalive: true,
      })
        .then(response => {
          clearTimeout(timeoutId)
          return response.json()
        })
        .then(result => {
          if (!isMountedRef.current) return

          setRecommendationController(null)

          if (result.success) {
            // startTransition으로 낮은 우선순위 업데이트 (페이지 전환 블로킹 방지)
            startTransition(() => {
              setRecommendedMenus(result.data || [])
              setIsFromCache(result.fromCache || false)
              setIsLoadingRecommendations(false)
            })

            toast({
              description: "🤖 AI 추천 메뉴를 불러왔습니다!",
            })
            console.log('✅ AI recommendations loaded')
          } else {
            console.error('Failed to fetch recommendations:', result.error)
            startTransition(() => {
              setIsLoadingRecommendations(false)
            })
            toast({
              title: "추천 로딩 실패",
              description: "기본 메뉴를 표시합니다.",
              variant: "destructive",
            })
          }
        })
        .catch(error => {
          clearTimeout(timeoutId)
          setRecommendationController(null)

          if (error.name === 'AbortError') {
            console.warn('AI recommendation request cancelled or timeout')
            if (isMountedRef.current) {
              startTransition(() => {
                setIsLoadingRecommendations(false)
              })
            }
          } else {
            console.error('Failed to fetch recommendations:', error)
            if (isMountedRef.current) {
              startTransition(() => {
                setIsLoadingRecommendations(false)
              })
              toast({
                title: "추천 로딩 실패",
                description: "기본 메뉴를 표시합니다.",
                variant: "destructive",
              })
            }
          }
        })
    }, 0)
  }

  const handleLike = async (menu: MenuItem, isCurrentlyLiked: boolean) => {
    if (!user) return

    if (isCurrentlyLiked) {
      // 좋아요 취소
      try {
        // meal_records에서 해당 메뉴명으로 된 식사 기록 찾기
        const mealsResponse = await fetch(`/api/meals?userId=${user.id}`)
        const mealsResult = await mealsResponse.json()

        if (mealsResult.success) {
          const mealRecord = mealsResult.data.find((m: any) => m.menu_name === menu.name)

          if (mealRecord) {
            const response = await fetch(`/api/liked-meals?userId=${user.id}&mealRecordId=${mealRecord.id}`, {
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
          }
        }
      } catch (error) {
        console.error('Remove like error:', error)
      }
    } else {
      // 좋아요 추가 - 먼저 meal_records에 저장
      try {
        const saveMealResponse = await fetch('/api/save-meal', {
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
            cost: menu.price,
            mealType: 'lunch',
            mealDate: getLocalDateString(),
          }),
        })

        const saveMealResult = await saveMealResponse.json()

        if (saveMealResponse.ok && saveMealResult.success) {
          // 좋아요 추가
          const likeResponse = await fetch('/api/liked-meals', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.id,
              mealRecordId: saveMealResult.data.id,
            }),
          })

          if (likeResponse.ok) {
            setLikedMenuNames(prev => new Set(prev).add(menu.name))
            toast({
              description: "좋아요 목록에 추가되었습니다.",
            })
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
              {showAiRecommendations ? "AI 추천 TOP 3" : "빠른 추천 TOP 3"}
            </h2>
            {aiRecommendationStatus === 'generating' && (
              <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200">
                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                AI 분석 중...
              </div>
            )}
          </div>

          {/* AI 추천 버튼 (항상 표시) */}
          {!showAiRecommendations && (
            <div className={`border-2 rounded-2xl p-4 ${
              aiRecommendationStatus === 'ready'
                ? 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30'
                : 'bg-gradient-to-r from-blue-50 to-blue-25 border-blue-200'
            }`}
            data-ai-status={aiRecommendationStatus}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🤖</span>
                    <h3 className="font-bold text-foreground">
                      {aiRecommendationStatus === 'ready'
                        ? 'AI 맞춤 추천 준비 완료!'
                        : 'AI 맞춤 추천 준비 중...'}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {aiRecommendationStatus === 'ready'
                      ? '당신의 선호도와 식습관을 분석한 AI 추천을 확인하세요'
                      : aiRecommendationStatus === 'generating'
                      ? '선호도, 좋아요 목록, 최근 식사를 분석하고 있습니다'
                      : 'AI가 당신만을 위한 메뉴를 준비하고 있습니다'}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    console.log(`🔘 [AI 추천] 버튼 클릭 - 상태: ${aiRecommendationStatus}`)
                    loadAiRecommendations()
                  }}
                  disabled={aiRecommendationStatus !== 'ready'}
                  className={`rounded-xl h-10 px-6 gap-2 ${
                    aiRecommendationStatus === 'ready'
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                  title={`버튼 상태: ${aiRecommendationStatus} - ${aiRecommendationStatus === 'ready' ? '클릭 가능' : '비활성화'}`}
                >
                  {(aiRecommendationStatus === 'generating' || aiRecommendationStatus === 'none') && (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  )}
                  <span className="font-semibold">
                    {aiRecommendationStatus === 'ready' ? '보기' : '준비 중'}
                  </span>
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
              <Button
                onClick={() => setSelectedMenu(null)}
                className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl h-12"
              >
                <Check className="h-4 w-4" />
                확인
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
    </AuthGuard>
  )
}
