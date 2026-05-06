import { useMutation } from '@tanstack/react-query';
import { publicApi } from '../api';
import type { PublicRegistration, PublicRegistrationCreate } from '../types';

export function useCreatePublicRegistration() {
	return useMutation({
		mutationFn: (input: PublicRegistrationCreate) => publicApi<PublicRegistration>('POST', '/public/registrations', input)
	});
}
