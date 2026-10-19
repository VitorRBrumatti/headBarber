'use client'

import type { ServiceAssignmentDraft } from '@/app/dashboard/servicos/service-types'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

interface ServiceAssignmentsEditorProps {
  assignments: ServiceAssignmentDraft[]
  onChange: (assignments: ServiceAssignmentDraft[]) => void
}

export function ServiceAssignmentsEditor({
  assignments,
  onChange,
}: ServiceAssignmentsEditorProps) {
  function update(
    barberId: string,
    changes: Partial<ServiceAssignmentDraft>,
  ) {
    onChange(
      assignments.map((assignment) =>
        assignment.barberId === barberId
          ? { ...assignment, ...changes }
          : assignment,
      ),
    )
  }

  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-semibold">Configuração por profissional</legend>
      {assignments.map((assignment) => (
        <div
          key={assignment.barberId}
          className="border-b border-[#e2ded7] py-4 last:border-b-0"
        >
          <div className="flex items-center justify-between gap-4">
            <span className="font-montserrat text-sm font-bold text-[#181c21]">
              {assignment.barberName}
            </span>
            <label className="flex items-center gap-1 text-xs font-semibold text-[#47464b]">
              <Switch
                aria-label={`${assignment.barberName}: disponível para agendamento`}
                checked={assignment.isAvailable}
                onCheckedChange={(isAvailable) =>
                  update(assignment.barberId, {
                    isAvailable,
                  })
                }
              />
              Disponível para agendamento
            </label>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="space-y-1.5 text-xs font-medium">
              <span>Preço (R$)</span>
              <Input
                aria-label={`Preço de ${assignment.barberName} (R$)`}
                type="number"
                min="0"
                step="0.01"
                value={assignment.price}
                onChange={(event) =>
                  update(assignment.barberId, {
                    price:
                      event.target.value === ''
                        ? ''
                        : Number(event.target.value),
                  })
                }
              />
            </label>
            <label className="space-y-1.5 text-xs font-medium">
              <span>Duração (min)</span>
              <Input
                aria-label={`Duração de ${assignment.barberName} (min)`}
                type="number"
                min="5"
                max="720"
                step="1"
                value={assignment.durationMinutes}
                onChange={(event) =>
                  update(assignment.barberId, {
                    durationMinutes:
                      event.target.value === ''
                        ? ''
                        : Number(event.target.value),
                  })
                }
              />
            </label>
          </div>
        </div>
      ))}
    </fieldset>
  )
}
