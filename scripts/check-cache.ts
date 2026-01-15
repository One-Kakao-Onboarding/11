import { config } from 'dotenv'
import path from 'path'
import postgres from 'postgres'

// Load .env.local file first
config({ path: path.join(process.cwd(), '.env.local') })

async function checkCache() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined in .env.local')
  }

  const sql = postgres(process.env.DATABASE_URL)

  try {
    console.log('🔍 Checking recommendation_cache...\n')

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
          WHEN recommendations IS NULL THEN 'NULL'
          ELSE 'EXISTS'
        END as has_recommendations
      FROM recommendation_cache
      ORDER BY created_at DESC
    `

    if (caches.length === 0) {
      console.log('❌ No cache entries found')
    } else {
      console.log(`✅ Found ${caches.length} cache entries:\n`)
      caches.forEach((cache, index) => {
        console.log(`${index + 1}. User ${cache.user_id} - Mode: ${cache.mode}`)
        console.log(`   Status: ${cache.status}`)
        console.log(`   Has recommendations: ${cache.has_recommendations}`)
        console.log(`   Created: ${cache.created_at}`)
        console.log(`   Expires: ${cache.expires_at}`)
        if (cache.error_message) {
          console.log(`   Error: ${cache.error_message}`)
        }
        console.log('')
      })
    }

    await sql.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

checkCache()
