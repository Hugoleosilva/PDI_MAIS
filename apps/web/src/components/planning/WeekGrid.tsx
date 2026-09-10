"use client";

import { WEEK_DAYS, WEEK_DAY_LABEL, weeklyHours, type WeekCapacity } from "@pdi-mais/core";

export function WeekGrid({
  value,
  onChange,
}: {
  value: WeekCapacity;
  onChange: (v: WeekCapacity) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-1.5">
      {WEEK_DAYS.map((d) => (
        <label key={d} className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
            {WEEK_DAY_LABEL[d]}
          </span>
          <input
            type="number"
            min={0}
            max={24}
            step={0.5}
            value={value[d] || ""}
            onChange={(e) => onChange({ ...value, [d]: Math.max(0, Number(e.target.value) || 0) })}
            placeholder="0"
            className="w-12 rounded-md border border-neutral-300 bg-white px-1 py-1 text-center text-sm text-neutral-900 outline-none focus:border-neutral-900"
          />
        </label>
      ))}
      <span className="ml-1 pb-1.5 text-xs font-medium text-neutral-500">
        = {weeklyHours(value)}h / semana
      </span>
    </div>
  );
}
