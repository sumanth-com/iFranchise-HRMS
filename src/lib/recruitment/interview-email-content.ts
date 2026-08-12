import { format, parseISO } from "date-fns";

import { applyOfferEmailTemplate } from "@/lib/recruitment/offer-email-content";

export const DEFAULT_INTERVIEW_EMAIL_SUBJECT =
  "Interview invitation — {{position}} | {{roundName}}";

export const DEFAULT_INTERVIEW_EMAIL_BODY = [
  "Dear {{candidateName}},",
  "",
  "We would like to invite you for a {{roundName}} interview for the {{position}} role at iFranchise.",
  "",
  "Date: {{interviewDate}}",
  "Time: {{interviewTime}}",
  "Duration: {{duration}} minutes",
  "Mode: {{interviewType}}",
  "Interviewer: {{interviewer}}",
  "Meeting link: {{meetingLink}}",
  "",
  "Please confirm your availability. For assistance, contact our HR team at {{hrEmail}} or {{hrPhone}}.",
  "",
  "Warm regards,",
  "Human Resources",
  "iFranchise",
].join("\n");

export type InterviewEmailVariables = {
  candidateName: string;
  position: string;
  roundName: string;
  interviewDate: string;
  interviewTime: string;
  duration: string;
  interviewType: string;
  meetingLink: string;
  interviewer: string;
  hrEmail?: string;
  hrPhone?: string;
};

export function formatInterviewDateLabel(value: string): string {
  if (!value) return "";
  try {
    return format(parseISO(value), "dd MMM yyyy");
  } catch {
    return value;
  }
}

export function formatInterviewTimeLabel(value: string): string {
  if (!value) return "";
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours)) return value;
  const date = new Date(2000, 0, 1, hours, Number.isNaN(minutes) ? 0 : minutes);
  return format(date, "h:mm a");
}

export function applyInterviewEmailTemplate(
  template: string,
  variables: InterviewEmailVariables,
): string {
  return applyOfferEmailTemplate(template, {
    candidateName: variables.candidateName,
    position: variables.position,
    hrEmail: variables.hrEmail,
    hrPhone: variables.hrPhone,
  })
    .replaceAll("{{roundName}}", variables.roundName)
    .replaceAll("{{interviewDate}}", variables.interviewDate)
    .replaceAll("{{interviewTime}}", variables.interviewTime)
    .replaceAll("{{duration}}", variables.duration)
    .replaceAll("{{interviewType}}", variables.interviewType)
    .replaceAll("{{meetingLink}}", variables.meetingLink || "Will be shared separately")
    .replaceAll("{{interviewer}}", variables.interviewer || "To be confirmed");
}
