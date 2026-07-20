export type EmployeeDirectoryPerson = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  designationTitle: string | null;
  departmentName: string | null;
  dateOfJoining: string | null;
  experienceYears: number | null;
  avatarUrl: string | null;
};
