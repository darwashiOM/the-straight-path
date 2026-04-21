import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#E6F2F1',
          100: '#BFDEDB',
          200: '#8FC6C1',
          300: '#5FADA7',
          400: '#2F9590',
          500: '#0F5F5C',
          600: '#0C4F4D',
          700: '#083D3B',
          800: '#062B2A',
          900: '#041918',
        },
        accent: {
          50: '#FAF3DE',
          100: '#F4E5B7',
          200: '#E8CD7D',
          300: '#DDBA49',
          400: '#C9A227',
          500: '#A8881F',
          600: '#876D18',
          700: '#665213',
          800: '#44370D',
          900: '#221B06',
        },
        paper: '#FAF7F1',
        ink: '#1C1C1A',
        sage: '#3D7A5E',
        sienna: '#B24A3E',
      },
      fontFamily: {
        serif: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        arabic: ['"Amiri"', '"Noto Naskh Arabic"', 'serif'],
      },
      fontSize: {
        '2xs': ['0.75rem', { lineHeight: '1.1rem' }],
      },
      maxWidth: {
        prose: '72ch',
        container: '1200px',
      },
      borderRadius: {
        xl: '0.875rem',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        md: '0 4px 16px -4px rgb(0 0 0 / 0.08)',
        lg: '0 16px 32px -12px rgb(0 0 0 / 0.12)',
      },
      animation: {
        'fade-in': 'fadeIn 400ms ease-out',
        'slide-up': 'slideUp 500ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      typography: ({ theme }: { theme: (k: string) => string }) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.ink'),
            '--tw-prose-headings': theme('colors.primary.700'),
            '--tw-prose-links': theme('colors.primary.500'),
            '--tw-prose-bold': theme('colors.primary.700'),
            '--tw-prose-quotes': theme('colors.primary.600'),
            '--tw-prose-quote-borders': theme('colors.accent.400'),
            maxWidth: '72ch',
            fontFamily: theme('fontFamily.sans').join(', '),
            h1: { fontFamily: theme('fontFamily.serif').join(', ') },
            h2: { fontFamily: theme('fontFamily.serif').join(', ') },
            h3: { fontFamily: theme('fontFamily.serif').join(', ') },
            h4: { fontFamily: theme('fontFamily.serif').join(', ') },
          },
        },
        invert: {
          css: {
            '--tw-prose-body': theme('colors.paper'),
            '--tw-prose-headings': theme('colors.accent.300'),
            '--tw-prose-links': theme('colors.accent.400'),
          },
        },
      }),
    },
  },
  plugins: [typography],
};

export default config;
