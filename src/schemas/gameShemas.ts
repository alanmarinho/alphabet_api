import { z } from 'zod';

export interface inputInterface {
  key: string;
  time: number;
}

const KeyLogItem = z.object({
  key: z.string().length(1),
  time: z.number().nonnegative(),
});

export const FinishSchema = z.object({
  matchToken: z.string().uuid(),
  input: z.array(KeyLogItem).length(26),
});
