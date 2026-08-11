import type { StaticImageData } from "next/image";

import airPodsImg from "@/assets/AirPods.png";
import androidPhoneImg from "@/assets/Android Phone.png";
import appleWatchImg from "@/assets/Applewatch.png";
import desktopPcImg from "@/assets/Desktop PC.png";
import dualMonitorImg from "@/assets/Dual Monitor.png";
import hardDriveImg from "@/assets/Hard Drive.png";
import headphonesImg from "@/assets/Headphones.png";
import keyboardImg from "@/assets/Keyboard.png";
import laptopImg from "@/assets/Laptop.png";
import macbookImg from "@/assets/Macbook .png";
import microphoneImg from "@/assets/Microphone.png";
import monitorImg from "@/assets/Monitor.png";
import mouseImg from "@/assets/Mouse.png";
import smartwatchImg from "@/assets/Smartwatch.png";
import tabletImg from "@/assets/Tablet.png";
import trackpadImg from "@/assets/Trackpad.png";
import usbDriveImg from "@/assets/USB Drive.png";
import imacImg from "@/assets/iMac.png";
import ipadImg from "@/assets/iPad.png";
import iphoneImg from "@/assets/iPhone.png";

export type AssetDeviceImageConfig = {
  src: StaticImageData;
  label: string;
  categoryNames: string[];
  defaultBrand?: string;
};

/** Every device product image in `src/assets/` (excluding brand/auth artwork). */
export const ASSET_DEVICE_IMAGE_CATALOG = {
  airPods: {
    src: airPodsImg,
    label: "AirPods",
    categoryNames: ["Headphone", "Headset"],
    defaultBrand: "Apple",
  },
  androidPhone: {
    src: androidPhoneImg,
    label: "Android Phone",
    categoryNames: ["Mobile", "SIM"],
  },
  appleWatch: {
    src: appleWatchImg,
    label: "Apple Watch",
    categoryNames: ["Mobile", "Wearable"],
    defaultBrand: "Apple",
  },
  desktopPc: {
    src: desktopPcImg,
    label: "Desktop PC",
    categoryNames: ["Desktop"],
  },
  dualMonitor: {
    src: dualMonitorImg,
    label: "Dual Monitor",
    categoryNames: ["Monitor"],
  },
  hardDrive: {
    src: hardDriveImg,
    label: "Hard Drive",
    categoryNames: ["Other", "Storage"],
  },
  headphones: {
    src: headphonesImg,
    label: "Headphones",
    categoryNames: ["Headphone", "Headset"],
  },
  keyboard: {
    src: keyboardImg,
    label: "Keyboard",
    categoryNames: ["Keyboard"],
  },
  laptop: {
    src: laptopImg,
    label: "Laptop",
    categoryNames: ["Laptop"],
  },
  macbook: {
    src: macbookImg,
    label: "MacBook",
    categoryNames: ["Laptop"],
    defaultBrand: "Apple",
  },
  microphone: {
    src: microphoneImg,
    label: "Microphone",
    categoryNames: ["Other", "Microphone"],
  },
  monitor: {
    src: monitorImg,
    label: "Monitor",
    categoryNames: ["Monitor"],
  },
  mouse: {
    src: mouseImg,
    label: "Mouse",
    categoryNames: ["Mouse"],
  },
  smartwatch: {
    src: smartwatchImg,
    label: "Smartwatch",
    categoryNames: ["Mobile", "Wearable"],
  },
  tablet: {
    src: tabletImg,
    label: "Tablet",
    categoryNames: ["Mobile", "Tablet"],
  },
  trackpad: {
    src: trackpadImg,
    label: "Trackpad",
    categoryNames: ["Mouse", "Trackpad"],
  },
  usbDrive: {
    src: usbDriveImg,
    label: "USB Drive",
    categoryNames: ["Other", "USB"],
  },
  imac: {
    src: imacImg,
    label: "iMac",
    categoryNames: ["Desktop"],
    defaultBrand: "Apple",
  },
  ipad: {
    src: ipadImg,
    label: "iPad",
    categoryNames: ["Mobile", "Tablet"],
    defaultBrand: "Apple",
  },
  iphone: {
    src: iphoneImg,
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
