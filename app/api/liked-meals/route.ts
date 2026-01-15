import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

// 좋아요 목록 조회
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

    const likedMeals = await sql`
      SELECT
        lm.id as like_id,
        lm.created_at as liked_at,
        mr.*
      FROM liked_meals lm
      INNER JOIN meal_records mr ON lm.meal_record_id = mr.id
      WHERE lm.user_id = ${userId}
      ORDER BY lm.created_at DESC
    `

    return NextResponse.json({
      success: true,
      data: likedMeals,
    })

  } catch (error) {
    console.error('Get liked meals error:', error)
    return NextResponse.json(
      { error: '좋아요 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 좋아요 추가
export async function POST(request: NextRequest) {
  try {
    const { userId, mealRecordId } = await request.json()

    if (!userId || !mealRecordId) {
      return NextResponse.json(
        { error: '사용자 ID와 식사 기록 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 이미 좋아요했는지 확인
    const existing = await sql`
      SELECT id FROM liked_meals
      WHERE user_id = ${userId} AND meal_record_id = ${mealRecordId}
    `

    if (existing.length > 0) {
      return NextResponse.json(
        { error: '이미 좋아요한 메뉴입니다.' },
        { status: 400 }
      )
    }

    const result = await sql`
      INSERT INTO liked_meals (user_id, meal_record_id)
      VALUES (${userId}, ${mealRecordId})
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      data: result[0],
    })

  } catch (error) {
    console.error('Add liked meal error:', error)
    return NextResponse.json(
      { error: '좋아요 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 좋아요 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const mealRecordId = searchParams.get('mealRecordId')

    if (!userId || !mealRecordId) {
      return NextResponse.json(
        { error: '사용자 ID와 식사 기록 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    await sql`
      DELETE FROM liked_meals
      WHERE user_id = ${userId} AND meal_record_id = ${mealRecordId}
    `

    return NextResponse.json({
      success: true,
      message: '좋아요가 취소되었습니다.',
    })

  } catch (error) {
    console.error('Delete liked meal error:', error)
    return NextResponse.json(
      { error: '좋아요 취소 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
