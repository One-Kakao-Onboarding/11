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
    // Next.js API Route의 제약으로 인해, 실제 백그라운드 작업은 클라이언트가 트리거
    // 여기서는 즉시 응답만 반환
    console.log(`📝 Recommendation generation requested for user ${userId}, mode ${currentMode}`)

    // 백그라운드 생성을 위해 별도 요청 트리거
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, mode: currentMode }),
    }).catch(error => {
      console.error('Background recommendation generation error:', error)
    })

    return NextResponse.json({
      success: true,
      status: 'generating',
      message: 'Recommendation generation started',
    })

  } catch (error) {
    console.error('Start recommendation error:', error)
    return NextResponse.json(
      { error: '추천 시작 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
