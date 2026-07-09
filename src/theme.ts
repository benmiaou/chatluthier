import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'maroon',
  fontFamily: 'BagnardSans, Arial, sans-serif',
  headings: {
    fontFamily: 'BagnardSans, Arial, sans-serif',
  },
  colors: {
    // Maroon scale matching the original --main-button-color: #923A3A
    maroon: [
      '#f5e0e0', // 0
      '#e8b8b8', // 1
      '#d98f8f', // 2
      '#c96666', // 3
      '#b84d4d', // 4
      '#923A3A', // 5 — original primary
      '#7a302e', // 6 — original hover
      '#5b2522', // 7 — original disabled
      '#431a19', // 8
      '#2d1010', // 9
    ],
    // Dark palette — very dark grays matching #222/#333 originals
    dark: [
      '#C1C2C5', // 0
      '#A6A7AB', // 1
      '#909296', // 2
      '#5c5f66', // 3
      '#373A40', // 4
      '#2C2E33', // 5
      '#333333', // 6 — original --main-background-color-secondary
      '#222222', // 7 — original --main-background-color (used as default bg)
      '#1a1a1a', // 8
      '#111111', // 9
    ],
  },
  components: {
    Button: {
      defaultProps: {
        radius: 'sm',
        color: 'maroon.5', // Force buttons to use maroon color by default
        variant: 'filled', // Force filled variant to ensure color is applied
      },
    },
    Slider: {
      defaultProps: {
        color: 'maroon',
      },
    },
    Paper: {
      defaultProps: {
        style: { borderColor: '#ee951f' },
      },
    },
  },
});
