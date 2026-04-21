import { type KeyboardEvent, useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

export default function TagInput({ value, onChange, placeholder }: Props) {
  const [draft, setDraft] = useState('');

  function commit(raw: string) {
    const next = raw.trim().replace(/,$/, '');
    if (!next) return;
    if (value.includes(next)) {
      setDraft('');
      return;
    }
    onChange([...value, next]);
    setDraft('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-primary-100 bg-white px-2 py-1.5 focus-within:border-primary-400 focus-within:ring-1 focus-within:ring-primary-400">
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-700"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="text-primary-500 hover:text-primary-700"
            aria-label={`Remove ${tag}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => commit(draft)}
        placeholder={value.length ? '' : placeholder}
        className="flex-1 border-0 bg-transparent py-1 text-sm focus:outline-none"
      />
    </div>
  );
}
