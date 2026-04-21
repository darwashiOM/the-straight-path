import CollectionTable, { type FieldSpec } from '@/components/admin/CollectionTable';
import {
  type AdminFaq,
  createFaq,
  deleteFaq,
  listFaqs,
  updateFaq,
} from '@/lib/admin-firestore';

const COLUMNS: FieldSpec<AdminFaq>[] = [
  { key: 'question', label: 'Question', required: true },
  { key: 'answer', label: 'Answer (markdown)', type: 'textarea', required: true },
  { key: 'category', label: 'Category' },
  { key: 'order', label: 'Order', type: 'number' },
];

const DEFAULTS: Omit<AdminFaq, 'id' | 'createdAt' | 'updatedAt'> = {
  question: '',
  answer: '',
  category: 'General',
  order: 10,
};

export default function FaqAdminPage() {
  return (
    <CollectionTable<AdminFaq>
      title="FAQ"
      queryKey={['admin', 'faqs']}
      load={listFaqs}
      create={createFaq}
      update={updateFaq}
      remove={deleteFaq}
      columns={COLUMNS}
      defaults={DEFAULTS}
      empty="No FAQs yet."
    />
  );
}
