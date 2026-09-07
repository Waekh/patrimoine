import { formatCurrency } from "@/lib/formatting";
import { messages, t } from "@/lib/i18n";
import type { WorldBuilding } from "@/types/world";
import { cn } from "@/lib/utils/cn";

/** Textual equivalent of the map: every building, selectable with the keyboard. */
export function BuildingList({
  buildings,
  selectedId,
  onSelect,
}: {
  buildings: WorldBuilding[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (buildings.length === 0) return <p className="text-fg-muted text-sm">{t("world.empty")}</p>;
  return (
    <ul className="flex flex-col gap-1" aria-label={t("world.buildingsList")}>
      {buildings.map((b) => (
        <li key={b.id}>
          <button
            type="button"
            onClick={() => onSelect(b.id)}
            aria-pressed={selectedId === b.id}
            className={cn(
              "hover:bg-surface-2 flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm",
              selectedId === b.id && "bg-surface-2",
            )}
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{b.label}</span>
              <span className="text-fg-muted text-xs">
                {messages.world.buildings[b.type]} · {t("world.level")} {b.level}
              </span>
            </span>
            <span className="tabular shrink-0 font-mono">
              {formatCurrency({ amountCents: b.valueCents, currency: b.currency })}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
