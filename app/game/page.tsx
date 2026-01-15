"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BottomNav } from "@/components/bottom-nav"
import { menuItems, type MenuItem } from "@/lib/data"
import { Sparkles, CircleDot, CookingPot, PartyPopper, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { AuthGuard } from "@/components/auth-guard"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

type GameMode = "roulette" | "ball" | "pot" | "balloon" | "box"

type Balloon = {
  id: number
  menu: MenuItem
  x: number
  y: number
  vx: number
  vy: number
  popped: boolean
  color: string
  popX?: number
  popY?: number
}

type Ball = {
  id: number
  menu: MenuItem
  x: number
  y: number
  selected: boolean
  colorIndex: number
}

export default function GamePage() {
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useAuth()
  const [selectedGame, setSelectedGame] = useState<GameMode | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [result, setResult] = useState<MenuItem | null>(null)
  const [availableMenuItems, setAvailableMenuItems] = useState<MenuItem[]>(menuItems)
  const [isLoadingMenus, setIsLoadingMenus] = useState(true)

  // 룰렛 상태
  const [rotation, setRotation] = useState(0)
  const [rouletteResult, setRouletteResult] = useState<MenuItem | null>(null)

  // 볼 추첨 상태
  const [balls, setBalls] = useState<Ball[]>([])
  const [selectedBall, setSelectedBall] = useState<MenuItem | null>(null)
  const [selectedBallColorIndex, setSelectedBallColorIndex] = useState<number | null>(null)
  const [ballAnimationPhase, setBallAnimationPhase] = useState<"idle" | "mixing" | "selecting" | "done">("idle")

  // 마법 냄비 상태
  const [potPhase, setPotPhase] = useState<"idle" | "boiling" | "opening" | "done">("idle")

  const [balloons, setBalloons] = useState<Balloon[]>([])
  const [balloonPhase, setBalloonPhase] = useState<"idle" | "ready" | "popped">("idle")
  const [fallingMenu, setFallingMenu] = useState<{ name: string; x: number; y: number; landed: boolean } | null>(null)
  const animationRef = useRef<number | null>(null)

  const [boxes, setBoxes] = useState<{ id: number; menu: MenuItem; opened: boolean }[]>([])
  const [boxPhase, setBoxPhase] = useState<"idle" | "ready" | "opened">("idle")

  // 최근 7일간 먹은 음식 중 3일 이내에 먹지 않은 음식 필터링
  useEffect(() => {
    const fetchAvailableMenus = async () => {
      if (!user) {
        setIsLoadingMenus(false)
        return
      }

      try {
        setIsLoadingMenus(true)

        // 최근 7일간의 식사 기록 가져오기
        const response = await fetch(`/api/meals?userId=${user.id}`)
        const data = await response.json()

        if (!data.success) {
          console.error('Failed to fetch meals')
          setAvailableMenuItems(menuItems)
          setIsLoadingMenus(false)
          return
        }

        const meals = data.data || []

        // 날짜 계산
        const today = new Date()
        const sevenDaysAgo = new Date(today)
        sevenDaysAgo.setDate(today.getDate() - 7)
        const threeDaysAgo = new Date(today)
        threeDaysAgo.setDate(today.getDate() - 3)

        // 최근 7일간 먹은 음식 목록
        const recentMeals = meals.filter((meal: any) => {
          const mealDate = new Date(meal.meal_date)
          return mealDate >= sevenDaysAgo && mealDate <= today
        })

        // 3일 이내에 먹은 음식 목록
        const recentThreeDaysMeals = meals.filter((meal: any) => {
          const mealDate = new Date(meal.meal_date)
          return mealDate >= threeDaysAgo && mealDate <= today
        })

        // 최근 7일간 먹은 음식 이름 목록
        const recentMealNames = new Set(recentMeals.map((meal: any) => meal.menu_name))

        // 3일 이내에 먹은 음식 이름 목록
        const recentThreeDaysMealNames = new Set(recentThreeDaysMeals.map((meal: any) => meal.menu_name))

        // 최근 7일간 먹은 음식 중 3일 이내에 먹지 않은 음식만 필터링
        const filtered = menuItems.filter(item =>
          recentMealNames.has(item.name) && !recentThreeDaysMealNames.has(item.name)
        )

        // 필터링된 결과가 없으면 모든 메뉴 사용
        if (filtered.length === 0) {
          console.log('No available menus after filtering, using all menus')
          setAvailableMenuItems(menuItems)
        } else {
          console.log(`Available menus: ${filtered.length}/${menuItems.length}`)
          setAvailableMenuItems(filtered)
        }

        setIsLoadingMenus(false)
      } catch (error) {
        console.error('Error fetching available menus:', error)
        setAvailableMenuItems(menuItems)
        setIsLoadingMenus(false)
      }
    }

    fetchAvailableMenus()
  }, [user])

  const getRandomMenu = () => availableMenuItems[Math.floor(Math.random() * availableMenuItems.length)]

  // 룰렛 스핀
  const spinRoulette = () => {
    if (isPlaying) return
    setIsPlaying(true)
    setResult(null)
    setRouletteResult(null)

    const spins = 5 + Math.random() * 3
    const extraDegrees = Math.random() * 360
    const totalRotation = rotation + spins * 360 + extraDegrees
    setRotation(totalRotation)

    setTimeout(() => {
      const normalizedRotation = totalRotation % 360
      const segmentAngle = 360 / availableMenuItems.length
      const pointerAngle = 270 // 12시 방향은 270도 (SVG에서 -90도 = 270도)

      // 각 세그먼트가 회전 후 어디에 위치하는지 확인하고
      // 포인터(270도)가 가리키는 세그먼트를 찾음
      let selectedIndex = 0
      for (let i = 0; i < availableMenuItems.length; i++) {
        // 세그먼트의 시작 각도와 끝 각도 (회전 후)
        const segmentStart = ((i * segmentAngle - 90 + normalizedRotation) % 360 + 360) % 360
        const segmentEnd = (((i + 1) * segmentAngle - 90 + normalizedRotation) % 360 + 360) % 360

        // 포인터가 이 세그먼트 범위 안에 있는지 확인
        if (segmentStart <= segmentEnd) {
          // 일반적인 케이스 (예: 10도 ~ 50도)
          if (pointerAngle >= segmentStart && pointerAngle < segmentEnd) {
            selectedIndex = i
            break
          }
        } else {
          // wrap-around 케이스 (예: 350도 ~ 10도)
          if (pointerAngle >= segmentStart || pointerAngle < segmentEnd) {
            selectedIndex = i
            break
          }
        }
      }

      const menu = availableMenuItems[selectedIndex]
      setResult(menu)
      setRouletteResult(menu)
      setIsPlaying(false)
    }, 3000)
  }

  // 볼 추첨
  const startBallDraw = () => {
    if (isPlaying) return
    setIsPlaying(true)
    setResult(null)
    setSelectedBall(null)
    setSelectedBallColorIndex(null)
    setBallAnimationPhase("mixing")

    const initialBalls: Ball[] = availableMenuItems.slice(0, 8).map((menu, i) => ({
      id: i,
      menu,
      x: 50,
      y: 50,
      selected: false,
      colorIndex: i,
    }))
    setBalls(initialBalls)

    const mixInterval = setInterval(() => {
      setBalls((prev) =>
        prev.map((ball) => ({
          ...ball,
          x: 20 + Math.random() * 60,
          y: 20 + Math.random() * 60,
        })),
      )
    }, 150)

    setTimeout(() => {
      clearInterval(mixInterval)
      setBallAnimationPhase("selecting")

      const winnerIndex = Math.floor(Math.random() * initialBalls.length)
      setBalls((prev) =>
        prev.map((ball, i) => ({
          ...ball,
          x: i === winnerIndex ? 50 : ball.x,
          y: i === winnerIndex ? -20 : ball.y + 30,
          selected: i === winnerIndex,
        })),
      )

      setTimeout(() => {
        setSelectedBall(initialBalls[winnerIndex].menu)
        setSelectedBallColorIndex(initialBalls[winnerIndex].colorIndex)
        setResult(initialBalls[winnerIndex].menu)
        setBallAnimationPhase("done")
        setIsPlaying(false)
      }, 1000)
    }, 2500)
  }

  // 마법 냄비
  const startMagicPot = () => {
    if (isPlaying) return
    setIsPlaying(true)
    setResult(null)
    setPotPhase("boiling")

    setTimeout(() => {
      setPotPhase("opening")
      setTimeout(() => {
        const menu = getRandomMenu()
        setResult(menu)
        setPotPhase("done")
        setIsPlaying(false)
      }, 1000)
    }, 2500)
  }

  useEffect(() => {
    if (balloonPhase !== "ready") {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      return
    }

    const animate = () => {
      setBalloons((prev) =>
        prev.map((balloon) => {
          if (balloon.popped) return balloon

          let newX = balloon.x + balloon.vx
          let newY = balloon.y + balloon.vy
          let newVx = balloon.vx
          let newVy = balloon.vy

          // 벽에 부딪히면 방향 전환
          if (newX < 10 || newX > 90) {
            newVx = -newVx * (0.8 + Math.random() * 0.4)
            newX = newX < 10 ? 10 : 90
          }
          if (newY < 5 || newY > 70) {
            newVy = -newVy * (0.8 + Math.random() * 0.4)
            newY = newY < 5 ? 5 : 70
          }

          // 랜덤하게 방향 변경
          if (Math.random() < 0.02) {
            newVx += (Math.random() - 0.5) * 0.3
            newVy += (Math.random() - 0.5) * 0.3
          }

          // 속도 제한
          newVx = Math.max(-1.5, Math.min(1.5, newVx))
          newVy = Math.max(-1.5, Math.min(1.5, newVy))

          return { ...balloon, x: newX, y: newY, vx: newVx, vy: newVy }
        }),
      )
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [balloonPhase])

  const startBalloonGame = () => {
    if (isPlaying) return
    setResult(null)
    setFallingMenu(null)
    setBalloonPhase("ready")

    const balloonColors = [
      "from-red-400 to-red-500",
      "from-blue-400 to-blue-500",
      "from-green-400 to-green-500",
      "from-yellow-400 to-yellow-500",
      "from-purple-400 to-purple-500",
      "from-pink-400 to-pink-500",
    ]

    const shuffledMenus = [...availableMenuItems].sort(() => Math.random() - 0.5).slice(0, 6)

    setBalloons(
      shuffledMenus.map((menu, i) => ({
        id: i,
        menu,
        x: 15 + Math.random() * 70,
        y: 10 + Math.random() * 50,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        popped: false,
        color: balloonColors[i],
      })),
    )
  }

  const popBalloon = (id: number, event: React.MouseEvent) => {
    if (balloonPhase !== "ready") return

    const balloon = balloons.find((b) => b.id === id)
    if (!balloon || balloon.popped) return

    // 풍선이 터진 위치 저장
    const popX = balloon.x
    const popY = balloon.y

    setBalloons((prev) => prev.map((b) => (b.id === id ? { ...b, popped: true, popX, popY } : b)))

    // 메뉴가 떨어지는 애니메이션 시작
    setFallingMenu({ name: balloon.menu.name, x: popX, y: popY, landed: false })

    // 떨어지는 애니메이션 후 결과 표시
    setTimeout(() => {
      setFallingMenu((prev) => (prev ? { ...prev, landed: true } : null))
      setResult(balloon.menu)
      setBalloonPhase("popped")
    }, 1000)
  }

  const startBoxGame = () => {
    if (isPlaying) return
    setResult(null)
    setBoxPhase("ready")

    const shuffledMenus = [...availableMenuItems].sort(() => Math.random() - 0.5).slice(0, 6)
    setBoxes(
      shuffledMenus.map((menu, i) => ({
        id: i,
        menu,
        opened: false,
      })),
    )
  }

  const openBox = (id: number) => {
    if (boxPhase !== "ready") return

    setBoxes((prev) => prev.map((b) => (b.id === id ? { ...b, opened: true } : b)))

    const selected = boxes.find((b) => b.id === id)
    if (selected) {
      setResult(selected.menu)
      setBoxPhase("opened")
    }
  }

  const resetGame = () => {
    setResult(null)
    setRouletteResult(null)
    setBallAnimationPhase("idle")
    setPotPhase("idle")
    setBalls([])
    setSelectedBall(null)
    setSelectedBallColorIndex(null)
    setBalloonPhase("idle")
    setBalloons([])
    setFallingMenu(null)
    setBoxPhase("idle")
    setBoxes([])
  }

  const rouletteColors = [
    "#FFD4B3", // 파스텔 오렌지
    "#FFECD2", // 파스텔 피치
    "#FFE4C4", // 파스텔 비스크
    "#FFF0DB", // 파스텔 크림
    "#FFCBA4", // 파스텔 살몬
    "#FFE5B4", // 파스텔 옐로우
    "#FFD9C0", // 파스텔 코랄
    "#FFF5E6", // 파스텔 아이보리
  ]

  const ballColors = [
    "from-red-400 to-red-600",
    "from-blue-400 to-blue-600",
    "from-green-400 to-green-600",
    "from-yellow-400 to-yellow-600",
    "from-purple-400 to-purple-600",
    "from-pink-400 to-pink-600",
    "from-orange-400 to-orange-600",
    "from-teal-400 to-teal-600",
  ]

  const boxColors = [
    "from-amber-600 to-amber-800",
    "from-emerald-600 to-emerald-800",
    "from-sky-600 to-sky-800",
    "from-rose-600 to-rose-800",
    "from-violet-600 to-violet-800",
    "from-orange-600 to-orange-800",
  ]

  const getBalloonTipColor = (color: string) => {
    if (color.includes("red")) return "border-t-red-500"
    if (color.includes("blue")) return "border-t-blue-500"
    if (color.includes("green")) return "border-t-green-500"
    if (color.includes("yellow")) return "border-t-yellow-500"
    if (color.includes("purple")) return "border-t-purple-500"
    return "border-t-pink-500"
  }

  const getTextSize = (text: string, maxWidth = 50) => {
    // 글자 수에 따른 동적 크기 계산
    const charCount = text.length
    if (charCount <= 2) return 12
    if (charCount <= 3) return 10
    if (charCount <= 4) return 9
    if (charCount <= 5) return 8
    if (charCount <= 6) return 7
    if (charCount <= 7) return 6
    return 5
  }

  return (
    <AuthGuard>
    <div className="min-h-screen bg-gradient-sky pb-24">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-md px-4 py-4">
          <h1 className="text-xl font-bold text-foreground">메뉴 게임</h1>
          <p className="text-sm text-muted-foreground">재미있게 메뉴를 골라보세요!</p>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-6 space-y-6">
        {isLoadingMenus && (
          <Card className="rounded-2xl bg-white">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">추천 가능한 메뉴를 불러오는 중...</p>
            </CardContent>
          </Card>
        )}

        {!isLoadingMenus && availableMenuItems.length === 0 && (
          <Card className="rounded-2xl bg-white">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                추천 가능한 메뉴가 없습니다. 최근 7일간 먹은 음식 중 3일 이내에 먹지 않은 음식이 없습니다.
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoadingMenus && availableMenuItems.length > 0 && (
          <>
        <div className="grid grid-cols-5 gap-2">
          <Button
            variant={selectedGame === "roulette" ? "default" : "outline"}
            className={cn(
              "h-20 flex-col gap-1 px-1 rounded-2xl",
              selectedGame === "roulette" && "bg-primary text-primary-foreground",
            )}
            onClick={() => {
              setSelectedGame("roulette")
              resetGame()
            }}
          >
            <Sparkles className="h-5 w-5" />
            <span className="text-[10px]">룰렛</span>
          </Button>
          <Button
            variant={selectedGame === "ball" ? "default" : "outline"}
            className={cn(
              "h-20 flex-col gap-1 px-1 rounded-2xl",
              selectedGame === "ball" && "bg-primary text-primary-foreground",
            )}
            onClick={() => {
              setSelectedGame("ball")
              resetGame()
            }}
          >
            <CircleDot className="h-5 w-5" />
            <span className="text-[10px]">볼 추첨</span>
          </Button>
          <Button
            variant={selectedGame === "pot" ? "default" : "outline"}
            className={cn(
              "h-20 flex-col gap-1 px-1 rounded-2xl",
              selectedGame === "pot" && "bg-primary text-primary-foreground",
            )}
            onClick={() => {
              setSelectedGame("pot")
              resetGame()
            }}
          >
            <CookingPot className="h-5 w-5" />
            <span className="text-[10px]">마법 냄비</span>
          </Button>
          <Button
            variant={selectedGame === "balloon" ? "default" : "outline"}
            className={cn(
              "h-20 flex-col gap-1 px-1 rounded-2xl",
              selectedGame === "balloon" && "bg-primary text-primary-foreground",
            )}
            onClick={() => {
              setSelectedGame("balloon")
              resetGame()
            }}
          >
            <PartyPopper className="h-5 w-5" />
            <span className="text-[10px]">풍선</span>
          </Button>
          <Button
            variant={selectedGame === "box" ? "default" : "outline"}
            className={cn(
              "h-20 flex-col gap-1 px-1 rounded-2xl",
              selectedGame === "box" && "bg-primary text-primary-foreground",
            )}
            onClick={() => {
              setSelectedGame("box")
              resetGame()
            }}
          >
            <Package className="h-5 w-5" />
            <span className="text-[10px]">도시락</span>
          </Button>
        </div>

        {selectedGame === "roulette" && (
          <Card className="rounded-2xl bg-white">
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-6">
                {/* 룰렛 휠 */}
                <div className="relative">
                  <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2">
                    <div className="h-0 w-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary drop-shadow-lg" />
                  </div>
                  <svg
                    width="256"
                    height="256"
                    viewBox="0 0 256 256"
                    className="drop-shadow-xl"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      transition: isPlaying ? "transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
                    }}
                  >
                    {availableMenuItems.map((item, index) => {
                      const segmentAngle = 360 / availableMenuItems.length
                      const startAngle = index * segmentAngle - 90
                      const endAngle = (index + 1) * segmentAngle - 90
                      const startRad = (startAngle * Math.PI) / 180
                      const endRad = (endAngle * Math.PI) / 180
                      const radius = 124
                      const centerX = 128
                      const centerY = 128

                      const x1 = centerX + radius * Math.cos(startRad)
                      const y1 = centerY + radius * Math.sin(startRad)
                      const x2 = centerX + radius * Math.cos(endRad)
                      const y2 = centerY + radius * Math.sin(endRad)

                      const largeArcFlag = segmentAngle > 180 ? 1 : 0

                      const pathD = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`

                      const midAngle = ((startAngle + endAngle) / 2) * (Math.PI / 180)
                      const textRadius = radius * 0.65
                      const textX = centerX + textRadius * Math.cos(midAngle)
                      const textY = centerY + textRadius * Math.sin(midAngle)

                      const bgColor = rouletteColors[index % rouletteColors.length]

                      const displayName = item.name
                      const fontSize = getTextSize(displayName)

                      return (
                        <g key={item.id}>
                          <path d={pathD} fill={bgColor} stroke="#FF6B00" strokeWidth="2" />
                          <text
                            x={textX}
                            y={textY}
                            fill="#5C4033"
                            fontSize={fontSize}
                            fontWeight="bold"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            transform={`rotate(${(startAngle + endAngle) / 2 + 90}, ${textX}, ${textY})`}
                          >
                            {displayName}
                          </text>
                        </g>
                      )
                    })}
                    <circle cx="128" cy="128" r="32" fill="#FFF5EB" stroke="#FF6B00" strokeWidth="4" />
                    <text x="128" y="132" fontSize="24" textAnchor="middle">
                      🍽️
                    </text>
                  </svg>
                </div>

                {rouletteResult && !isPlaying && (
                  <div className="animate-in fade-in zoom-in duration-500 text-center">
                    <p className="text-sm text-muted-foreground mb-1">선택된 메뉴</p>
                    <p className="text-xl font-bold text-primary">{rouletteResult.name}</p>
                  </div>
                )}

                <Button
                  onClick={spinRoulette}
                  disabled={isPlaying}
                  size="lg"
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-8 rounded-2xl"
                >
                  <Sparkles className={cn("h-5 w-5", isPlaying && "animate-spin")} />
                  {isPlaying ? "돌아가는 중..." : "룰렛 돌리기!"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedGame === "ball" && (
          <Card className="rounded-2xl bg-white">
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-6">
                <div className="relative h-64 w-64">
                  {/* 가챠 머신 상단 캡 */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-12 bg-gradient-to-b from-red-400 to-red-500 rounded-t-3xl border-4 border-red-600 shadow-lg" />

                  {/* 가챠 머신 메인 투명 컨테이너 */}
                  <div className="absolute top-10 left-1/2 -translate-x-1/2 w-48 h-36 bg-gradient-to-b from-blue-50/90 to-blue-100/90 backdrop-blur-sm border-4 border-gray-300 rounded-lg shadow-xl overflow-hidden">
                    {/* 볼들 */}
                    {balls.map((ball) => (
                      <div
                        key={ball.id}
                        className={cn(
                          "absolute w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 border-2 border-white/50 bg-gradient-to-br",
                          ballColors[ball.colorIndex % ballColors.length],
                          ball.selected && "scale-125 z-20",
                        )}
                        style={{
                          left: `${ball.x}%`,
                          top: `${ball.y}%`,
                          transform: "translate(-50%, -50%)",
                          transition: ballAnimationPhase === "mixing" ? "all 0.15s ease-in-out" : "all 0.5s ease-out",
                        }}
                      >
                        <span className="text-[7px] font-bold text-white text-center leading-tight px-0.5">
                          {ball.menu.name.length > 3 ? ball.menu.name.slice(0, 3) : ball.menu.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* 가챠 머신 하단 베이스 */}
                  <div className="absolute top-44 left-1/2 -translate-x-1/2 w-48 h-20 bg-gradient-to-b from-red-500 to-red-600 rounded-b-3xl border-4 border-red-600 shadow-lg">
                    {/* 배출구 */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-gradient-to-b from-gray-700 to-gray-900 rounded-full" />
                    {/* 동전 투입구 */}
                    <div className="absolute top-8 left-4 w-8 h-2 bg-gray-800 rounded-sm shadow-inner" />
                    {/* 레버 */}
                    <div className="absolute top-7 right-6 w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full border-2 border-gray-500 shadow-md">
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-3 bg-gray-400" />
                    </div>
                  </div>
                </div>

                {selectedBall && ballAnimationPhase === "done" && (
                  <div className="animate-in fade-in zoom-in duration-500">
                    <div
                      className={cn(
                        "w-20 h-20 rounded-full shadow-xl flex items-center justify-center border-4 border-white/50 bg-gradient-to-br",
                        selectedBallColorIndex !== null
                          ? ballColors[selectedBallColorIndex % ballColors.length]
                          : "from-yellow-400 to-yellow-600",
                      )}
                    >
                      <span className="text-xs font-bold text-white text-center px-1">{selectedBall.name}</span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={startBallDraw}
                  disabled={isPlaying}
                  size="lg"
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-8 rounded-2xl"
                >
                  <CircleDot className={cn("h-5 w-5", isPlaying && "animate-bounce")} />
                  {isPlaying ? "추첨 중..." : "볼 추첨하기!"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedGame === "pot" && (
          <Card className="rounded-2xl bg-white">
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-6">
                <div className="relative h-64 w-64">
                  {/* 마법 냄비 본체 */}
                  <svg viewBox="0 0 200 180" className="w-full h-full">
                    {/* 왼쪽 손잡이 */}
                    <ellipse cx="25" cy="100" rx="12" ry="18" fill="#4a4a4a" />
                    <ellipse cx="25" cy="100" rx="6" ry="12" fill="#3a3a3a" />

                    {/* 오른쪽 손잡이 */}
                    <ellipse cx="175" cy="100" rx="12" ry="18" fill="#4a4a4a" />
                    <ellipse cx="175" cy="100" rx="6" ry="12" fill="#3a3a3a" />

                    {/* 냄비 몸체 */}
                    <ellipse cx="100" cy="140" rx="70" ry="25" fill="#3a3a3a" />
                    <path
                      d="M 30 100 Q 30 160 100 160 Q 170 160 170 100 L 170 85 Q 170 70 100 70 Q 30 70 30 85 Z"
                      fill="#4a4a4a"
                    />
                    <path
                      d="M 35 95 Q 35 150 100 150 Q 165 150 165 95 L 165 85 Q 165 75 100 75 Q 35 75 35 85 Z"
                      fill="#5a5a5a"
                    />

                    {/* 냄비 테두리 */}
                    <ellipse cx="100" cy="72" rx="72" ry="15" fill="#3a3a3a" />
                    <ellipse cx="100" cy="72" rx="65" ry="12" fill="#4a4a4a" />

                    {/* 보라색 액체 */}
                    <ellipse cx="100" cy="75" rx="58" ry="10" fill="#9333ea" />
                    <ellipse cx="100" cy="73" rx="50" ry="7" fill="#a855f7" opacity="0.5" />

                    {/* 끓는 거품 */}
                    {(potPhase === "boiling" || potPhase === "opening") && (
                      <>
                        <circle cx="70" cy="72" r="6" fill="#c084fc" className="animate-pulse" />
                        <circle
                          cx="90"
                          cy="70"
                          r="4"
                          fill="#d8b4fe"
                          className="animate-pulse"
                          style={{ animationDelay: "0.2s" }}
                        />
                        <circle
                          cx="110"
                          cy="71"
                          r="5"
                          fill="#c084fc"
                          className="animate-pulse"
                          style={{ animationDelay: "0.4s" }}
                        />
                        <circle
                          cx="130"
                          cy="73"
                          r="4"
                          fill="#d8b4fe"
                          className="animate-pulse"
                          style={{ animationDelay: "0.1s" }}
                        />
                      </>
                    )}

                    {/* 다리 3개 */}
                    <rect x="55" y="155" width="8" height="20" rx="2" fill="#3a3a3a" transform="rotate(-10 59 165)" />
                    <rect x="96" y="158" width="8" height="20" rx="2" fill="#3a3a3a" />
                    <rect x="137" y="155" width="8" height="20" rx="2" fill="#3a3a3a" transform="rotate(10 141 165)" />
                  </svg>

                  {/* 증기 파티클 */}
                  {(potPhase === "boiling" || potPhase === "opening") && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-20">
                      {/* 증기 기둥 1 */}
                      <div className="absolute left-4 bottom-0 w-4 animate-bounce" style={{ animationDuration: "1s" }}>
                        <svg viewBox="0 0 20 60" className="w-full h-16">
                          <path
                            d="M10 60 Q5 45 10 30 Q15 15 10 0"
                            stroke="#c084fc"
                            strokeWidth="4"
                            fill="none"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      {/* 증기 기둥 2 */}
                      <div
                        className="absolute right-4 bottom-0 w-4 animate-bounce"
                        style={{ animationDuration: "1.2s", animationDelay: "0.3s" }}
                      >
                        <svg viewBox="0 0 20 60" className="w-full h-16">
                          <path
                            d="M10 60 Q15 45 10 30 Q5 15 10 0"
                            stroke="#c084fc"
                            strokeWidth="4"
                            fill="none"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      {/* 거품들 */}
                      <div
                        className="absolute left-8 top-4 w-4 h-4 rounded-full bg-purple-400 animate-ping"
                        style={{ animationDuration: "1.5s" }}
                      />
                      <div
                        className="absolute right-8 top-2 w-3 h-3 rounded-full bg-purple-300 animate-ping"
                        style={{ animationDuration: "1.8s", animationDelay: "0.5s" }}
                      />
                      <div
                        className="absolute left-12 top-0 w-2 h-2 rounded-full bg-purple-200 animate-ping"
                        style={{ animationDuration: "2s", animationDelay: "0.2s" }}
                      />
                    </div>
                  )}

                  {/* 결과 표시 */}
                  {potPhase === "done" && result && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 animate-in fade-in zoom-in duration-500 w-full flex justify-center">
                      <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white px-6 py-3 rounded-full shadow-lg text-center">
                        <p className="text-lg font-bold">{result.name}</p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  {potPhase === "idle" && "마법의 냄비를 끓여보세요!"}
                  {potPhase === "boiling" && "보글보글... 마법이 일어나고 있어요"}
                  {potPhase === "opening" && "무엇이 나올까요?"}
                  {potPhase === "done" && result && `${result.name}(이)가 나왔어요!`}
                </p>

                <Button
                  onClick={startMagicPot}
                  disabled={isPlaying}
                  size="lg"
                  className="gap-2 bg-purple-600 text-white hover:bg-purple-700 px-8 rounded-2xl"
                >
                  <CookingPot className={cn("h-5 w-5", isPlaying && "animate-bounce")} />
                  {isPlaying ? "끓이는 중..." : "냄비 끓이기!"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedGame === "balloon" && (
          <Card className="rounded-2xl bg-white">
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-6">
                <div className="relative h-64 w-64 rounded-xl bg-gradient-to-b from-sky-200 to-sky-100 overflow-hidden">
                  {/* 풍선들 */}
                  {balloons.map((balloon) => (
                    <div
                      key={balloon.id}
                      className={cn(
                        "absolute cursor-pointer transition-all",
                        balloon.popped ? "scale-0 opacity-0" : "hover:scale-110",
                      )}
                      style={{
                        left: `${balloon.x}%`,
                        top: `${balloon.y}%`,
                        transform: "translate(-50%, -50%)",
                        transition: balloon.popped ? "all 0.3s ease-out" : "none",
                      }}
                      onClick={(e) => popBalloon(balloon.id, e)}
                    >
                      {/* 풍선 몸체 */}
                      <div
                        className={cn("w-8 h-10 rounded-full bg-gradient-to-br shadow-lg", balloon.color)}
                        style={{ borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%" }}
                      />
                      {/* 풍선 꼭지 */}
                      <div
                        className={cn(
                          "w-0 h-0 mx-auto border-l-[4px] border-r-[4px] border-t-[8px] border-l-transparent border-r-transparent",
                          getBalloonTipColor(balloon.color),
                        )}
                      />
                      {/* 풍선 줄 */}
                      <div className="w-px h-4 bg-gray-400 mx-auto" />
                    </div>
                  ))}

                  {/* 터지는 파티클 효과 */}
                  {balloons
                    .filter((b) => b.popped && b.popX !== undefined)
                    .map((balloon) => (
                      <div
                        key={`pop-${balloon.id}`}
                        className="absolute pointer-events-none"
                        style={{
                          left: `${balloon.popX}%`,
                          top: `${balloon.popY}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        {[...Array(8)].map((_, i) => (
                          <div
                            key={i}
                            className={cn("absolute w-2 h-2 rounded-full bg-gradient-to-br", balloon.color)}
                            style={{
                              animation: `particle-${i} 0.5s ease-out forwards`,
                            }}
                          />
                        ))}
                      </div>
                    ))}

                  {/* 떨어지는 메뉴 태그 */}
                  {fallingMenu && (
                    <div
                      className={cn(
                        "absolute bg-white px-3 py-1 rounded-full shadow-lg text-sm font-bold text-primary transition-all duration-1000",
                        fallingMenu.landed ? "bottom-4" : "",
                      )}
                      style={{
                        left: `${fallingMenu.x}%`,
                        top: fallingMenu.landed ? "auto" : `${fallingMenu.y}%`,
                        transform: "translateX(-50%)",
                      }}
                    >
                      {fallingMenu.name}
                    </div>
                  )}

                  {/* 안내 텍스트 */}
                  {balloonPhase === "idle" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-muted-foreground text-sm">시작 버튼을 눌러주세요!</p>
                    </div>
                  )}
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  {balloonPhase === "idle" && "풍선을 터뜨려 메뉴를 확인하세요!"}
                  {balloonPhase === "ready" && "풍선 하나를 클릭해주세요!"}
                  {balloonPhase === "popped" && result && `${result.name}(이)가 나왔어요!`}
                </p>

                <Button
                  onClick={startBalloonGame}
                  disabled={balloonPhase === "ready"}
                  size="lg"
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-8 rounded-2xl"
                >
                  <PartyPopper className="h-5 w-5" />
                  {balloonPhase === "ready"
                    ? "풍선을 터뜨려주세요!"
                    : balloonPhase === "popped"
                      ? "다시 하기"
                      : "풍선 게임 시작!"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedGame === "box" && (
          <Card className="rounded-2xl bg-white">
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-6">
                <div className="relative h-64 w-64">
                  <div className="grid grid-cols-3 gap-2 p-2">
                    {boxes.map((box, i) => (
                      <div
                        key={box.id}
                        className={cn(
                          "relative cursor-pointer transition-all duration-300",
                          box.opened ? "scale-95" : "hover:scale-105",
                        )}
                        onClick={() => openBox(box.id)}
                      >
                        {/* 도시락 박스 */}
                        <div
                          className={cn(
                            "w-16 h-14 rounded-lg shadow-lg overflow-hidden bg-gradient-to-br",
                            boxColors[i % boxColors.length],
                          )}
                        >
                          {/* 뚜껑 */}
                          <div
                            className={cn(
                              "absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white/30 to-transparent rounded-t-lg transition-transform duration-500 origin-bottom",
                              box.opened && "-translate-y-full opacity-0",
                            )}
                          />
                          {/* 리본 */}
                          <div className="absolute top-1/2 left-0 right-0 h-2 bg-white/40 -translate-y-1/2" />
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/50" />
                        </div>

                        {/* 메뉴 표시 */}
                        {box.opened && (
                          <div className="absolute inset-0 flex items-center justify-center animate-in fade-in zoom-in duration-300">
                            <div className="bg-white px-2 py-1 rounded shadow-lg">
                              <p className="text-[10px] font-bold text-foreground text-center">{box.menu.name}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {boxPhase === "idle" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-muted-foreground text-sm">시작 버튼을 눌러주세요!</p>
                    </div>
                  )}
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  {boxPhase === "idle" && "도시락 상자를 열어 메뉴를 확인하세요!"}
                  {boxPhase === "ready" && "도시락 상자 하나를 선택해주세요!"}
                  {boxPhase === "opened" && result && `${result.name}(이)가 나왔어요!`}
                </p>

                <Button
                  onClick={startBoxGame}
                  disabled={boxPhase === "ready"}
                  size="lg"
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-8 rounded-2xl"
                >
                  <Package className="h-5 w-5" />
                  {boxPhase === "ready"
                    ? "도시락을 선택해주세요!"
                    : boxPhase === "opened"
                      ? "다시 하기"
                      : "도시락 게임 시작!"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!selectedGame && (
          <Card className="rounded-2xl bg-white">
            <CardContent className="py-12 text-center">
              <div className="rounded-full bg-primary/10 w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">게임을 선택해주세요</h3>
              <p className="text-sm text-muted-foreground">위에서 원하는 게임을 선택하면 랜덤으로 메뉴를 골라드려요!</p>
            </CardContent>
          </Card>
        )}
          </>
        )}
      </main>

      <BottomNav />

      <style jsx>{`
        @keyframes particle-0 {
          to {
            transform: translate(-20px, -30px);
            opacity: 0;
          }
        }
        @keyframes particle-1 {
          to {
            transform: translate(20px, -30px);
            opacity: 0;
          }
        }
        @keyframes particle-2 {
          to {
            transform: translate(-30px, 0px);
            opacity: 0;
          }
        }
        @keyframes particle-3 {
          to {
            transform: translate(30px, 0px);
            opacity: 0;
          }
        }
        @keyframes particle-4 {
          to {
            transform: translate(-20px, 20px);
            opacity: 0;
          }
        }
        @keyframes particle-5 {
          to {
            transform: translate(20px, 20px);
            opacity: 0;
          }
        }
        @keyframes particle-6 {
          to {
            transform: translate(0px, -35px);
            opacity: 0;
          }
        }
        @keyframes particle-7 {
          to {
            transform: translate(0px, 25px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
    </AuthGuard>
  )
}
