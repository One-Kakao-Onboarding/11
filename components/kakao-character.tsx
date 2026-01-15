"use client"

import { cn } from "@/lib/utils"

interface KakaoCharacterProps {
  type?: "ryan" | "apeach" | "muzi" | "frodo" | "neo" | "tube"
  size?: "sm" | "md" | "lg"
  className?: string
  message?: string
}

export function KakaoCharacter({ type = "ryan", size = "md", className, message }: KakaoCharacterProps) {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-20 h-20",
    lg: "w-32 h-32",
  }

  // 귀여운 캐릭터 SVG 컴포넌트
  const CharacterSVG = () => {
    switch (type) {
      case "ryan":
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* 라이언 스타일 캐릭터 - 갈색 곰 */}
            <circle cx="50" cy="50" r="45" fill="#D4A574" />
            <circle cx="50" cy="55" r="35" fill="#F5DEB3" />
            {/* 귀 */}
            <circle cx="25" cy="25" r="12" fill="#D4A574" />
            <circle cx="75" cy="25" r="12" fill="#D4A574" />
            <circle cx="25" cy="25" r="7" fill="#C4956A" />
            <circle cx="75" cy="25" r="7" fill="#C4956A" />
            {/* 눈 */}
            <ellipse cx="38" cy="48" rx="4" ry="5" fill="#333" />
            <ellipse cx="62" cy="48" rx="4" ry="5" fill="#333" />
            <circle cx="39" cy="47" r="1.5" fill="#fff" />
            <circle cx="63" cy="47" r="1.5" fill="#fff" />
            {/* 코 */}
            <ellipse cx="50" cy="58" rx="6" ry="4" fill="#333" />
            {/* 눈썹 */}
            <path d="M32 40 Q38 36 44 40" stroke="#8B7355" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M56 40 Q62 36 68 40" stroke="#8B7355" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            {/* 볼 */}
            <circle cx="28" cy="58" r="6" fill="#FFB6C1" opacity="0.5" />
            <circle cx="72" cy="58" r="6" fill="#FFB6C1" opacity="0.5" />
          </svg>
        )
      case "apeach":
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* 어피치 스타일 캐릭터 - 복숭아 */}
            <ellipse cx="50" cy="55" rx="40" ry="38" fill="#FFBCD9" />
            <circle cx="50" cy="20" r="8" fill="#7CB342" />
            <path d="M45 20 Q50 5 55 20" stroke="#7CB342" strokeWidth="3" fill="none" />
            {/* 눈 */}
            <ellipse cx="38" cy="50" rx="4" ry="6" fill="#333" />
            <ellipse cx="62" cy="50" rx="4" ry="6" fill="#333" />
            <circle cx="39" cy="48" r="2" fill="#fff" />
            <circle cx="63" cy="48" r="2" fill="#fff" />
            {/* 코 */}
            <circle cx="50" cy="60" r="3" fill="#FF8FA3" />
            {/* 입 */}
            <path d="M44 68 Q50 74 56 68" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* 볼 */}
            <circle cx="28" cy="58" r="7" fill="#FF8FA3" opacity="0.4" />
            <circle cx="72" cy="58" r="7" fill="#FF8FA3" opacity="0.4" />
          </svg>
        )
      case "muzi":
        return (
          <svg viewBox="0 0 120 120" className="w-full h-full">
            {/* 무지 스타일 캐릭터 - 노란 토끼 (viewBox 확대로 귀 포함) */}
            <ellipse cx="60" cy="75" rx="30" ry="25" fill="#FFE135" />
            {/* 귀 */}
            <ellipse cx="45" cy="35" rx="8" ry="22" fill="#FFE135" />
            <ellipse cx="75" cy="35" rx="8" ry="22" fill="#FFE135" />
            <ellipse cx="45" cy="35" rx="5" ry="15" fill="#FFEB8A" />
            <ellipse cx="75" cy="35" rx="5" ry="15" fill="#FFEB8A" />
            {/* 눈 */}
            <circle cx="52" cy="70" r="3.5" fill="#333" />
            <circle cx="68" cy="70" r="3.5" fill="#333" />
            <circle cx="52.5" cy="69" r="1.2" fill="#fff" />
            <circle cx="68.5" cy="69" r="1.2" fill="#fff" />
            {/* 코 */}
            <ellipse cx="60" cy="78" rx="3.5" ry="2.5" fill="#FF6B00" />
            {/* 입 */}
            <path d="M55 84 Q60 87 65 84" stroke="#333" strokeWidth="1.2" fill="none" />
            {/* 볼 */}
            <circle cx="42" cy="76" r="4" fill="#FFB6C1" opacity="0.5" />
            <circle cx="78" cy="76" r="4" fill="#FFB6C1" opacity="0.5" />
          </svg>
        )
      default:
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="#FF6B00" />
            <circle cx="38" cy="45" r="5" fill="#fff" />
            <circle cx="62" cy="45" r="5" fill="#fff" />
            <circle cx="38" cy="45" r="2.5" fill="#333" />
            <circle cx="62" cy="45" r="2.5" fill="#333" />
            <path d="M40 60 Q50 70 60 60" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
          </svg>
        )
    }
  }

  return (
    <div className={cn("relative", className)}>
      <div className={cn(sizeClasses[size], "animate-float")}>
        <CharacterSVG />
      </div>
      {message && (
        <div className="absolute -top-2 left-full ml-2 bg-white rounded-2xl px-3 py-2 shadow-lg border border-border min-w-max">
          <p className="text-sm font-medium text-foreground">{message}</p>
          <div className="absolute top-4 -left-2 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-white border-b-8 border-b-transparent" />
        </div>
      )}
    </div>
  )
}
