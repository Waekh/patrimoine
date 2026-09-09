/**
 * Each option is a raised block that darkens when ticked, so the state reads
 * from the shape as well as from the colour.
 *
 * The native checkbox is kept and restyled with `appearance-none` rather than
 * hidden behind a drawn box: hiding it left a decoration on top that swallowed
 * every click aimed at the input. The tick is a sibling of the input, not a
 * child, because `peer-checked:` only reaches siblings.
 */
export function CheckboxList({
  items,
}: {
  items: Array<{ name: string; label: string; checked: boolean }>;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.name}>
          <label className="border-ink bg-surface hard-shadow has-[:checked]:bg-surface-2 flex cursor-pointer items-center gap-3 rounded-md border-2 px-4 py-3 text-sm">
            <span className="relative inline-flex h-4 w-4 shrink-0">
              <input
                type="checkbox"
                name={item.name}
                defaultChecked={item.checked}
                className="peer border-ink bg-surface checked:bg-accent sunken h-4 w-4 cursor-pointer appearance-none border-2"
              />
              <svg
                viewBox="0 0 12 12"
                aria-hidden="true"
                className="text-accent-fg pixel-edges pointer-events-none absolute inset-0 hidden h-full w-full peer-checked:block"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M2 6l3 3 5-6" />
              </svg>
            </span>
            {item.label}
          </label>
        </li>
      ))}
    </ul>
  );
}
