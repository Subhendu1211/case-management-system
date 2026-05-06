import fs from 'fs';
import path from 'path';

/**
 * Process signature/stamp images to remove white/light backgrounds
 * Uses CSS/SVG approach by embedding the image with filter
 * For production, consider using 'sharp' or 'jimp' library
 */
export async function processSignatureImage(
	filePath: string,
	options: {
		removeBackground?: boolean;
		targetPath?: string;
	} = {}
): Promise<string> {
	try {
		// For now, return the original path
		// The background removal will be handled client-side via CSS
		// when a library like jimp is added, update this function
		return filePath;
	} catch (error) {
		console.error('Image processing error:', error);
		// Return original if processing fails
		return filePath;
	}
}

/**
 * Create an SVG wrapper that applies CSS filters to remove white background
 * This is a client-side solution that works with existing images
 */
export function generateSignatureImageWithFilter(imageUrl: string): string {
	// This URL will be used to generate a data URI with filters applied
	// For now, return the URL as-is
	// The filtering will be handled via CSS background-blend-mode
	return imageUrl;
}

/**
 * Validate if file is a valid image
 */
export function isValidImageFile(file: Express.Multer.File): boolean {
	const validMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
	const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

	const ext = path.extname(file.originalname).toLowerCase();
	return validMimeTypes.includes(file.mimetype) && validExtensions.includes(ext);
}

/**
 * Get image dimensions (for validation)
 */
export async function getImageDimensions(
	filePath: string
): Promise<{ width: number; height: number } | null> {
	try {
		// This would require image processing library
		// For now, return null
		return null;
	} catch (error) {
		console.error('Error getting image dimensions:', error);
		return null;
	}
}
