import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

// 추천 캐시 상태 확인
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const mode = searchParams.get('mode') || 'budget'

    if (!userId) {
      return NextResponse.json(
        { error: '사용자 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 캐시 조회
    const cacheResult = await sql`
      SELECT id, created_at, expires_at
      FROM recommendation_cache
      WHERE user_id = ${userId}
      AND mode = ${mode}
      AND expires_at > CURRENT_TIMESTAMP
      LIMIT 1
    `

    if (cacheResult.length > 0) {
      const cache = cacheResult[0]
      return NextResponse.json({
        success: true,
        hasCache: true,
        createdAt: cache.created_at,
        expiresAt: cache.expires_at,
      })
    }

    return NextResponse.json({
      success: true,
      hasCache: false,
    })

  } catch (error) {
    console.error('Cache status check error:', error)
    return NextResponse.json(
      { error: '캐시 상태 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
