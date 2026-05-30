'use server'

import { revalidatePath } from 'next/cache'
import { getBarbershopId } from '@/utils/get-barbershop'

export async function createProduct(formData: FormData) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { error } = await supabase.from('products').insert({
    barbershop_id: barbershopId,
    name: formData.get('name') as string,
    description: formData.get('description') as string || null,
    category: formData.get('category') as string || null,
    sale_price: parseFloat(formData.get('sale_price') as string),
    cost_price: formData.get('cost_price') ? parseFloat(formData.get('cost_price') as string) : null,
    stock_quantity: formData.get('stock_quantity') ? parseInt(formData.get('stock_quantity') as string) : 0,
    image_url: formData.get('image_url') as string || null,
    is_active: true,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/produtos')
  revalidatePath('/dashboard')
}

export async function updateProduct(id: string, formData: FormData) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { error } = await supabase.from('products').update({
    name: formData.get('name') as string,
    description: formData.get('description') as string || null,
    category: formData.get('category') as string || null,
    sale_price: parseFloat(formData.get('sale_price') as string),
    cost_price: formData.get('cost_price') ? parseFloat(formData.get('cost_price') as string) : null,
    stock_quantity: formData.get('stock_quantity') ? parseInt(formData.get('stock_quantity') as string) : 0,
    image_url: formData.get('image_url') as string || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id).eq('barbershop_id', barbershopId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/produtos')
}

export async function toggleProductStatus(id: string, isActive: boolean) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { error } = await supabase.from('products')
    .update({ is_active: !isActive, updated_at: new Date().toISOString() })
    .eq('id', id).eq('barbershop_id', barbershopId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/produtos')
}

export async function deleteProduct(id: string) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { error } = await supabase.from('products')
    .delete()
    .eq('id', id).eq('barbershop_id', barbershopId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/produtos')
  revalidatePath('/dashboard')
}
