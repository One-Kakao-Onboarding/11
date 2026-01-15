import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

// 사용자 선호도 조회
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

    const preferences = await sql`
      SELECT * FROM menu_preferences
      WHERE user_id = ${userId}
    `

    if (preferences.length === 0) {
      // 기본 선호도 반환
      return NextResponse.json({
        success: true,
        data: {
          user_id: userId,
          preferred_mode: 'budget',
          favorite_categories: [],
          disliked_ingredients: [],
          priority_price: 33,
          priority_nutrition: 33,
          priority_delivery: 34,
          monthly_budget: 300000,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: preferences[0],
    })

  } catch (error) {
    console.error('Get preferences error:', error)
    return NextResponse.json(
      { error: '선호도 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 사용자 선호도 저장/업데이트
export async function POST(request: NextRequest) {
  try {
    const {
      userId,
      preferredMode,
      favoriteCategories,
      dislikedIngredients,
      priorityPrice,
      priorityNutrition,
      priorityDelivery,
      monthlyBudget,
    } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: '사용자 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 기존 선호도 확인
    const existing = await sql`
      SELECT id FROM menu_preferences
      WHERE user_id = ${userId}
    `

    let result

    if (existing.length > 0) {
      // 업데이트
      result = await sql`
        UPDATE menu_preferences
        SET
          preferred_mode = ${preferredMode || 'budget'},
          favorite_categories = ${sql.array(favoriteCategories || [])},
          disliked_ingredients = ${sql.array(dislikedIngredients || [])},
          priority_price = ${priorityPrice || 33},
          priority_nutrition = ${priorityNutrition || 33},
          priority_delivery = ${priorityDelivery || 34},
          monthly_budget = ${monthlyBudget || 300000},
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${userId}
        RETURNING *
      `
    } else {
      // 새로 생성
      result = await sql`
        INSERT INTO menu_preferences (
          user_id,
          preferred_mode,
          favorite_categories,
          disliked_ingredients,
          priority_price,
          priority_nutrition,
          priority_delivery,
          monthly_budget
        )
        VALUES (
          ${userId},
          ${preferredMode || 'budget'},
          ${sql.array(favoriteCategories || [])},
          ${sql.array(dislikedIngredients || [])},
          ${priorityPrice || 33},
          ${priorityNutrition || 33},
          ${priorityDelivery || 34},
          ${monthlyBudget || 300000}
        )
        RETURNING *
      `
    }

    return NextResponse.json({
      success: true,
      data: result[0],
    })

  } catch (error) {
    console.error('Save preferences error:', error)
    return NextResponse.json(
      { error: '선호도 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
