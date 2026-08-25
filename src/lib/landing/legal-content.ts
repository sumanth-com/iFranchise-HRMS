export const LEGAL_ROUTES = {
  terms: "/terms",
  privacy: "/privacy",
  cookies: "/cookies",
  security: "/security",
} as const;

export type LegalPageSlug = keyof typeof LEGAL_ROUTES;

export type LegalSection = {
  title: string;
  paragraphs: string[];
};

export type LegalPageContent = {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
};

export const LEGAL_FOOTER_LINKS = [
  { href: LEGAL_ROUTES.terms, label: "Terms & Conditions" },
  { href: LEGAL_ROUTES.privacy, label: "Privacy Policy" },
  { href: LEGAL_ROUTES.cookies, label: "Cookie Policy" },
  { href: LEGAL_ROUTES.security, label: "Security" },
] as const;

export const LEGAL_PAGES: Record<LegalPageSlug, LegalPageContent> = {
  terms: {
    title: "Terms & Conditions",
    lastUpdated: "25 August 2026",
    intro:
      "These Terms & Conditions govern access to and use of the iFranchise HRMS workplace platform. By signing in or continuing to use the platform, you agree to use it responsibly and in line with company policy, applicable law, and the guidance of your organization.",
    sections: [
      {
        title: "1. Purpose of the platform",
        paragraphs: [
          "iFranchise HRMS is an internal workplace system used to manage attendance, leave, payroll information, employee records, performance activities, documents, approvals, and related HR processes.",
          "Access is provided solely for authorized employees, managers, HR, executives, and other approved roles within the organization.",
          "The platform is intended for legitimate workplace operations and should not be used for personal or unauthorized purposes.",
        ],
      },
      {
        title: "2. Eligibility and accounts",
        paragraphs: [
          "Only users provisioned by the organization may create or maintain an account on iFranchise HRMS.",
          "You are responsible for keeping your login credentials confidential and for activity carried out under your account.",
          "If you suspect unauthorized access to your account, notify IT support or your HR administrator immediately.",
        ],
      },
      {
        title: "3. Acceptable use",
        paragraphs: [
          "You must use the platform only for legitimate work purposes and follow role-based access rules.",
          "You must not attempt to access information outside your permissions, interfere with system security, misuse workplace data, or disrupt platform availability.",
          "Uploading harmful content, sharing credentials, or attempting to bypass authentication and authorization controls is prohibited.",
        ],
      },
      {
        title: "4. Accuracy of information",
        paragraphs: [
          "Users are responsible for submitting accurate attendance, leave, profile, and related workplace information.",
          "HR and authorized administrators may review, correct, or update records where required for operational, payroll, audit, or compliance purposes.",
          "Delay or failure to keep information accurate may affect approvals, payroll processing, or workplace records.",
        ],
      },
      {
        title: "5. Availability and changes",
        paragraphs: [
          "We aim to keep the platform available during normal business operations. Temporary interruptions may occur for maintenance, upgrades, or unforeseen technical issues.",
          "Features may be improved, updated, or adjusted over time to support workplace needs and security requirements.",
        ],
      },
      {
        title: "6. Intellectual property and confidentiality",
        paragraphs: [
          "Platform content, branding, and system materials remain the property of iFranchise or its licensors, except for employee data owned or controlled by the organization under applicable policy.",
          "Users must treat workplace information as confidential and use it only for authorized business purposes.",
        ],
      },
      {
        title: "7. Changes to these terms",
        paragraphs: [
          "These terms may be updated from time to time. The latest version will be published on this page with an updated date.",
          "Continued use of the platform after updates means you accept the revised terms, unless applicable law or company policy requires otherwise.",
        ],
      },
      {
        title: "8. Contact",
        paragraphs: [
          "For questions about these Terms & Conditions, contact your HR administrator or IT support team.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    lastUpdated: "25 August 2026",
    intro:
      "This Privacy Policy explains how iFranchise HRMS handles personal and employment-related information within the workplace platform so employees, managers, and HR teams understand what is processed and why.",
    sections: [
      {
        title: "1. Information we process",
        paragraphs: [
          "The platform may process employee identity details, contact information, attendance and leave records, payroll-related data, documents, performance information, organizational assignments, and system activity needed to operate HR processes.",
          "Depending on your role and organization settings, additional workplace records such as approvals, onboarding details, or asset information may also be processed.",
        ],
      },
      {
        title: "2. Why we process information",
        paragraphs: [
          "Information is processed to support day-to-day workplace operations, including attendance tracking, leave management, payroll access, employee administration, approvals, reporting, and internal communication.",
          "Processing is limited to what is needed for business operations, security, auditability, and compliance with company policy and applicable law.",
        ],
      },
      {
        title: "3. Access and permissions",
        paragraphs: [
          "Access to personal and employment data is role-based. Employees, managers, HR, and other authorized roles see only the information relevant to their responsibilities.",
          "Administrative and elevated access is restricted to authorized personnel and controlled through the platform permission model.",
        ],
      },
      {
        title: "4. Sharing",
        paragraphs: [
          "Workplace data is intended for internal use. Information is shared only with authorized personnel or systems required to deliver HRMS services.",
          "iFranchise HRMS does not sell personal workplace data to third parties.",
        ],
      },
      {
        title: "5. Retention and security",
        paragraphs: [
          "Records are retained for as long as needed for employment, operational, legal, or audit requirements, in line with company policy.",
          "Technical and organizational controls are used to help protect information against unauthorized access, alteration, or disclosure.",
        ],
      },
      {
        title: "6. Your responsibilities and requests",
        paragraphs: [
          "Keep your profile and submitted information up to date where you are allowed to edit it.",
          "For privacy-related requests or concerns, contact your HR administrator. Requests will be handled according to company policy and applicable requirements.",
        ],
      },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    lastUpdated: "25 August 2026",
    intro:
      "This Cookie Policy describes how iFranchise HRMS uses cookies and similar technologies to keep the platform secure, functional, and consistent for authorized users.",
    sections: [
      {
        title: "1. What we use cookies for",
        paragraphs: [
          "Cookies and similar storage technologies help maintain secure sign-in sessions, remember preferences, support idle-session controls, and keep the application working reliably.",
          "These technologies are used to operate the platform, not to sell personal information.",
        ],
      },
      {
        title: "2. Essential cookies",
        paragraphs: [
          "Essential cookies are required for authentication, session continuity, security controls, and core platform features.",
          "Without these cookies, sign-in and protected workplace features may not function correctly.",
        ],
      },
      {
        title: "3. Preference cookies",
        paragraphs: [
          "Preference cookies may store settings such as display theme so your experience remains consistent across visits.",
          "These preferences improve usability and do not replace essential security controls.",
        ],
      },
      {
        title: "4. Managing cookies",
        paragraphs: [
          "You can control cookies through your browser settings. Disabling essential cookies may prevent sign-in or limit access to protected workplace features.",
          "If you experience access issues after changing cookie settings, contact IT support for assistance.",
        ],
      },
      {
        title: "5. Updates",
        paragraphs: [
          "This Cookie Policy may be updated as platform features or security requirements change.",
          "The latest version will be published on this page with an updated date.",
        ],
      },
    ],
  },
  security: {
    title: "Security",
    lastUpdated: "25 August 2026",
    intro:
      "iFranchise HRMS is designed to protect workplace information through secure access, role-based permissions, and controlled platform operations across attendance, leave, payroll, and people processes.",
    sections: [
      {
        title: "1. Secure access",
        paragraphs: [
          "Users authenticate before accessing the platform. Sessions are protected and inactivity controls help reduce unauthorized access to open workstations.",
          "Sign-in and session handling are designed to keep workplace accounts available only to authorized users.",
        ],
      },
      {
        title: "2. Role-based permissions",
        paragraphs: [
          "Employees, managers, HR, and other roles receive access based on their responsibilities.",
          "Sensitive actions and records remain limited to authorized users through the platform permission model.",
        ],
      },
      {
        title: "3. Data protection practices",
        paragraphs: [
          "Workplace information is organized within a controlled environment.",
          "Platform features are designed to keep attendance, leave, payroll, documents, and employee records available only to users with appropriate permission.",
        ],
      },
      {
        title: "4. Monitoring and controls",
        paragraphs: [
          "Operational controls such as audit visibility, approval workflows, and access restrictions help maintain accountability across workplace processes.",
          "Security practices may evolve as platform capabilities and organizational requirements change.",
        ],
      },
      {
        title: "5. User responsibilities",
        paragraphs: [
          "Protect your credentials, avoid sharing accounts, sign out on shared devices, and report suspicious activity to IT support promptly.",
          "Responsible use by every user is an important part of keeping workplace information secure.",
        ],
      },
      {
        title: "6. Reporting concerns",
        paragraphs: [
          "If you believe there has been unauthorized access or a security issue, contact your IT support team or HR administrator immediately.",
        ],
      },
    ],
  },
};
