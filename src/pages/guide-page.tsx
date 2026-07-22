import { For } from "solid-js";
import { Link } from "@tanstack/solid-router";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  IconSparkles,
  IconNote,
  IconCalendarDays,
  IconBook,
  IconExam,
  IconCheck,
  IconUsers,
  IconSchool,
  IconReportAnalytics,
  IconClipboardCheck,
  IconUserCog,
  IconGlobe,
  IconClock,
  IconFileText,
  IconChart,
} from "@/components/ui/icons";
import { useT } from "@/stores/preferences-context";
import { cn } from "@/lib/cn";

type GuideStep = {
  id: string;
  stepNumber: string;
  badge: string;
  badgeTone: string;
  borderTone: string;
  icon: any;
  iconColor: string;
  title: string;
  description: string;
  to: string;
  cta: string;
  features: string[];
};

export default function GuidePage() {
  return (
    <RouteGuard>
      <GuideContent />
    </RouteGuard>
  );
}

function GuideContent() {
  const t = useT();

  const steps: GuideStep[] = [
    {
      id: "ai",
      stepNumber: "01",
      badge: "Yapay Zeka",
      badgeTone: "border-sky-500/40 text-foreground bg-card",
      borderTone: "border-sky-500/40 dark:border-sky-500/30 hover:border-sky-500/70 ring-1 ring-sky-500/20",
      icon: IconSparkles,
      iconColor: "text-sky-400",
      title: "Çelebi AI Asistanı",
      description: "Tüm sayfalardan üst barda bulunan 'Çelebi'ye Sor' butonuyla erişilebilir akıllı yapay zeka asistanı. Kampüs verileriniz, ders konularınız ve sistem hakkında anlık yanıtlar verir.",
      to: "/",
      cta: "Çelebi'yi Dene",
      features: ["Tüm sayfalardan tek tıkla erişim", "Kampüs ve ders odaklı yanıtlar", "Bağlamsal çalışma rehberliği"],
    },
    {
      id: "notes",
      stepNumber: "02",
      badge: "Notlar & Çizim",
      badgeTone: "border-sky-500/40 text-foreground bg-card",
      borderTone: "border-sky-500/40 dark:border-sky-500/30 hover:border-sky-500/70 ring-1 ring-sky-500/20",
      icon: IconNote,
      iconColor: "text-sky-400",
      title: "Akıllı Defter & Çizim Tuvali",
      description: "PDF, TXT ve Markdown materyallerinizi temiz Markdown notlarına dönüştürün. Dahili .hzdraw tuvali ile derslerinize serbest el çizimleri ve grafikler ekleyin.",
      to: "/notes",
      cta: "Notlara Git",
      features: ["PDF & TXT otomatik dönüştürücü", "Dahili .hzdraw serbest çizim tuvali", "Markdown biçimlendirme ve OCR uyarısı"],
    },
    {
      id: "questions",
      stepNumber: "03",
      badge: "Soru Havuzu",
      badgeTone: "border-sky-500/40 text-foreground bg-card",
      borderTone: "border-sky-500/40 dark:border-sky-500/30 hover:border-sky-500/70 ring-1 ring-sky-500/20",
      icon: IconBook,
      iconColor: "text-sky-400",
      title: "Soru Havuzu & Çözümler",
      description: "Topluluk soru havuzunda sorularınızı paylaşın, yazılı ve çoktan seçmeli çözümler ekleyin. Öğretmen onaylı çözümlerle ders konularında uzmanlaşın.",
      to: "/questions",
      cta: "Soru Havuzu",
      features: ["Yazılı ve test çözümleri", "Öğretmen onaylı çözüm rozeti", "Filtrelenebilir konu ve durum kategorileri"],
    },
    {
      id: "courses",
      stepNumber: "04",
      badge: "Dersler & Etütler",
      badgeTone: "border-sky-500/40 text-foreground bg-card",
      borderTone: "border-sky-500/40 dark:border-sky-500/30 hover:border-sky-500/70 ring-1 ring-sky-500/20",
      icon: IconCalendarDays,
      iconColor: "text-sky-400",
      title: "Dersler, Etütler & Kulüpler",
      description: "Ders, etüt ve kulüp programı. Öğretmenler öğrenci kaydeder, ders içi oturum yoklaması (Var, Yok, Geç, Mazeretli) alır ve müfredat takibi yapar.",
      to: "/courses",
      cta: "Derslerim",
      features: ["Öğrenci ders kayıt yönetimi", "Anlık oturum yoklaması alma", "Sınav ve etüt takvimi hizalaması"],
    },
    {
      id: "exams",
      stepNumber: "05",
      badge: "Sınav Odası",
      badgeTone: "border-sky-500/40 text-foreground bg-card",
      borderTone: "border-sky-500/40 dark:border-sky-500/30 hover:border-sky-500/70 ring-1 ring-sky-500/20",
      icon: IconExam,
      iconColor: "text-sky-400",
      title: "Sınav Odası & Canlı Takip",
      description: "Geri sayım ve otomatik kaydetmeli canlı sınav odası. Öğretmenler canlı izleme panelinden yanıt kağıtlarını ve anlık puanlama önerilerini takip eder.",
      to: "/exams",
      cta: "Sınav Odası",
      features: ["Sunucu saati senkronize geri sayım", "WebSocket & REST otomatik kaydetme", "Canlı öğretmen izleme ve puanlama"],
    },
    {
      id: "marks",
      stepNumber: "06",
      badge: "Karne & Devam",
      badgeTone: "border-sky-500/40 text-foreground bg-card",
      borderTone: "border-sky-500/40 dark:border-sky-500/30 hover:border-sky-500/70 ring-1 ring-sky-500/20",
      icon: IconReportAnalytics,
      iconColor: "text-sky-400",
      title: "Karne & İlerleme Raporu",
      description: "Dönem ders ortalamaları ve sınav türü ağırlıklarına göre hesaplanan genel başarı puanı. Devamsızlık istatistikleri ile anlık gelişim takibi.",
      to: "/marks",
      cta: "Karnem",
      features: ["Ağırlıklı sınav puan ortalaması", "Devamsızlık ve mazeret özetleri", "Detaylı grafik ve ders raporları"],
    },
  ];

  return (
    <div class="space-y-6">
      <PageHeader
        accent="sky"
        eyebrow={t("nav.guide")}
        title={t("guide.title")}
        description="Kampüs akışı: Rol yetkileri, modül kullanım adımları ve pratik çalışma ipuçları."
      />

      {/* 1. ROL BAZLI YETKİ HARİTASI (TABS AT THE TOP) */}
      <section class="data-shell space-y-4 border-sky-500/15 bg-sky-500/[0.025] p-6">
        <div>
          <h2 class="font-display text-lg font-semibold tracking-tight">Rol Bazlı Yetki Haritası</h2>
          <p class="mt-1 text-xs text-muted-foreground">Platformdaki her bir rolün erişebildiği ve yönetebildiği alanlar.</p>
        </div>

        <Tabs defaultValue="student" class="w-full">
          <TabsList class="w-full justify-start">
            <TabsTrigger value="student" class="flex-row items-center gap-2">
              <IconSchool class="h-4 w-4 shrink-0" />
              <span class="whitespace-nowrap">Öğrenci</span>
            </TabsTrigger>
            <TabsTrigger value="teacher" class="flex-row items-center gap-2">
              <IconClipboardCheck class="h-4 w-4 shrink-0" />
              <span class="whitespace-nowrap">Öğretmen</span>
            </TabsTrigger>
            <TabsTrigger value="parent" class="flex-row items-center gap-2">
              <IconUsers class="h-4 w-4 shrink-0" />
              <span class="whitespace-nowrap">Veli</span>
            </TabsTrigger>
            <TabsTrigger value="admin" class="flex-row items-center gap-2">
              <IconUserCog class="h-4 w-4 shrink-0" />
              <span class="whitespace-nowrap">Yönetici & Admin</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="student" class="space-y-3">
            <div class="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
              <h3 class="font-display text-sm font-semibold text-foreground">Öğrenci Çalışma & Katılım Araçları</h3>
              <ul class="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <li class="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <IconCheck class="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Kendi özel defterinde not tutma, PDF aktarma ve çizim yapma</span>
                </li>
                <li class="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <IconCheck class="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Soru havuzunda soru sorma, diğer sorulara çözüm yazma</span>
                </li>
                <li class="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <IconCheck class="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Kaydolunan derslerin sınav odasına girme ve süreli sınav çözme</span>
                </li>
                <li class="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <IconCheck class="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Kendi karne ortalamasını ve devamsızlık durumunu izleme</span>
                </li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="teacher" class="space-y-3">
            <div class="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
              <h3 class="font-display text-sm font-semibold text-foreground">Öğretmen Yönetim & Eğitici Paneli</h3>
              <ul class="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <li class="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <IconCheck class="h-4 w-4 text-sky-400 shrink-0" />
                  <span>Ders, etüt ve kulüp oluşturma, öğrencileri derse kaydetme</span>
                </li>
                <li class="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <IconCheck class="h-4 w-4 text-sky-400 shrink-0" />
                  <span>Ders oturumlarında öğrenci yoklaması alma (Var, Yok, Geç, Mazeretli)</span>
                </li>
                <li class="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <IconCheck class="h-4 w-4 text-sky-400 shrink-0" />
                  <span>Sınav oluşturma, sorular ekleme ve canlı sınav takibi yürütme</span>
                </li>
                <li class="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <IconCheck class="h-4 w-4 text-sky-400 shrink-0" />
                  <span>Öğrenci sınav kağıtlarını inceleme, puan verme ve karne onaylama</span>
                </li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="parent" class="space-y-3">
            <div class="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
              <h3 class="font-display text-sm font-semibold text-foreground">Veli Takip & Bilgilendirme Portalı</h3>
              <ul class="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <li class="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <IconCheck class="h-4 w-4 text-violet-400 shrink-0" />
                  <span>Bağlı öğrencilerin ders devamsızlık kayıtlarını anlık izleme</span>
                </li>
                <li class="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <IconCheck class="h-4 w-4 text-violet-400 shrink-0" />
                  <span>Öğrencinin ders bazlı karne başarı ortalamalarını görüntüleme</span>
                </li>
                <li class="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <IconCheck class="h-4 w-4 text-violet-400 shrink-0" />
                  <span>Yaklaşan sınav ve etkinlik takvimini takip etme</span>
                </li>
                <li class="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <IconCheck class="h-4 w-4 text-violet-400 shrink-0" />
                  <span>Öğretmenler ve okul yönetimi ile doğrudan mesajlaşma</span>
                </li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="admin" class="space-y-3">
            <div class="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
              <h3 class="font-display text-sm font-semibold text-foreground">Yönetici & Sistem Politikaları Paneli</h3>
              <ul class="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <li class="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <IconCheck class="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Kullanıcı hesapları oluşturma, rollerini atama (Öğrenci, Öğretmen, Veli)</span>
                </li>
                <li class="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <IconCheck class="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Okul akademik dönemleri, sınav türleri ve ağırlık oranlarını tanımlama</span>
                </li>
                <li class="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <IconCheck class="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Tüm ders ve etkinlik kayıtlarını genel denetim seviyesinde yönetme</span>
                </li>
                <li class="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <IconCheck class="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Personel çalışma günlüklerini ve sistem loglarını inceleme</span>
                </li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      {/* 2. TEMEL AKIŞLAR & ÖZELLİKLER (MODÜL KARTLARI) */}
      <section class="data-shell space-y-6 border-sky-500/15 bg-sky-500/[0.025] p-6">
        <div>
          <h2 class="font-display text-lg font-semibold tracking-tight">Temel Akışlar & Özellikler</h2>
          <p class="mt-1 text-xs text-muted-foreground">Hezarfen platformundaki ana modülleri ve kullanım adımlarını inceleyin.</p>
        </div>

        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <For each={steps}>
            {(step) => (
              <article class={cn("group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-md", step.borderTone)}>
                <div class="space-y-3">
                  <div class="flex items-center justify-between gap-2">
                    <span class={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider", step.badgeTone)}>
                      <step.icon class="h-3.5 w-3.5" />
                      {step.badge}
                    </span>
                    <span class="mono text-xs font-bold opacity-40">{step.stepNumber}</span>
                  </div>

                  <h3 class="font-display text-base font-semibold tracking-tight text-foreground">{step.title}</h3>
                  <p class="text-xs leading-relaxed text-muted-foreground">{step.description}</p>

                  <ul class="space-y-1.5 pt-2">
                    <For each={step.features}>
                      {(feat) => (
                        <li class="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <IconCheck class={cn("h-3.5 w-3.5 shrink-0", step.iconColor)} />
                          <span>{feat}</span>
                        </li>
                      )}
                    </For>
                  </ul>
                </div>

                <div class="mt-5 pt-3 border-t border-border/60">
                  <Link to={step.to}>
                    <Button variant="default" size="sm" class="w-full justify-between rounded-xl text-xs">
                      <span>{step.cta}</span>
                      <span class="font-bold">→</span>
                    </Button>
                  </Link>
                </div>
              </article>
            )}
          </For>
        </div>
      </section>

      {/* 3. PRATİK İPUÇLARI & KISAYOLLAR */}
      <section class="data-shell space-y-4 border-sky-500/15 bg-sky-500/[0.025] p-6">
        <div>
          <h2 class="font-display text-lg font-semibold tracking-tight">Pratik İpuçları & Kısayollar</h2>
          <p class="mt-1 text-xs text-muted-foreground">Hezarfen deneyimini en verimli şekilde kullanmanızı sağlayan püf noktaları.</p>
        </div>

        <ul class="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
          <li class="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-card text-violet-400">
              <IconGlobe class="h-4 w-4" />
            </span>
            <div>
              <p class="font-semibold text-foreground">Dil & Tema Seçimi</p>
              <p class="mt-1 leading-relaxed">Sağ üstteki profil avatarınıza tıklayarak Türkçe / İngilizce dillerini ve Dark / Light temalarını anında değiştirebilirsiniz.</p>
            </div>
          </li>
          <li class="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-card text-sky-400">
              <IconClock class="h-4 w-4" />
            </span>
            <div>
              <p class="font-semibold text-foreground">Otomatik Senkronizasyon</p>
              <p class="mt-1 leading-relaxed">Sınav odasındaki yanıtlarınız ve çizim tuvalindeki taslaklarınız sunucu saati (`/time`) ile arka planda güvenle kaydedilir.</p>
            </div>
          </li>
          <li class="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-card text-amber-400">
              <IconFileText class="h-4 w-4" />
            </span>
            <div>
              <p class="font-semibold text-foreground">Hızlı Not İçe Aktarma</p>
              <p class="mt-1 leading-relaxed">Notlar sayfasında "İçe Aktar" butonunu kullanarak PDF ve TXT ders dokümanlarınızı temiz Markdown metinlerine dönüştürebilirsiniz.</p>
            </div>
          </li>
          <li class="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-card text-emerald-400">
              <IconChart class="h-4 w-4" />
            </span>
            <div>
              <p class="font-semibold text-foreground">Ağırlıklı Not Hesaplaması</p>
              <p class="mt-1 leading-relaxed">Sınav sonuçlarınız, okul yönetiminin tanımladığı sınav türü ağırlıklarına göre doğrudan karne ortalamanıza yansıtılır.</p>
            </div>
          </li>
        </ul>
      </section>
    </div>
  );
}
