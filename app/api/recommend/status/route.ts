import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

// 추천 캐시 상태 확인
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const mode = searchParams.get('mode') || 'budget'

    console.log(`[API /api/recommend/status] 요청 - userId: ${userId}, mode: ${mode}`)

    if (!userId) {
      return NextResponse.json(
        { error: '사용자 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 캐시 조회 (status 포함)
    const cacheResult = await sql`
      SELECT id, status, created_at, expires_at, error_message
      FROM recommendation_cache
      WHERE user_id = ${userId}
      AND mode = ${mode}
      AND expires_at > CURRENT_TIMESTAMP
      LIMIT 1
    `

    if (cacheResult.length > 0) {
      const cache = cacheResult[0]
      console.log(`[API /api/recommend/status] ✅ 캐시 발견 - userId: ${userId}, mode: ${mode}, status: ${cache.status}`)

      return NextResponse.json({
        success: true,
        hasCache: cache.status === 'completed',
        status: cache.status,
        createdAt: cache.created_at,
        expiresAt: cache.expires_at,
        errorMessage: cache.error_message,
      })
    }

    console.log(`[API /api/recommend/status] ❌ 캐시 없음 - userId: ${userId}, mode: ${mode}`)
    return NextResponse.json({
      success: true,
      hasCache: false,
      status: 'none',
    })

  } catch (error) {
    console.error('Cache status check error:', error)
    return NextResponse.json(
      { error: '캐시 상태 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
