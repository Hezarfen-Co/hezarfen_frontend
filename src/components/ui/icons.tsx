import type { JSX } from "solid-js";
import { cn } from "@/lib/cn";
import arrowSquareOutUrl from "@phosphor-icons/core/regular/arrow-square-out.svg?url";
import bellUrl from "@phosphor-icons/core/regular/bell.svg?url";
import bookOpenUrl from "@phosphor-icons/core/regular/book-open.svg?url";
import calendarDotsUrl from "@phosphor-icons/core/regular/calendar-dots.svg?url";
import calendarBlankUrl from "@phosphor-icons/core/regular/calendar-blank.svg?url";
import calendarCheckUrl from "@phosphor-icons/core/regular/calendar-check.svg?url";
import calendarStarUrl from "@phosphor-icons/core/regular/calendar-star.svg?url";
import clockUserUrl from "@phosphor-icons/core/regular/clock-user.svg?url";
import handshakeUrl from "@phosphor-icons/core/regular/handshake.svg?url";
import listChecksUrl from "@phosphor-icons/core/regular/list-checks.svg?url";
import timerUrl from "@phosphor-icons/core/regular/timer.svg?url";
import caretDownUrl from "@phosphor-icons/core/regular/caret-down.svg?url";
import chalkboardTeacherUrl from "@phosphor-icons/core/regular/chalkboard-teacher.svg?url";
import chartPieUrl from "@phosphor-icons/core/regular/chart-pie.svg?url";
import caretLeftUrl from "@phosphor-icons/core/regular/caret-left.svg?url";
import caretRightUrl from "@phosphor-icons/core/regular/caret-right.svg?url";
import caretUpDownUrl from "@phosphor-icons/core/regular/caret-up-down.svg?url";
import chartBarUrl from "@phosphor-icons/core/regular/chart-bar.svg?url";
import chartLineUpUrl from "@phosphor-icons/core/regular/chart-line-up.svg?url";
import chatCircleDotsUrl from "@phosphor-icons/core/regular/chat-circle-dots.svg?url";
import checkCircleUrl from "@phosphor-icons/core/regular/check-circle.svg?url";
import checkUrl from "@phosphor-icons/core/regular/check.svg?url";
import clockUrl from "@phosphor-icons/core/regular/clock.svg?url";
import clipboardTextUrl from "@phosphor-icons/core/regular/clipboard-text.svg?url";
import copyUrl from "@phosphor-icons/core/regular/copy.svg?url";
import downloadSimpleUrl from "@phosphor-icons/core/regular/download-simple.svg?url";
import examUrl from "@phosphor-icons/core/regular/exam.svg?url";
import eyeUrl from "@phosphor-icons/core/regular/eye.svg?url";
import fileTextUrl from "@phosphor-icons/core/regular/file-text.svg?url";
import funnelUrl from "@phosphor-icons/core/regular/funnel.svg?url";
import gearUrl from "@phosphor-icons/core/regular/gear.svg?url";
import userCircleUrl from "@phosphor-icons/core/regular/user-circle.svg?url";
import graduationCapUrl from "@phosphor-icons/core/regular/graduation-cap.svg?url";
import houseUrl from "@phosphor-icons/core/regular/house.svg?url";
import listUrl from "@phosphor-icons/core/regular/list.svg?url";
import lockSimpleUrl from "@phosphor-icons/core/regular/lock-simple.svg?url";
import magnifyingGlassUrl from "@phosphor-icons/core/regular/magnifying-glass.svg?url";
import packageUrl from "@phosphor-icons/core/regular/package.svg?url";
import paperPlaneTiltUrl from "@phosphor-icons/core/regular/paper-plane-tilt.svg?url";
import pencilSimpleUrl from "@phosphor-icons/core/regular/pencil-simple.svg?url";
import plusUrl from "@phosphor-icons/core/regular/plus.svg?url";
import questionUrl from "@phosphor-icons/core/regular/question.svg?url";
import scanUrl from "@phosphor-icons/core/regular/scan.svg?url";
import shieldCheckUrl from "@phosphor-icons/core/regular/shield-check.svg?url";
import sidebarSimpleUrl from "@phosphor-icons/core/regular/sidebar-simple.svg?url";
import signOutUrl from "@phosphor-icons/core/regular/sign-out.svg?url";
import sparkleUrl from "@phosphor-icons/core/regular/sparkle.svg?url";
import targetUrl from "@phosphor-icons/core/regular/target.svg?url";
import trashUrl from "@phosphor-icons/core/regular/trash.svg?url";
import uploadSimpleUrl from "@phosphor-icons/core/regular/upload-simple.svg?url";
import usersUrl from "@phosphor-icons/core/regular/users.svg?url";
import warningUrl from "@phosphor-icons/core/regular/warning.svg?url";
import waveformUrl from "@phosphor-icons/core/regular/waveform.svg?url";
import playFillUrl from "@phosphor-icons/core/fill/play-fill.svg?url";
import pauseFillUrl from "@phosphor-icons/core/fill/pause-fill.svg?url";
import arrowCounterClockwiseUrl from "@phosphor-icons/core/regular/arrow-counter-clockwise.svg?url";
import arrowClockwiseUrl from "@phosphor-icons/core/regular/arrow-clockwise.svg?url";
import speakerHighUrl from "@phosphor-icons/core/regular/speaker-high.svg?url";
import speakerLowUrl from "@phosphor-icons/core/regular/speaker-low.svg?url";
import speakerXUrl from "@phosphor-icons/core/regular/speaker-x.svg?url";
import subtitlesUrl from "@phosphor-icons/core/regular/subtitles.svg?url";
import wifiHighUrl from "@phosphor-icons/core/regular/wifi-high.svg?url";
import wifiSlashUrl from "@phosphor-icons/core/regular/wifi-slash.svg?url";
import xUrl from "@phosphor-icons/core/regular/x.svg?url";
import textBUrl from "@phosphor-icons/core/regular/text-b.svg?url";
import textItalicUrl from "@phosphor-icons/core/regular/text-italic.svg?url";
import textUnderlineUrl from "@phosphor-icons/core/regular/text-underline.svg?url";
import textStrikethroughUrl from "@phosphor-icons/core/regular/text-strikethrough.svg?url";
import textHTwoUrl from "@phosphor-icons/core/regular/text-h-two.svg?url";
import textHThreeUrl from "@phosphor-icons/core/regular/text-h-three.svg?url";
import textTUrl from "@phosphor-icons/core/regular/text-t.svg?url";
import listBulletsUrl from "@phosphor-icons/core/regular/list-bullets.svg?url";
import listNumbersUrl from "@phosphor-icons/core/regular/list-numbers.svg?url";
import quotesUrl from "@phosphor-icons/core/regular/quotes.svg?url";
import codeBlockUrl from "@phosphor-icons/core/regular/code-block.svg?url";
import linkSimpleUrl from "@phosphor-icons/core/regular/link-simple.svg?url";
import arrowUUpLeftUrl from "@phosphor-icons/core/regular/arrow-u-up-left.svg?url";
import arrowUUpRightUrl from "@phosphor-icons/core/regular/arrow-u-up-right.svg?url";

export type IconProps = {
  class?: string;
};

/** Exact Phosphor Regular artwork used by the Figma icon library. A mask keeps
 * the source SVG local while allowing the icon to inherit the current color. */
function PhosphorIcon(props: IconProps & { src: string }) {
  return (
    <span
      aria-hidden="true"
      class={cn("inline-block h-4 w-4 shrink-0 bg-current", props.class)}
      style={{
        "mask-image": `url("${props.src}")`,
        "mask-position": "center",
        "mask-repeat": "no-repeat",
        "mask-size": "contain",
        "-webkit-mask-image": `url("${props.src}")`,
        "-webkit-mask-position": "center",
        "-webkit-mask-repeat": "no-repeat",
        "-webkit-mask-size": "contain",
      }}
    />
  );
}

/** Shared stroke system: 24 grid, 2px stroke, round caps/joins (Lucide geometry). */
function Svg(props: IconProps & { children: JSX.Element }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden
      class={cn("h-4 w-4 shrink-0", props.class)}
    >
      {props.children}
    </svg>
  );
}

export function IconLogout(props: IconProps) {
  return <PhosphorIcon {...props} src={signOutUrl} />;
}

export function IconTrash(props: IconProps) {
  return <PhosphorIcon {...props} src={trashUrl} />;
}

export function IconLock(props: IconProps) {
  return <PhosphorIcon {...props} src={lockSimpleUrl} />;
}

/** Delete-whole-series: a calendar with an ✕ — distinct silhouette from the
 *  single-slot trash, signalling "remove these recurring dated slots". */
export function IconCalendarX(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 2v3" />
      <path d="M16 2v3" />
      <rect x="3" y="4.5" width="18" height="16.5" rx="2" />
      <path d="M3 9.5h18" />
      <path d="m9.5 13 5 5" />
      <path d="m14.5 13-5 5" />
    </Svg>
  );
}

export function IconArchive(props: IconProps) {
  return (
    <Svg {...props}>
      <rect width="20" height="5" x="2" y="3" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </Svg>
  );
}

export function IconSend(props: IconProps) {
  return <PhosphorIcon {...props} src={paperPlaneTiltUrl} />;
}

export function IconMessage(props: IconProps) {
  return <PhosphorIcon {...props} src={chatCircleDotsUrl} />;
}

export function IconBotSquare(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="M8 10h1" />
      <path d="M15 10h1" />
      <path d="M9 14h6" />
    </Svg>
  );
}

export function IconCheck(props: IconProps) {
  return <PhosphorIcon {...props} src={checkUrl} />;
}

export function IconCopy(props: IconProps) {
  return <PhosphorIcon {...props} src={copyUrl} />;
}

export function IconX(props: IconProps) {
  return <PhosphorIcon {...props} src={xUrl} />;
}

export function IconAlert(props: IconProps) {
  return <PhosphorIcon {...props} src={warningUrl} />;
}

export function IconSave(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
      <path d="M7 3v4a1 1 0 0 0 1 1h7" />
    </Svg>
  );
}

export function IconEdit(props: IconProps) {
  return <PhosphorIcon {...props} src={pencilSimpleUrl} />;
}

export function IconEraser(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" />
      <path d="m5 11 9 9" />
    </Svg>
  );
}

export function IconMove(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 9l-3 3 3 3" />
      <path d="M9 5l3-3 3 3" />
      <path d="M15 19l-3 3-3-3" />
      <path d="M19 9l3 3-3 3" />
      <path d="M2 12h20" />
      <path d="M12 2v20" />
    </Svg>
  );
}

export function IconGrid(props: IconProps) {
  return (
    <Svg {...props}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M9 3v18" />
      <path d="M15 3v18" />
    </Svg>
  );
}

export function IconRuled(props: IconProps) {
  return (
    <Svg {...props}>
      <line x1="4" y1="5" x2="20" y2="5" />
      <line x1="4" y1="10" x2="20" y2="10" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="4" y1="19" x2="20" y2="19" />
    </Svg>
  );
}

export function IconSquareOff(props: IconProps) {
  return (
    <Svg {...props}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="m3 21 18-18" />
    </Svg>
  );
}

export function IconUndo(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </Svg>
  );
}

export function IconPlus(props: IconProps) {
  return <PhosphorIcon {...props} src={plusUrl} />;
}

export function IconDownload(props: IconProps) {
  return <PhosphorIcon {...props} src={downloadSimpleUrl} />;
}

export function IconSun(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </Svg>
  );
}

export function IconMoon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9" />
    </Svg>
  );
}

export function IconZoomIn(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" x2="16.65" y1="21" y2="16.65" />
      <line x1="11" x2="11" y1="8" y2="14" />
      <line x1="8" x2="14" y1="11" y2="11" />
    </Svg>
  );
}

/** lucide "maximize" — four outward corners. */
export function IconMaximize(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </Svg>
  );
}

/** lucide "minimize" — four inward corners. */
export function IconMinimize(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
    </Svg>
  );
}

export function IconZoomOut(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" x2="16.65" y1="21" y2="16.65" />
      <line x1="8" x2="14" y1="11" y2="11" />
    </Svg>
  );
}

export function IconHelpCircle(props: IconProps) {
  return <PhosphorIcon {...props} src={questionUrl} />;
}

export function IconMessagePlus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M12 7v6" />
      <path d="M9 10h6" />
    </Svg>
  );
}

export function IconPhoto(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </Svg>
  );
}

export function IconGlobe(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </Svg>
  );
}

export function IconChevronLeft(props: IconProps) {
  return <PhosphorIcon {...props} src={caretLeftUrl} />;
}

export function IconChevronRight(props: IconProps) {
  return <PhosphorIcon {...props} src={caretRightUrl} />;
}

export function IconChevronDown(props: IconProps) {
  return <PhosphorIcon {...props} src={caretDownUrl} />;
}

export function IconArrowUp(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </Svg>
  );
}

export function IconArrowDown(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </Svg>
  );
}

export function IconChevronsUpDown(props: IconProps) {
  return <PhosphorIcon {...props} src={caretUpDownUrl} />;
}

export function IconHome(props: IconProps) {
  return <PhosphorIcon {...props} src={houseUrl} />;
}

export function IconNote(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </Svg>
  );
}

export function IconFileImage(props: IconProps) {
  return (
    <Svg {...props}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
    </Svg>
  );
}

export function IconFileVideo(props: IconProps) {
  return (
    <Svg {...props}>
      <rect width="18" height="14" x="3" y="5" rx="2" />
      <path d="m10 9 5 3-5 3Z" />
    </Svg>
  );
}

export function IconFileAudio(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </Svg>
  );
}

export function IconFileText(props: IconProps) {
  return <PhosphorIcon {...props} src={fileTextUrl} />;
}

export function IconHomework(props: IconProps) {
  return <PhosphorIcon {...props} src={clipboardTextUrl} />;
}

export function IconFileSpreadsheet(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M8 13h8" />
      <path d="M8 17h8" />
      <path d="M11 10v10" />
    </Svg>
  );
}

export function IconCalendar(props: IconProps) {
  return <PhosphorIcon {...props} src={calendarDotsUrl} />;
}

export function IconCalendarDays(props: IconProps) {
  return <PhosphorIcon {...props} src={calendarDotsUrl} />;
}

export function IconClock(props: IconProps) {
  return <PhosphorIcon {...props} src={clockUrl} />;
}

export function IconCalendarBlank(props: IconProps) {
  return <PhosphorIcon {...props} src={calendarBlankUrl} />;
}

export function IconCalendarCheck(props: IconProps) {
  return <PhosphorIcon {...props} src={calendarCheckUrl} />;
}

export function IconCalendarStar(props: IconProps) {
  return <PhosphorIcon {...props} src={calendarStarUrl} />;
}

export function IconClockUser(props: IconProps) {
  return <PhosphorIcon {...props} src={clockUserUrl} />;
}

export function IconHandshake(props: IconProps) {
  return <PhosphorIcon {...props} src={handshakeUrl} />;
}

export function IconListChecks(props: IconProps) {
  return <PhosphorIcon {...props} src={listChecksUrl} />;
}

export function IconTimer(props: IconProps) {
  return <PhosphorIcon {...props} src={timerUrl} />;
}

export function IconExam(props: IconProps) {
  return <PhosphorIcon {...props} src={examUrl} />;
}

export function IconGuide(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </Svg>
  );
}

export function IconUsers(props: IconProps) {
  return <PhosphorIcon {...props} src={usersUrl} />;
}

export function IconMenu(props: IconProps) {
  return <PhosphorIcon {...props} src={listUrl} />;
}

export function IconDotsVertical(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconPanelLeft(props: IconProps) {
  return <PhosphorIcon {...props} src={sidebarSimpleUrl} />;
}

export function IconBook(props: IconProps) {
  return <PhosphorIcon {...props} src={bookOpenUrl} />;
}

export function IconEye(props: IconProps) {
  return <PhosphorIcon {...props} src={eyeUrl} />;
}

export function IconEyeOff(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-4.86" />
      <path d="m2 2 20 20" />
    </Svg>
  );
}

export function IconChart(props: IconProps) {
  return <PhosphorIcon {...props} src={chartBarUrl} />;
}

export function IconSchool(props: IconProps) {
  return <PhosphorIcon {...props} src={graduationCapUrl} />;
}

export function IconClipboardCheck(props: IconProps) {
  return <PhosphorIcon {...props} src={checkCircleUrl} />;
}

export function IconReportAnalytics(props: IconProps) {
  return <PhosphorIcon {...props} src={chartLineUpUrl} />;
}

export function IconUserCircle(props: IconProps) {
  return <PhosphorIcon {...props} src={userCircleUrl} />;
}

export function IconSettings(props: IconProps) {
  return <PhosphorIcon {...props} src={gearUrl} />;
}

export function IconUserCog(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="18" cy="15" r="3" />
      <circle cx="9" cy="7" r="4" />
      <path d="M10 15H6a4 4 0 0 0-4 4v2" />
      <path d="m21.7 16.4-.9-.3" />
      <path d="m15.2 13.9-.9-.3" />
      <path d="m16.6 18.7.3-.9" />
      <path d="m19.1 12.2.3-.9" />
      <path d="m19.6 18.7-.4-1" />
      <path d="m16.8 12.3-.4-1" />
      <path d="m14.3 16.6 1-.4" />
      <path d="m20.7 13.8 1-.4" />
    </Svg>
  );
}

export function IconBriefcase(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      <rect width="20" height="14" x="2" y="6" rx="2" />
    </Svg>
  );
}

export function IconUtensils(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 2v7a3 3 0 0 0 3 3V2" />
      <path d="M3 6h3" />
      <path d="M6 12v10" />
      <path d="M17 2v20" />
      <path d="M17 2c3 2 4 5 4 8h-4" />
    </Svg>
  );
}

export function IconSearch(props: IconProps) {
  return <PhosphorIcon {...props} src={magnifyingGlassUrl} />;
}

export function IconSparkles(props: IconProps) {
  return <PhosphorIcon {...props} src={sparkleUrl} />;
}

export function IconUploadCloud(props: IconProps) {
  return <PhosphorIcon {...props} src={uploadSimpleUrl} />;
}

export function IconFilter(props: IconProps) {
  return <PhosphorIcon {...props} src={funnelUrl} />;
}

export function IconRotateCcw(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </Svg>
  );
}

export function IconChevronUp(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m18 15-6-6-6 6" />
    </Svg>
  );
}

export function IconRefresh(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 21h5v-5" />
    </Svg>
  );
}

export function IconExternalLink(props: IconProps) {
  return <PhosphorIcon {...props} src={arrowSquareOutUrl} />;
}

export function IconBell(props: IconProps) {
  return <PhosphorIcon {...props} src={bellUrl} />;
}

export function IconChalkboardTeacher(props: IconProps) {
  return <PhosphorIcon {...props} src={chalkboardTeacherUrl} />;
}

export function IconChartPie(props: IconProps) {
  return <PhosphorIcon {...props} src={chartPieUrl} />;
}

export function IconPackage(props: IconProps) {
  return <PhosphorIcon {...props} src={packageUrl} />;
}

export function IconScan(props: IconProps) {
  return <PhosphorIcon {...props} src={scanUrl} />;
}

export function IconShieldCheck(props: IconProps) {
  return <PhosphorIcon {...props} src={shieldCheckUrl} />;
}

export function IconTarget(props: IconProps) {
  return <PhosphorIcon {...props} src={targetUrl} />;
}

export function IconWaveform(props: IconProps) {
  return <PhosphorIcon {...props} src={waveformUrl} />;
}

export function IconPlay(props: IconProps) {
  return <PhosphorIcon {...props} src={playFillUrl} />;
}

export function IconPause(props: IconProps) {
  return <PhosphorIcon {...props} src={pauseFillUrl} />;
}

export function IconSkipBack(props: IconProps) {
  return <PhosphorIcon {...props} src={arrowCounterClockwiseUrl} />;
}

export function IconSkipForward(props: IconProps) {
  return <PhosphorIcon {...props} src={arrowClockwiseUrl} />;
}

export function IconVolume(props: IconProps) {
  return <PhosphorIcon {...props} src={speakerHighUrl} />;
}

export function IconVolumeLow(props: IconProps) {
  return <PhosphorIcon {...props} src={speakerLowUrl} />;
}

export function IconVolumeMute(props: IconProps) {
  return <PhosphorIcon {...props} src={speakerXUrl} />;
}

export function IconTranscript(props: IconProps) {
  return <PhosphorIcon {...props} src={subtitlesUrl} />;
}

export function IconWifi(props: IconProps) {
  return <PhosphorIcon {...props} src={wifiHighUrl} />;
}

export function IconWifiOff(props: IconProps) {
  return <PhosphorIcon {...props} src={wifiSlashUrl} />;
}

export function IconBold(props: IconProps) {
  return <PhosphorIcon {...props} src={textBUrl} />;
}

export function IconItalic(props: IconProps) {
  return <PhosphorIcon {...props} src={textItalicUrl} />;
}

export function IconUnderline(props: IconProps) {
  return <PhosphorIcon {...props} src={textUnderlineUrl} />;
}

export function IconStrikethrough(props: IconProps) {
  return <PhosphorIcon {...props} src={textStrikethroughUrl} />;
}

export function IconHeading2(props: IconProps) {
  return <PhosphorIcon {...props} src={textHTwoUrl} />;
}

export function IconHeading3(props: IconProps) {
  return <PhosphorIcon {...props} src={textHThreeUrl} />;
}

export function IconParagraph(props: IconProps) {
  return <PhosphorIcon {...props} src={textTUrl} />;
}

export function IconListBullets(props: IconProps) {
  return <PhosphorIcon {...props} src={listBulletsUrl} />;
}

export function IconListNumbers(props: IconProps) {
  return <PhosphorIcon {...props} src={listNumbersUrl} />;
}

export function IconQuote(props: IconProps) {
  return <PhosphorIcon {...props} src={quotesUrl} />;
}

export function IconCodeBlock(props: IconProps) {
  return <PhosphorIcon {...props} src={codeBlockUrl} />;
}

export function IconLink(props: IconProps) {
  return <PhosphorIcon {...props} src={linkSimpleUrl} />;
}

export function IconArrowUndo(props: IconProps) {
  return <PhosphorIcon {...props} src={arrowUUpLeftUrl} />;
}

export function IconArrowRedo(props: IconProps) {
  return <PhosphorIcon {...props} src={arrowUUpRightUrl} />;
}
