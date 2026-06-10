import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')

let supabaseUrl = ''
let supabaseServiceKey = ''

envContent.split('\n').forEach((line) => {
  const parts = line.trim().split('=')
  const key = parts[0]
  const val = parts.slice(1).join('=')
  if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val
  if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseServiceKey = val
})

// Use service role key to bypass RLS and inspect schema
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  console.log('Inspecting columns of product_sales...')
  const { data, error } = await supabase.rpc('inspect_table_columns', { table_name: 'product_sales' }).catch(err => ({ data: null, error: err }))
  
  if (error || !data) {
    // Let's try querying information_schema via a generic SQL query or just fetch a single row and print keys
    console.log('RPC inspect_table_columns failed, trying select * limit 0...')
    const { data: rowData, error: selectError } = await supabase.from('product_sales').select('*').limit(1)
    if (selectError) {
      console.error('Error selecting from product_sales:', selectError)
    } else {
      console.log('Keys in a row or schema cache keys:', rowData)
    }
  } else {
    console.log('Columns:', data)
  }
}
run()
