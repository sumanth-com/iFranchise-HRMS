export type LeavePolicyContact = {
  phone: string;
  email: string;
  address: string;
};

export type LeavePolicySection = {
  id: string;
  title: string;
  content: string;
};

export type LeavePolicyDocument = {
  intro: string;
  sections: LeavePolicySection[];
  contact: LeavePolicyContact;
  updatedAt: string | null;
};

export type LeavePolicyHolidayRow = {
  id: string;
  name: string;
  date: string;
  day: string;
  isoDate: string;
  isOptional: boolean;
};

export type LeavePolicyPageData = {
  document: LeavePolicyDocument;
  mandatoryHolidays: LeavePolicyHolidayRow[];
  optionalHolidays: LeavePolicyHolidayRow[];
  holidayYear: number;
};

export type LeavePolicyActionResult =
  | { success: true }
  | { success: false; message: string };
