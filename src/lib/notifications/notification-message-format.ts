import { format, isValid, parseISO } from "date-fns";

import { formatNotificationDisplayText } from "@/lib/notifications/constants";

/** Formats notification body text for employee-facing views. */
export function formatEnterpriseNotificationMessage(text: string): string {
  let result = formatNotificationDisplayText(text);

  result = result.replace(
    /\b(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}:\d{2}(?::\d{2})?)?)?\b/g,
    (match, datePart: string, timePart?: string) => {
      const parsed = parseISO(timePart ? `${datePart}T${timePart}` : datePart);
      if (!isValid(parsed)) return match;
      return timePart ? format(parsed, "d MMM yyyy, h:mm a") : format(parsed, "d MMM yyyy");
    },
  );

  return result.replace(/\s{2,}/g, " ").trim();
}
