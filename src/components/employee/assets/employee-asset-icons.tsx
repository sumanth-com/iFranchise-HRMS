import {
  AppWindow,
  Armchair,
  Cpu,
  Headphones,
  IdCard,
  Keyboard,
  KeyRound,
  Laptop,
  Monitor,
  Mouse,
  Package,
  Printer,
  Smartphone,
  Tablet,
  type LucideIcon,
} from "lucide-react";

/** Maps an asset category name to a representative icon (keyword based). */
export function assetCategoryIcon(categoryName: string | null): LucideIcon {
  const name = (categoryName ?? "").toLowerCase();
  if (name.includes("laptop")) return Laptop;
  if (name.includes("desktop") || name.includes("cpu") || name.includes("computer")) return Cpu;
  if (name.includes("monitor") || name.includes("display")) return Monitor;
  if (name.includes("keyboard")) return Keyboard;
  if (name.includes("mouse")) return Mouse;
  if (name.includes("headset") || name.includes("headphone")) return Headphones;
  if (name.includes("phone") || name.includes("mobile") || name.includes("sim")) return Smartphone;
  if (name.includes("tablet") || name.includes("ipad")) return Tablet;
  if (name.includes("printer")) return Printer;
  if (name.includes("furniture") || name.includes("chair") || name.includes("desk")) return Armchair;
  if (name.includes("id card") || name.includes("access card")) return IdCard;
  if (name.includes("token") || name.includes("security")) return KeyRound;
  if (name.includes("software") || name.includes("license")) return AppWindow;
  return Package;
}
