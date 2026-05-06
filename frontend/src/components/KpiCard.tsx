import type { ReactNode } from 'react';

type Color = 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'teal';

const colorMap: Record<Color, { border: string; iconBg: string; iconText: string }> = {
	blue:   { border: '#3b82f6', iconBg: '#eff6ff', iconText: '#2563eb' },
	green:  { border: '#22c55e', iconBg: '#f0fdf4', iconText: '#16a34a' },
	red:    { border: '#ef4444', iconBg: '#fef2f2', iconText: '#dc2626' },
	amber:  { border: '#f59e0b', iconBg: '#fffbeb', iconText: '#d97706' },
	purple: { border: '#a855f7', iconBg: '#faf5ff', iconText: '#9333ea' },
	teal:   { border: '#14b8a6', iconBg: '#f0fdfa', iconText: '#0d9488' },
};

export function KpiCard(props: {
	label: string;
	value: string | number;
	icon?: ReactNode;
	color?: Color;
	sublabel?: string;
}) {
	const c = colorMap[props.color ?? 'blue'];
	const isLoading = props.value === '—';

	return (
		<div
			className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
			style={{ borderLeft: `4px solid ${c.border}` }}
		>
			<div className="flex items-start justify-between gap-3 p-5">
				<div className="min-w-0 flex-1">
					<p className="truncate text-xs font-semibold uppercase tracking-wide text-neutral-500">
						{props.label}
					</p>
					<p className={`mt-2 text-3xl font-bold ${isLoading ? 'text-neutral-300' : 'text-neutral-900'}`}>
						{props.value}
					</p>
					{props.sublabel && (
						<p className="mt-1 text-xs text-neutral-400">{props.sublabel}</p>
					)}
				</div>
				{props.icon && (
					<div
						className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
						style={{ background: c.iconBg, color: c.iconText }}
					>
						{props.icon}
					</div>
				)}
			</div>
		</div>
	);
}
