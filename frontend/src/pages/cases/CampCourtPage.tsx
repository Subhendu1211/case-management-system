import { useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { useMe } from '../../lib/queries/auth.queries';
import { navForRole } from '../admin/AdminShell';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { useCampCourtGroups, useCreateCampCourtGroup } from './campCourt.queries';
import type { CampCourtGroup } from '../../lib/types';

export function CampCourtPage() {
	const me = useMe();
	const navItems = navForRole(me.data?.user.role);

	// State for the upload form modal
	const [isUploadModalOpen, setUploadModalOpen] = useState(false);
	const [title, setTitle] = useState('');
	const [eventDate, setEventDate] = useState('');
	const [photos, setPhotos] = useState<FileList | null>(null);

	// State for viewing a group's photos
	const [viewingGroup, setViewingGroup] = useState<CampCourtGroup | null>(null);

	// API hooks
	const { data: groups, isLoading, error } = useCampCourtGroups();
	const createGroup = useCreateCampCourtGroup();

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setPhotos(e.target.files);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!title || !eventDate || !photos || photos.length === 0) {
			alert('Please fill all fields and select photos.');
			return;
		}

		const formData = new FormData();
		formData.append('title', title);
		formData.append('date', eventDate);
		for (let i = 0; i < photos.length; i++) {
			formData.append('photos', photos[i]);
		}

		createGroup.mutate(formData, {
			onSuccess: () => {
				setUploadModalOpen(false);
				setTitle('');
				setEventDate('');
				setPhotos(null);
			}
		});
	};

	return (
		<AppShell title="Camp Court" nav={navItems}>
			<div className="flex items-center justify-between">
				<h1 className="text-xl font-semibold">Camp Court Gallery</h1>
				<Button onClick={() => setUploadModalOpen(true)}>Upload Photos</Button>
			</div>

			{isLoading && <div className="mt-4 p-4">Loading...</div>}
			{error && <div className="mt-4 p-4 text-semantic-danger">Error loading groups: {(error as any).message}</div>}

			<div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{groups?.map((group) => (
					<div key={group.id} className="border rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setViewingGroup(group)}>
						{group.photos.length > 0 && (
							<img src={group.photos[0].url} alt={group.title} className="mb-2 h-40 w-full object-cover rounded" />
						)}
						<h2 className="font-semibold text-lg">{group.title}</h2>
						<p className="text-sm text-neutral-600">{new Date(group.date).toLocaleDateString()}</p>
						<p className="text-sm text-neutral-500 mt-2">{group.photos.length} photos</p>
					</div>
				))}
			</div>

			{/* Upload Modal */}
			<Modal open={isUploadModalOpen} onClose={() => setUploadModalOpen(false)} title="Upload Camp Court Photos">
				<form onSubmit={handleSubmit} className="space-y-4">
					<Input label="Event Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
					<Input label="Event Date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
					<div>
						<label className="block text-sm font-medium text-neutral-800 mb-1">Photos (multiple can be selected)</label>
						<input
							type="file"
							multiple
							accept="image/*"
							onChange={handleFileChange}
							className="w-full text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
							required
						/>
					</div>
					{createGroup.error && <div className="text-semantic-danger text-sm">{(createGroup.error as any).message}</div>}
					<div className="flex justify-end gap-2 pt-4">
						<Button type="button" variant="secondary" onClick={() => setUploadModalOpen(false)}>Cancel</Button>
						<Button type="submit" disabled={createGroup.isPending}>
							{createGroup.isPending ? 'Uploading...' : 'Upload'}
						</Button>
					</div>
				</form>
			</Modal>

			{/* Photo Viewer Modal */}
			<Modal open={!!viewingGroup} onClose={() => setViewingGroup(null)} title={viewingGroup?.title ?? ''}>
				{viewingGroup && (
					<div>
						<p className="text-neutral-600 mb-4">{new Date(viewingGroup.date).toLocaleDateString()}</p>
						<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[70vh] overflow-y-auto">
							{viewingGroup.photos.map((photo) => (
								<div key={photo.id}>
									<img src={photo.url} alt={viewingGroup.title} className="w-full h-auto object-cover rounded-lg shadow-md" />
								</div>
							))}
						</div>
					</div>
				)}
			</Modal>
		</AppShell>
	);
}
