import clsx from 'clsx';

export type TabItem = { id: string; label: string };

export function Tabs(props: { tabs: TabItem[]; activeId: string; onChange: (id: string) => void }) {
	const activeIndex = Math.max(
		0,
		props.tabs.findIndex((t) => t.id === props.activeId)
	);

	return (
		<div
			role="tablist"
			aria-orientation="horizontal"
			className="flex gap-2"
			onKeyDown={(e) => {
				if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
				e.preventDefault();

				let nextIndex = activeIndex;
				if (e.key === 'ArrowLeft') nextIndex = (activeIndex - 1 + props.tabs.length) % props.tabs.length;
				if (e.key === 'ArrowRight') nextIndex = (activeIndex + 1) % props.tabs.length;
				if (e.key === 'Home') nextIndex = 0;
				if (e.key === 'End') nextIndex = props.tabs.length - 1;
				props.onChange(props.tabs[nextIndex]!.id);
			}}
		>
			{props.tabs.map((t) => (
				<button
					key={t.id}
					role="tab"
					aria-selected={props.activeId === t.id}
					id={`tab-${t.id}`}
					aria-controls={`panel-${t.id}`}
					tabIndex={props.activeId === t.id ? 0 : -1}
					className={clsx(
						'rounded-lg px-3 py-2 text-sm',
						props.activeId === t.id ? 'bg-brand-600 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
					)}
					onClick={() => props.onChange(t.id)}
				>
					{t.label}
				</button>
			))}
		</div>
	);
}
