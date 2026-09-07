export function CheckboxList({
  items,
}: {
  items: Array<{ name: string; label: string; checked: boolean }>;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.name}>
          <label className="border-border bg-surface has-[:checked]:border-accent flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm">
            <input
              type="checkbox"
              name={item.name}
              defaultChecked={item.checked}
              className="accent-accent h-4 w-4"
            />
            {item.label}
          </label>
        </li>
      ))}
    </ul>
  );
}
