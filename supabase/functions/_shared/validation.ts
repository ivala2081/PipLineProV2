import { z } from 'npm:zod@3.25.76'

/**
 * Shared Zod validation helper for Supabase Edge Functions.
 *
 * Usage:
 *   import { parseBody, ValidationError } from '../_shared/validation.ts'
 *
 *   const schema = z.object({ name: z.string() })
 *   const { data, error } = await parseBody(req, schema)
 *   if (error) return error          // 400 Response with validation details
 *   // data is fully typed as { name: string }
 */

export { z }

export class ValidationError extends Error {
  public issues: z.ZodIssue[]

  constructor(zodError: z.ZodError) {
    const message = zodError.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    super(message)
    this.name = 'ValidationError'
    this.issues = zodError.issues
  }
}

/**
 * Parse the JSON body of a request against a Zod schema.
 *
 * Returns `{ data }` on success or `{ error }` with a 400 Response containing
 * structured validation details the caller can return directly.
 */
export async function parseBody<T>(
  req: Request,
  schema: z.ZodSchema<T>,
  corsHeaders?: Record<string, string>,
): Promise<{ data: T; error?: never } | { data?: never; error: Response }> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return {
      error: new Response(
        JSON.stringify({
          error: 'VALIDATION_ERROR',
          message: 'Invalid JSON body',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      ),
    }
  }

  const result = schema.safeParse(raw)
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }))

    return {
      error: new Response(
        JSON.stringify({
          error: 'VALIDATION_ERROR',
          message: 'Request body validation failed',
          details,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      ),
    }
  }

  return { data: result.data }
}
