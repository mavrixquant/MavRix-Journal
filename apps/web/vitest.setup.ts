// Vitest setup file - runs before each test file
import { vi, afterEach } from 'vitest';

// Mock window.confirm for tests
window.confirm = vi.fn(() => true);

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Import @testing-library/jest-dom - vitest provides expect globally in test context
import '@testing-library/jest-dom';

// Clean up mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});