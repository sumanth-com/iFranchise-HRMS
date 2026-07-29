export type EmployeeDirectoryPerson = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  designationTitle: string | null;
  departmentId: string | null;
  departmentName: string | null;
  verticalName: string | null;
  avatarUrl: string | null;
  profileImagePath: string | null;
};
