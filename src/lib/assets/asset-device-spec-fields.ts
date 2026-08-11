import {
  ASSET_DEVICE_CATALOG_KEYS,
  ASSET_DEVICE_IMAGE_CATALOG,
  type AssetDeviceCatalogKey,
} from "@/lib/assets/asset-device-images";

export type AssetDeviceSpecField =
  | "chip"
  | "memory"
  | "storage"
  | "operatingSystem"
  | "accessories"
  | "connectionType";

export type AssetDeviceSpecValues = {
  chip: string;
  memory: string;
  storage: string;
  operatingSystem: string;
  accessories: string;
  connectionType: string;
};

export const CONNECTION_TYPE_OPTIONS = [
  { value: "Bluetooth", label: "Bluetooth" },
  { value: "Wired", label: "Wired" },
  { value: "Wireless", label: "Wireless" },
] as const;

const SPEC_FIELD_LABELS: Record<AssetDeviceSpecField, string> = {
  chip: "Chip / processor",
  memory: "Memory",
  storage: "Storage",
  operatingSystem: "Operating system",
  accessories: "Additional details",
  connectionType: "Connection type",
};

/** Spec fields shown per device type when registering or assigning. */
const DEVICE_SPEC_FIELDS: Record<AssetDeviceCatalogKey, AssetDeviceSpecField[]> = {
  macbook: ["chip", "memory", "storage", "operatingSystem", "accessories"],
  laptop: ["chip", "memory", "storage", "operatingSystem", "accessories"],
  desktopPc: ["chip", "memory", "storage", "operatingSystem", "accessories"],
  imac: ["chip", "memory", "storage", "operatingSystem", "accessories"],
  iphone: ["memory", "storage", "operatingSystem", "accessories"],
  androidPhone: ["memory", "storage", "operatingSystem", "accessories"],
  ipad: ["memory", "storage", "operatingSystem", "accessories"],
  tablet: ["memory", "storage", "operatingSystem", "accessories"],
  hardDrive: ["storage", "accessories"],
  usbDrive: ["storage"],
  monitor: ["connectionType", "accessories"],
  dualMonitor: ["connectionType", "accessories"],
  keyboard: ["connectionType", "accessories"],
  mouse: ["connectionType", "accessories"],
  trackpad: ["connectionType", "accessories"],
  headphones: ["connectionType", "accessories"],
  airPods: ["connectionType", "accessories"],
  microphone: ["connectionType", "accessories"],
  appleWatch: ["connectionType", "memory", "accessories"],
  smartwatch: ["connectionType", "memory", "accessories"],
};

const DEFAULT_SPEC_FIELDS: AssetDeviceSpecField[] = [
  "chip",
  "memory",
  "storage",
  "operatingSystem",
  "accessories",
];

const CATEGORY_DEVICE_MAP: Record<string, AssetDeviceCatalogKey> = {
  laptop: "laptop",
  desktop: "desktopPc",
  monitor: "monitor",
  keyboard: "keyboard",
  mouse: "mouse",
  mobile: "androidPhone",
  sim: "androidPhone",
  printer: "monitor",
  furniture: "monitor",
  other: "hardDrive",
};

export function categoryNameToDeviceType(
  categoryName: string | null | undefined,
): AssetDeviceCatalogKey | null {
  if (!categoryName?.trim()) return null;
  const lower = categoryName.trim().toLowerCase();
  if (CATEGORY_DEVICE_MAP[lower]) return CATEGORY_DEVICE_MAP[lower];

  for (const key of ASSET_DEVICE_CATALOG_KEYS) {
    const config = ASSET_DEVICE_IMAGE_CATALOG[key];
    if (config.categoryNames.some((name) => name.toLowerCase() === lower)) {
      return key;
    }
  }

  return null;
}

export function getDeviceSpecFields(
  deviceType: AssetDeviceCatalogKey | null | undefined,
): AssetDeviceSpecField[] {
  if (!deviceType) return [];
  return DEVICE_SPEC_FIELDS[deviceType] ?? DEFAULT_SPEC_FIELDS;
}

export function getSpecFieldLabel(field: AssetDeviceSpecField): string {
  return SPEC_FIELD_LABELS[field];
}

export function deviceShowsWarrantyField(
  deviceType: AssetDeviceCatalogKey | null | undefined,
): boolean {
  if (!deviceType) return true;
  return deviceType !== "usbDrive";
}

export function isConnectionTypeField(field: AssetDeviceSpecField): boolean {
  return field === "connectionType";
}
