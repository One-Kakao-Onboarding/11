import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: '사용자 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 해당 사용자의 모든 캐시 조회
    const caches = await sql`
      SELECT
        id,
        user_id,
        mode,
        status,
        created_at,
        expires_at,
        error_message,
        CASE
          WHEN recommendations IS NULL THEN false
          ELSE true
        END as has_recommendations,
        CASE
          WHEN expires_at > CURRENT_TIMESTAMP THEN true
          ELSE false
        END as is_valid
      FROM recommendation_cache
      WHERE user_id = ${userId}
      ORDER BY mode
    `

    return NextResponse.json({
      success: true,
      userId,
      caches,
      count: caches.length,
    })
  } catch (error) {
    console.error('Debug cache error:', error)
    return NextResponse.json(
      { error: '캐시 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
