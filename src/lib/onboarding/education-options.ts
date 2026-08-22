/** Education dropdown / typeahead options for Indian qualifications. */

/** Class X / SSC / Secondary boards (India). */
export const INDIAN_SSC_BOARDS = [
  "CBSE — Class X (Secondary)",
  "ICSE — Class X (Secondary)",
  "NIOS — Secondary Course",
  "Andhra Pradesh Board of Secondary Education (BSEAP)",
  "Assam Board of Secondary Education (SEBA)",
  "Bihar School Examination Board (BSEB) — Matric",
  "Chhattisgarh Board of Secondary Education (CGBSE)",
  "Goa Board — Secondary School Certificate (SSC)",
  "Gujarat Secondary Education Board (GSEB) — SSC",
  "Board of School Education Haryana (BSEH) — Secondary",
  "HP Board of School Education (HPBOSE) — Class X",
  "JKBOSE — Class X",
  "Jharkhand Academic Council (JAC) — Class X",
  "Karnataka Secondary Education Examination Board (KSEEB) — SSLC",
  "Kerala Board of Public Examinations (KBPE) — SSLC",
  "Maharashtra State Board — SSC",
  "MP Board of Secondary Education (MPBSE) — Class X",
  "Board of Secondary Education, Odisha (BSE) — Class X",
  "Punjab School Education Board (PSEB) — Matric",
  "Rajasthan Board of Secondary Education (RBSE) — Class X",
  "Tamil Nadu State Board — SSLC",
  "Telangana Board of Secondary Education — SSC",
  "Tripura Board of Secondary Education (TBSE) — Madhyamik",
  "UP Board — High School (Class X)",
  "Uttarakhand Board of School Education (UBSE) — Class X",
  "West Bengal Board of Secondary Education (WBBSE) — Madhyamik",
  "CISCE — ICSE (Class X)",
] as const;

/** Class XII / Intermediate / HSC boards (India). */
export const INDIAN_INTERMEDIATE_BOARDS = [
  "CBSE — Class XII (Senior Secondary)",
  "ISC — Class XII (Indian School Certificate)",
  "NIOS — Senior Secondary Course",
  "Andhra Pradesh Board of Intermediate Education (BIEAP)",
  "Telangana State Board of Intermediate Education (TSBIE)",
  "Assam Higher Secondary Education Council (AHSEC)",
  "Bihar School Examination Board (BSEB) — Intermediate",
  "Chhattisgarh Board of Secondary Education — Higher Secondary",
  "Goa Board — Higher Secondary (HSSC)",
  "Gujarat Secondary and Higher Secondary Education Board (GSEB) — HSC",
  "Board of School Education Haryana (BSEH) — Senior Secondary",
  "HP Board of School Education (HPBOSE) — Class XII",
  "JKBOSE — Class XII",
  "Jharkhand Academic Council (JAC) — Intermediate",
  "Karnataka Pre-University Board (PUC)",
  "Kerala Higher Secondary Examination Board (DHSE) — Plus Two",
  "Maharashtra State Board — HSC",
  "MP Board — Higher Secondary (Class XII)",
  "Council of Higher Secondary Education, Odisha (CHSE)",
  "Punjab School Education Board (PSEB) — Senior Secondary",
  "Rajasthan Board of Secondary Education (RBSE) — Class XII",
  "Tamil Nadu State Board — HSC (+2)",
  "Tripura Board of Joint Entrance Examination (TBJEE) / Higher Secondary",
  "UP Board — Intermediate (Class XII)",
  "Uttarakhand Board of School Education (UBSE) — Class XII",
  "West Bengal Council of Higher Secondary Education (WBCHSE)",
  "CISCE — ISC (Class XII)",
] as const;

/** @deprecated Use INDIAN_SSC_BOARDS or INDIAN_INTERMEDIATE_BOARDS */
export const INDIAN_SCHOOL_BOARDS = INDIAN_SSC_BOARDS;

export const INTERMEDIATE_QUALIFICATIONS = [
  "12th / Intermediate / Senior Secondary",
  "PUC (Pre-University Course)",
  "HSC (Higher Secondary Certificate)",
] as const;

export const ACADEMIC_STREAMS = [
  "MPC (Maths, Physics, Chemistry)",
  "BiPC (Biology, Physics, Chemistry)",
  "CEC (Commerce, Economics, Civics)",
  "MEC (Maths, Economics, Commerce)",
  "Commerce",
  "Arts / Humanities",
  "Vocational",
  "Other",
] as const;

export const GRADUATION_DEGREES = [
  "B.Tech",
  "B.E.",
  "B.Sc",
  "B.Com",
  "BBA",
  "BCA",
  "BA",
  "B.Pharm",
  "LLB",
  "MBBS",
  "BDS",
  "B.Arch",
  "B.Ed",
  "BHM",
  "BMS",
  "Other",
] as const;

export const GRADUATION_SPECIALIZATIONS = [
  "Computer Science Engineering (CSE)",
  "Electronics and Communication Engineering (ECE)",
  "Electrical and Electronics Engineering (EEE)",
  "Mechanical Engineering",
  "Civil Engineering",
  "Information Technology (IT)",
  "Artificial Intelligence & Machine Learning",
  "Data Science",
  "Cyber Security",
  "Automobile Engineering",
  "Aerospace Engineering",
  "Biotechnology",
  "Chemical Engineering",
  "Accounting & Finance",
  "Marketing",
  "Human Resource Management",
  "Economics",
  "Psychology",
  "English Literature",
  "Political Science",
  "Other",
] as const;

export function filterEducationOptions(
  options: readonly string[],
  query: string,
  limit = 25,
): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...options].slice(0, limit);
  return options.filter((item) => item.toLowerCase().includes(q)).slice(0, limit);
}

export function toSelectItems(options: readonly string[]) {
  return options.map((item) => ({ value: item, label: item }));
}

export function isValidEducationDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed);
}

export function isValidEducationDateRange(from: string, to: string): boolean {
  if (!isValidEducationDate(from) || !isValidEducationDate(to)) return false;
  return from <= to;
}

export function normalizeIntermediateQualification(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const legacyMap: Record<string, string> = {
    "12th": "12th / Intermediate / Senior Secondary",
    Intermediate: "12th / Intermediate / Senior Secondary",
    "Senior Secondary": "12th / Intermediate / Senior Secondary",
    "PUC (Pre-University Course)": "PUC (Pre-University Course)",
    "HSC (Higher Secondary Certificate)": "HSC (Higher Secondary Certificate)",
  };
  return legacyMap[trimmed] ?? trimmed;
}
