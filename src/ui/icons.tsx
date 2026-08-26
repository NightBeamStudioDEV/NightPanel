import type { ReactElement, SVGProps } from "react";
import type { ViewId } from "../protocol/types";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 18, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconOverview(props: IconProps) {
  return <Svg {...props}><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="5" rx="1.5" /><rect x="13" y="10" width="8" height="11" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /></Svg>;
}
export function IconAlerts(props: IconProps) {
  return <Svg {...props}><path d="M12 3 21 19H3L12 3Z" /><path d="M12 10v4" /><path d="M12 17h.01" /></Svg>;
}
export function IconPlayers(props: IconProps) {
  return <Svg {...props}><circle cx="9" cy="8" r="3" /><path d="M3 19c0-3 2.5-5 6-5s6 2 6 5" /><circle cx="17" cy="9" r="2.2" /><path d="M16.5 19c.3-2.2 1.8-3.6 3.5-4" /></Svg>;
}
export function IconChecks(props: IconProps) {
  return <Svg {...props}><path d="M5 12l4 4 10-10" /></Svg>;
}
export function IconAnalytics(props: IconProps) {
  return <Svg {...props}><path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="M22 19v-4" /></Svg>;
}
export function IconServers(props: IconProps) {
  return <Svg {...props}><rect x="3" y="4" width="18" height="6" rx="1.5" /><rect x="3" y="14" width="18" height="6" rx="1.5" /><circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" /><circle cx="7" cy="17" r="1" fill="currentColor" stroke="none" /></Svg>;
}
export function IconAudit(props: IconProps) {
  return <Svg {...props}><path d="M8 7h8" /><path d="M8 12h8" /><path d="M8 17h5" /><rect x="4" y="3" width="16" height="18" rx="2" /></Svg>;
}
export function IconAccess(props: IconProps) {
  return <Svg {...props}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Svg>;
}
export function IconLogs(props: IconProps) {
  return <Svg {...props}><path d="M5 6h6" /><path d="M5 12h14" /><path d="M5 18h10" /><path d="M16 6l3 2-3 2" /></Svg>;
}
export function IconSettings(props: IconProps) {
  return <Svg {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></Svg>;
}
export function IconPlus(props: IconProps) {
  return <Svg {...props}><path d="M12 5v14" /><path d="M5 12h14" /></Svg>;
}
export function IconUser(props: IconProps) {
  return <Svg {...props}><circle cx="12" cy="8" r="3.2" /><path d="M5 19c0-3.3 3-5.5 7-5.5s7 2.2 7 5.5" /></Svg>;
}
export function IconLock(props: IconProps) {
  return <Svg {...props}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Svg>;
}
export function IconLink(props: IconProps) {
  return <Svg {...props}><path d="M10 13a5 5 0 0 0 7.5.1l1.4-1.4a5 5 0 0 0-7.1-7.1L10.5 6" /><path d="M14 11a5 5 0 0 0-7.5-.1L5.1 12.3a5 5 0 0 0 7.1 7.1L13.5 18" /></Svg>;
}
export function IconSearch(props: IconProps) {
  return <Svg {...props}><circle cx="11" cy="11" r="6" /><path d="M20 20l-3.5-3.5" /></Svg>;
}
export function IconMinimize(props: IconProps) {
  return <Svg {...props} size={12}><path d="M5 12h14" strokeWidth="2.2" /></Svg>;
}
export function IconMaximize(props: IconProps) {
  return <Svg {...props} size={12}><rect x="6" y="6" width="12" height="12" rx="2" strokeWidth="2" /></Svg>;
}
export function IconRestore(props: IconProps) {
  return (
    <Svg {...props} size={12}>
      <rect x="8" y="4" width="10" height="10" rx="1.5" strokeWidth="1.8" />
      <rect x="4" y="8" width="10" height="10" rx="1.5" strokeWidth="1.8" />
    </Svg>
  );
}
export function IconClose(props: IconProps) {
  return <Svg {...props} size={12}><path d="M6 6l12 12" strokeWidth="2.2" /><path d="M18 6L6 18" strokeWidth="2.2" /></Svg>;
}

export const NAV_ICONS: Record<ViewId, (props: IconProps) => ReactElement> = {
  overview: IconOverview,
  alerts: IconAlerts,
  players: IconPlayers,
  checks: IconChecks,
  analytics: IconAnalytics,
  servers: IconServers,
  audit: IconAudit,
  access: IconAccess,
  logs: IconLogs,
  settings: IconSettings,
} as const;
