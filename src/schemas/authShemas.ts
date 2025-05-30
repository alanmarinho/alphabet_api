import { z } from 'zod';

export const LoginSchema = z.object({
  username: z.string().min(1, 'Username must be at least 1 character long.'),
  password: z.string(),
});

export const RegisterSchema = z.object({
  username: z
    .string()
    .min(1, 'Username must be at least 1 character long.')
    .max(15, 'Username must be a maximum of 15 characters.')
    .regex(/^[a-zA-Z0-9]+$/, 'Username must contain only letters and numbers.'),
  password: z.string().min(6, 'The password must be at least 6 characters long.'),
  email: z.string().email().optional(),
});

export const deleteAccountSchema = z.object({
  password: z.string(),
});

export const startRecoverPasswordSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Identifier is required.')
    .refine((val) => /^[a-zA-Z0-9]+$/.test(val) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: 'Must be a valid username or email address.',
    }),
});

export const recoverPasswordSchema = z.object({
  token: z.string().uuid(),
  password: z.string().min(6, 'The password must be at least 6 characters long.'),
});

export const editPasswordSchema = z.object({
  password: z.string().min(6, 'The password must be at least 6 characters long.'),
});

export const validateEmail = z.object({
  token: z.string().uuid(),
});

export const addNewEmail = z.object({
  email: z.string().email(),
});
