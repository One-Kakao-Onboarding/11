import { config } from 'dotenv'
import path from 'path'
import fs from 'fs'
import postgres from 'postgres'

// Load .env.local file first
config({ path: path.join(process.cwd(), '.env.local') })

async function migrateDatabase() {
  try {
    console.log('Running recommendation cache migration...')

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not defined in .env.local')
    }

    // Create database connection
    const sql = postgres(process.env.DATABASE_URL)

    const migrationPath = path.join(process.cwd(), 'lib', 'migration-recommendation-cache.sql')
    const migration = fs.readFileSync(migrationPath, 'utf-8')

    // Execute migration
    await sql.unsafe(migration)

    console.log('✅ Recommendation cache migration completed successfully!')

    await sql.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error running migration:', error)
    process.exit(1)
  }
}

migrateDatabase()
