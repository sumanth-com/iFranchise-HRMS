import type { SectionHelpPoint } from "@/components/common/section-help-button";

export const HIRING_SECTION_HELP = {
  dashboard: {
    title: "About Recruitment Dashboard",
    points: [
      {
        label: "What this page is for",
        detail:
          "See hiring health at a glance — open roles, active candidates, pending offers, and upcoming interviews.",
      },
      {
        label: "Pipeline",
        detail:
          "Use the pipeline view to spot bottlenecks by stage (screening, interviews, CEO, offer, joining).",
      },
      {
        label: "Next step",
        detail:
          "Open Job Openings to create roles, or Candidates to move applicants through the hiring flow.",
      },
    ] satisfies SectionHelpPoint[],
  },
  jobs: {
    title: "About Job Openings",
    points: [
      {
        label: "What this page is for",
        detail:
          "Create and manage open roles — department, employment type, location, positions, and salary range.",
      },
      {
        label: "Statuses",
        detail:
          "Open = accepting candidates. Paused = temporarily stopped. Closed = hiring finished for this role. Draft = not published yet.",
      },
      {
        label: "Candidates badge",
        detail:
          "Shows how many applicants are linked to that job. Open the Candidates section to review them.",
      },
      {
        label: "Close vs Delete",
        detail:
          "Close ends hiring for the role but keeps history. Delete removes the opening when it should not stay in the list.",
      },
    ] satisfies SectionHelpPoint[],
  },
  candidates: {
    title: "About Candidates",
    points: [
      {
        label: "What this page is for",
        detail:
          "Track applicants from applied → screening → interviews → CEO → offer → joining, with resumes and interview notes.",
      },
      {
        label: "Moving stages",
        detail:
          "Advance candidates only when the current step is complete. Offers unlock after CEO clearance.",
      },
      {
        label: "Interviews",
        detail:
          "Schedule interview rounds from the candidate detail panel and keep feedback before moving forward.",
      },
      {
        label: "Filters",
        detail:
          "Search by name or filter by job, department, and stage to find the right applicant quickly.",
      },
    ] satisfies SectionHelpPoint[],
  },
  offers: {
    title: "About Offers",
    points: [
      {
        label: "What this page is for",
        detail:
          "Prepare and send offer letters to candidates who have cleared CEO stage — upload the letter and email it securely.",
      },
      {
        label: "When candidates appear",
        detail:
          "Only candidates ready for offer show here. Earlier stages stay under Candidates until CEO is done.",
      },
      {
        label: "Send flow",
        detail:
          "Select the candidate, attach the offer letter, review the email, then send. Track sent vs accepted status afterward.",
      },
      {
        label: "After acceptance",
        detail:
          "Accepted offers move into Onboarding so HR can complete pre-joining steps before portal access.",
      },
    ] satisfies SectionHelpPoint[],
  },
  onboarding: {
    title: "About Employee Onboarding",
    points: [
      {
        label: "What this page is for",
        detail:
          "After an offer is sent, the person appears here. HR sends a secure onboarding link so they can complete documents before a company account is created.",
      },
      {
        label: "Who appears here",
        detail:
          "Anyone with a sent or accepted offer is listed automatically. Use Send invitation or Resend invitation on that row — there is no separate New Hire form.",
      },
      {
        label: "Statuses",
        detail:
          "Draft means the offer is in, but the invite is not sent yet. Invitation sent / viewed, documents uploaded, then HR review through to employee created.",
      },
      {
        label: "After completion",
        detail:
          "When onboarding is done, HR can provision the employee account from Employees / invite flows as needed.",
      },
    ] satisfies SectionHelpPoint[],
  },
} as const;
