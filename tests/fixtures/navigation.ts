/** Product-review corrections, including the clarified Single child + Down → N1. */
export const navigationExamples = [
    { from: 'one', direction: 'down', to: 'two' },
    { from: 'c', direction: 'up', to: 'b' },
    { from: 'a', direction: 'down', to: 'b' },
    { from: 'single', direction: 'up', to: 'c' },
    { from: 'single', direction: 'down', to: 'n1' },
    { from: 'n2', direction: 'down', to: 'n3' },
    { from: 'n3', direction: 'up', to: 'n2' },
    { from: 'c2', direction: 'down', to: 'n4' },
    { from: 'chain', direction: 'up', to: 'c' },
    { from: 'c21', direction: 'up', to: 'child1' },
] as const;
