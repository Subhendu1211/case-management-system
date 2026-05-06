import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CampCourtGroup } from '../types';

// In a real app, this would be your API client, e.g., axios instance
const api = {
	get: async (url: string) => { /* mock */ },
	post: async (url: string, data: any) => { /* mock */ }
};

// --- Mock API functions ---
// Replace these with your actual backend API calls.

async function getCampCourtGroups(): Promise<CampCourtGroup[]> {
	// const { data } = await api.get('/camp-court');
	// return data;

	// Mock data for demonstration purposes
	return Promise.resolve([
		{
			id: '1',
			title: 'Camp Court at Puri',
			date: '2023-10-26',
			photos: Array.from({ length: 5 }, (_, i) => ({ id: `p${i + 1}`, url: `https://picsum.photos/seed/${i + 1}/400/300` }))
		},
		{
			id: '2',
			title: 'Event in Bhubaneswar',
			date: '2023-11-15',
			photos: Array.from({ length: 3 }, (_, i) => ({ id: `p${i + 6}`, url: `https://picsum.photos/seed/${i + 6}/400/300` }))
		}
	]);
}

async function createCampCourtGroup(formData: FormData): Promise<CampCourtGroup> {
	// const { data } = await api.post('/camp-court', formData, {
	//   headers: { 'Content-Type': 'multipart/form-data' },
	// });
	// return data;

	// Mock creation for demonstration
	const title = formData.get('title') as string;
	const date = formData.get('date') as string;
	const photos = formData.getAll('photos');
	return Promise.resolve({
		id: String(Math.random()),
		title,
		date,
		photos: photos.map((_, i) => ({ id: `new-p-${i}`, url: `https://picsum.photos/seed/${Math.random()}/400/300` }))
	});
}

// --- React Query Hooks ---

export function useCampCourtGroups() {
	return useQuery({ queryKey: ['campCourtGroups'], queryFn: getCampCourtGroups });
}

export function useCreateCampCourtGroup() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: createCampCourtGroup,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['campCourtGroups'] });
		}
	});
}