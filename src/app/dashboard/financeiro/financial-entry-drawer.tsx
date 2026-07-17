'use client'

import { type FormEvent, useEffect, useRef, useState, useTransition } from 'react'
import { Check, ChevronDown, Save, X } from 'lucide-react'
import { createExpenseAction, createManualRevenueAction } from './actions'

type EntryType = 'revenue' | 'expense'

interface FinancialEntryDrawerProps {
  open: boolean
  onClose: () => void
}

const today = () => new Date().toISOString().split('T')[0]

const paymentMethods = [
  ['pix', 'Pix'],
  ['money', 'Dinheiro'],
  ['credit_card', 'Crédito'],
  ['debit_card', 'Débito'],
  ['other', 'Outro'],
] as const

export function FinancialEntryDrawer({ open, onClose }: FinancialEntryDrawerProps) {
  const [entryType, setEntryType] = useState<EntryType>('revenue')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [category, setCategory] = useState('manual_adjustment')
  const [description, setDescription] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('pix')
  const [recurring, setRecurring] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const amountRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.style.overflow = 'hidden'
    const focusTimer = window.setTimeout(() => amountRef.current?.focus(), 0)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [open, onClose])

  const selectType = (nextType: EntryType) => {
    setEntryType(nextType)
    setCategory(nextType === 'revenue' ? 'manual_adjustment' : 'other')
    setError('')
  }

  const resetSubmittedType = () => {
    setAmount('')
    setDate(today())
    setDescription('')
    if (entryType === 'revenue') {
      setCategory('manual_adjustment')
      setPaymentMethod('pix')
    } else {
      setCategory('other')
      setRecurring(false)
    }
  }

  const submitEntry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    startTransition(async () => {
      try {
        if (entryType === 'revenue') {
          await createManualRevenueAction({
            category,
            description,
            amount: Number(amount),
            date,
            payment_method: paymentMethod,
          })
        } else {
          await createExpenseAction({
            category,
            description,
            amount: Number(amount),
            date,
            is_recurring: recurring,
          })
        }
        resetSubmittedType()
        onClose()
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Não foi possível salvar o lançamento.')
      }
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fechar novo lançamento"
        className="absolute inset-0 cursor-default bg-[#181c21]/40 backdrop-blur-[4px] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
        onClick={onClose}
      />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="financial-entry-title"
        className="relative flex h-full w-full max-w-[448px] flex-col border-l border-[#c8c5cb]/30 bg-[#f8f9ff] text-[#181c21] shadow-[-8px_0_24px_rgba(27,27,30,0.10)] motion-safe:animate-in motion-safe:slide-in-from-right motion-safe:duration-300 motion-reduce:transition-none"
      >
        <header className="flex items-start justify-between border-b border-[#e0e2e9] bg-white px-6 py-6 sm:px-8">
          <div>
            <h2 id="financial-entry-title" className="font-montserrat text-2xl font-semibold tracking-tight">Novo Lançamento</h2>
            <p className="mt-1 text-sm text-[#47464b]">Registre uma nova transação financeira.</p>
          </div>
          <button type="button" aria-label="Fechar" onClick={onClose} className="rounded-full p-2 text-[#47464b] transition-colors hover:bg-[#f1f3fa] hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C79A4A]">
            <X className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={submitEntry} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6 sm:px-8">
            <div className="relative grid grid-cols-2 rounded-lg bg-[#eceef4] p-1" aria-label="Tipo de lançamento">
              <span aria-hidden="true" className={`absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-md bg-white shadow-sm transition-transform duration-300 motion-reduce:transition-none ${entryType === 'expense' ? 'translate-x-full' : 'translate-x-0'}`} />
              {(['revenue', 'expense'] as const).map((type) => (
                <button key={type} type="button" aria-pressed={entryType === type} onClick={() => selectType(type)} className="relative z-10 py-3 text-xs font-semibold uppercase tracking-[0.05em]">
                  {type === 'revenue' ? 'Receita' : 'Despesa'}
                </button>
              ))}
            </div>

            {error && <p role="alert" className="rounded-lg border border-[#ba1a1a]/20 bg-[#ffdad6] px-4 py-3 text-sm text-[#93000a]">{error}</p>}

            <div>
              <label htmlFor="entry-amount" className="mb-2 block text-xs font-semibold uppercase tracking-[0.05em] text-[#47464b]">Valor (R$)</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-montserrat text-2xl text-[#47464b]">R$</span>
                <input ref={amountRef} id="entry-amount" aria-label="Valor" required min="0.01" step="0.01" type="number" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" className="w-full rounded-t-md border-0 border-b-2 border-[#e0e2e9] bg-white py-4 pl-16 pr-4 font-montserrat text-3xl font-bold outline-none transition-colors focus:border-[#C79A4A]" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#47464b]">Data<input aria-label="Data" required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 w-full rounded-md border border-[#c8c5cb] bg-white px-4 py-3 text-sm font-normal text-[#181c21] outline-none focus:border-[#C79A4A] focus:ring-1 focus:ring-[#C79A4A]" /></label>
              <label className="relative text-xs font-semibold uppercase tracking-[0.05em] text-[#47464b]">Categoria<select aria-label="Categoria" required value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 w-full appearance-none rounded-md border border-[#c8c5cb] bg-white px-4 py-3 pr-10 text-sm font-normal normal-case text-[#181c21] outline-none focus:border-[#C79A4A] focus:ring-1 focus:ring-[#C79A4A]">{entryType === 'revenue' ? <><option value="manual_adjustment">Ajuste manual</option><option value="service">Serviço avulso</option><option value="product">Venda de produto</option></> : <><option value="other">Outros</option><option value="rent">Aluguel</option><option value="energy">Energia elétrica</option><option value="water">Água</option><option value="internet">Internet</option><option value="products">Produtos / Estoque</option><option value="maintenance">Manutenção</option><option value="marketing">Marketing</option></>}</select><ChevronDown className="pointer-events-none absolute bottom-3.5 right-3 h-4 w-4" /></label>
            </div>

            <label className="block text-xs font-semibold uppercase tracking-[0.05em] text-[#47464b]">Descrição<textarea aria-label="Descrição" required value={description} onChange={(event) => setDescription(event.target.value)} placeholder={entryType === 'revenue' ? 'Ex: Corte de cabelo + barba' : 'Ex: Conta de energia elétrica'} className="mt-2 h-24 w-full resize-none rounded-md border border-[#c8c5cb] bg-white px-4 py-3 text-sm font-normal normal-case text-[#181c21] outline-none focus:border-[#C79A4A] focus:ring-1 focus:ring-[#C79A4A]" /></label>

            {entryType === 'revenue' ? (
              <fieldset>
                <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.05em] text-[#47464b]">Forma de pagamento</legend>
                <div aria-label="Forma de pagamento" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {paymentMethods.map(([value, label]) => (
                    <label key={value} className={`cursor-pointer rounded-md border px-3 py-2 text-center text-sm transition-colors ${paymentMethod === value ? 'border-[#C79A4A] bg-[#C79A4A]/10 text-[#795506]' : 'border-[#c8c5cb] text-[#47464b]'}`}>
                      <input className="sr-only" type="radio" name="payment-method" value={value} checked={paymentMethod === value} onChange={() => setPaymentMethod(value)} />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : (
              <label className="flex cursor-pointer items-center gap-3 text-sm text-[#47464b]"><input aria-label="Despesa recorrente" type="checkbox" checked={recurring} onChange={(event) => setRecurring(event.target.checked)} className="h-4 w-4 rounded border-[#c8c5cb] accent-[#C79A4A]" /><span>Esta despesa se repete todo mês</span>{recurring && <Check className="h-4 w-4 text-[#795506]" />}</label>
            )}
          </div>

          <footer className="flex items-center justify-end gap-3 border-t border-[#e0e2e9] bg-white px-6 py-5 sm:px-8">
            <button type="button" onClick={onClose} disabled={isPending} className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.05em] text-[#47464b] hover:text-black">Cancelar</button>
            <button type="submit" disabled={isPending} className="flex items-center gap-2 rounded-md bg-[#C79A4A] px-6 py-3 text-xs font-semibold uppercase tracking-[0.05em] text-[#1b1b1e] shadow-sm transition-colors hover:bg-[#ffcd77] disabled:cursor-not-allowed disabled:opacity-60"><Save className="h-4 w-4" />{isPending ? 'Salvando...' : 'Salvar Lançamento'}</button>
          </footer>
        </form>
      </section>
    </div>
  )
}
