import "server-only";
import { z } from "zod";

// Server-side env. `server-only` makes any accidental import from a client
// component a build error, so secrets can never reach the browser bundle.
// Parsed lazily (not at module load) so a bad value fails the one request
// that needs it instead of the whole build.

const envSchema = z.object({
  RESEND_API_KEY: z.string().min(1).optional(),
  CONTACT_TO: z.string().email().optional(),
  RESEND_FROM: z.string().email().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(): Env {
  return envSchema.parse(process.env);
}
