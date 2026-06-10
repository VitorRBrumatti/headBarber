import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')

let supabaseUrl = ''
let supabaseAnonKey = ''

envContent.split('\n').forEach((line) => {
  const parts = line.trim().split('=')
  const key = parts[0]
  const val = parts.slice(1).join('=')
  if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val
  if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseAnonKey = val
})

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  console.log('Connecting to:', supabaseUrl)
  const { data, error } = await supabase.from('clients').select('*').limit(5)
  if (error) {
    console.log('Error querying clients:', error.message)
  } else {
    console.log('Successfully queried clients. Count:', data?.length)
    console.log('Data:', data)
  }
}
test()
