/** Product-review corrections, including the clarified Single child + Down → N1. */
export const navigationExamples = [
    { from: 'one', direction: 'down', to: 'two' },
    { from: 'c', direction: 'up', to: 'b' },
    { from: 'a', direction: 'down', to: 'b' },
    { from: 'single', direction: 'up', to: 'c' },
    { from: 'single', direction: 'down', to: 'n1' },
    { from: 'n2', direction: 'down', to: 'n3' },
    { from: 'n3', direction: 'up', to: 'n2' },
] as const;
