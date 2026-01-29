/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
          },
        },
        invert: {
          css: {
            '--tw-prose-body': 'rgb(212 212 212)',
            '--tw-prose-headings': 'rgb(255 255 255)',
            '--tw-prose-lead': 'rgb(163 163 163)',
            '--tw-prose-links': 'rgb(255 255 255)',
            '--tw-prose-bold': 'rgb(255 255 255)',
            '--tw-prose-counters': 'rgb(163 163 163)',
            '--tw-prose-bullets': 'rgb(115 115 115)',
            '--tw-prose-hr': 'rgb(64 64 64)',
            '--tw-prose-quotes': 'rgb(229 229 229)',
            '--tw-prose-quote-borders': 'rgb(64 64 64)',
            '--tw-prose-captions': 'rgb(163 163 163)',
            '--tw-prose-code': 'rgb(255 255 255)',
            '--tw-prose-pre-code': 'rgb(212 212 212)',
            '--tw-prose-pre-bg': 'rgb(23 23 23)',
            '--tw-prose-th-borders': 'rgb(64 64 64)',
            '--tw-prose-td-borders': 'rgb(38 38 38)',
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
