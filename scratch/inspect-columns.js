const fs = require('fs')
const path = require('path')

const envPath = path.resolve(__dirname, '../.env.local')
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

async function run() {
  const url = `${supabaseUrl}/rest/v1/product_sales`
  const res = await fetch(url, {
    method: 'OPTIONS',
    headers: {
      'apikey': supabaseAnonKey
    }
  })
  const json = await res.json()
  console.log('OPTIONS Response keys:', Object.keys(json))
  if (json.definitions && json.definitions.product_sales) {
    console.log('Columns in product_sales properties:', Object.keys(json.definitions.product_sales.properties))
  } else {
    console.log('Full JSON response:', JSON.stringify(json, null, 2))
  }
}
run()
