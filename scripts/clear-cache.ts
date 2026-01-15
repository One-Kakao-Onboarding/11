import { config } from 'dotenv'
import path from 'path'
import postgres from 'postgres'

// Load .env.local file first
config({ path: path.join(process.cwd(), '.env.local') })

async function clearCache() {
  try {
    console.log('Clearing recommendation cache...')

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not defined in .env.local')
    }

    // Create database connection
    const sql = postgres(process.env.DATABASE_URL)

    // Delete all cache entries
    await sql`DELETE FROM recommendation_cache`

    console.log('✅ Cache cleared successfully!')

    await sql.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error clearing cache:', error)
    process.exit(1)
  }
}

clearCache()
