"use client"

import { Loader2 } from "lucide-react"
import { KakaoCharacter } from "./kakao-character"

interface LoadingScreenProps {
  message?: string
  subMessage?: string
}

export function LoadingScreen({ message = "처리 중...", subMessage = "잠시만 기다려주세요" }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-white shadow-xl">
        <div className="relative">
          <div className="w-20 h-20 flex items-center justify-center">
            <KakaoCharacter type="muzi" size={64} />
          </div>
          <div className="absolute -bottom-1 -right-1">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{message}</p>
          <p className="text-sm text-muted-foreground mt-1">{subMessage}</p>
        </div>
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  )
}
