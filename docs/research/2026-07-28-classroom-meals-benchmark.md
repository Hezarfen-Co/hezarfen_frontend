# Classroom and Meals Benchmark — 2026-07-28

## Sources

- [Google Classroom teacher overview](https://support.google.com/edu/classroom/answer/9582854)
- [Google Classroom co-teacher permissions](https://support.google.com/edu/classroom/answer/6190761)
- [SchoolCafé Google Play listing and screenshots](https://play.google.com/store/apps/details?id=com.schoolcafe.app)
- [Menuvo features and product images](https://menuvo.co.uk/features/)
- [K12NET student portal](https://k12net.com/yeni-ogretim-yilinda-k12netin-yeni-ogrenci-portali/)
- [Canvas dashboard basics](https://community.canvaslms.com/html/assets/Canvas_Basics_Guide.pdf)
- [PowerSchool MyPowerHub overview](https://uc.powerschool-docs.com/mypowerhub-family/latest/overview)

Research checked 2026-07-28. Product screenshots remain owned by their publishers;
this repository links to them instead of copying them.

## Screenshot observations

| Source | Observation | Adopted |
| --- | --- | --- |
| Classroom home/class-card images | One card is the entry point to a durable class; title is the primary target. | Responsive class cards link to `/courses/:id`. |
| Classroom Classwork | Work is task-oriented rather than a generic activity feed. | Course detail groups subjects, homework, and exams under Work. |
| Classroom People | Teachers and students have one roster area. | Course detail has People with teachers plus role-gated roster. |
| SchoolCafé screenshots 1–3 | Menu browsing starts with day/menu; account balance and child context stay visible. | Date-first menu cards, parent child selector, balance and ledger. |
| SchoolCafé description/screenshots | Allergen information accompanies menu items and parent account history. | Icon + text warnings on dishes; parent-scoped profile/history. |
| Menuvo ordering image | Ordering is close to the menu rather than a separate checkout flow. | Book/cancel sits on durable menu detail. |
| Menuvo service-register image | Door service prioritizes name lookup and eaten/not-eaten status. | Service roster plus walk-in lookup and served/missed actions. |
| K12NET, Canvas, PowerSchool portal structure | Role context and a small set of durable destinations provide orientation before detailed work. | Single-level role navigation, prominent search, compact workspace cards, and dedicated Students/School hubs. |

## Adopted patterns

- Card entry for classes and menus.
- Durable detail routes; short create/edit work stays in `SidePanel`.
- Four class areas: Overview, Work, Sessions, People.
- Date and meal-slot first navigation.
- Dietary conflict visible before booking, never color-only.
- Explicit child scope for parent actions.
- Booking cutoff and cancellation/refund explanation next to actions.
- Fast service register with booked people and walk-ins.
- Integer minor-unit API values; locale-formatted TRY display.
- Reference hierarchy and density without copying branding, promotions, analytics,
  nested assignment trees, or unsupported trends.

## Rejected patterns

- Classroom Stream, announcements, invite codes, self-enrollment, materials feed,
  Meet links, guardian summaries, and course gradebook: no matching backend contract.
- SchoolCafé payment cards, gateway payments, auto-pay, nutrition calculations,
  favorites, ratings, and notifications: out of scope and would require new data.
- Menuvo QR service, multi-school management, MIS import, and same-day policy
  automation: backend supports one school, name lookup, and one explicit cutoff.

## Result

Research guides interaction shape only. Backend authorization, capacity, cutoff,
dietary conflict, and ledger rules remain authoritative.
