import clsx from 'clsx';
import type { ReactNode } from 'react';

export type Column<T> = {
	key: string;
	header: ReactNode;
	cell: (row: T) => ReactNode;
	className?: string;
};

export function Table<T>(props: {
	columns: Column<T>[];
	rows: T[];
	onRowClick?: (row: T) => void;
	getRowKey?: (row: T) => string;
	rowAriaLabel?: (row: T) => string;
	caption?: string;
	ariaLabel?: string;
}) {
	return (
		<div className="overflow-auto rounded-lg border border-neutral-200 bg-neutral-0">
			<table className="min-w-full text-sm" aria-label={props.ariaLabel}>
				{props.caption ? <caption className="sr-only">{props.caption}</caption> : null}
				<thead className="bg-neutral-50 text-neutral-700">
					<tr>
						{props.columns.map((c) => (
							<th scope="col" key={c.key} className={clsx('px-3 py-2 text-left font-medium', c.className)}>
								{c.header}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{props.rows.map((r, idx) => (
						<tr
							key={props.getRowKey ? props.getRowKey(r) : String(idx)}
							className={clsx(
								'border-t border-neutral-100',
								props.onRowClick && 'cursor-pointer hover:bg-neutral-50'
							)}
							onClick={() => props.onRowClick?.(r)}
							tabIndex={props.onRowClick ? 0 : undefined}
							aria-label={props.onRowClick && props.rowAriaLabel ? props.rowAriaLabel(r) : undefined}
							onKeyDown={(e) => {
								if (!props.onRowClick) return;
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									props.onRowClick(r);
								}
							}}
						>
							{props.columns.map((c) => (
								<td key={c.key} className={clsx('px-3 py-2', c.className)}>
									{c.cell(r)}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
