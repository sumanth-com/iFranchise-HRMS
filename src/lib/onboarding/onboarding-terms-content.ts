export type OnboardingTermsBlock = {
  title: string;
  paragraphs: string[];
};

export const ONBOARDING_TERMS_BLOCKS: OnboardingTermsBlock[] = [
  {
    title: "Employment & workplace conduct",
    paragraphs: [
      "By joining iFranchise, you agree to perform your duties with integrity, professionalism, and respect for colleagues, customers, and company property.",
      "You must follow applicable laws, company policies, and instructions from authorized managers. Harassment, discrimination, fraud, or misuse of company resources is not permitted.",
    ],
  },
  {
    title: "Attendance, leave & working hours",
    paragraphs: [
      "You are expected to maintain regular attendance and punctuality as per your role and location policy.",
      "Leave must be applied through approved HR channels. Unauthorized absence may affect payroll and disciplinary action.",
    ],
  },
  {
    title: "Confidentiality & data protection",
    paragraphs: [
      "You may access confidential business, customer, and employee information only for legitimate work purposes.",
      "You must protect personal and company data, follow IT security practices, and not share credentials or sensitive information outside authorized channels.",
    ],
  },
  {
    title: "IT, assets & intellectual property",
    paragraphs: [
      "Company devices, systems, email, and software are provided for business use. Reasonable personal use may be allowed where policy permits.",
      "Work product, inventions, and materials created in the course of employment belong to the company unless otherwise agreed in writing.",
    ],
  },
  {
    title: "Privacy & communications",
    paragraphs: [
      "The company may process your personal data for HR, payroll, compliance, and workplace operations in line with applicable privacy laws.",
      "Official communications may be recorded or monitored where permitted by law and company policy.",
    ],
  },
  {
    title: "Offer, employment terms & separation",
    paragraphs: [
      "Your compensation, role, and employment terms are as communicated in your offer and appointment documents.",
      "Either party may end employment as per notice, contract, and applicable law. You must return company assets and complete handover on separation.",
    ],
  },
];
