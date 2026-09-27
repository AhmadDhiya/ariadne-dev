import type * as React from 'react';

export type StatusKey = 'not-started' | 'progress' | 'fixing' | 'blocked' | 'hold' | 'request' | 'done' | 'routine';
export type PriorityKey = 'critical' | 'high' | 'medium' | 'low';
export declare const STATUSES: { key: StatusKey; label: string; held: boolean }[];
export declare const PRIORITIES: { key: PriorityKey; label: string; rank: number }[];

export interface IconProps { name: string; size?: number; title?: string; strokeWidth?: number; className?: string }
/** Line icon on a 24px grid, drawn in currentColor. */
export declare function Icon(props: IconProps): React.ReactElement;

export interface LogoProps { size?: number; subtitle?: string | false; markOnly?: boolean }
/** The Ariadne mark (labyrinth + thread) with the wordmark. */
export declare function Logo(props: LogoProps): React.ReactElement;
export declare function Mark(props: { size?: number }): React.ReactElement;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary' | 'secondary' | 'ghost'; size?: 'md' | 'sm'; icon?: string; iconEnd?: string }
/** Actions. One primary per view. */
export declare function Button(props: ButtonProps): React.ReactElement;

export interface IconButtonProps { icon: string; label: string; badge?: number; size?: 'md' | 'sm'; onClick?: () => void }
/** Icon-only button with an optional count badge. */
export declare function IconButton(props: IconButtonProps): React.ReactElement;

export interface NavItemProps { label: string; icon?: string; depth?: 0 | 1 | 2; expandable?: boolean; expanded?: boolean; active?: boolean; count?: number }
/** A sidebar row or project-tree node. */
export declare function NavItem(props: NavItemProps): React.ReactElement;

export interface SearchFieldProps { placeholder?: string; value?: string; shortcut?: string; width?: number | string }
/** Search input with a magnifier and optional keyboard hint. */
export declare function SearchField(props: SearchFieldProps): React.ReactElement;

export interface TabsProps { items: (string | { label: string })[]; active: string }
/** Underlined view switcher: Tabel | Gantt | Milestone | Anggota. */
export declare function Tabs(props: TabsProps): React.ReactElement;

export interface FilterChipProps { label: string; value?: string; count?: number; toggle?: boolean; active?: boolean }
/** Filter-bar dropdown chip or on/off toggle chip. */
export declare function FilterChip(props: FilterChipProps): React.ReactElement;

export interface StatusPillProps { status: StatusKey; select?: boolean; open?: boolean; className?: string }
/** A task's status: glyph + name in the status's soft fill. */
export declare function StatusPill(props: StatusPillProps): React.ReactElement;

export interface PriorityIconProps { priority: PriorityKey; showLabel?: boolean; size?: number }
/** Priority as a bare chevron/bar glyph, never a pill. */
export declare function PriorityIcon(props: PriorityIconProps): React.ReactElement;

export interface AvatarProps { name: string; size?: number; guest?: boolean }
/** Initials avatar; guests are outlined. */
export declare function Avatar(props: AvatarProps): React.ReactElement;
export declare function AvatarStack(props: { names: string[]; max?: number; size?: number }): React.ReactElement;

/** Neutral task label. */
export declare function Label(props: { children: React.ReactNode }): React.ReactElement;

export interface DueDateProps { children: React.ReactNode; overdue?: boolean; lateBy?: number }
/** A finish date; red with a calendar glyph when overdue. */
export declare function DueDate(props: DueDateProps): React.ReactElement;

export interface HoldTooltipProps { status: 'blocked' | 'hold' | 'request'; reason: string; waitingOn?: string; since?: string; open?: boolean }
/** Info trigger + card with the hold reason and who the task waits for. */
export declare function HoldTooltip(props: HoldTooltipProps): React.ReactElement;

export interface SummaryCardProps { label: string; value: React.ReactNode; icon?: string; tone?: 'danger' | 'held'; hint?: React.ReactNode }
/** A dashboard count card. */
export declare function SummaryCard(props: SummaryCardProps): React.ReactElement;

export interface BannerProps { kind: 'guest' | 'viewing'; children: React.ReactNode; action?: string; icon?: string }
/** Context strip: viewing as guest / viewing someone's dashboard. */
export declare function Banner(props: BannerProps): React.ReactElement;

export interface MenuItem { label?: string; status?: StatusKey; avatar?: string; icon?: string; meta?: string; selected?: boolean }
export interface MenuProps { items: MenuItem[]; activeIndex?: number; title?: string; query?: string; width?: number }
/** Floating list: status dropdown, @mention autocomplete, "Pindahkan ke…". */
export declare function Menu(props: MenuProps): React.ReactElement;

export interface ActivityItemProps { kind: 'update' | 'comment' | 'log' | 'internal'; author: string; time: string; guest?: boolean; icon?: string; children: React.ReactNode }
/** One entry of the task activity timeline. */
export declare function ActivityItem(props: ActivityItemProps): React.ReactElement;
/** An @mention inside comment text. */
export declare function Mention(props: { children: string }): React.ReactElement;

export interface GanttTrackProps { days: { weekend?: boolean }[]; dayWidth?: number; height?: number; children?: React.ReactNode }
/** The day grid of a Gantt row group; weekends hatched. */
export declare function GanttTrack(props: GanttTrackProps): React.ReactElement;
export interface GanttBarProps { status: StatusKey; start: number; span: number; label?: string; priority?: PriorityKey; overdue?: boolean; top?: number; dayWidth?: number }
/** A task bar: status fill + status glyph, label and priority glyph to the right. */
export declare function GanttBar(props: GanttBarProps): React.ReactElement;
/** Milestone diamond with its label. */
export declare function Milestone(props: { day: number; label: string; done?: boolean; top?: number; dayWidth?: number }): React.ReactElement;
/** The today line: Ariadne's thread with a knot. */
export declare function TodayMarker(props: { day: number; label?: string | false; dayWidth?: number }): React.ReactElement;

export interface WorkloadRowProps { name?: string; counts: number[]; weekends?: number[]; dayWidth?: number }
/** Active tasks per day as a heatmap strip, numbers always printed. */
export declare function WorkloadRow(props: WorkloadRowProps): React.ReactElement;

declare global { interface Window { Ariadne: typeof import('./index') } }
