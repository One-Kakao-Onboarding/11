import { NextRequest, NextResponse } from 'next/server'
import { menuItems } from '@/lib/data'

// 빠른 추천 TOP3 (고정)
export async function GET(request: NextRequest) {
  try {
    // 고정된 인기 메뉴 순서
    const popularMenuNames = ['김치찌개', '치킨 버거 세트', '제육볶음 정식']

    // menuItems에서 해당 메뉴 찾기 (순서 유지)
    const selectedMenus = popularMenuNames
      .map(name => menuItems.find(menu => menu.name === name))
      .filter(menu => menu !== undefined)

    return NextResponse.json({
      success: true,
      data: selectedMenus,
      hasRealData: true,
    })

  } catch (error) {
    console.error('Popular menus error:', error)

    // 에러 발생 시에도 동일한 메뉴 반환
    const popularMenuNames = ['김치찌개', '치킨 버거 세트', '제육볶음 정식']
    const selectedMenus = popularMenuNames
      .map(name => menuItems.find(menu => menu.name === name))
      .filter(menu => menu !== undefined)

    return NextResponse.json({
      success: true,
      data: selectedMenus,
      hasRealData: true,
    })
  }
}
