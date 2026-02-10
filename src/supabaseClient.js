import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dqzujczkomsypzclfkwu.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxenVqY3prb21zeXB6Y2xma3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NjIzOTEsImV4cCI6MjA4NjMzODM5MX0.4gGxkkPj56qoQiwX3w1cEuALBiit-P41D7ynS4vJDz8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper to generate 4-digit tournament code
export const generateTournamentCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString()
}
