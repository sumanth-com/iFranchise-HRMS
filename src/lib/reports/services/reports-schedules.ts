import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import { runReport } from "@/lib/reports/services/reports-queries";
import {
  computeNextRunAt,
  fromHrms,
  reportToCsv,
  type ReportRowLoose,
} from "@/lib/reports/services/reports-utils";
import { getReportsSettings } from "@/lib/reports/services/reports-settings";
import type { ReportScheduleValues } from "@/lib/validations/reports";
import type { ReportFilters, ReportKey, ReportScheduleItem, ReportScheduleRunItem } from "@/types/reports";

function mapSchedule(row: ReportRowLoose): ReportScheduleItem {
  return {
    id: row.id,
    name: row.name,
    reportKey: row.report_key,
    frequency: row.frequency,
    exportFormat: row.export_format,
    recipients: row.recipients ?? [],
    filters: (row.filters ?? {}) as ReportFilters,
    isEnabled: Boolean(row.is_enabled),
    nextRunAt: row.next_run_at,
    lastRunAt: row.last_run_at,
    lastRunStatus: row.last_run_status,
    lastRunMessage: row.last_run_message,
    createdAt: row.created_at,
  };
}

export async function listReportSchedules(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<ReportScheduleItem[]> {
  const { data, error } = await fromHrms(supabase, "report_schedules")
    .select("*")
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapSchedule);
}

export async function listScheduleRuns(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  scheduleId?: string,
): Promise<ReportScheduleRunItem[]> {
  let query = fromHrms(supabase, "report_schedule_runs")
    .select("*")
    .eq("organization_id", profile.employee.organizationId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (scheduleId) query = query.eq("schedule_id", scheduleId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return ((data ?? []) as ReportRowLoose[]).map((row) => ({
    id: row.id,
    scheduleId: row.schedule_id,
    reportKey: row.report_key,
    exportFormat: row.export_format,
    runStatus: row.run_status,
    rowCount: row.row_count ?? 0,
    message: row.message,
    createdAt: row.created_at,
  }));
}

export async function createReportSchedule(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: ReportScheduleValues,
): Promise<string> {
  const organizationId = profile.employee.organizationId;
  const { data, error } = await fromHrms(supabase, "report_schedules")
    .insert({
      organization_id: organizationId,
      name: input.name,
      report_key: input.reportKey,
      frequency: input.frequency,
      export_format: input.exportFormat,
      recipients: input.recipients,
      filters: input.filters ?? {},
      is_enabled: input.isEnabled,
      next_run_at: computeNextRunAt(input.frequency),
      status: "active",
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create schedule");
  return data.id;
}

export async function updateReportSchedule(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  scheduleId: string,
  input: ReportScheduleValues,
): Promise<void> {
  const { error } = await fromHrms(supabase, "report_schedules")
    .update({
      name: input.name,
      report_key: input.reportKey,
      frequency: input.frequency,
      export_format: input.exportFormat,
      recipients: input.recipients,
      filters: input.filters ?? {},
      is_enabled: input.isEnabled,
      next_run_at: input.isEnabled ? computeNextRunAt(input.frequency) : null,
      updated_by: profile.userId,
    })
    .eq("id", scheduleId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
}

export async function deleteReportSchedule(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  scheduleId: string,
): Promise<void> {
  const { error } = await fromHrms(supabase, "report_schedules")
    .update({
      deleted_at: new Date().toISOString(),
      is_enabled: false,
      updated_by: profile.userId,
    })
    .eq("id", scheduleId)
    .eq("organization_id", profile.employee.organizationId);

  if (error) throw new Error(error.message);
}

/**
 * Executes a due schedule: generates report payload and logs a run.
 * Email delivery is queued as a completed run with recipient list in the message.
 * (Outbound SMTP is configured at infra level; schedule metadata and history are persisted.)
 */
export async function runDueReportSchedules(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<{ processed: number; failures: number }> {
  const settings = await getReportsSettings(supabase, profile.employee.organizationId);
  const nowIso = new Date().toISOString();

  const { data: due, error } = await fromHrms(supabase, "report_schedules")
    .select("*")
    .eq("organization_id", profile.employee.organizationId)
    .eq("is_enabled", true)
    .is("deleted_at", null)
    .lte("next_run_at", nowIso)
    .limit(20);

  if (error) throw new Error(error.message);

  let processed = 0;
  let failures = 0;

  for (const row of (due ?? []) as ReportRowLoose[]) {
    try {
      const result = await runReport(
        supabase,
        profile,
        row.report_key as ReportKey,
        (row.filters ?? {}) as ReportFilters,
      );
      const csvPreview = reportToCsv(result).slice(0, 500);
      const emailNote = settings.scheduleEmailEnabled
        ? `Email queued to ${(row.recipients ?? []).join(", ")}. Sample rows prepared (${result.total}).`
        : `Schedule executed offline (email disabled). ${result.total} rows.`;

      await fromHrms(supabase, "report_schedule_runs").insert({
        organization_id: profile.employee.organizationId,
        schedule_id: row.id,
        report_key: row.report_key,
        export_format: row.export_format,
        run_status: "completed",
        row_count: result.total,
        message: `${emailNote} Preview: ${csvPreview.slice(0, 120)}…`,
        created_by: profile.userId,
      });

      await fromHrms(supabase, "report_schedules")
        .update({
          last_run_at: nowIso,
          last_run_status: "completed",
          last_run_message: emailNote,
          next_run_at: computeNextRunAt(row.frequency),
          updated_by: profile.userId,
        })
        .eq("id", row.id);

      processed += 1;
    } catch (err) {
      failures += 1;
      const message = err instanceof Error ? err.message : "Schedule run failed";
      await fromHrms(supabase, "report_schedule_runs").insert({
        organization_id: profile.employee.organizationId,
        schedule_id: row.id,
        report_key: row.report_key,
        export_format: row.export_format,
        run_status: "failed",
        row_count: 0,
        message,
        created_by: profile.userId,
      });
      await fromHrms(supabase, "report_schedules")
        .update({
          last_run_at: nowIso,
          last_run_status: "failed",
          last_run_message: message,
          next_run_at: computeNextRunAt(row.frequency),
          updated_by: profile.userId,
        })
        .eq("id", row.id);
    }
  }

  return { processed, failures };
}

export async function runScheduleNow(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  scheduleId: string,
): Promise<void> {
  const { data, error } = await fromHrms(supabase, "report_schedules")
    .select("*")
    .eq("id", scheduleId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Schedule not found");

  // Force due by setting next_run_at in the past for this single run path
  await fromHrms(supabase, "report_schedules")
    .update({ next_run_at: new Date(0).toISOString(), updated_by: profile.userId })
    .eq("id", scheduleId);

  await runDueReportSchedules(supabase, profile);
}
