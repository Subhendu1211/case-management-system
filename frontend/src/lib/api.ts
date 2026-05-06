import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
const API_ROOT_URL = API_BASE_URL.replace(/\/api\/v1\/?$/i, '');

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export class ApiError extends Error {
	status: number;
	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

type ApiErrorPayload = {
	error?: {
		message?: string;
		details?: Array<{ path?: Array<string | number>; message?: string }>;
	};
};

async function rawRequest<T>(method: HttpMethod, path: string, body?: unknown, withAuth?: boolean): Promise<T> {
	const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
	const headers: Record<string, string> = isFormData ? {} : { 'content-type': 'application/json' };
	if (withAuth) {
		const access = getAccessToken();
		if (access) headers.authorization = `Bearer ${access}`;
	}

	let res: Response;
	try {
		res = await fetch(`${API_BASE_URL}${path}`, {
			method,
			headers,
			body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined
		});
	} catch {
		throw new ApiError(0, `Failed to reach API at ${API_BASE_URL}`);
	}

	if (res.ok) return (await res.json()) as T;
	const payload = (await res.json().catch(() => null)) as ApiErrorPayload | null;
	const firstDetail = payload?.error?.details?.[0];
	const detailMessage =
		typeof firstDetail?.message === 'string'
			? `${firstDetail.path?.length ? `${firstDetail.path.join('.')}: ` : ''}${firstDetail.message}`
			: undefined;
	throw new ApiError(res.status, detailMessage ?? payload?.error?.message ?? 'Request failed');
}

async function refreshTokens() {
	const refreshToken = getRefreshToken();
	if (!refreshToken) throw new ApiError(401, 'Not authenticated');
	const result = await rawRequest<{ accessToken: string; refreshToken: string }>('POST', '/auth/refresh', { refreshToken }, false);
	setTokens(result);
	return result.accessToken;
}

export async function api<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
	try {
		return await rawRequest<T>(method, path, body, true);
	} catch (e) {
		if (e instanceof ApiError && e.status === 401) {
			try {
				await refreshTokens();
				return await rawRequest<T>(method, path, body, true);
			} catch (err) {
				clearTokens();
				throw err instanceof ApiError ? err : e;
			}
		}
		throw e;
	}
}

export async function publicApi<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
	return rawRequest<T>(method, path, body, false);
}

export function resolveFileUrl(url?: string | null): string | null {
	if (!url) return null;
	const raw = String(url).trim();
	if (!raw) return null;
	if (/^https?:\/\//i.test(raw)) return raw;
	if (raw.startsWith('/')) {
		return API_ROOT_URL ? `${API_ROOT_URL}${raw}` : raw;
	}
	const base = API_BASE_URL.replace(/\/+$/, '');
	return base ? `${base}/${raw.replace(/^\/+/, '')}` : `/${raw.replace(/^\/+/, '')}`;
}

export async function downloadFile(url: string): Promise<Blob> {
	const request = async () => {
		const headers: Record<string, string> = {};
		const access = getAccessToken();
		if (access) headers.authorization = `Bearer ${access}`;
		return fetch(url, { method: 'GET', headers });
	};

	let res: Response;
	try {
		res = await request();
	} catch {
		throw new ApiError(0, `Failed to reach API at ${API_BASE_URL}`);
	}

	if (res.status === 401) {
		try {
			await refreshTokens();
			res = await request();
		} catch (err) {
			clearTokens();
			throw err instanceof ApiError ? err : new ApiError(401, 'Not authenticated');
		}
	}

	if (!res.ok) {
		const payload = (await res.json().catch(() => null)) as ApiErrorPayload | null;
		const firstDetail = payload?.error?.details?.[0];
		const detailMessage =
			typeof firstDetail?.message === 'string'
				? `${firstDetail.path?.length ? `${firstDetail.path.join('.')}: ` : ''}${firstDetail.message}`
				: undefined;
		throw new ApiError(res.status, detailMessage ?? payload?.error?.message ?? 'Download failed');
	}

	return res.blob();
}
