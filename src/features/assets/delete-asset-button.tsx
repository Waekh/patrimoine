"use client";

import { t } from "@/lib/i18n";
import { deleteAssetAction } from "./actions";

export function DeleteAssetButton({ id }: { id: string }) {
  return (
    <form
      action={deleteAssetAction}
      onSubmit={(e) => {
        if (!window.confirm(t("assets.deleteConfirm"))) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-negative text-sm underline-offset-2 hover:underline">
        {t("common.delete")}
      </button>
    </form>
  );
}
