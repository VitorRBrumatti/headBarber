'use client'

import type { AddOnAssignmentDraft } from '@/app/dashboard/adicionais/add-on-types'
import { Input } from '@/components/ui/input'

interface AddOnAssignmentsEditorProps {
  assignments: AddOnAssignmentDraft[]
  onChange: (assignments: AddOnAssignmentDraft[]) => void
}

export function AddOnAssignmentsEditor({
  assignments,
  onChange,
}: AddOnAssignmentsEditorProps) {
  function update(
    barberId: string,
    changes: Partial<AddOnAssignmentDraft>,
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
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold">
        Configuração por profissional
      </legend>
      {assignments.map((assignment) => (
        <div
          key={assignment.barberId}
          className="rounded-xl border border-[#e0e2e9] bg-[#f8f9ff] p-4"
        >
          <div className="flex items-center justify-between gap-4">
            <span className="font-montserrat text-sm font-bold text-[#181c21]">
              {assignment.barberName}
            </span>
            <label className="flex items-center gap-2 text-xs font-semibold text-[#47464b]">
              <input
                type="checkbox"
                checked={assignment.isAvailable}
                onChange={(event) =>
                  update(assignment.barberId, {
                    isAvailable: event.target.checked,
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
              <span>Duração extra (min)</span>
              <Input
                type="number"
                min="0"
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
