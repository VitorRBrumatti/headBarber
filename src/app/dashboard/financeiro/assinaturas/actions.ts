'use server'

import { revalidatePath } from 'next/cache'
import { getBarbershopId } from '@/utils/get-barbershop'
import type {
  SaveSubscriptionPlanInput,
  SubscriptionActionResult,
  SubscriptionPaymentMethod,
  SubscriptionStatus,
} from './types'

const errorMessages: Record<string, string> = {
  INVALID_PLAN: 'Revise os dados e benefícios do plano.',
  INVALID_PLAN_ITEM: 'Um dos benefícios do plano é inválido.',
  PLAN_NAME_EXISTS: 'Já existe um plano com esse nome.',
  INVALID_CLIENT: 'O cliente informado não pertence a esta barbearia.',
  SUBSCRIPTION_ALREADY_EXISTS: 'Este cliente já possui uma assinatura ativa ou pausada.',
  INVALID_SUBSCRIPTION: 'A assinatura informada não está disponível.',
  INVALID_STATUS_TRANSITION: 'Essa mudança de status não é permitida.',
  INVALID_PAYMENT: 'Revise a data e a forma de pagamento.',
  PAYMENT_CONFLICT: 'A data informada não corresponde à próxima cobrança.',
  FORBIDDEN: 'Você não tem permissão para concluir esta operação.',
  UNAUTHENTICATED: 'Sua sessão expirou. Entre novamente.',
}

function failure<T>(message: string): SubscriptionActionResult<T> {
  const code =
    Object.keys(errorMessages).find((knownCode) => message.includes(knownCode)) ??
    'UNKNOWN'
  return {
    success: false,
    code,
    error: errorMessages[code] ?? 'Não foi possível concluir a operação.',
  }
}

function revalidateSubscriptionConsumers() {
  revalidatePath('/dashboard/financeiro/assinaturas')
  revalidatePath('/dashboard/financeiro')
  revalidatePath('/dashboard/agenda')
}

async function executeRpc<T>(
  name: string,
  parameters: Record<string, unknown>,
): Promise<SubscriptionActionResult<T>> {
  const { supabase } = await getBarbershopId()
  const { data, error } = await supabase.rpc(name, parameters)
  if (error) return failure<T>(error.message)
  revalidateSubscriptionConsumers()
  return { success: true, data: data as T }
}

export async function saveSubscriptionPlanAction(
  input: SaveSubscriptionPlanInput,
) {
  return executeRpc<string>('save_subscription_plan', {
    p_plan_id: input.planId,
    p_name: input.name,
    p_description: input.description,
    p_monthly_price: input.monthlyPrice,
    p_items: input.items,
  })
}

export async function setSubscriptionPlanActiveAction(input: {
  planId: string
  isActive: boolean
}) {
  return executeRpc<Record<string, unknown>>('set_subscription_plan_active', {
    p_plan_id: input.planId,
    p_is_active: input.isActive,
  })
}

export async function createClientSubscriptionAction(input: {
  clientId: string
  planId: string
  startedOn: string
  notes: string | null
}) {
  return executeRpc<string>('create_client_subscription', {
    p_client_id: input.clientId,
    p_plan_id: input.planId,
    p_started_on: input.startedOn,
    p_notes: input.notes,
  })
}

export async function setSubscriptionStatusAction(input: {
  subscriptionId: string
  status: SubscriptionStatus
}) {
  return executeRpc<Record<string, unknown>>('set_client_subscription_status', {
    p_subscription_id: input.subscriptionId,
    p_status: input.status,
  })
}

export async function scheduleSubscriptionPlanAction(input: {
  subscriptionId: string
  planId: string
}) {
  return executeRpc<Record<string, unknown>>('schedule_client_subscription_plan', {
    p_subscription_id: input.subscriptionId,
    p_plan_id: input.planId,
  })
}

export async function registerSubscriptionPaymentAction(input: {
  subscriptionId: string
  periodStart: string
  paymentMethod: SubscriptionPaymentMethod
}) {
  return executeRpc<Record<string, unknown>>(
    'register_client_subscription_payment',
    {
      p_subscription_id: input.subscriptionId,
      p_period_start: input.periodStart,
      p_payment_method: input.paymentMethod,
    },
  )
}
