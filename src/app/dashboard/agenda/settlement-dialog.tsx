'use client'

import { useState } from 'react'
import { Sheet } from '@/components/ui/sheet'
import type { AppointmentDetails } from './agenda-types'

export type SettlementTargetStatus = 'completed' | 'cancelled' | 'no_show'
export type SettlementPaymentMethod =
  'money' | 'pix' | 'credit_card' | 'debit_card' | 'other'

interface SettlementDialogProps {
  appointment: AppointmentDetails | null
  targetStatus: SettlementTargetStatus | null
  open: boolean
  isPending: boolean
  error: string
  onClose: () => void
  onConfirm: (paymentMethod: SettlementPaymentMethod | null) => void
}

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)

const titles: Record<SettlementTargetStatus, string> = {
  completed: 'Finalizar atendimento',
  cancelled: 'Cancelar atendimento',
  no_show: 'Registrar falta',
}

export function SettlementDialog({
  appointment,
  targetStatus,
  open,
  isPending,
  error,
  onClose,
  onConfirm,
}: SettlementDialogProps) {
  const [paymentMethod, setPaymentMethod] =
    useState<SettlementPaymentMethod>('pix')

  if (!appointment || !targetStatus) return null

  const productSubtotal = appointment.products
    .filter((product) => product.status !== 'cancelled')
    .reduce((total, product) => total + product.unitPrice * product.quantity, 0)

  return (
    <Sheet
      description="Confira as consequências antes de confirmar."
      onClose={onClose}
      open={open}
      title={titles[targetStatus]}
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-[#e0e2e9] bg-[#f8f9ff] p-4">
          <p className="font-montserrat font-bold text-[#181c21]">
            {appointment.client.name}
          </p>
          <p className="mt-1 text-sm text-[#77767b]">
            {appointment.serviceName} · {appointment.startAt.substring(11, 16)}
          </p>
        </div>

        <dl className="space-y-3 rounded-xl border border-[#e0e2e9] p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt>Valor bruto</dt>
            <dd className="font-semibold">
              {money(appointment.attendanceTotal)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 text-emerald-800">
            <dt>Valor coberto</dt>
            <dd className="font-semibold">
              - {money(appointment.subscriptionCoveredTotal)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-[#eceef4] pt-3">
            <dt className="font-bold">Valor a receber</dt>
            <dd className="font-bold">{money(appointment.amountDue)}</dd>
          </div>
          <div className="flex justify-between gap-4 text-[#77767b]">
            <dt>Produtos</dt>
            <dd>{money(productSubtotal)}</dd>
          </div>
        </dl>

        {targetStatus === 'completed' && (
          <label className="block text-sm font-semibold text-[#181c21]">
            Forma de pagamento
            <select
              className="mt-2 h-11 w-full rounded-xl border border-[#d8dae0] bg-white px-3 outline-none focus:border-[#C79A4A] focus:ring-2 focus:ring-[#C79A4A]/15"
              disabled={isPending}
              onChange={(event) =>
                setPaymentMethod(event.target.value as SettlementPaymentMethod)
              }
              value={paymentMethod}
            >
              <option value="pix">Pix</option>
              <option value="money">Dinheiro</option>
              <option value="credit_card">Cartão de crédito</option>
              <option value="debit_card">Cartão de débito</option>
              <option value="other">Outro</option>
            </select>
          </label>
        )}

        {targetStatus === 'cancelled' && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
            O cancelamento libera os benefícios reservados e promove o próximo
            agendamento elegível que estiver aguardando.
          </p>
        )}

        {targetStatus === 'no_show' && (
          <p className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-950">
            A falta consome os benefícios reservados e não gera cobrança do
            atendimento.
          </p>
        )}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            {error}
          </p>
        )}

        <div className="flex gap-3 border-t border-[#eceef4] pt-5">
          <button
            className="flex-1 rounded-xl border border-[#d8dae0] px-4 py-3 text-sm font-bold disabled:opacity-50"
            disabled={isPending}
            onClick={onClose}
            type="button"
          >
            Voltar
          </button>
          <button
            className="flex-1 rounded-xl bg-[#181c21] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            disabled={isPending}
            onClick={() =>
              onConfirm(targetStatus === 'completed' ? paymentMethod : null)
            }
            type="button"
          >
            {isPending ? 'Processando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
