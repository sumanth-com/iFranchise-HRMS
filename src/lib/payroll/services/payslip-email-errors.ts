/**
 * An error whose message is safe to render to the user in the payslip email flow.
 *
 * Anything thrown that is not one of these is treated as an infrastructure failure:
 * logged server-side and replaced with a generic message, so Supabase/Postgres text
 * (RLS violations, PostgREST errors) never reaches the UI.
 */
export class PayslipEmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayslipEmailError";
  }
}
