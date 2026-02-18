type SupabaseLikeError = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
} | null | undefined;

export function logSupabaseError(table: string, error: SupabaseLikeError, context?: string) {
  if (!error) return;

  console.error('[supabase]', {
    table,
    context,
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
    code: error.code ?? null
  });
}

