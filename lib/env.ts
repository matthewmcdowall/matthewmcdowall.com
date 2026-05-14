import { z } from "zod";

const envSchema = z.object({
  RESEND_API_KEY: z.string().min(1).optional(),
  CONTACT_TO: z.string().email().optional(),
  STRAVA_CLIENT_ID: z.string().optional(),
  STRAVA_CLIENT_SECRET: z.string().optional(),
  STRAVA_REFRESH_TOKEN: z.string().optional(),
});

export const env = envSchema.parse(process.env);
