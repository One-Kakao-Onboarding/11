import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { nickname } = await request.json()

    if (!nickname || nickname.trim().length === 0) {
      return NextResponse.json(
        { exists: false },
        { status: 200 }
      )
    }

    const existingUser = await sql`
      SELECT id FROM app_users WHERE nickname = ${nickname}
    `

    return NextResponse.json({
      exists: existingUser.length > 0
    })

  } catch (error) {
    console.error('Check nickname error:', error)
    return NextResponse.json(
      { error: '닉네임 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
