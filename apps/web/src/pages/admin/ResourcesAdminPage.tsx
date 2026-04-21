import CollectionTable, { type FieldSpec } from '@/components/admin/CollectionTable';
import {
  type AdminResource,
  createResource,
  deleteResource,
  listResources,
  updateResource,
} from '@/lib/admin-firestore';

const COLUMNS: FieldSpec<AdminResource>[] = [
  { key: 'title', label: 'Title', required: true },
  { key: 'url', label: 'URL', type: 'url', required: true },
  { key: 'category', label: 'Category', placeholder: 'e.g. Qur’an, Hadith, Fiqh' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'order', label: 'Order', type: 'number' },
];

const DEFAULTS: Omit<AdminResource, 'id' | 'createdAt' | 'updatedAt'> = {
  title: '',
  url: '',
  description: '',
  category: 'General',
  order: 10,
};

export default function ResourcesAdminPage() {
  return (
    <CollectionTable<AdminResource>
      title="Resources"
      queryKey={['admin', 'resources']}
      load={listResources}
      create={createResource}
      update={updateResource}
      remove={deleteResource}
      columns={COLUMNS}
      defaults={DEFAULTS}
      empty="No resources yet. Click New to add your first link."
    />
  );
}
