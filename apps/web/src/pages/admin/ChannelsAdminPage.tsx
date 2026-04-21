import CollectionTable, { type FieldSpec } from '@/components/admin/CollectionTable';
import {
  type AdminChannel,
  createChannel,
  deleteChannel,
  listChannels,
  updateChannel,
} from '@/lib/admin-firestore';

const COLUMNS: FieldSpec<AdminChannel>[] = [
  { key: 'name', label: 'Channel name', required: true },
  { key: 'url', label: 'URL', type: 'url', required: true },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'order', label: 'Order', type: 'number' },
];

const DEFAULTS: Omit<AdminChannel, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  url: '',
  description: '',
  order: 10,
};

export default function ChannelsAdminPage() {
  return (
    <CollectionTable<AdminChannel>
      title="Channels"
      queryKey={['admin', 'channels']}
      load={listChannels}
      create={createChannel}
      update={updateChannel}
      remove={deleteChannel}
      columns={COLUMNS}
      defaults={DEFAULTS}
      empty="No channels yet."
    />
  );
}
