import { createPublicBooking } from '../src/app/booking/[slug]/actions'

/**
 * Concurrency Test Script for HeadBarber.
 * 
 * To run this test:
 * 1. Replace the placeholder UUIDs below with real IDs from your Supabase database.
 * 2. Run the script using ts-node or npx tsx.
 * 
 * Expected Behavior:
 * - 5 parallel requests are fired to book the exact same slot at the exact same millisecond.
 * - The PostgreSQL `pg_advisory_xact_lock` will serialize the execution.
 * - The first request processed will succeed and commit the booking.
 * - The other 4 requests will be queued, and when they resume, the conflict check will
 *   detect that the slot is now occupied, rejecting them with "Este horário já está ocupado".
 * - Verification: Exactly 1 success and 4 safe conflict failures, with NO double-booking!
 */
async function runConcurrencyTest() {
  console.log('=============================================================')
  console.log('🚀 INICIANDO TESTE DE CONCORRÊNCIA DE RESERVAS (ADVISORY LOCK)')
  console.log('=============================================================')

  // SUBSTITUA ESTES IDS POR REGISTROS REAIS DO SEU BANCO DE DADOS PARA TESTAR:
  const BARBERSHOP_ID = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'
  const SERVICE_ID = '0b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'
  const BARBER_ID = '1b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'
  const START_AT = '2026-06-15T15:00:00.000Z' // Horário do teste

  const clients = [
    { name: 'Roberto Alencar', phone: '(11) 99999-1111' },
    { name: 'Fabiana Costa', phone: '(11) 99999-2222' },
    { name: 'Gustavo Santos', phone: '(11) 99999-3333' },
    { name: 'Marina Neves', phone: '(11) 99999-4444' },
    { name: 'Julio Cesar', phone: '(11) 99999-5555' }
  ]

  console.log(`Disparando ${clients.length} requisições simultâneas para o mesmo slot: ${START_AT}...`)

  const promises = clients.map(async (client) => {
    try {
      const start = Date.now()
      const res = await createPublicBooking({
        barbershopId: BARBERSHOP_ID,
        serviceId: SERVICE_ID,
        barberId: BARBER_ID,
        startAt: START_AT,
        clientName: client.name,
        clientPhone: client.phone
      })
      const duration = Date.now() - start
      return { client: client.name, success: !res.error, detail: res.error || 'Agendado com sucesso!', duration }
    } catch (err: any) {
      return { client: client.name, success: false, detail: err.message, duration: 0 }
    }
  })

  const results = await Promise.all(promises)

  console.log('\n=========================================')
  console.log('📊 RESULTADOS DA CONCORRÊNCIA')
  console.log('=========================================')

  let successes = 0
  let failures = 0

  results.forEach((r) => {
    if (r.success) {
      successes++
      console.log(`🟢 [SUCESSO] ${r.client} (${r.duration}ms) => ${r.detail}`)
    } else {
      failures++
      console.log(`🔴 [REJEITADO] ${r.client} (${r.duration}ms) => Motivo: ${r.detail}`)
    }
  })

  console.log('-----------------------------------------')
  console.log(`Resumo: ${successes} Sucessos | ${failures} Conflitos Identificados Seguramente`)
  console.log('=========================================')
  
  if (successes === 1) {
    console.log('🏆 TESTE APROVADO! O Advisory Lock garantiu exatamente 1 agendamento e evitou a sobreposição!')
  } else {
    console.log('⚠️ ALERTA: Verifique os bloqueios ou IDs fornecidos.')
  }
}

// Para executar, basta descomentar a linha abaixo e rodar "npx tsx scratch/test-concurrency.ts"
// runConcurrencyTest();
