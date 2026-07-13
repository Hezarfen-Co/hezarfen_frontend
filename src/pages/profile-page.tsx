import { Show, Suspense } from "solid-js";
import { ProfileForm } from "@/components/users/profile-form";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { PageSpinner } from "@/components/ui/page-spinner";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";

export default function ProfilePage() {
  return (
    <RouteGuard>
      <ProfileContent />
    </RouteGuard>
  );
}

function ProfileContent() {
  const auth = useAuth();
  const t = useT();

  return (
    <Suspense fallback={<PageSpinner />}>
      <Show when={auth.user()}>
        {(u) => (
          <div class="space-y-6">
            <PageHeader
              accent="mint"
              eyebrow={t("nav.account")}
              title={u().username}
              description={`${u().role} · ${u().id}`}
            />

            <div class="grid gap-6 lg:grid-cols-2">
              <section class="surface-card p-5">
                <div class="mb-4">
                  <h2 class="font-display text-lg font-semibold">{t("profile.edit")}</h2>
                  <p class="mt-1 text-sm text-muted-foreground">{t("nav.account")}</p>
                </div>
                <ProfileForm
                  user={u()}
                  onSaved={async () => {
                    await auth.refresh();
                  }}
                />
              </section>

              <section class="surface-card space-y-4 p-5">
                <h2 class="font-display text-lg font-semibold">{t("nav.account")}</h2>
                <div class="grid gap-3 text-sm">
                  <div class="rounded-lg border bg-background/60 p-3">
                    <p class="text-xs text-muted-foreground">{t("profile.name")}</p>
                    <p class="mt-1 font-medium">{u().name || "—"}</p>
                  </div>
                  <div class="rounded-lg border bg-background/60 p-3">
                    <p class="text-xs text-muted-foreground">{t("profile.surname")}</p>
                    <p class="mt-1 font-medium">{u().surname || "—"}</p>
                  </div>
                  <div class="rounded-lg border bg-background/60 p-3">
                    <p class="text-xs text-muted-foreground">{t("profile.email")}</p>
                    <p class="mt-1 font-medium">{u().email || "—"}</p>
                  </div>
                  <div class="rounded-lg border bg-background/60 p-3">
                    <p class="text-xs text-muted-foreground">{t("profile.phone")}</p>
                    <p class="mt-1 font-medium">{u().phone || "—"}</p>
                  </div>
                  <div class="rounded-lg border bg-background/60 p-3">
                    <p class="text-xs text-muted-foreground">{t("profile.birthDate")}</p>
                    <p class="mt-1 font-medium">{u().birth_date || "—"}</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </Show>
    </Suspense>
  );
}
