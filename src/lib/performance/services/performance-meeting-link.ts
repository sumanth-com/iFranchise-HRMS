const MEETING_LINK_PATTERN = /\n\nMeeting link:\s*(https?:\/\/[^\s]+)\s*$/;
const MEETING_LINK_ONLY_PATTERN = /^Meeting link:\s*(https?:\/\/[^\s]+)\s*$/;

/** Parse meeting link stored in agenda when the DB column is unavailable. */
export function extractMeetingLinkFromAgenda(
  agenda: string | null | undefined,
  meetingLink?: string | null,
): { agenda: string | null; meetingLink: string | null } {
  if (meetingLink?.trim()) {
    return { agenda: agenda ?? null, meetingLink: meetingLink.trim() };
  }

  if (!agenda) return { agenda: null, meetingLink: null };

  const suffixMatch = agenda.match(MEETING_LINK_PATTERN);
  if (suffixMatch) {
    return {
      agenda: agenda.replace(MEETING_LINK_PATTERN, "").trim() || null,
      meetingLink: suffixMatch[1],
    };
  }

  const onlyMatch = agenda.match(MEETING_LINK_ONLY_PATTERN);
  if (onlyMatch) {
    return { agenda: null, meetingLink: onlyMatch[1] };
  }

  return { agenda, meetingLink: null };
}

/** Embed meeting link in agenda when the DB column is not available yet. */
export function agendaWithEmbeddedMeetingLink(
  agenda: string | undefined | null,
  meetingLink: string | undefined | null,
): string | null {
  const cleanAgenda = agenda?.trim() ?? "";
  const cleanLink = meetingLink?.trim() ?? "";
  if (!cleanLink) return cleanAgenda || null;
  if (!cleanAgenda) return `Meeting link: ${cleanLink}`;
  return `${cleanAgenda}\n\nMeeting link: ${cleanLink}`;
}

export function isMissingMeetingLinkColumnError(message: string) {
  return message.includes("meeting_link") && message.includes("does not exist");
}
