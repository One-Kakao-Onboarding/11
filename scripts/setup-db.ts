import { config } from 'dotenv'
import path from 'path'
import fs from 'fs'
import postgres from 'postgres'

// Load .env.local file first
config({ path: path.join(process.cwd(), '.env.local') })

async function setupDatabase() {
  try {
    console.log('Setting up database...')

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not defined in .env.local')
    }

    // Create database connection
    const sql = postgres(process.env.DATABASE_URL)

    const schemaPath = path.join(process.cwd(), 'lib', 'schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf-8')

    // Execute schema
    await sql.unsafe(schema)

    console.log('✅ Database setup completed successfully!')

    await sql.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error setting up database:', error)
    process.exit(1)
  }
}

setupDatabase()
