export type AssetStatus =
  | "available"
  | "assigned"
  | "maintenance"
  | "lost"
  | "retired"
  | "disposed";

export type AssetAssignmentStatus =
  | "active"
  | "returned"
  | "transferred"
  | "lost"
  | "damaged";

export type AssetMaintenanceStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled";

export type AssetCondition = "excellent" | "good" | "fair" | "poor" | "damaged";

export type AssetSettings = {
  assetPrefix: string;
  enableQrCodes: boolean;
  warrantyReminderDays: number;
  maintenanceReminderDays: number;
  defaultReturnDays: number;
  categories: string[];
};

export type AssetCategoryItem = {
  id: string;
  name: string;
  code: string;
  description: string | null;
};

export type AssetVendorItem = {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  purchasedAssetsCount: number;
  updatedAt: string;
};

export type AssetItem = {
  id: string;
  assetCode: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  purchaseDate: string | null;
  purchaseCost: number | null;
  warrantyExpiry: string | null;
  vendorId: string | null;
  vendorName: string | null;
  assetStatus: AssetStatus;
  officeLocation: string | null;
  departmentId: string | null;
  departmentName: string | null;
  imagePath: string | null;
  qrPayload: string | null;
  notes: string | null;
  currentAssignmentId: string | null;
  assignedEmployeeId: string | null;
  assignedEmployeeName: string | null;
  createdAt: string;
};

export type AssetListResult = {
  data: AssetItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type AssetAssignmentItem = {
  id: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  categoryName: string | null;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string | null;
  assignedDate: string;
  expectedReturnDate: string | null;
  returnedDate: string | null;
  conditionBefore: AssetCondition;
  conditionAfter: AssetCondition | null;
  assignmentStatus: AssetAssignmentStatus;
  remarks: string | null;
  returnRemarks: string | null;
  createdAt: string;
};

export type AssetAssignmentListResult = {
  data: AssetAssignmentItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type AssetMaintenanceItem = {
  id: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  vendorId: string | null;
  vendorName: string | null;
  maintenanceDate: string;
  issue: string;
  cost: number | null;
  nextServiceDate: string | null;
  maintenanceStatus: AssetMaintenanceStatus;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
};

export type AssetMaintenanceListResult = {
  data: AssetMaintenanceItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type AssetsSummary = {
  totalAssets: number;
  assignedAssets: number;
  availableAssets: number;
  underMaintenance: number;
  lostAssets: number;
  warrantyExpiring: number;
  assetsByCategory: { categoryName: string; count: number }[];
  assetsByDepartment: { departmentName: string; count: number }[];
  recentAssignments: AssetAssignmentItem[];
  warrantyTimeline: { assetCode: string; assetName: string; warrantyExpiry: string }[];
};

export type AssetsReportData = {
  utilization: { available: number; assigned: number; maintenance: number; other: number };
  departmentWise: { departmentName: string; count: number; assigned: number }[];
  warrantyExpiry: AssetItem[];
  maintenanceCost: { month: string; total: number }[];
  lostAssets: AssetItem[];
  returnedAssets: AssetAssignmentItem[];
};

export type AssetsLookups = {
  categories: AssetCategoryItem[];
  vendors: { id: string; label: string }[];
  employees: { id: string; label: string }[];
  departments: { id: string; label: string }[];
  availableAssets: { id: string; label: string }[];
  allAssets: { id: string; label: string }[];
};
