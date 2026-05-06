import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: Variant;
};

export function Button({ variant = 'primary', className, ...props }: Props) {
	return (
		<button
			className={clsx(
				'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed',
				variant === 'primary' && 'bg-brand-600 text-white hover:bg-brand-500',
				variant === 'secondary' && 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200',
				variant === 'ghost' && 'bg-transparent text-neutral-700 hover:bg-neutral-100',
				className
			)}
			{...props}
		/>
	);
}
