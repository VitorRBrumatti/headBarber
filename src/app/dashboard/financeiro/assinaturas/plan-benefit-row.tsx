'use client'

import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

interface PlanBenefitRowProps {
  name: string
  selected: boolean
  limit: string
  onSelectedChange: (selected: boolean) => void
  onLimitChange: (limit: string) => void
}

export function PlanBenefitRow({
  name,
  selected,
  limit,
  onSelectedChange,
  onLimitChange,
}: PlanBenefitRowProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_100px] items-center gap-3 rounded-xl border border-[#e0e2e9] p-3">
      <label className="flex min-w-0 items-center gap-1 text-sm font-medium text-[#181c21]">
        <Switch checked={selected} onCheckedChange={onSelectedChange} />
        <span className="truncate">{name}</span>
      </label>
      <Input
        aria-label={`Limite de ${name}`}
        type="number"
        min="1"
        placeholder="Ilimitado"
        disabled={!selected}
        value={limit}
        onChange={(event) => onLimitChange(event.target.value)}
      />
    </div>
  )
}
