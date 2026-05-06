import type { User } from './types';

const ACCESS_KEY = 'scpd.cms.accessToken';
const REFRESH_KEY = 'scpd.cms.refreshToken';

export function getAccessToken() {
	return localStorage.getItem(ACCESS_KEY);
}

export function setTokens(input: { accessToken: string; refreshToken: string }) {
	localStorage.setItem(ACCESS_KEY, input.accessToken);
	localStorage.setItem(REFRESH_KEY, input.refreshToken);
}

export function clearTokens() {
	localStorage.removeItem(ACCESS_KEY);
	localStorage.removeItem(REFRESH_KEY);
}

export function getRefreshToken() {
	return localStorage.getItem(REFRESH_KEY);
}

export function roleHome(role: User['role']) {
	switch (role) {
		case 'COMMISSIONER':
			return '/dashboard/commissioner';
		case 'PRIVATE_SECRETARY':
			return '/dashboard/private-secretary';
		case 'PRIVATE_ASSISTANT':
			return '/cases';
		case 'LEGAL_ASSISTANT':
			return '/dashboard/legal';
		case 'REGISTRAR':
			return '/dashboard/registrar';
		case 'STATIONERY':
			return '/dashboard/stationery';
		case 'PROGRAMMER':
			// Programmers should land on the case queue, not the admin dashboard
			return '/cases';
		case 'ADMIN':
			return '/dashboard/admin';
		case 'COMPUTER_ASSISTANT':
			// Computer Assistant handles final dispatch/closing — show case queue
			return '/cases';
		case 'CITIZEN':
			return '/profile';
		default:
			return '/dashboard';
	}
}
