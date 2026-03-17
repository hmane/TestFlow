jest.mock('spfx-toolkit/lib/utilities/context', () => ({
  SPContext: {
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      success: jest.fn(),
    },
    currentUser: {
      email: 'user@example.com',
    },
    sp: {
      web: {},
    },
    spPessimistic: {
      web: {},
    },
    tryGetFreshSP: jest.fn(() => undefined),
  },
}));

jest.mock('spfx-toolkit/lib/utilities/context/pnpImports/lists', () => ({}));
jest.mock('spfx-toolkit/lib/utilities/context/pnpImports/files', () => ({}));

import {
  normalizeSharePointCheckOutType,
  resolveEffectiveCheckoutType,
  shouldBlockMutationForCheckout,
} from '../documentService';

describe('normalizeSharePointCheckOutType', () => {
  it.each([
    [undefined, 0],
    [null, 0],
    ['', 0],
    ['0', 0],
    ['None', 0],
    [' none ', 0],
    [0, 0],
    [1, 1],
    ['1', 1],
    ['Online', 1],
    ['2', 2],
    ['Offline', 2],
  ])('normalizes %p to %p', (input, expected) => {
    expect(normalizeSharePointCheckOutType(input)).toBe(expected);
  });
});

describe('shouldBlockMutationForCheckout', () => {
  it.each([
    [0, undefined, undefined, false],
    [2, undefined, undefined, false],
    [2, '', '', false],
    [2, 'user@example.com', undefined, true],
    [2, undefined, 'Hemant Mane', true],
    [1, 'user@example.com', '', true],
  ])('returns %p for checkoutType=%p email=%p title=%p', (checkoutType, email, title, expected) => {
    expect(shouldBlockMutationForCheckout(checkoutType, email, title)).toBe(expected);
  });
});

describe('resolveEffectiveCheckoutType', () => {
  it.each([
    [0, undefined, undefined, undefined, undefined, 0],
    [0, '6', 'Hemant Mane', undefined, undefined, 1],
    [0, undefined, 'Hemant Mane', undefined, undefined, 1],
    [0, undefined, undefined, 'user@example.com', undefined, 1],
    [0, undefined, undefined, undefined, 'i:0#.f|membership|user@example.com', 1],
    [2, undefined, undefined, undefined, undefined, 0],
  ])(
    'returns %p for rawType=%p ownerId=%p ownerName=%p ownerEmail=%p ownerLoginName=%p',
    (rawType, ownerId, ownerName, ownerEmail, ownerLoginName, expected) => {
      expect(
        resolveEffectiveCheckoutType(rawType, ownerId, ownerName, ownerEmail, ownerLoginName)
      ).toBe(expected);
    }
  );
});
