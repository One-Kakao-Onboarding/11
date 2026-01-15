import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import sql from '@/lib/db'
import { menuItems, restaurants, getRestaurantById } from '@/lib/data'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface RecommendationScore {
  menuId: string
  score: number
  reasoning: string
}

// Claude API를 사용한 메뉴 추천 (4시간 캐시)
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let userId: number
  let mode: string

  try {
    const body = await request.json()
    userId = body.userId
    mode = body.mode

    if (!userId) {
      return NextResponse.json(
        { error: '사용자 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    const currentMode = mode || 'budget'
    console.log(`⏱️ [${currentMode}] Recommendation request started for user ${userId}`)

    // 1. 캐시 조회
    const cacheResult = await sql`
      SELECT * FROM recommendation_cache
      WHERE user_id = ${userId}
      AND mode = ${currentMode}
      AND status = 'completed'
      AND expires_at > CURRENT_TIMESTAMP
      LIMIT 1
    `

    // 캐시가 있으면 반환
    if (cacheResult.length > 0) {
      console.log('✅ Using cached recommendations for user', userId, 'mode', currentMode)
      const cache = cacheResult[0]

      // JSONB 데이터 파싱
      let recommendations: RecommendationScore[] = []
      try {
        if (typeof cache.recommendations === 'string') {
          recommendations = JSON.parse(cache.recommendations)
        } else if (Array.isArray(cache.recommendations)) {
          recommendations = cache.recommendations
        } else if (cache.recommendations && typeof cache.recommendations === 'object') {
          // recommendations 필드가 객체인 경우
          recommendations = (cache.recommendations as any).recommendations || []
        }
      } catch (error) {
        console.error('Failed to parse cached recommendations:', error)
        recommendations = []
      }

      if (recommendations.length === 0) {
        console.warn('⚠️ Cached recommendations is empty, regenerating...')
        // 캐시가 비어있으면 아래 로직으로 계속 진행
      } else {
        // 캐시된 추천 데이터를 메뉴 정보와 함께 반환
        const topMenus = recommendations.slice(0, 3).map(rec => {
          const menu = menuItems.find(m => m.id === rec.menuId)
          const restaurant = menu ? getRestaurantById(menu.restaurantId) : null
          return {
            ...menu,
            score: rec.score,
            reasoning: rec.reasoning,
            restaurant,
          }
        })

        const elapsed = Date.now() - startTime
        console.log(`✅ [${currentMode}] Cached response returned in ${elapsed}ms`)

        return NextResponse.json({
          success: true,
          data: topMenus,
          fromCache: true,
          cacheExpiresAt: cache.expires_at,
        })
      }
    }

    console.log(`🔄 [${currentMode}] Generating new recommendations with Claude AI for user ${userId}`)
    const aiStartTime = Date.now()

    // 1. 사용자 선호도 조회
    const preferencesResult = await sql`
      SELECT * FROM menu_preferences
      WHERE user_id = ${userId}
    `

    const preferences = preferencesResult[0] || {
      preferred_mode: 'budget',
      favorite_categories: [],
      disliked_ingredients: [],
      priority_price: 33,
      priority_nutrition: 33,
      priority_delivery: 34,
      monthly_budget: 300000,
    }

    // 2. 최근 7일간 식사 기록 조회
    const recentMeals = await sql`
      SELECT menu_name, calories, cost, meal_date
      FROM meal_records
      WHERE user_id = ${userId}
      AND meal_date >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY meal_date DESC
    `

    // 2-1. 좋아요 누른 음식 목록 조회
    const likedMeals = await sql`
      SELECT menu_name, calories, price as cost
      FROM liked_meals
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 20
    `

    // 3. 이번 달 지출 계산
    const monthlySpending = await sql`
      SELECT COALESCE(SUM(cost), 0) as total
      FROM meal_records
      WHERE user_id = ${userId}
      AND EXTRACT(MONTH FROM meal_date) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(YEAR FROM meal_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    `
    const totalSpent = Number(monthlySpending[0]?.total || 0)
    const remainingBudget = preferences.monthly_budget - totalSpent

    // 4. 메뉴 데이터를 레스토랑 정보와 함께 준비
    const menusWithRestaurants = menuItems.map(menu => {
      const restaurant = getRestaurantById(menu.restaurantId)
      return {
        ...menu,
        restaurantName: restaurant?.name || '',
        deliveryTime: restaurant?.deliveryTime || 30,
        deliveryFee: restaurant?.deliveryFee || 0,
      }
    })

    // 5. Claude에게 분석 요청
    const modeDescriptions: Record<string, string> = {
      budget: '가성비 중심 - 저렴하면서도 만족도 높은 메뉴',
      healthy: '영양 중심 - 단백질이 높고 균형잡힌 영양소',
      quick: '배달 속도 중심 - 빠르게 배달되는 메뉴',
    }

    const prompt = `당신은 음식 추천 전문가입니다. 사용자의 선호도와 식습관을 분석하여 최적의 메뉴를 추천해주세요.

**사용자 정보:**
- 월 식비 예산: ${preferences.monthly_budget.toLocaleString()}원
- 이번 달 지출: ${totalSpent.toLocaleString()}원
- 남은 예산: ${remainingBudget.toLocaleString()}원
- 좋아하는 음식 카테고리: ${preferences.favorite_categories.length > 0 ? preferences.favorite_categories.join(', ') : '없음'}
- 기피 식재료: ${preferences.disliked_ingredients.length > 0 ? preferences.disliked_ingredients.join(', ') : '없음'}
- 추천 우선순위: 가격(${preferences.priority_price}%), 영양(${preferences.priority_nutrition}%), 배달시간(${preferences.priority_delivery}%)

**좋아요 누른 음식 목록 (선호하는 메뉴):**
${likedMeals.length > 0 ? likedMeals.map(m => `- ${m.menu_name} (${m.calories}kcal, ${m.cost?.toLocaleString()}원)`).join('\n') : '없음'}

**최근 7일간 식사 기록:**
${recentMeals.length > 0 ? recentMeals.map(m => `- ${m.menu_name} (${m.calories}kcal, ${m.cost?.toLocaleString()}원)`).join('\n') : '기록 없음'}

**현재 추천 모드:** ${currentMode} - ${modeDescriptions[currentMode]}

**추천 가능한 메뉴 목록:**
${menusWithRestaurants.map(m => `
- ID: ${m.id}
  이름: ${m.name}
  카테고리: ${m.category}
  가격: ${m.price.toLocaleString()}원
  칼로리: ${m.calories}kcal
  단백질: ${m.protein}g
  탄수화물: ${m.carbs}g
  지방: ${m.fat}g
  레스토랑: ${m.restaurantName}
  배달시간: ${m.deliveryTime}분
  배달비: ${m.deliveryFee.toLocaleString()}원
`).join('\n')}

**채점 기준:**
1. 사용자의 우선순위 가중치를 반영하여 점수 계산
2. 가격: 예산 대비 적절성 (남은 예산 고려)
3. 영양: 단백질 함량, 칼로리 균형
4. 배달시간: 빠른 배달 가능 여부
5. 선호도 매칭:
   - 좋아하는 카테고리와 일치하면 가산점
   - 좋아요 누른 음식과 유사한 메뉴에 높은 가산점 (카테고리, 칼로리, 가격대가 비슷한 경우)
   - 기피 식재료가 포함된 메뉴는 큰 감점
6. 다양성: 최근 7일간 먹지 않은 메뉴에 가산점
7. 현재 모드에 따른 가중치 조정

**중요:**
- 좋아요 누른 음식 목록을 중요하게 고려하세요. 사용자가 명시적으로 좋아한다고 표시한 메뉴입니다.
- 좋아요 목록의 메뉴와 비슷한 특성(카테고리, 가격대, 영양 구성)을 가진 메뉴를 우선 추천하세요.

각 메뉴에 대해 0-100점 사이의 점수를 부여하고, 점수가 높은 상위 3개 메뉴를 추천해주세요.

**응답 형식 (반드시 유효한 JSON으로 응답):**
{
  "recommendations": [
    {
      "menuId": "메뉴ID",
      "score": 점수(0-100),
      "reasoning": "추천 이유 (1-2문장)"
    }
  ]
}

추천 이유는 사용자가 이해하기 쉽게 구체적으로 작성해주세요.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const aiElapsed = Date.now() - aiStartTime
    console.log(`🤖 [${currentMode}] Claude API responded in ${aiElapsed}ms`)

    // 6. Claude 응답 파싱
    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // JSON 추출 (코드 블록 제거)
    let jsonText = responseText.trim()
    if (jsonText.startsWith('```')) {
      const lines = jsonText.split('\n')
      jsonText = lines.slice(1, -1).join('\n')
      if (jsonText.startsWith('json')) {
        jsonText = jsonText.substring(4).trim()
      }
    }

    const result = JSON.parse(jsonText)
    const recommendations: RecommendationScore[] = result.recommendations || []

    // 7. 캐시에 저장 (2시간 TTL)
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2시간 후

    await sql`
      INSERT INTO recommendation_cache (
        user_id,
        mode,
        status,
        recommendations,
        expires_at
      )
      VALUES (
        ${userId},
        ${currentMode},
        'completed',
        ${sql.json(recommendations)},
        ${expiresAt}
      )
      ON CONFLICT (user_id, mode)
      DO UPDATE SET
        status = 'completed',
        recommendations = ${sql.json(recommendations)},
        created_at = CURRENT_TIMESTAMP,
        expires_at = ${expiresAt},
        error_message = NULL
    `

    console.log(`💾 [${currentMode}] Cached recommendations for user ${userId} (completed)`)

    // 8. 상위 3개 메뉴 정보와 함께 반환
    const topMenus = recommendations.slice(0, 3).map(rec => {
      const menu = menuItems.find(m => m.id === rec.menuId)
      const restaurant = menu ? getRestaurantById(menu.restaurantId) : null
      return {
        ...menu,
        score: rec.score,
        reasoning: rec.reasoning,
        restaurant,
      }
    })

    const totalElapsed = Date.now() - startTime
    console.log(`✅ [${currentMode}] New recommendation generated and returned in ${totalElapsed}ms`)

    return NextResponse.json({
      success: true,
      data: topMenus,
      fromCache: false,
      cacheExpiresAt: expiresAt,
      metadata: {
        mode: currentMode,
        totalSpent,
        remainingBudget,
        recentMealsCount: recentMeals.length,
      },
    })

  } catch (error) {
    const errorElapsed = Date.now() - startTime
    console.error(`❌ Recommendation error after ${errorElapsed}ms:`, error)

    // 에러 상태 저장 (userId와 mode가 이미 정의된 경우에만)
    if (userId && mode) {
      try {
        const currentMode = mode || 'budget'
        const errorExpiresAt = new Date(Date.now() + 60 * 1000) // 1분 후

        await sql`
          UPDATE recommendation_cache
          SET status = 'error',
              error_message = ${error instanceof Error ? error.message : String(error)},
              expires_at = ${errorExpiresAt}
          WHERE user_id = ${userId}
          AND mode = ${currentMode}
        `
        console.log(`❌ Saved error status for user ${userId}, mode ${currentMode}`)
      } catch (updateError) {
        console.error('Failed to update error status:', updateError)
      }
    }

    return NextResponse.json(
      { error: '추천 생성 중 오류가 발생했습니다.', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
