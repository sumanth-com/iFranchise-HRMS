/** Success copy for User Provisioning manager / HR contact updates. */

export function reportingContactsSuccessMessage(input: {
  managerChanged: boolean;
  hrChanged: boolean;
}): string {
  if (input.managerChanged && input.hrChanged) {
    return "Manager and HR contact updated successfully.";
  }
  if (input.managerChanged) {
    return "Manager assigned successfully.";
  }
  if (input.hrChanged) {
    return "HR contact updated successfully.";
  }
  return "Reporting contacts updated successfully.";
}

export function bulkReportingContactsSuccessMessage(input: {
  managerChanged: boolean;
  hrChanged: boolean;
  employeeCount: number;
}): string {
  const count = Math.max(0, input.employeeCount);
  const noun = count === 1 ? "employee" : "employees";
  if (input.managerChanged && input.hrChanged) {
    return `Manager and HR contact updated for ${count} ${noun} successfully.`;
  }
  if (input.managerChanged) {
    return `Manager assigned to ${count} ${noun} successfully.`;
  }
  if (input.hrChanged) {
    return `HR contact updated for ${count} ${noun} successfully.`;
  }
  return `Reporting contacts updated for ${count} ${noun} successfully.`;
}
