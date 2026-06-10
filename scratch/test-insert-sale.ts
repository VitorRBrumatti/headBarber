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
  console.log('Fetching first product...')
  const { data: products, error: pError } = await supabase.from('products').select('*').limit(1)
  if (pError || !products || products.length === 0) {
    console.log('Error or no products found:', pError?.message)
    return
  }

  const product = products[0]
  console.log('Found product:', product.name, 'ID:', product.id)

  console.log('Attempting to insert product_sales...')
  const { data, error } = await supabase
    .from('product_sales')
    .insert({
      barbershop_id: product.barbershop_id,
      product_id: product.id,
      quantity: 1,
      unit_price: product.sale_price,
      total_price: product.sale_price,
      payment_method: 'pix'
    })
    .select()

  if (error) {
    console.log('Error inserting product sale:', error.message)
    console.log('Error details:', error)
  } else {
    console.log('Successfully inserted product sale! Data:', data)
  }
}
test()
