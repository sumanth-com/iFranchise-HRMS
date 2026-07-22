export const LEAVE_POLICY_CONTACT = {
  phone: "+91-912 913 0303",
  email: "contact@ifranchise.in",
  address: "No 51, Devarabisanahalli, Bangalore, Karnataka - 560103",
} as const;

export type LeavePolicyHoliday = {
  name: string;
  date: string;
  day: string;
  isoDate: string;
};

export const MANDATORY_HOLIDAYS_2026: readonly LeavePolicyHoliday[] = [
  { name: "New Year", date: "01.01.2026", day: "Thursday", isoDate: "2026-01-01" },
  { name: "Makara Sankranti", date: "15.01.2026", day: "Thursday", isoDate: "2026-01-15" },
  { name: "Republic Day", date: "26.01.2026", day: "Monday", isoDate: "2026-01-26" },
  { name: "Maha Sivaratri", date: "15.02.2026", day: "Sunday", isoDate: "2026-02-15" },
  { name: "Ugadi", date: "19.03.2026", day: "Thursday", isoDate: "2026-03-19" },
  { name: "Eid-ul-Fitr (Ramzan)", date: "20.03.2026", day: "Friday", isoDate: "2026-03-20" },
  { name: "May Day (Labour's Day)", date: "01.05.2026", day: "Friday", isoDate: "2026-05-01" },
  { name: "Independence Day", date: "15.08.2026", day: "Saturday", isoDate: "2026-08-15" },
  { name: "Vinayaka Chavithi", date: "14.09.2026", day: "Monday", isoDate: "2026-09-14" },
  { name: "Mahatma Gandhi Jayanthy", date: "02.10.2026", day: "Friday", isoDate: "2026-10-02" },
  { name: "Dusshera", date: "20.10.2026", day: "Tuesday", isoDate: "2026-10-20" },
  { name: "Deepavali", date: "08.11.2026", day: "Sunday", isoDate: "2026-11-08" },
  { name: "Christmas", date: "25.12.2026", day: "Friday", isoDate: "2026-12-25" },
] as const;

export const OPTIONAL_HOLIDAYS_2026: readonly LeavePolicyHoliday[] = [
  { name: "Holi", date: "03.03.2026", day: "Tuesday", isoDate: "2026-03-03" },
  { name: "Srirama Navami", date: "27.03.2026", day: "Friday", isoDate: "2026-03-27" },
  { name: "Good Friday", date: "03.04.2026", day: "Friday", isoDate: "2026-04-03" },
  { name: "Eid-ul-Adha (Bakrid)", date: "27.05.2026", day: "Wednesday", isoDate: "2026-05-27" },
  {
    name: "Moharrum (Shahadat Imam Hussain RA, 1447 Hijri)",
    date: "25.06.2026",
    day: "Thursday",
    isoDate: "2026-06-25",
  },
  { name: "Sri Krishnaashtami", date: "04.09.2026", day: "Friday", isoDate: "2026-09-04" },
] as const;
