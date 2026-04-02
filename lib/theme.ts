export const theme = {
  colors: {
    bb1: '#0D0D0D',
    bb2: '#4A4A4A',
    bb3: '#8B0000',
    bb4: '#8B7536',
    bb5: '#2F2F2F',
    bb6: '#6B6B5E',
    bb7: '#9C9680',
    bb8: '#E8E0D0',
  },
  semantic: {
    text:        'bb1',
    accent:      'bb2',
    danger:      'bb3',
    highlight:   'bb4',
    secondary:   'bb5',
    muted:       'bb6',
    border:      'bb7',
    background:  'bb8',
  },
} as const

export type Theme = typeof theme
