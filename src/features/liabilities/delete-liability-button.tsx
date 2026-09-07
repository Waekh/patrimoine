"use client";

import { t } from "@/lib/i18n";
import { deleteLiabilityAction } from "./actions";

export function DeleteLiabilityButton({ id }: { id: string }) {
  return (
    <form
      action={deleteLiabilityAction}
      onSubmit={(e) => {
        if (!window.confirm(t("liabilities.deleteConfirm"))) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-negative text-sm underline-offset-2 hover:underline">
        {t("common.delete")}
      </button>
    </form>
  );
}
