import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';

export function Modal(props: { open: boolean; title: string; descriptionId?: string; onClose: () => void; children: ReactNode }) {
	const titleId = useId();
	const panelRef = useRef<HTMLDivElement | null>(null);
	const restoreFocusRef = useRef<HTMLElement | null>(null);
	const bodyOverflowRef = useRef<string>('');
	const onCloseRef = useRef(props.onClose);

	useEffect(() => {
		onCloseRef.current = props.onClose;
	}, [props.onClose]);

	const getFocusableElements = (root: HTMLElement | null) => {
		if (!root) return [] as HTMLElement[];
		return Array.from(
			root.querySelectorAll<HTMLElement>(
				'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'
			)
		).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');
	};

	useEffect(() => {
		if (!props.open) return;
		restoreFocusRef.current = document.activeElement as HTMLElement | null;
		bodyOverflowRef.current = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onCloseRef.current();
			if (e.key === 'Tab') {
				const root = panelRef.current;
				if (!root) return;

				const focusable = getFocusableElements(root);
				if (!focusable.length) return;
				const first = focusable[0];
				const last = focusable[focusable.length - 1];

				const active = document.activeElement as HTMLElement | null;
				if (e.shiftKey) {
					if (active === first || !root.contains(active)) {
						e.preventDefault();
						last.focus();
					}
				} else {
					if (active === last) {
						e.preventDefault();
						first.focus();
					}
				}
			}
		};
		window.addEventListener('keydown', onKeyDown);

		requestAnimationFrame(() => {
			const root = panelRef.current;
			const focusable = getFocusableElements(root);
			if (!focusable.length) return;
			const first = focusable.find((el) => el.getAttribute('data-modal-close') !== 'true') ?? focusable[0];
			first?.focus();
		});

		return () => window.removeEventListener('keydown', onKeyDown);
	}, [props.open]);

	useEffect(() => {
		if (props.open) return;
		const prev = restoreFocusRef.current;
		if (prev) requestAnimationFrame(() => prev.focus());
		document.body.style.overflow = bodyOverflowRef.current;
	}, [props.open]);

	if (!props.open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center" role="presentation" aria-label="Modal overlay">
			<div className="absolute inset-0 bg-black/40" onClick={onCloseRef.current} aria-hidden="true" />
			<div
				ref={panelRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={props.descriptionId}
				className="relative w-full max-w-lg rounded-lg bg-neutral-0 p-4 shadow-xl"
			>
				<div className="flex items-center justify-between">
					<div id={titleId} className="text-base font-semibold">
						{props.title}
					</div>
					<button
						type="button"
						className="rounded-lg px-2 py-1 text-sm text-neutral-700 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
						data-modal-close="true"
						onClick={onCloseRef.current}
						aria-label="Close dialog"
					>
						Close
					</button>
				</div>
				<div className="mt-3">{props.children}</div>
			</div>
		</div>
	);
}
