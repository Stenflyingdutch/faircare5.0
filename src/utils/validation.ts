export const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

export const validatePassword = (password: string) => {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must include at least one number.';
  return '';
};
