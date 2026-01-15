import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { nickname } = await request.json()

    if (!nickname || nickname.trim().length === 0) {
      return NextResponse.json(
        { error: '닉네임을 입력해주세요.' },
        { status: 400 }
      )
    }

    if (nickname.length > 50) {
      return NextResponse.json(
        { error: '닉네임은 50자 이내로 입력해주세요.' },
        { status: 400 }
      )
    }

    // Check if nickname exists
    const existingUser = await sql`
      SELECT id, nickname, created_at
      FROM app_users
      WHERE nickname = ${nickname}
    `

    if (existingUser.length > 0) {
      // User exists, return user info
      return NextResponse.json({
        success: true,
        user: existingUser[0],
        message: '로그인되었습니다.'
      })
    }

    // Create new user
    const newUser = await sql`
      INSERT INTO app_users (nickname)
      VALUES (${nickname})
      RETURNING id, nickname, created_at
    `

    return NextResponse.json({
      success: true,
      user: newUser[0],
      message: '계정이 생성되었습니다.'
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
