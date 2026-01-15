import { config } from 'dotenv'
import path from 'path'
import postgres from 'postgres'

// Load .env.local file first
config({ path: path.join(process.cwd(), '.env.local') })

async function checkSchema() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined in .env.local')
  }

  const sql = postgres(process.env.DATABASE_URL)

  try {
    console.log('🔍 Checking liked_meals table schema...\n')

    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'liked_meals'
      ORDER BY ordinal_position
    `

    console.log('Columns in liked_meals table:')
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`)
    })

    console.log('\nSample data:')
    const sample = await sql`
      SELECT * FROM liked_meals LIMIT 3
    `
    console.log(sample)

    await sql.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

checkSchema()
