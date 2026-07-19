import { For, Show, createMemo, createSignal } from "solid-js";
import { RouteGuard } from "@/components/layout/route-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconArchive, IconMessage, IconSearch, IconSend, IconTrash, IconUsers } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type TestMessage = {
  id: string;
  from: string;
  role: string;
  subject: string;
  preview: string;
  body: string;
  time: string;
  unread?: boolean;
  label: string;
};

const messages: TestMessage[] = [
  {
    id: "m1",
    from: "Ayse Yilmaz",
    role: "Ogrenci",
    subject: "Bugunku etut hakkinda",
    preview: "Hocam 16:00 etudune 10 dakika gec kalabilirim, bilginize.",
    body: "Hocam merhaba,\n\nBugunku 16:00 etudune servis gecikmesi nedeniyle 10 dakika gec kalabilirim. Konu anlatimina yetisebilirsem notlari tamamlayacagim.\n\nTesekkurler.",
    time: "09:24",
    unread: true,
    label: "Etut",
  },
  {
    id: "m2",
    from: "Mehmet Demir",
    role: "Veli",
    subject: "Sinav sonucu gorusmesi",
    preview: "Hafta ici kisa bir gorusme planlayabilir miyiz?",
    body: "Merhaba,\n\nMehmet'in son deneme sonucunu birlikte degerlendirmek istiyoruz. Size uygun olan bir gun ve saat varsa gorusme planlayabiliriz.\n\nIyi calismalar.",
    time: "Dun",
    label: "Sinav",
  },
  {
    id: "m3",
    from: "Fen Kulubu",
    role: "Kulup",
    subject: "Proje teslim listesi",
    preview: "Cuma gunune kadar teslim edecek ekiplerin listesi hazir.",
    body: "Kulup proje teslimleri icin ekip listesi hazirlandi. Eksik malzeme bildiren iki ekip var. Cuma gunu kontrol listesini tamamlayalim.",
    time: "Sal",
    unread: true,
    label: "Kulup",
  },
];

export default function MessagesPage() {
  const [selectedId, setSelectedId] = createSignal(messages[0]?.id ?? "");
  const [query, setQuery] = createSignal("");
  const filtered = createMemo(() => {
    const q = query().trim().toLocaleLowerCase();
    if (!q) return messages;
    return messages.filter((message) => [message.from, message.role, message.subject, message.preview, message.label].join(" ").toLocaleLowerCase().includes(q));
  });
  const selected = createMemo(() => messages.find((message) => message.id === selectedId()) ?? filtered()[0] ?? null);

  return (
    <RouteGuard>
      <div>
        <section class="data-shell overflow-hidden p-0">
          <div class="grid min-h-[calc(100vh-7rem)] lg:grid-cols-[13rem_minmax(26rem,34rem)_minmax(0,1fr)]">
            <aside class="border-b bg-muted/20 p-3 lg:border-b-0 lg:border-r">
              <div class="space-y-1">
                <Button variant="secondary" class="h-9 w-full justify-start rounded-md">
                  <IconMessage class="h-4 w-4" />
                  Gelenler
                  <span class="ml-auto mono text-xs">{messages.length}</span>
                </Button>
                <Button variant="ghost" class="h-9 w-full justify-start rounded-md text-muted-foreground">
                  <IconSend class="h-4 w-4" />
                  Gonderilen
                </Button>
                <Button variant="ghost" class="h-9 w-full justify-start rounded-md text-muted-foreground">
                  <IconArchive class="h-4 w-4" />
                  Arsiv
                </Button>
                <Button variant="ghost" class="h-9 w-full justify-start rounded-md text-muted-foreground">
                  <IconTrash class="h-4 w-4" />
                  Cop kutusu
                </Button>
              </div>
              <div class="mt-5 border-t pt-4">
                <p class="px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Kanallar</p>
                <div class="mt-2 space-y-1">
                  <Button variant="ghost" class="h-8 w-full justify-start rounded-md text-muted-foreground">
                    <IconUsers class="h-4 w-4" />
                    Ogrenci
                  </Button>
                  <Button variant="ghost" class="h-8 w-full justify-start rounded-md text-muted-foreground">
                    <IconUsers class="h-4 w-4" />
                    Veli
                  </Button>
                </div>
              </div>
            </aside>

            <div class="border-b lg:border-b-0 lg:border-r">
              <div class="border-b p-3">
                <div class="relative">
                  <IconSearch class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input class="h-9 rounded-md pl-8" placeholder="Mesajlarda ara" value={query()} onInput={(event) => setQuery(event.currentTarget.value)} />
                </div>
              </div>
              <div class="max-h-[calc(100vh-10.5rem)] space-y-2 overflow-auto p-3">
                <For each={filtered()}>
                  {(message) => (
                    <button
                      type="button"
                      class={cn("w-full rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted/60", selected()?.id === message.id && "border-primary/30 bg-muted")}
                      onClick={() => setSelectedId(message.id)}
                    >
                      <div class="flex items-start gap-2">
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center gap-2">
                            <span class="truncate font-semibold">{message.from}</span>
                            <Show when={message.unread}>
                              <span class="h-2 w-2 rounded-full bg-sky-500" />
                            </Show>
                          </div>
                          <p class="mt-1 truncate text-xs font-medium">{message.subject}</p>
                        </div>
                        <span class="mono text-xs text-muted-foreground">{message.time}</span>
                      </div>
                      <p class="mt-2 line-clamp-2 text-xs text-muted-foreground">{message.preview}</p>
                      <div class="mt-3 flex items-center gap-2">
                        <Badge variant={message.unread ? "default" : "secondary"}>{message.label}</Badge>
                        <span class="text-xs text-muted-foreground">{message.role}</span>
                      </div>
                    </button>
                  )}
                </For>
              </div>
            </div>

            <Show when={selected()} fallback={<div class="p-8 text-sm text-muted-foreground">Mesaj secilmedi.</div>}>
              {(message) => (
                <article class="flex min-h-[30rem] flex-col">
                  <div class="flex items-center gap-2 border-b p-3">
                    <Button variant="ghost" size="icon" class="h-8 w-8 rounded-md">
                      <IconArchive class="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" class="h-8 w-8 rounded-md text-destructive">
                      <IconTrash class="h-4 w-4" />
                    </Button>
                    <Button class="ml-auto h-8 rounded-md" size="sm">
                      <IconSend class="h-4 w-4" />
                      Yanitla
                    </Button>
                  </div>
                  <div class="border-b p-4">
                    <div class="flex items-start gap-3">
                      <div class="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                        {message().from.split(" ").map((part) => part[0]).join("")}
                      </div>
                      <div class="min-w-0 flex-1">
                        <h2 class="font-display text-lg font-semibold">{message().subject}</h2>
                        <p class="mt-1 text-sm text-muted-foreground">
                          {message().from} · {message().role}
                        </p>
                      </div>
                      <span class="mono text-xs text-muted-foreground">{message().time}</span>
                    </div>
                  </div>
                  <div class="flex-1 whitespace-pre-wrap p-4 text-sm leading-6">{message().body}</div>
                  <div class="border-t p-4">
                    <textarea class="min-h-24 w-full resize-none rounded-md border bg-background p-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" placeholder={`${message().from} kisilerine yanit yaz...`} />
                    <div class="mt-3 flex justify-end">
                      <Button size="sm" class="rounded-md">
                        <IconSend class="h-4 w-4" />
                        Gonder
                      </Button>
                    </div>
                  </div>
                </article>
              )}
            </Show>
          </div>
        </section>
      </div>
    </RouteGuard>
  );
}
