import React, { ImgHTMLAttributes, useState, useEffect } from 'react';

interface SignatureImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onLoad' | 'onError'> {
	src: string | null;
	altText: string;
	removeBackground?: boolean;
	showNotUploadedMessage?: boolean;
	onLoad?: () => void;
	onError?: () => void;
}

/**
 * SignatureImage Component
 * Displays signature/stamp images with optional background removal
 * Handles loading states and error cases
 * Uses CSS blend modes (lighten/screen) to remove white backgrounds
 */
export const SignatureImage = React.forwardRef<HTMLDivElement, SignatureImageProps>(
	(
		{
			src,
			altText,
			removeBackground = true,
			showNotUploadedMessage = true,
			onLoad,
			onError,
			className,
			...props
		},
		ref
	) => {
		const [isLoading, setIsLoading] = useState(!!src);
		const [hasError, setHasError] = useState(false);
		const [retryCount, setRetryCount] = useState(0);
		const maxRetries = 3;

		// Reset states when src changes
		useEffect(() => {
			if (src) {
				setIsLoading(true);
				setHasError(false);
				setRetryCount(0);
			}
		}, [src]);

		const handleImageLoad = () => {
			setIsLoading(false);
			setHasError(false);
			onLoad?.();
		};

		const handleImageError = () => {
			setIsLoading(false);
			
			// Retry logic for transient failures
			if (retryCount < maxRetries) {
				setRetryCount(prev => prev + 1);
				// Don't mark as error, just let it retry
				return;
			}
			
			setHasError(true);
			onError?.();
			console.error(`Failed to load image: ${src}`);
		};

		const containerClass = `relative h-16 w-36 overflow-hidden rounded border border-dashed border-neutral-300 bg-white flex items-center justify-center ${
			isLoading ? 'signature-container loading' : 'signature-container'
		} ${hasError ? 'error' : ''} ${!isLoading && !hasError ? 'loaded' : ''} ${className || ''}`;

		return (
			<div ref={ref} className={containerClass}>
				{src && !hasError ? (
					<>
						{isLoading && (
							<div className="absolute inset-0 flex items-center justify-center bg-neutral-50 z-10">
								<div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600"></div>
							</div>
						)}
						<img
							key={`${src}-${retryCount}`}
							src={src}
							alt={altText}
							className={`max-h-full max-w-full object-contain transition-opacity duration-200 ${
								isLoading ? 'opacity-0' : 'opacity-100'
							} ${removeBackground ? 'mix-blend-lighten' : ''}`}
							style={
								removeBackground
									? {
										mixBlendMode: 'lighten',
										filter: 'contrast(1.1) brightness(0.95)'
									}
									: {}
							}
							onLoad={handleImageLoad}
							onError={handleImageError}
							{...props}
						/>
					</>
				) : (
					<span className="text-xs text-neutral-500 text-center px-2">
						{hasError ? 'Failed to load' : showNotUploadedMessage ? 'Not uploaded' : ''}
					</span>
				)}
			</div>
		);
	}
);

SignatureImage.displayName = 'SignatureImage';
