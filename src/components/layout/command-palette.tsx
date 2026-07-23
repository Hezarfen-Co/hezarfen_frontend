import { useNavigate } from "@tanstack/solid-router";
import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  IconBook,
  IconCalendar,
  IconDownload,
  IconExam,
  IconGlobe,
  IconHomework,
  IconLogout,
  IconMoon,
  IconNote,
  IconPencilQuestion,
  IconSearch,
  IconSparkles,
  IconSun,
  IconUsers,
} from "@/components/ui/icons";
import { HOME_ITEM, visibleNavGroups } from "@/components/layout/nav-items";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";
import { cn } from "@/lib/cn";

export type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenCelebi?: () => void;
  onOpenProfile?: () => void;
};

type CommandCategory = "actions" | "pages" | "system";

type CommandItem = {
  id: string;
  category: CommandCategory;
  categoryLabel: string;
  title: string;
  description?: string;
  keywords?: string;
  icon: typeof IconSearch;
  shortcut?: string;
  roleBadge?: string;
  onSelect: () => void;
};

export function CommandPalette(props: CommandPaletteProps) {
  const auth = useAuth();
  const prefs = usePreferences();
  const t = useT();
  const navigate = useNavigate();

  const [query, setQuery] = createSignal("");
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  let inputRef: HTMLInputElement | undefined;
  let listRef: HTMLDivElement | undefined;

  const role = () => auth.user()?.role;

  const items = createMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [];
    const userRole = role();
    const isTeacherPlus = hasMinRole(userRole, "teacher");
    const isStudent = userRole === "student";

    const isMac = typeof navigator !== "undefined" && (navigator.userAgent.includes("Mac") || navigator.platform?.includes("Mac"));
    const mod = isMac ? "⌘" : "Ctrl+";

    // 1. Quick Actions (Hızlı İşlemler)
    const actionsCategoryLabel = t("command.group.actions");

    if (isTeacherPlus) {
      list.push({
        id: "action-create-homework",
        category: "actions",
        categoryLabel: actionsCategoryLabel,
        title: t("command.action.createHomework"),
        description: t("command.action.createHomeworkDesc"),
        keywords: "homework odev ekle olustur ders",
        icon: IconHomework,
        shortcut: `${mod}H`,
        roleBadge: t("role.teacher"),
        onSelect: () => void navigate({ to: "/homework", search: { action: "new" } as any }),
      });

      list.push({
        id: "action-create-course",
        category: "actions",
        categoryLabel: actionsCategoryLabel,
        title: t("command.action.createCourse"),
        description: t("command.action.createCourseDesc"),
        keywords: "course ders kurs olustur egitim",
        icon: IconBook,
        shortcut: `${mod}C`,
        roleBadge: t("role.teacher"),
        onSelect: () => void navigate({ to: "/courses", search: { action: "new" } as any }),
      });

      list.push({
        id: "action-create-event",
        category: "actions",
        categoryLabel: actionsCategoryLabel,
        title: t("command.action.createEvent"),
        description: t("command.action.createEventDesc"),
        keywords: "event etkinlik planla takvim oturum",
        icon: IconCalendar,
        shortcut: `${mod}E`,
        roleBadge: t("role.teacher"),
        onSelect: () => void navigate({ to: "/events", search: { action: "new" } as any }),
      });

      list.push({
        id: "action-create-exam",
        category: "actions",
        categoryLabel: actionsCategoryLabel,
        title: t("command.action.createExam"),
        description: t("command.action.createExamDesc"),
        keywords: "exam sinav test hazirla olustur",
        icon: IconExam,
        shortcut: `${mod}X`,
        roleBadge: t("role.teacher"),
        onSelect: () => void navigate({ to: "/exams", search: { action: "new" } as any }),
      });
    }

    // Common Quick Actions for all roles
    list.push({
      id: "action-create-note",
      category: "actions",
      categoryLabel: actionsCategoryLabel,
      title: t("command.action.createNote"),
      description: t("command.action.createNoteDesc"),
      keywords: "note not ekle ders notu kaydet",
      icon: IconNote,
      shortcut: `${mod}N`,
      onSelect: () => void navigate({ to: "/notes", search: { action: "new" } as any }),
    });

    list.push({
      id: "action-import-note",
      category: "actions",
      categoryLabel: actionsCategoryLabel,
      title: t("command.action.importNote"),
      description: t("command.action.importNoteDesc"),
      keywords: "import ice aktar pdf txt markdown assistant",
      icon: IconDownload,
      onSelect: () => void navigate({ to: "/notes", search: { action: "import" } as any }),
    });

    list.push({
      id: "action-ask-question",
      category: "actions",
      categoryLabel: actionsCategoryLabel,
      title: t("command.action.askQuestion"),
      description: t("command.action.askQuestionDesc"),
      keywords: "question soru sor havuz ekle topluluk",
      icon: IconPencilQuestion,
      shortcut: `${mod}Q`,
      roleBadge: isStudent ? t("role.student") : undefined,
      onSelect: () => void navigate({ to: "/questions", search: { action: "new" } as any }),
    });

    if (props.onOpenCelebi) {
      list.push({
        id: "action-ask-celebi",
        category: "actions",
        categoryLabel: actionsCategoryLabel,
        title: t("command.action.askCelebi"),
        description: t("command.action.askCelebiDesc"),
        keywords: "celebi ai yapay zeka sohbet asistan yardım",
        icon: IconSparkles,
        onSelect: () => props.onOpenCelebi?.(),
      });
    }

    if (props.onOpenProfile) {
      list.push({
        id: "action-my-profile",
        category: "actions",
        categoryLabel: actionsCategoryLabel,
        title: t("command.action.myProfile"),
        description: t("command.action.myProfileDesc"),
        keywords: "profile profil hesabim kullanici sifre",
        icon: IconUsers,
        onSelect: () => props.onOpenProfile?.(),
      });
    }

    // 2. Navigation Pages (Sayfalar & Gezinme)
    const pagesCategoryLabel = t("command.group.navigation");

    list.push({
      id: "page-home",
      category: "pages",
      categoryLabel: pagesCategoryLabel,
      title: t(HOME_ITEM.labelKey),
      description: t("app.name"),
      keywords: "home anasayfa kontrol paneli dashboard",
      icon: HOME_ITEM.Icon,
      onSelect: () => void navigate({ to: HOME_ITEM.to }),
    });

    for (const group of visibleNavGroups(userRole)) {
      const groupName = t(group.labelKey);
      for (const item of group.items) {
        list.push({
          id: `page-${item.to}`,
          category: "pages",
          categoryLabel: pagesCategoryLabel,
          title: t(item.labelKey),
          description: groupName,
          keywords: `${item.to} ${t(item.labelKey)} ${groupName}`,
          icon: item.Icon,
          onSelect: () => void navigate({ to: item.to }),
        });
      }
    }

    // 3. System Preferences & Account (Sistem & Tercihler)
    const systemCategoryLabel = t("command.group.system");

    const isDark = prefs.theme() === "dark";
    list.push({
      id: "system-theme-toggle",
      category: "system",
      categoryLabel: systemCategoryLabel,
      title: isDark ? t("command.action.themeLight") : t("command.action.themeDark"),
      description: isDark ? "Açık moda geç" : "Koyu moda geç",
      keywords: "theme tema koyu acik dark light mode",
      icon: isDark ? IconSun : IconMoon,
      onSelect: () => prefs.setTheme(isDark ? "light" : "dark"),
    });

    const isTr = prefs.locale() === "tr";
    list.push({
      id: "system-lang-toggle",
      category: "system",
      categoryLabel: systemCategoryLabel,
      title: isTr ? t("command.action.langEn") : t("command.action.langTr"),
      description: isTr ? "Switch to English" : "Türkçe diline geç",
      keywords: "language dil turkce english tr en",
      icon: IconGlobe,
      onSelect: () => prefs.setLocale(isTr ? "en" : "tr"),
    });

    list.push({
      id: "system-logout",
      category: "system",
      categoryLabel: systemCategoryLabel,
      title: t("command.action.logout"),
      description: t("command.action.logoutDesc"),
      keywords: "logout cıkıs oturum kapat ayrıl",
      icon: IconLogout,
      onSelect: async () => {
        await auth.logout();
        void navigate({ to: "/login" });
      },
    });

    return list;
  });

  const filteredItems = createMemo(() => {
    const q = query().trim().toLocaleLowerCase(prefs.locale());
    if (!q) return items();
    return items().filter((item) =>
      `${item.title} ${item.description ?? ""} ${item.keywords ?? ""} ${item.categoryLabel}`
        .toLocaleLowerCase(prefs.locale())
        .includes(q),
    );
  });

  // Group items by category while preserving single flat index order for keyboard navigation
  const groupedItems = createMemo(() => {
    const list = filteredItems();
    const categories: { category: CommandCategory; label: string; items: { item: CommandItem; globalIndex: number }[] }[] = [];

    const map = new Map<CommandCategory, { item: CommandItem; globalIndex: number }[]>();

    list.forEach((item, idx) => {
      if (!map.has(item.category)) {
        map.set(item.category, []);
      }
      map.get(item.category)!.push({ item, globalIndex: idx });
    });

    const order: CommandCategory[] = ["actions", "pages", "system"];
    for (const cat of order) {
      const itemsInCat = map.get(cat);
      if (itemsInCat && itemsInCat.length > 0) {
        categories.push({
          category: cat,
          label: itemsInCat[0].item.categoryLabel,
          items: itemsInCat,
        });
      }
    }

    return categories;
  });

  const executeItem = (item: CommandItem) => {
    props.onOpenChange(false);
    item.onSelect();
  };

  createEffect(() => {
    if (!props.open) return;
    setQuery("");
    setSelectedIndex(0);
    queueMicrotask(() => inputRef?.focus());
  });

  // Reset selected index when query changes
  createEffect(() => {
    query();
    setSelectedIndex(0);
  });

  // Auto scroll active item into view
  createEffect(() => {
    const idx = selectedIndex();
    if (!listRef) return;
    const activeEl = listRef.querySelector(`[data-index="${idx}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  });

  const handleKeyDown = (event: KeyboardEvent) => {
    const list = filteredItems();
    if (!list.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % list.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + list.length) % list.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const current = list[selectedIndex()];
      if (current) executeItem(current);
    }
  };

  onMount(() => {
    const onGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (auth.user()) props.onOpenChange(!props.open);
      }
      if (event.key === "Escape" && props.open) props.onOpenChange(false);
    };
    window.addEventListener("keydown", onGlobalKeyDown);
    onCleanup(() => window.removeEventListener("keydown", onGlobalKeyDown));
  });

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent class="max-h-[min(85vh,38rem)] max-w-2xl overflow-hidden rounded-2xl p-0 shadow-2xl border border-black/[0.08] dark:border-white/[0.12] bg-popover/95 backdrop-blur-xl">
        <DialogTitle class="sr-only">{t("dashboard.commandCenter")}</DialogTitle>
        <DialogDescription class="sr-only">{t("common.searchPlaceholder")}</DialogDescription>

        {/* Search Bar Header */}
        <div class="flex items-center gap-3 border-b border-border/80 px-4 py-3.5">
          <IconSearch class="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query()}
            placeholder={t("common.searchPlaceholder")}
            class="h-9 border-0 bg-transparent px-0 text-base font-medium shadow-none hover:bg-transparent focus:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            onInput={(event) => setQuery(event.currentTarget.value)}
            onKeyDown={handleKeyDown}
          />
          <Show when={query()}>
            <span class="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground shrink-0">
              {filteredItems().length} {t("dashboard.ready").toLowerCase()}
            </span>
          </Show>
        </div>

        {/* Command Items List */}
        <div ref={listRef} class="max-h-[min(65vh,28rem)] overflow-y-auto p-2 space-y-4">
          <Show
            when={filteredItems().length > 0}
            fallback={<p class="px-3 py-12 text-center text-sm text-muted-foreground">{t("common.noResults")}</p>}
          >
            <For each={groupedItems()}>
              {(group) => (
                <div class="space-y-1">
                  <div class="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {group.label}
                  </div>
                  <For each={group.items}>
                    {({ item, globalIndex }) => {
                      const isSelected = () => selectedIndex() === globalIndex;
                      const ItemIcon = item.icon;
                      return (
                        <button
                          type="button"
                          data-index={globalIndex}
                          onClick={() => executeItem(item)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          class={cn(
                            "flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition-colors duration-150",
                            isSelected()
                              ? "bg-accent text-accent-foreground font-medium shadow-sm"
                              : "text-foreground hover:bg-secondary/60",
                          )}
                        >
                          <div
                            class={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                              isSelected()
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            <ItemIcon class="h-4 w-4" />
                          </div>

                          <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2">
                              <span class="truncate text-sm font-medium">{item.title}</span>
                              <Show when={item.roleBadge}>
                                <span class="rounded-full bg-secondary border border-border px-2 py-0.2 text-[10px] font-semibold text-muted-foreground">
                                  {item.roleBadge}
                                </span>
                              </Show>
                            </div>
                            <Show when={item.description}>
                              <p class="truncate text-xs text-muted-foreground">{item.description}</p>
                            </Show>
                          </div>

                          <Show when={item.shortcut}>
                            <kbd class="hidden shrink-0 rounded-md border border-border/80 bg-muted/60 px-2 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground sm:inline-block">
                              {item.shortcut}
                            </kbd>
                          </Show>
                        </button>
                      );
                    }}
                  </For>
                </div>
              )}
            </For>
          </Show>
        </div>

        {/* Command Palette Footer */}
        <div class="flex items-center justify-between border-t border-border/60 bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          <span class="truncate">{t("command.shortcutHint")}</span>
          <div class="flex items-center gap-2 font-mono shrink-0">
            <kbd class="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold">↑↓</kbd>
            <span>navigasyon</span>
            <kbd class="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold">↵</kbd>
            <span>seç</span>
            <kbd class="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold">Esc</kbd>
            <span>kapat</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
