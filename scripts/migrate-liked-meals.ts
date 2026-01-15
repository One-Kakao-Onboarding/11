import postgres from 'postgres'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('❌ DATABASE_URL is not defined in environment variables')
  process.exit(1)
}

const sql = postgres(connectionString)

async function migrate() {
  try {
    console.log('🔄 Starting migration: Update liked_meals table...')

    // Step 1: Drop the old liked_meals table
    console.log('1️⃣ Dropping old liked_meals table...')
    await sql`DROP TABLE IF EXISTS liked_meals CASCADE`

    // Step 2: Create the new liked_meals table with menu data
    console.log('2️⃣ Creating new liked_meals table...')
    await sql`
      CREATE TABLE liked_meals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES app_users(id) ON DELETE CASCADE,
        menu_name VARCHAR(200) NOT NULL,
        calories INTEGER,
        carbs INTEGER,
        protein INTEGER,
        fat INTEGER,
        price INTEGER,
        delivery_time INTEGER,
        restaurant_name VARCHAR(200),
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, menu_name)
      )
    `

    // Step 3: Create indexes for better performance
    console.log('3️⃣ Creating indexes...')
    await sql`DROP INDEX IF EXISTS idx_liked_meals_user_id`
    await sql`DROP INDEX IF EXISTS idx_liked_meals_meal_record_id`
    await sql`DROP INDEX IF EXISTS idx_liked_meals_user_menu`

    await sql`CREATE INDEX idx_liked_meals_user_id ON liked_meals(user_id)`
    await sql`CREATE INDEX idx_liked_meals_user_menu ON liked_meals(user_id, menu_name)`

    console.log('✅ Migration completed successfully!')
    await sql.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    await sql.end()
    process.exit(1)
  }
}

migrate()
