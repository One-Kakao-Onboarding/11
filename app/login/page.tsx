"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { KakaoCharacter } from '@/components/kakao-character'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!nickname.trim()) {
      setError('닉네임을 입력해주세요.')
      return
    }

    if (nickname.length > 50) {
      setError('닉네임은 50자 이내로 입력해주세요.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nickname: nickname.trim() }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // 로그인 성공 - 즉시 리다이렉트
        login(data.user)
        setIsLoading(false) // 로딩 상태 즉시 해제

        // AI 맞춤 추천 시작 (백그라운드, fire-and-forget)
        // API 내부에서 Pending 상태 저장 및 중복 호출 방지
        const modes = ['budget', 'healthy', 'quick']
        console.log('🚀 Starting AI recommendations after login...')

        modes.forEach((mode, index) => {
          setTimeout(() => {
            fetch('/api/recommend/start', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: data.user.id,
                mode,
              }),
              keepalive: true, // 페이지가 이동해도 요청 계속
            })
              .then(response => response.json())
              .then(result => {
                console.log(`✅ AI recommendation start triggered for ${mode} mode:`, result.status)
              })
              .catch(error => {
                console.error(`Failed to start ${mode} mode:`, error)
              })
          }, index * 100) // 각 요청을 100ms씩 지연
        })

        // 홈으로 이동
        router.push('/')
      } else {
        setError(data.error || '로그인에 실패했습니다.')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('로그인 중 오류가 발생했습니다.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-sky flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <KakaoCharacter type="ryan" size="lg" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Me-nu</h1>
              <p className="text-sm text-muted-foreground mt-2">
                나를 위한 AI 미식 큐레이터
              </p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="nickname" className="text-sm font-medium text-foreground">
                닉네임
              </label>
              <Input
                id="nickname"
                type="text"
                placeholder="닉네임을 입력해주세요"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={isLoading}
                className="h-12 rounded-xl"
                maxLength={50}
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <p className="text-xs text-muted-foreground">
                새로운 닉네임을 입력하면 자동으로 계정이 생성됩니다.
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  로그인 중...
                </>
              ) : (
                '시작하기'
              )}
            </Button>
          </form>

          {/* Info */}
          <div className="text-center text-xs text-muted-foreground">
            <p>닉네임만으로 간편하게 시작할 수 있어요</p>
          </div>
        </div>
      </div>
    </div>
  )
}
