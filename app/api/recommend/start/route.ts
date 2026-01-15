import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

// 추천 생성 시작 (즉시 응답, 백그라운드 처리)
export async function POST(request: NextRequest) {
  try {
    const { userId, mode } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: '사용자 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    const currentMode = mode || 'budget'

    // 1. 캐시 조회
    const cacheResult = await sql`
      SELECT id FROM recommendation_cache
      WHERE user_id = ${userId}
      AND mode = ${currentMode}
      AND expires_at > CURRENT_TIMESTAMP
      LIMIT 1
    `

    if (cacheResult.length > 0) {
      // 이미 캐시가 있으면 ready 상태 반환
      return NextResponse.json({
        success: true,
        status: 'ready',
        message: 'Recommendation already cached',
      })
    }

    // 2. 캐시가 없으면 백그라운드로 생성 시작
    console.log(`📝 Recommendation generation requested for user ${userId}, mode ${currentMode}`)

    // 백그라운드 생성을 위해 별도 요청 트리거 (await로 확실하게 실행)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                    'http://localhost:3000'

    try {
      // fetch를 시작하되 응답을 기다리지 않음 (백그라운드 실행)
      // waitUntil 패턴 대신 Promise를 생성만 하고 즉시 응답 반환
      const promise = fetch(`${baseUrl}/api/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, mode: currentMode }),
      }).then(response => {
        if (response.ok) {
          console.log(`✅ Background recommendation generation started for ${currentMode}`)
        } else {
          console.error(`❌ Background recommendation generation failed: ${response.status}`)
        }
      }).catch(error => {
        console.error('Background recommendation generation error:', error)
      })

      // 즉시 응답 반환 (백그라운드 작업은 계속 실행)
      return NextResponse.json({
        success: true,
        status: 'generating',
        message: 'Recommendation generation started',
      })
    } catch (error) {
      console.error('Failed to trigger background generation:', error)
      return NextResponse.json({
        success: false,
        status: 'error',
        message: 'Failed to start recommendation generation',
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Start recommendation error:', error)
    return NextResponse.json(
      { error: '추천 시작 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
