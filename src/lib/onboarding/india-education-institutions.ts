/** Indian universities and colleges grouped by state for onboarding typeahead. */

import { INDIAN_STATES } from "@/lib/onboarding/india-locations";

const NATIONAL_UNIVERSITIES = [
  "University of Delhi",
  "Jawaharlal Nehru University (JNU)",
  "Jamia Millia Islamia",
  "Indira Gandhi National Open University (IGNOU)",
  "Banaras Hindu University (BHU)",
  "Aligarh Muslim University (AMU)",
  "University of Hyderabad",
  "Pondicherry University",
  "English and Foreign Languages University (EFLU)",
  "Indian Institute of Science (IISc), Bengaluru",
  "BITS Pilani",
  "Manipal Academy of Higher Education",
] as const;

const UNIVERSITIES_BY_STATE: Record<string, readonly string[]> = {
  "Andhra Pradesh": [
    "Andhra University, Visakhapatnam",
    "Sri Venkateswara University, Tirupati",
    "Acharya Nagarjuna University, Guntur",
    "Dr. Y.S.R. Horticultural University",
    "JNTU Anantapur",
    "JNTU Kakinada",
    "JNTU Hyderabad (AP campus affiliates)",
    "Rayalaseema University, Kurnool",
  ],
  "Arunachal Pradesh": [
    "Rajiv Gandhi University, Itanagar",
    "North Eastern Regional Institute of Science and Technology (NERIST)",
    "Arunachal University of Studies",
  ],
  Assam: [
    "Gauhati University, Guwahati",
    "Dibrugarh University",
    "Tezpur University",
    "Assam University, Silchar",
    "Cotton University, Guwahati",
  ],
  Bihar: [
    "Patna University",
    "Magadh University, Bodh Gaya",
    "Lalit Narayan Mithila University, Darbhanga",
    "Aryabhatta Knowledge University, Patna",
    "Bihar Agricultural University, Sabour",
  ],
  Chhattisgarh: [
    "Pt. Ravishankar Shukla University, Raipur",
    "Guru Ghasidas Vishwavidyalaya, Bilaspur",
    "Hidayatullah National Law University, Raipur",
    "Chhattisgarh Swami Vivekananda Technical University, Bhilai",
  ],
  Delhi: [
    "Delhi Technological University (DTU)",
    "Guru Gobind Singh Indraprastha University (GGSIPU)",
    "Netaji Subhas University of Technology (NSUT)",
    "Indraprastha Institute of Information Technology (IIIT-D)",
    "Ambedkar University Delhi",
  ],
  Goa: ["Goa University, Taleigao"],
  Gujarat: [
    "Gujarat University, Ahmedabad",
    "Maharaja Sayajirao University of Baroda, Vadodara",
    "Sardar Patel University, Vallabh Vidyanagar",
    "Nirma University, Ahmedabad",
    "Dhirubhai Ambani Institute of Information and Communication Technology (DA-IICT)",
  ],
  Haryana: [
    "Kurukshetra University",
    "Maharshi Dayanand University, Rohtak",
    "Guru Jambheshwar University, Hisar",
    "Deenbandhu Chhotu Ram University of Science and Technology, Murthal",
  ],
  "Himachal Pradesh": [
    "Himachal Pradesh University, Shimla",
    "Central University of Himachal Pradesh, Dharamshala",
    "Shoolini University, Solan",
  ],
  "Jammu and Kashmir": [
    "University of Kashmir, Srinagar",
    "University of Jammu",
    "Islamic University of Science and Technology, Awantipora",
  ],
  Jharkhand: [
    "Ranchi University",
    "Vinoba Bhave University, Hazaribagh",
    "Birla Institute of Technology (BIT Mesra), Ranchi",
    "XLRI Xavier School of Management, Jamshedpur",
  ],
  Karnataka: [
    "Bangalore University",
    "Mysore University",
    "Visvesvaraya Technological University (VTU), Belagavi",
    "Karnatak University, Dharwad",
    "Gulbarga University, Kalaburagi",
    "Mangalore University",
    "Rajiv Gandhi University of Health Sciences, Bengaluru",
  ],
  Kerala: [
    "University of Kerala, Thiruvananthapuram",
    "Mahatma Gandhi University, Kottayam",
    "Calicut University, Kozhikode",
    "Cochin University of Science and Technology (CUSAT)",
    "Kerala Agricultural University, Thrissur",
  ],
  "Madhya Pradesh": [
    "Devi Ahilya Vishwavidyalaya, Indore",
    "Rani Durgavati Vishwavidyalaya, Jabalpur",
    "Barkatullah University, Bhopal",
    "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV), Bhopal",
    "Madhya Pradesh Medical Science University, Jabalpur",
  ],
  Maharashtra: [
    "University of Mumbai",
    "Savitribai Phule Pune University (SPPU)",
    "Shivaji University, Kolhapur",
    "Dr. Babasaheb Ambedkar Marathwada University, Aurangabad",
    "Sant Gadge Baba Amravati University",
    "Mumbai University Institute of Chemical Technology (ICT)",
  ],
  Manipur: ["Manipur University, Canchipur", "Central Agricultural University, Imphal"],
  Meghalaya: ["North-Eastern Hill University (NEHU), Shillong", "University of Science and Technology, Meghalaya"],
  Mizoram: ["Mizoram University, Aizawl"],
  Nagaland: ["Nagaland University, Lumami"],
  Odisha: [
    "Utkal University, Bhubaneswar",
    "Berhampur University",
    "Sambalpur University",
    "Biju Patnaik University of Technology (BPUT), Rourkela",
    "KIIT University, Bhubaneswar",
  ],
  Punjab: [
    "Panjab University, Chandigarh",
    "Guru Nanak Dev University, Amritsar",
    "Punjabi University, Patiala",
    "Punjab Agricultural University, Ludhiana",
    "Lovely Professional University (LPU), Phagwara",
  ],
  Rajasthan: [
    "University of Rajasthan, Jaipur",
    "Maharaja Ganga Singh University, Bikaner",
    "Jai Narain Vyas University, Jodhpur",
    "Rajasthan Technical University, Kota",
    "Mohanlal Sukhadia University, Udaipur",
  ],
  Sikkim: ["Sikkim University, Gangtok"],
  "Tamil Nadu": [
    "University of Madras, Chennai",
    "Anna University, Chennai",
    "Bharathiar University, Coimbatore",
    "Madurai Kamaraj University",
    "Alagappa University, Karaikudi",
    "Tamil Nadu Dr. M.G.R. Medical University, Chennai",
    "VIT University, Vellore",
    "SRM Institute of Science and Technology, Chennai",
  ],
  Telangana: [
    "Osmania University, Hyderabad",
    "Kakatiya University, Warangal",
    "Telangana University, Nizamabad",
    "Jawaharlal Nehru Technological University Hyderabad (JNTUH)",
    "International Institute of Information Technology Hyderabad (IIIT-H)",
    "University of Hyderabad",
  ],
  Tripura: ["Tripura University, Agartala"],
  "Uttar Pradesh": [
    "University of Allahabad (Prayagraj)",
    "Lucknow University",
    "Banaras Hindu University (BHU), Varanasi",
    "Dr. A.P.J. Abdul Kalam Technical University (AKTU), Lucknow",
    "Chaudhary Charan Singh University, Meerut",
    "Dr. B.R. Ambedkar University, Agra",
    "Aligarh Muslim University (AMU)",
  ],
  Uttarakhand: [
    "Kumaun University, Nainital",
    "Uttarakhand Technical University, Dehradun",
    "Graphic Era University, Dehradun",
    "Doon University, Dehradun",
  ],
  "West Bengal": [
    "University of Calcutta",
    "Jadavpur University, Kolkata",
    "University of Kalyani",
    "Visva-Bharati University, Santiniketan",
    "Maulana Abul Kalam Azad University of Technology (MAKAUT), Kolkata",
  ],
  Chandigarh: ["Panjab University, Chandigarh"],
  Puducherry: ["Pondicherry University"],
  Ladakh: ["University of Ladakh, Leh"],
};

const COLLEGES_BY_STATE: Record<string, readonly string[]> = {
  "Andhra Pradesh": [
    "Government Junior College",
    "Sri Chaitanya Junior College",
    "Narayana Junior College",
    "Rajiv Gandhi University of Knowledge Technologies (RGUKT)",
    "Andhra Loyola College, Vijayawada",
    "Sri Venkateswara College of Engineering, Tirupati",
    "GMR Institute of Technology, Rajam",
    "Vignan's Foundation for Science, Technology and Research, Guntur",
  ],
  Telangana: [
    "Narayana Junior College, Hyderabad",
    "Sri Chaitanya Junior College, Hyderabad",
    "Osmania University College for Women",
    "CBIT — Chaitanya Bharathi Institute of Technology, Hyderabad",
    "Vasavi College of Engineering, Hyderabad",
    "G Narayanamma Institute of Technology and Science, Hyderabad",
  ],
  Karnataka: [
    "RV College of Engineering, Bengaluru",
    "PES University, Bengaluru",
    "MS Ramaiah Institute of Technology, Bengaluru",
    "BMS College of Engineering, Bengaluru",
    "National College, Bengaluru",
    "Christ University, Bengaluru",
  ],
  "Tamil Nadu": [
    "Loyola College, Chennai",
    "PSG College of Technology, Coimbatore",
    "Thiagarajar College of Engineering, Madurai",
    "SSN College of Engineering, Chennai",
    "St. Joseph's College, Trichy",
  ],
  Maharashtra: [
    "Fergusson College, Pune",
    "Veermata Jijabai Technological Institute (VJTI), Mumbai",
    "College of Engineering Pune (COEP)",
    "Symbiosis College, Pune",
    "K J Somaiya College of Engineering, Mumbai",
  ],
  Delhi: [
    "Hansraj College, Delhi",
    "Shri Ram College of Commerce (SRCC), Delhi",
    "Delhi Technological University (DTU)",
    "Netaji Subhas University of Technology (NSUT)",
    "Indira Gandhi Delhi Technical University for Women",
  ],
  Kerala: [
    "Government Engineering College, Thrissur",
    "Rajagiri College of Social Sciences, Kochi",
    "Federal Institute of Science and Technology (FISAT), Kochi",
  ],
  Gujarat: [
    "L.D. College of Engineering, Ahmedabad",
    "Nirma Institute of Technology, Ahmedabad",
    "Dharmsinh Desai University College, Nadiad",
  ],
  "Uttar Pradesh": [
    "IIT BHU (Institute of Banaras Hindu University)",
    "Harcourt Butler Technical University, Kanpur",
    "Bundelkhand University College, Jhansi",
    "Amity University, Noida",
  ],
  Rajasthan: [
    "Malaviya National Institute of Technology (MNIT), Jaipur",
    "Banasthali Vidyapith, Tonk",
    "St. Xavier's College, Jaipur",
  ],
  "West Bengal": [
    "Jadavpur University — Faculty of Engineering",
    "Heritage Institute of Technology, Kolkata",
    "Presidency University, Kolkata",
  ],
  Punjab: [
    "Thapar Institute of Engineering and Technology, Patiala",
    "Guru Nanak Dev Engineering College, Ludhiana",
    "DAV College, Chandigarh",
  ],
  Bihar: [
    "National Institute of Technology (NIT), Patna",
    "Patna Science College",
    "Birla Institute of Technology, Patna extension",
  ],
  Odisha: [
    "National Institute of Technology (NIT), Rourkela",
    "KIIT School of Engineering, Bhubaneswar",
    "CV Raman Global University, Bhubaneswar",
  ],
  "Madhya Pradesh": [
    "Maulana Azad National Institute of Technology (MANIT), Bhopal",
    "Shri Govindram Seksaria Institute of Technology and Science (SGSITS), Indore",
  ],
  Haryana: [
    "National Institute of Technology (NIT), Kurukshetra",
    "YMCA University of Science and Technology, Faridabad",
  ],
  Jharkhand: [
    "National Institute of Technology (NIT), Jamshedpur",
    "Birla Institute of Technology (BIT Mesra), Ranchi",
  ],
  Assam: [
    "Cotton University, Guwahati",
    "National Institute of Technology (NIT), Silchar",
    "Tezpur University College of Engineering",
  ],
};

const NATIONAL_COLLEGES = [
  "Indian Institute of Technology (IIT)",
  "National Institute of Technology (NIT)",
  "Indian Institute of Information Technology (IIIT)",
  "Indian Institute of Management (IIM)",
  "All India Institute of Medical Sciences (AIIMS)",
  "Government Polytechnic",
  "Government Degree College",
  "Private Engineering College",
  "Private Degree College",
] as const;

function flattenByState(
  byState: Record<string, readonly string[]>,
  national: readonly string[],
): string[] {
  const items = new Set<string>(national);
  for (const state of INDIAN_STATES) {
    const list = byState[state];
    if (!list) continue;
    for (const name of list) {
      items.add(`${state} — ${name}`);
    }
  }
  return [...items].sort((a, b) => a.localeCompare(b));
}

export const INDIAN_UNIVERSITIES_ALL = [
  ...NATIONAL_UNIVERSITIES,
  ...flattenByState(UNIVERSITIES_BY_STATE, []),
] as const;

export const INDIAN_COLLEGES_ALL = flattenByState(COLLEGES_BY_STATE, NATIONAL_COLLEGES);

export function filterInstitutionsByState(
  options: readonly string[],
  query: string,
  state?: string,
  limit = 30,
): string[] {
  const q = query.trim().toLowerCase();
  const stateKey = state?.trim().toLowerCase();

  let pool = options;
  if (stateKey) {
    pool = options.filter(
      (item) =>
        item.toLowerCase().startsWith(`${stateKey} —`) ||
        item.toLowerCase().includes(stateKey),
    );
  }

  if (!q) return [...pool].slice(0, limit);
  return pool.filter((item) => item.toLowerCase().includes(q)).slice(0, limit);
}
