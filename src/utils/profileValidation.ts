export type ProfileFormValues = {
  name: string;
  username: string;
};

export type ProfileFormErrors = {
  name?: string;
  username?: string;
};

export const NAME_MAX_LENGTH = 50;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;
export const USERNAME_PATTERN = /^[A-Za-z0-9._]+$/;

export function validateProfileForm(
  values: ProfileFormValues,
  messages: {
    nameRequired: string;
    nameTooLong: string;
    usernameRequired: string;
    usernameLength: string;
    usernameChars: string;
  },
): ProfileFormErrors {
  const errors: ProfileFormErrors = {};
  const name = values.name.trim();
  const username = values.username.trim();

  if (!name) {
    errors.name = messages.nameRequired;
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.name = messages.nameTooLong;
  }

  if (!username) {
    errors.username = messages.usernameRequired;
  } else if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    errors.username = messages.usernameLength;
  } else if (!USERNAME_PATTERN.test(username)) {
    errors.username = messages.usernameChars;
  }

  return errors;
}
