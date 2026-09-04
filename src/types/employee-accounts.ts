export type EmployeeAccountListItem = {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentId: string | null;
  departmentName: string | null;
  dateOfBirth: string | null;
  aadhaarNumber: string | null;
  panNumber: string | null;
  bankAccountId: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountHolderName: string | null;
  ifscCode: string | null;
  branchName: string | null;
  hasBankAccount: boolean;
  hasIdentityDetails: boolean;
};

export type EmployeeAccountListResult = {
  data: EmployeeAccountListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type EmployeeAccountListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  department?: string;
};

export type EmployeeAccountFormInput = {
  employeeId: string;
  dateOfBirth?: string | null;
  aadhaarNumber?: string | null;
  panNumber?: string | null;
  bankName?: string | null;
  accountHolderName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  branchName?: string | null;
  accountType?: "savings" | "current" | "salary";
};

export type PayslipBankAccountSnapshot = {
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string | null;
  branchName: string | null;
};
