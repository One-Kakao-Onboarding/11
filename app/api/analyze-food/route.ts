import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { imageData } = await request.json()

    if (!imageData) {
      return NextResponse.json(
        { error: '이미지 데이터가 필요합니다.' },
        { status: 400 }
      )
    }

    // base64 이미지에서 미디어 타입과 데이터 추출
    const matches = imageData.match(/^data:image\/(jpeg|jpg|png|gif|webp);base64,(.+)$/)

    if (!matches) {
      return NextResponse.json(
        { error: '유효하지 않은 이미지 형식입니다. data:image/(jpeg|png|gif|webp);base64,... 형식이어야 합니다.' },
        { status: 400 }
      )
    }

    const detectedType = matches[1]
    let base64Data = matches[2]

    // base64 데이터에서 공백과 개행 제거
    base64Data = base64Data.replace(/\s/g, '')

    // base64의 첫 바이트를 확인하여 실제 이미지 타입을 감지
    const getActualImageType = (base64: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' => {
      const signature = base64.substring(0, 8)

      // PNG: iVBORw (89 50 4E 47)
      if (signature.startsWith('iVBORw')) return 'image/png'

      // GIF: R0lGOD (47 49 46 38)
      if (signature.startsWith('R0lGOD')) return 'image/gif'

      // WebP: UklGR (52 49 46 46)
      if (signature.startsWith('UklGR')) return 'image/webp'

      // JPEG: /9j/ (FF D8 FF)
      if (signature.startsWith('/9j/')) return 'image/jpeg'

      // 기본값은 감지된 타입 사용
      return detectedType === 'png' ? 'image/png' :
             detectedType === 'gif' ? 'image/gif' :
             detectedType === 'webp' ? 'image/webp' :
             'image/jpeg'
    }

    const mediaType = getActualImageType(base64Data)

    console.log('선언된 이미지 타입:', detectedType)
    console.log('실제 감지된 media_type:', mediaType)
    console.log('Base64 데이터 길이:', base64Data.length)
    console.log('Base64 시그니처:', base64Data.substring(0, 12))

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: `이 음식 사진을 분석해서 다음 정보를 JSON 형식으로 제공해주세요:

{
  "menu_name": "음식 이름 (한글)",
  "calories": 예상 칼로리 (숫자만),
  "protein": 예상 단백질 그램 (숫자만),
  "carbs": 예상 탄수화물 그램 (숫자만),
  "fat": 예상 지방 그램 (숫자만),
  "estimated_price": 예상 가격 (원 단위 숫자만, 한국의 일반적인 음식 가격 기준),
  "description": "음식에 대한 간단한 설명과 영양 코멘트 (1-2문장, 한글)"
}

반드시 JSON 형식만 응답해주세요. 다른 텍스트는 포함하지 마세요.`,
            },
          ],
        },
      ],
    })

    // Claude의 응답에서 텍스트 추출
    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // JSON 파싱
    let analysisResult
    try {
      // JSON 코드 블록이 있으면 제거
      const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      analysisResult = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError)
      console.error('응답 텍스트:', responseText)
      return NextResponse.json(
        { error: '음식 분석 결과를 파싱하는데 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: analysisResult,
    })
  } catch (error) {
    console.error('음식 분석 오류:', error)
    return NextResponse.json(
      { error: '음식 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
