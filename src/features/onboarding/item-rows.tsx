"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

/**
 * Repeatable rows for list steps. Field names follow "items.{index}.{field}".
 * Rows keep their original index so validation errors stay attached.
 */
export function ItemRows<T>({
  initial,
  empty,
  render,
}: {
  initial: T[];
  empty: T;
  render: (item: T, prefix: string, index: number) => ReactNode;
}) {
  const [rows, setRows] = useState<Array<{ key: number; item: T }>>(() =>
    (initial.length ? initial : [empty]).map((item, i) => ({ key: i, item })),
  );
  const [nextKey, setNextKey] = useState(rows.length);
  return (
    <div className="flex flex-col gap-4">
      {rows.map((row, index) => (
        <div
          key={row.key}
          className="border-border bg-surface flex flex-col gap-4 rounded-md border p-4"
        >
          {render(row.item, `items.${index}`, index)}
          {rows.length > 1 ? (
            <button
              type="button"
              onClick={() => setRows(rows.filter((r) => r.key !== row.key))}
              className="text-negative self-end text-xs underline-offset-2 hover:underline"
            >
              {t("onboarding.remove")}
            </button>
          ) : null}
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="self-start"
        onClick={() => {
          setRows([...rows, { key: nextKey, item: empty }]);
          setNextKey(nextKey + 1);
        }}
      >
        {t("onboarding.addAnother")}
      </Button>
    </div>
  );
}
