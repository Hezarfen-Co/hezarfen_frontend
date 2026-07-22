export type DomainKind = "notes" | "messages" | "events" | "exams" | "courses" | "marks" | "attendance";

export type DomainColorDef = {
  accent: "amber" | "violet" | "emerald" | "rose" | "cyan" | "teal";
  badgeClass: string;
  borderClass: string;
  ringClass: string;
  cardBorderClass: string;
  iconOutlineClass: string;
  emptyStateClass: string;
};

export const DOMAIN_COLORS: Record<DomainKind, DomainColorDef> = {
  notes: {
    accent: "amber",
    badgeClass: "border border-amber-500/35 bg-muted/40 text-foreground ring-1 ring-amber-500/20",
    borderClass: "border-amber-500/50 dark:border-amber-500/50",
    ringClass: "ring-1 ring-amber-500/30",
    cardBorderClass: "border border-amber-500/30 dark:border-amber-500/40 hover:border-amber-500/60 dark:hover:border-amber-400/60",
    iconOutlineClass: "border border-amber-500/50 ring-1 ring-amber-500/30 bg-muted/40 text-muted-foreground group-hover:text-foreground dark:bg-muted/30",
    emptyStateClass: "border-amber-500/40 ring-1 ring-amber-500/25 bg-muted/30 text-foreground",
  },
  messages: {
    accent: "violet",
    badgeClass: "border border-violet-500/35 bg-muted/40 text-foreground ring-1 ring-violet-500/20",
    borderClass: "border-violet-500/50 dark:border-violet-500/50",
    ringClass: "ring-1 ring-violet-500/30",
    cardBorderClass: "border border-violet-500/30 dark:border-violet-500/40 hover:border-violet-500/60 dark:hover:border-violet-400/60",
    iconOutlineClass: "border border-violet-500/50 ring-1 ring-violet-500/30 bg-muted/40 text-muted-foreground group-hover:text-foreground dark:bg-muted/30",
    emptyStateClass: "border-violet-500/40 ring-1 ring-violet-500/25 bg-muted/30 text-foreground",
  },
  events: {
    accent: "emerald",
    badgeClass: "border border-emerald-500/35 bg-muted/40 text-foreground ring-1 ring-emerald-500/20",
    borderClass: "border-emerald-500/50 dark:border-emerald-500/50",
    ringClass: "ring-1 ring-emerald-500/30",
    cardBorderClass: "border border-emerald-500/30 dark:border-emerald-500/40 hover:border-emerald-500/60 dark:hover:border-emerald-400/60",
    iconOutlineClass: "border border-emerald-500/50 ring-1 ring-emerald-500/30 bg-muted/40 text-muted-foreground group-hover:text-foreground dark:bg-muted/30",
    emptyStateClass: "border-emerald-500/40 ring-1 ring-emerald-500/25 bg-muted/30 text-foreground",
  },
  exams: {
    accent: "rose",
    badgeClass: "border border-rose-500/35 bg-muted/40 text-foreground ring-1 ring-rose-500/20",
    borderClass: "border-rose-500/50 dark:border-rose-500/50",
    ringClass: "ring-1 ring-rose-500/30",
    cardBorderClass: "border border-rose-500/30 dark:border-rose-500/40 hover:border-rose-500/60 dark:hover:border-rose-400/60",
    iconOutlineClass: "border border-rose-500/50 ring-1 ring-rose-500/30 bg-muted/40 text-muted-foreground group-hover:text-foreground dark:bg-muted/30",
    emptyStateClass: "border-rose-500/40 ring-1 ring-rose-500/25 bg-muted/30 text-foreground",
  },
  courses: {
    accent: "cyan",
    badgeClass: "border border-cyan-500/35 bg-muted/40 text-foreground ring-1 ring-cyan-500/20",
    borderClass: "border-cyan-500/50 dark:border-cyan-500/50",
    ringClass: "ring-1 ring-cyan-500/30",
    cardBorderClass: "border border-cyan-500/30 dark:border-cyan-500/40 hover:border-cyan-500/60 dark:hover:border-cyan-400/60",
    iconOutlineClass: "border border-cyan-500/50 ring-1 ring-cyan-500/30 bg-muted/40 text-muted-foreground group-hover:text-foreground dark:bg-muted/30",
    emptyStateClass: "border-cyan-500/40 ring-1 ring-cyan-500/25 bg-muted/30 text-foreground",
  },
  marks: {
    accent: "teal",
    badgeClass: "border border-teal-500/35 bg-muted/40 text-foreground ring-1 ring-teal-500/20",
    borderClass: "border-teal-500/50 dark:border-teal-500/50",
    ringClass: "ring-1 ring-teal-500/30",
    cardBorderClass: "border border-teal-500/30 dark:border-teal-500/40 hover:border-teal-500/60 dark:hover:border-teal-400/60",
    iconOutlineClass: "border border-teal-500/50 ring-1 ring-teal-500/30 bg-muted/40 text-muted-foreground group-hover:text-foreground dark:bg-muted/30",
    emptyStateClass: "border-teal-500/40 ring-1 ring-teal-500/25 bg-muted/30 text-foreground",
  },
  attendance: {
    accent: "teal",
    badgeClass: "border border-teal-500/35 bg-muted/40 text-foreground ring-1 ring-teal-500/20",
    borderClass: "border-teal-500/50 dark:border-teal-500/50",
    ringClass: "ring-1 ring-teal-500/30",
    cardBorderClass: "border border-teal-500/30 dark:border-teal-500/40 hover:border-teal-500/60 dark:hover:border-teal-400/60",
    iconOutlineClass: "border border-teal-500/50 ring-1 ring-teal-500/30 bg-muted/40 text-muted-foreground group-hover:text-foreground dark:bg-muted/30",
    emptyStateClass: "border-teal-500/40 ring-1 ring-teal-500/25 bg-muted/30 text-foreground",
  },
};
