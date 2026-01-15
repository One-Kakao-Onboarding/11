import { config } from 'dotenv'
import path from 'path'
import postgres from 'postgres'

// Load .env.local file first
config({ path: path.join(process.cwd(), '.env.local') })

async function fixPendingCaches() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined in .env.local')
  }

  const sql = postgres(process.env.DATABASE_URL)

  try {
    console.log('🔍 Finding pending caches with recommendations...\n')

    // pending 상태이지만 recommendations가 있는 레코드 찾기
    const pendingCaches = await sql`
      SELECT id, user_id, mode, status
      FROM recommendation_cache
      WHERE status = 'pending'
      AND recommendations IS NOT NULL
    `

    console.log(`Found ${pendingCaches.length} pending caches with recommendations\n`)

    if (pendingCaches.length > 0) {
      // completed로 업데이트
      const result = await sql`
        UPDATE recommendation_cache
        SET status = 'completed'
        WHERE status = 'pending'
        AND recommendations IS NOT NULL
      `

      console.log(`✅ Updated ${result.count} records from pending to completed\n`)
    }

    // 최종 상태 확인
    const stats = await sql`
      SELECT status, COUNT(*) as count
      FROM recommendation_cache
      GROUP BY status
      ORDER BY status
    `

    console.log('Current cache statistics:')
    stats.forEach(stat => {
      console.log(`  ${stat.status}: ${stat.count}`)
    })

    await sql.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

fixPendingCaches()
