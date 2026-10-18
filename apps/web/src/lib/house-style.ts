/**
 * House-style spelling rules (see CLAUDE.md → House style), applied to
 * content stored in Firestore by the Admin "House style" card. Each rule
 * finds a spelling the site no longer uses and returns the house spelling.
 */
export interface HouseStyleRule {
  /** The house spelling, shown in Admin. */
  label: string;
  /** Global pattern for the spellings to replace. */
  pattern: RegExp;
  fix: (match: string) => string;
}

export const HOUSE_STYLE_RULES: HouseStyleRule[] = [
  {
    label: 'Quran',
    // Q-u-r, then an apostrophe before a/ā, or ā alone, then n: Qur'an,
    // Qur’ān, Qurān… Plain "Quran" and "quran.com" never match.
    pattern: /\bqur(?:['’ʾʼ‘`][aā]|ā)n/giu,
    fix: (m) => (m === m.toUpperCase() ? 'QURAN' : m.startsWith('q') ? 'quran' : 'Quran'),
  },
];

/** Collections whose documents hold visitor-facing text. */
export const HOUSE_STYLE_COLLECTIONS = [
  'siteSettings',
  'pages',
  'articles',
  'faqs',
  'resources',
  'channels',
  'series',
  'topics',
] as const;

/** Apply every rule to one string. */
export function fixText(text: string): { text: string; count: number } {
  let count = 0;
  let out = text;
  for (const rule of HOUSE_STYLE_RULES) {
    out = out.replace(rule.pattern, (m) => {
      count++;
      return rule.fix(m);
    });
  }
  return { text: out, count };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (typeof v !== 'object' || v === null) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

/**
 * Apply the rules to every string inside a Firestore value, including
 * nested maps and arrays. Anything else (timestamps, numbers, references)
 * comes back untouched.
 */
export function fixValue(value: unknown): { value: unknown; count: number } {
  if (typeof value === 'string') {
    const { text, count } = fixText(value);
    return { value: text, count };
  }
  if (Array.isArray(value)) {
    let count = 0;
    const out = value.map((v) => {
      const r = fixValue(v);
      count += r.count;
      return r.value;
    });
    return { value: out, count };
  }
  if (isPlainObject(value)) {
    let count = 0;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const r = fixValue(v);
      count += r.count;
      out[k] = r.value;
    }
    return { value: out, count };
  }
  return { value, count: 0 };
}
