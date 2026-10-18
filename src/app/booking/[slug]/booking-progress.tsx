import styles from './booking.module.css'

interface BookingProgressProps {
  steps: readonly { id: number; name: string }[]
  currentStep: number
}

export function BookingProgress({ steps, currentStep }: BookingProgressProps) {
  const titles = ['Escolha seu barbeiro', 'Escolha o serviço', 'Opcionais', 'Escolha seus produtos', 'Escolha o horário', 'Seus dados', 'Confirme seu agendamento']
  return (
    <nav className={styles.progress} aria-label="Etapas do agendamento">
      <p className={styles.stepCount}>Etapa {currentStep} de {steps.length}</p>
      <p className={styles.stepTitle}>{titles[currentStep - 1]}</p>
      <div className={styles.stepSegments} role="progressbar" aria-label="Progresso do agendamento" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={currentStep} aria-valuetext={`Etapa ${currentStep} de ${steps.length}: ${steps[currentStep - 1]?.name}`}>
        {steps.map(step => <span key={step.id} aria-hidden="true" className={step.id <= currentStep ? styles.segmentActive : undefined} />)}
      </div>
    </nav>
  )
}
