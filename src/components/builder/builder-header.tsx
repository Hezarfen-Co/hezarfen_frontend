import { Link, useNavigate } from "@tanstack/solid-router";
import { Button } from "@/components/ui/button";
import { IconLogout, IconShieldCheck } from "@/components/ui/icons";
import { useBuilder } from "@/stores/builder-context";
import { useT } from "@/stores/preferences-context";

/** The operator strip over every builder page: where you are, who you are, the way out. */
export function BuilderHeader() {
  const session = useBuilder();
  const navigate = useNavigate();
  const t = useT();

  const logout = async () => {
    await session.logout();
    void navigate({ to: "/builder/login" });
  };

  return (
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-line bg-surface-base px-4 py-2.5">
      <Link to="/builder" class="flex min-w-0 items-center gap-2 text-sm font-semibold text-text-strong">
        <IconShieldCheck class="h-4 w-4 shrink-0 text-primary-text" />
        <span class="truncate">{t("builder.console")}</span>
      </Link>
      <div class="flex min-w-0 items-center gap-3">
        <span class="truncate text-sm text-text-subtle">@{session.builder()?.username}</span>
        <Button type="button" variant="outline" size="sm" class="rounded-lg" onClick={() => void logout()}>
          <IconLogout class="h-4 w-4" />
          {t("builder.logout")}
        </Button>
      </div>
    </div>
  );
}
