import type { Preview } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import '../src/styles/index.css'; // Import Tailwind CSS

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity },
  },
});

const preview: Preview = {
  decorators: [
    (Story) => React.createElement(QueryClientProvider, { client: queryClient }, React.createElement(Story)),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#1a1a1a',
        },
      ],
    },
  },
  tags: ['autodocs'],
};

export default preview;
