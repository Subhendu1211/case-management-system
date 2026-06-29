import fs from 'node:fs';
import path from 'node:path';
import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { HttpError } from './httpError.js';

type UploadFile = Express.Multer.File;

type AllowedFile = {
	extensions: string[];
	mimeType: string;
	match: (buffer: Buffer) => boolean;
};

const allowedFiles: AllowedFile[] = [
	{
		extensions: ['.pdf'],
		mimeType: 'application/pdf',
		match: (buffer) => buffer.subarray(0, 5).toString('latin1') === '%PDF-'
	},
	{
		extensions: ['.png'],
		mimeType: 'image/png',
		match: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
	},
	{
		extensions: ['.jpg', '.jpeg'],
		mimeType: 'image/jpeg',
		match: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
	},
	{
		extensions: ['.webp'],
		mimeType: 'image/webp',
		match: (buffer) =>
			buffer.length >= 12 &&
			buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
			buffer.subarray(8, 12).toString('latin1') === 'WEBP'
	}
];

const pdfActiveContentPattern = /\/(JavaScript|JS|AA|OpenAction|Launch|RichMedia|SubmitForm|GoToE|EmbeddedFile|Encrypt)\b/i;

export type ValidatedUpload = {
	file: UploadFile;
	fileName: string;
	mimeType: string;
	storageKey: string;
};

export function resolveUploadDirAbs() {
	return path.isAbsolute(env.UPLOAD_DIR) ? env.UPLOAD_DIR : path.resolve(process.cwd(), env.UPLOAD_DIR);
}

export function uploadFileFilter(
	_req: Request,
	file: Express.Multer.File,
	cb: (error: Error | null, acceptFile?: boolean) => void
) {
	const extension = path.extname(file.originalname).toLowerCase();
	const allowed = allowedFiles.some((entry) => entry.extensions.includes(extension));
	if (!allowed) {
		return cb(new HttpError(400, 'Only PDF, PNG, JPG, JPEG, and WEBP files are allowed.'));
	}
	cb(null, true);
}

export async function cleanupUploadedFiles(files: UploadFile[]) {
	await Promise.all(
		files.map(async (file) => {
			if (!file.path) return;
			await fs.promises.unlink(file.path).catch(() => undefined);
		})
	);
}

export async function validateUploadedFiles(files: UploadFile[]): Promise<ValidatedUpload[]> {
	try {
		const validated: ValidatedUpload[] = [];
		for (const file of files) {
			const extension = path.extname(file.originalname).toLowerCase();
			const allowed = allowedFiles.find((entry) => entry.extensions.includes(extension));
			if (!allowed) {
				throw new HttpError(400, 'Only PDF, PNG, JPG, JPEG, and WEBP files are allowed.');
			}

			const buffer = await fs.promises.readFile(file.path);
			if (!allowed.match(buffer)) {
				throw new HttpError(400, `Uploaded file ${safeDownloadName(file.originalname)} does not match its declared type.`);
			}

			if (extension === '.pdf') {
				const pdfText = buffer.toString('latin1');
				if (pdfActiveContentPattern.test(pdfText)) {
					throw new HttpError(400, `Uploaded PDF ${safeDownloadName(file.originalname)} contains active or embedded content.`);
				}
			}

			validated.push({
				file,
				fileName: safeDownloadName(file.originalname),
				mimeType: allowed.mimeType,
				storageKey: storageKeyFor(file.path)
			});
		}
		return validated;
	} catch (error) {
		await cleanupUploadedFiles(files);
		throw error;
	}
}

export function storageKeyFor(filePath: string) {
	return path.relative(resolveUploadDirAbs(), filePath).replace(/\\/g, '/');
}

export function resolveStoredFilePath(storageKey: string) {
	const baseDir = resolveUploadDirAbs();
	const filePath = path.resolve(baseDir, storageKey);
	const relative = path.relative(baseDir, filePath);
	if (relative.startsWith('..') || path.isAbsolute(relative)) {
		throw new HttpError(400, 'Invalid file path');
	}
	return filePath;
}

export function safeDownloadName(fileName: string) {
	const baseName = path.basename(fileName).replace(/[\r\n"]/g, '').trim();
	return baseName || 'document';
}

export function sendSafeDownload(res: Response, filePath: string, fileName: string) {
	return res.download(filePath, safeDownloadName(fileName), {
		headers: {
			'Content-Type': 'application/octet-stream',
			'X-Content-Type-Options': 'nosniff',
			'Cross-Origin-Resource-Policy': 'same-origin',
			'Content-Security-Policy': "sandbox; default-src 'none'; script-src 'none'; object-src 'none'"
		}
	});
}
