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

export async function recordProductSaleAction(
  productId: string,
  quantity: number,
  paymentMethod: string,
  clientId?: string
) {
  const { supabase, barbershopId } = await getBarbershopId()

  // 1. Fetch the product details and stock
  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('name, sale_price, stock_quantity')
    .eq('id', productId)
    .eq('barbershop_id', barbershopId)
    .single()

  if (fetchError || !product) {
    throw new Error('Produto não encontrado')
  }

  if (product.stock_quantity < quantity) {
    throw new Error(`Estoque insuficiente. Disponível: ${product.stock_quantity}`)
  }

  // Calculate prices
  const unitPrice = product.sale_price
  const totalPrice = unitPrice * quantity

  // 2. Perform transaction steps
  // First, decrement product stock
  const { error: updateStockError } = await supabase
    .from('products')
    .update({
      stock_quantity: product.stock_quantity - quantity,
      updated_at: new Date().toISOString()
    })
    .eq('id', productId)
    .eq('barbershop_id', barbershopId)

  if (updateStockError) {
    throw new Error(`Erro ao atualizar estoque: ${updateStockError.message}`)
  }

  // Second, insert product sale record
  const { data: sale, error: insertSaleError } = await supabase
    .from('product_sales')
    .insert({
      barbershop_id: barbershopId,
      product_id: productId,
      client_id: clientId || null,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      payment_method: paymentMethod
    })
    .select('id')
    .single()

  if (insertSaleError || !sale) {
    // Attempt rollback of stock in case of error
    await supabase
      .from('products')
      .update({
        stock_quantity: product.stock_quantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .eq('barbershop_id', barbershopId)

    throw new Error(`Erro ao registrar venda: ${insertSaleError?.message || 'Erro desconhecido'}`)
  }

  // Third, insert revenue ledger entry
  const { error: insertRevenueError } = await supabase
    .from('revenues')
    .insert({
      barbershop_id: barbershopId,
      category: 'product',
      description: `Venda de produto: ${product.name} (x${quantity})`,
      amount: totalPrice,
      reference_id: sale.id,
      payment_method: paymentMethod
    })

  if (insertRevenueError) {
    console.error('Failed to register revenue for product sale, but sale was recorded:', insertRevenueError.message)
  }

  revalidatePath('/dashboard/produtos')
  revalidatePath('/dashboard/financeiro')
  revalidatePath('/dashboard')

  return { success: true }
}

