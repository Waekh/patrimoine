import { logoutAction } from "./actions";
import { Icons } from "@/components/ui/icons";
import { t } from "@/lib/i18n";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="text-fg-muted hover:bg-surface-2 hover:text-fg inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs"
      >
        <Icons.logout size={14} />
        {t("nav.logout")}
      </button>
    </form>
  );
}
