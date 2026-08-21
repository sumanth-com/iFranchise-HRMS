export type AssetDeviceImageSrc = {
  src: string;
  width: number;
  height: number;
};

export type AssetDeviceImageConfig = {
  src: AssetDeviceImageSrc;
  label: string;
  categoryNames: string[];
  defaultBrand?: string;
};

/** Compressed device previews under `public/images/devices/` (max 800px JPEG). */
function deviceImage(file: string, width = 800, height = 533): AssetDeviceImageSrc {
  return {
    src: `/images/devices/${file}`,
    width,
    height,
  };
}

/** Every device product image (excluding brand/auth artwork). */
export const ASSET_DEVICE_IMAGE_CATALOG = {
  airPods: {
    src: deviceImage("airpods.jpg"),
    label: "AirPods",
    categoryNames: ["Headphone", "Headset"],
    defaultBrand: "Apple",
  },
  androidPhone: {
    src: deviceImage("android-phone.jpg"),
    label: "Android Phone",
    categoryNames: ["Mobile", "SIM"],
  },
  appleWatch: {
    src: deviceImage("applewatch.jpg"),
    label: "Apple Watch",
    categoryNames: ["Mobile", "Wearable"],
    defaultBrand: "Apple",
  },
  desktopPc: {
    src: deviceImage("desktop-pc.jpg"),
    label: "Desktop PC",
    categoryNames: ["Desktop"],
  },
  dualMonitor: {
    src: deviceImage("dual-monitor.jpg"),
    label: "Dual Monitor",
    categoryNames: ["Monitor"],
  },
  hardDrive: {
    src: deviceImage("hard-drive.jpg"),
    label: "Hard Drive",
    categoryNames: ["Other", "Storage"],
  },
  headphones: {
    src: deviceImage("headphones.jpg"),
    label: "Headphones",
    categoryNames: ["Headphone", "Headset"],
  },
  keyboard: {
    src: deviceImage("keyboard.jpg"),
    label: "Keyboard",
    categoryNames: ["Keyboard"],
  },
  laptop: {
    src: deviceImage("laptop.jpg"),
    label: "Laptop",
    categoryNames: ["Laptop"],
  },
  macbook: {
    src: deviceImage("macbook.jpg", 800, 450),
    label: "MacBook",
    categoryNames: ["Laptop"],
    defaultBrand: "Apple",
  },
  microphone: {
    src: deviceImage("microphone.jpg"),
    label: "Microphone",
    categoryNames: ["Other", "Microphone"],
  },
  monitor: {
    src: deviceImage("monitor.jpg", 800, 565),
    label: "Monitor",
    categoryNames: ["Monitor"],
  },
  mouse: {
    src: deviceImage("mouse.jpg"),
    label: "Mouse",
    categoryNames: ["Mouse"],
  },
  smartwatch: {
    src: deviceImage("smartwatch.jpg"),
    label: "Smartwatch",
    categoryNames: ["Mobile", "Wearable"],
  },
  tablet: {
    src: deviceImage("tablet.jpg", 800, 800),
    label: "Tablet",
    categoryNames: ["Mobile", "Tablet"],
  },
  trackpad: {
    src: deviceImage("trackpad.jpg"),
    label: "Trackpad",
    categoryNames: ["Mouse", "Trackpad"],
  },
  usbDrive: {
    src: deviceImage("usb-drive.jpg"),
    label: "USB Drive",
    categoryNames: ["Other", "USB"],
  },
  imac: {
    src: deviceImage("imac.jpg"),
    label: "iMac",
    categoryNames: ["Desktop"],
    defaultBrand: "Apple",
  },
  ipad: {
    src: deviceImage("ipad.jpg"),
    label: "iPad",
    categoryNames: ["Mobile", "Tablet"],
    defaultBrand: "Apple",
  },
  iphone: {
    src: deviceImage("iphone.jpg"),
    label: "iPhone",
    categoryNames: ["Mobile", "SIM"],
    defaultBrand: "Apple",
  },
} as const satisfies Record<string, AssetDeviceImageConfig>;

export type AssetDeviceCatalogKey = keyof typeof ASSET_DEVICE_IMAGE_CATALOG;

export const ASSET_DEVICE_CATALOG_KEYS = Object.keys(
  ASSET_DEVICE_IMAGE_CATALOG,
) as AssetDeviceCatalogKey[];

export function getCatalogDeviceImage(key: AssetDeviceCatalogKey): AssetDeviceImageConfig {
  return ASSET_DEVICE_IMAGE_CATALOG[key];
}

export function isAssetDeviceCatalogKey(value: string): value is AssetDeviceCatalogKey {
  return value in ASSET_DEVICE_IMAGE_CATALOG;
}

/** Best-match device image key from asset metadata (category, brand, model, name). */
export function resolveAssetDeviceType(input: {
  categoryName?: string | null;
  brand?: string | null;
  model?: string | null;
  name?: string | null;
}): AssetDeviceCatalogKey | null {
  const category = input.categoryName?.trim().toLowerCase() ?? "";
  const brand = input.brand?.trim().toLowerCase() ?? "";
  const haystack = `${input.name ?? ""} ${input.model ?? ""} ${input.brand ?? ""}`.toLowerCase();

  const labelKeys = [...ASSET_DEVICE_CATALOG_KEYS].sort(
    (a, b) =>
      ASSET_DEVICE_IMAGE_CATALOG[b].label.length - ASSET_DEVICE_IMAGE_CATALOG[a].label.length,
  );
  for (const key of labelKeys) {
    const label = ASSET_DEVICE_IMAGE_CATALOG[key].label.toLowerCase();
    if (haystack.includes(label)) return key;
  }

  if (haystack.includes("macbook")) return "macbook";
  if (haystack.includes("imac")) return "imac";
  if (haystack.includes("ipad")) return "ipad";
  if (haystack.includes("iphone")) return "iphone";
  if (haystack.includes("airpod")) return "airPods";
  if (haystack.includes("hard drive") || haystack.includes("harddrive")) return "hardDrive";
  if (haystack.includes("usb")) return "usbDrive";
  if (haystack.includes("watch")) return brand === "apple" ? "appleWatch" : "smartwatch";

  if (category === "laptop") return brand === "apple" ? "macbook" : "laptop";
  if (category === "desktop") return brand === "apple" ? "imac" : "desktopPc";
  if (category === "monitor") return "monitor";
  if (category === "keyboard") return "keyboard";
  if (category === "mouse") return "mouse";
  if (category === "mobile" || category === "sim") {
    if (brand === "apple") return haystack.includes("ipad") ? "ipad" : "iphone";
    return "androidPhone";
  }

  for (const key of ASSET_DEVICE_CATALOG_KEYS) {
    const config = ASSET_DEVICE_IMAGE_CATALOG[key];
    if (config.categoryNames.some((c) => c.toLowerCase() === category)) {
      if (key === "appleWatch" || key === "smartwatch" || key === "androidPhone") continue;
      return key;
    }
  }

  return null;
}
