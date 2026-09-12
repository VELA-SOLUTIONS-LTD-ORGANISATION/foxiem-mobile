import { validateProfileForm } from '@/utils/profileValidation';

const messages = {
  nameRequired: 'name-required',
  nameTooLong: 'name-too-long',
  usernameRequired: 'username-required',
  usernameLength: 'username-length',
  usernameChars: 'username-chars',
};

describe('validateProfileForm', () => {
  it('accepts valid trimmed values', () => {
    expect(
      validateProfileForm({ name: '  Hakan  ', username: '  hakan.1_  ' }, messages),
    ).toEqual({});
  });

  it('rejects whitespace-only name and username', () => {
    expect(validateProfileForm({ name: '   ', username: 'abc' }, messages).name).toBe(
      'name-required',
    );
    expect(validateProfileForm({ name: 'Hakan', username: '  ' }, messages).username).toBe(
      'username-required',
    );
  });

  it('enforces name max 50 and username 3–24 pattern', () => {
    expect(
      validateProfileForm({ name: 'a'.repeat(51), username: 'abc' }, messages).name,
    ).toBe('name-too-long');
    expect(validateProfileForm({ name: 'Hakan', username: 'ab' }, messages).username).toBe(
      'username-length',
    );
    expect(validateProfileForm({ name: 'Hakan', username: 'bad!' }, messages).username).toBe(
      'username-chars',
    );
  });
});
