/** Education dropdown / typeahead options for Indian qualifications. */

export const INDIAN_SCHOOL_BOARDS = [
  "CBSE (Central Board of Secondary Education)",
  "ICSE (Indian Certificate of Secondary Education)",
  "ISC (Indian School Certificate)",
  "NIOS (National Institute of Open Schooling)",
  "Andhra Pradesh Board of Secondary Education",
  "Assam Board of Secondary Education (SEBA)",
  "Bihar School Examination Board (BSEB)",
  "Chhattisgarh Board of Secondary Education (CGBSE)",
  "Goa Board of Secondary and Higher Secondary Education",
  "Gujarat Secondary and Higher Secondary Education Board (GSEB)",
  "Board of School Education Haryana (BSEH)",
  "Himachal Pradesh Board of School Education (HPBOSE)",
  "Jammu and Kashmir Board of School Education (JKBOSE)",
  "Jharkhand Academic Council (JAC)",
  "Karnataka Secondary Education Examination Board (KSEEB)",
  "Kerala Board of Public Examinations (KBPE)",
  "Maharashtra State Board of Secondary and Higher Secondary Education (MSBSHSE)",
  "Board of Secondary Education, Madhya Pradesh (MPBSE)",
  "Board of Secondary Education, Odisha (BSE Odisha)",
  "Punjab School Education Board (PSEB)",
  "Rajasthan Board of Secondary Education (RBSE)",
  "Tamil Nadu State Board",
  "Telangana Board of Secondary Education (BSE Telangana)",
  "Tripura Board of Secondary Education (TBSE)",
  "Uttar Pradesh Board of Secondary Education (UP Board)",
  "Uttarakhand Board of School Education (UBSE)",
  "West Bengal Board of Secondary Education (WBBSE)",
  "Council for the Indian School Certificate Examinations (CISCE)",
] as const;

export const INTERMEDIATE_QUALIFICATIONS = [
  "12th",
  "Intermediate",
  "PUC (Pre-University Course)",
  "HSC (Higher Secondary Certificate)",
  "Senior Secondary",
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

export const INDIAN_UNIVERSITIES = [
  "University of Delhi",
  "Jawaharlal Nehru University (JNU)",
  "Banaras Hindu University (BHU)",
  "Aligarh Muslim University (AMU)",
  "University of Mumbai",
  "University of Pune (SPPU)",
  "Savitribai Phule Pune University",
  "University of Calcutta",
  "Jadavpur University",
  "University of Hyderabad",
  "Osmania University",
  "Kakatiya University",
  "Andhra University",
  "Sri Venkateswara University",
  "Anna University",
  "Bharathiar University",
  "Madras University",
  "Visvesvaraya Technological University (VTU)",
  "Bangalore University",
  "Mysore University",
  "Gujarat University",
  "Maharaja Sayajirao University of Baroda",
  "Panjab University",
  "Guru Nanak Dev University",
  "Rajasthan University",
  "University of Rajasthan",
  "Lucknow University",
  "Allahabad University (University of Allahabad)",
  "Dr. A.P.J. Abdul Kalam Technical University (AKTU)",
  "Gautam Buddha University",
  "Jamia Millia Islamia",
  "Indira Gandhi National Open University (IGNOU)",
  "BITS Pilani",
  "Manipal Academy of Higher Education",
  "Amity University",
  "VIT University (Vellore Institute of Technology)",
  "SRM Institute of Science and Technology",
  "Lovely Professional University (LPU)",
  "Chandigarh University",
  "Symbiosis International University",
  "Other",
] as const;

export const INDIAN_COLLEGES = [
  "Indian Institute of Technology (IIT)",
  "National Institute of Technology (NIT)",
  "Indian Institute of Information Technology (IIIT)",
  "Government Degree College",
  "Government Polytechnic",
  "Private Engineering College",
  "Private Degree College",
  "Autonomous College",
  "Affiliated College",
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

export function passingYearSelectItems() {
  const current = new Date().getFullYear();
  const items: { value: string; label: string }[] = [];
  for (let year = current + 1; year >= 1970; year -= 1) {
    items.push({ value: String(year), label: String(year) });
  }
  return items;
}

export function sanitizeYear(value: string): string {
  return value.replace(/\D/g, "").slice(0, 4);
}

export function isValidPassingYear(value: string): boolean {
  if (!/^\d{4}$/.test(value)) return false;
  const year = Number(value);
  const current = new Date().getFullYear();
  return year >= 1970 && year <= current + 1;
}
