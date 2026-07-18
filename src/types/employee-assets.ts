import type {
  AssetAssignmentStatus,
  AssetCondition,
  AssetMaintenanceStatus,
  AssetStatus,
} from "@/types/assets";

export type EmployeeAssetWarranty = {
  status: "active" | "expired" | "none";
  expiry: string | null;
  daysRemaining: number | null;
};

export type EmployeeAssetMaintenance = {
  id: string;
  maintenanceDate: string;
  issue: string;
  maintenanceStatus: AssetMaintenanceStatus;
  nextServiceDate: string | null;
  completedAt: string | null;
  vendorName: string | null;
  notes: string | null;
};

export type EmployeeAsset = {
  assignmentId: string;
  assignmentStatus: AssetAssignmentStatus;
  assignedDate: string;
  expectedReturnDate: string | null;
  returnedDate: string | null;
  conditionBefore: AssetCondition;
  conditionAfter: AssetCondition | null;
  remarks: string | null;
  returnRemarks: string | null;

  assetId: string;
  assetCode: string;
  name: string;
  categoryName: string | null;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  purchaseDate: string | null;
  assetStatus: AssetStatus;
  officeLocation: string | null;
  notes: string | null;
  imageUrl: string | null;

  warranty: EmployeeAssetWarranty;
  maintenance: EmployeeAssetMaintenance[];
};

export type EmployeeAssetsSummary = {
  currentlyAssigned: number;
  previouslyReturned: number;
  underRepair: number;
  warrantyExpiringSoon: number;
  lostOrDamaged: number;
};

export type EmployeeAssetsData = {
  assigned: EmployeeAsset[];
  history: EmployeeAsset[];
  summary: EmployeeAssetsSummary;
  categories: string[];
};
