import type { StaticImageData } from "next/image";

import akshitaPotnuru from "@/assets/Akshita Potnuru.png";
import anmolPrasad from "@/assets/Anmol Prasad.png";
import dikshaChoudhary from "@/assets/Dikhsha Choudhary.png";
import ektaPattanaik from "@/assets/Ekta.jpeg";
import himaniBhargava from "@/assets/Himani.jpeg";
import omRamtekkar from "@/assets/Om.jpeg";
import prajwalPhoto from "@/assets/Prajwal Photo.jpeg";
import samitAli from "@/assets/Samit Ali.jpg";
import shakshayGupta from "@/assets/Shakshay Gupta.jpeg";
import shiwaliSingh from "@/assets/Shiwali Singh.png";
import snehaMahajan from "@/assets/Sneha Mahajan.png";
import sumanthReddy from "@/assets/whatsapp_img.png";
import swethaChintada from "@/assets/swetha.jpeg";
import vennapusaHemavathi from "@/assets/Vennapusa Hemavathi.png";
import vivekPhoto from "@/assets/vivek.png";

const DIRECTORY_ASSET_PHOTOS: Record<string, StaticImageData> = {
  "akshita potnuru": akshitaPotnuru,
  "anmol prasad": anmolPrasad,
  "diksha choudhary": dikshaChoudhary,
  "dikhsha choudhary": dikshaChoudhary,
  "ekta pattanaik": ektaPattanaik,
  ekta: ektaPattanaik,
  "himani bhargava tapadiya": himaniBhargava,
  "himani bhargava": himaniBhargava,
  "himani tapadiya": himaniBhargava,
  himani: himaniBhargava,
  om: omRamtekkar,
  "om anil ramtekkar": omRamtekkar,
  "om ramtekkar": omRamtekkar,
  "om anil": omRamtekkar,
  ramtekkar: omRamtekkar,
  "prajjwal negi": prajwalPhoto,
  "prajwal negi": prajwalPhoto,
  prajjwal: prajwalPhoto,
  prajwal: prajwalPhoto,
  "samit ali": samitAli,
  samit: samitAli,
  "shakshay gupta": shakshayGupta,
  shakshay: shakshayGupta,
  "shiwali singh": shiwaliSingh,
  shiwali: shiwaliSingh,
  "sneha mahajan": snehaMahajan,
  sneha: snehaMahajan,
  "gangaram sumanth reddy": sumanthReddy,
  "gangaram sumanth": sumanthReddy,
  "g sumanth reddy": sumanthReddy,
  "g sumanth": sumanthReddy,
  "sumanth reddy": sumanthReddy,
  sumanth: sumanthReddy,
  "swetha chintada": swethaChintada,
  swetha: swethaChintada,
  chintada: swethaChintada,
  "vennapusa hemavathi": vennapusaHemavathi,
  hemavathi: vennapusaHemavathi,
  vivek: vivekPhoto,
};

const DIRECTORY_ASSET_PHOTOS_BY_LAST_NAME: Record<string, StaticImageData> = {
  potnuru: akshitaPotnuru,
  prasad: anmolPrasad,
  choudhary: dikshaChoudhary,
  pattanaik: ektaPattanaik,
  tapadiya: himaniBhargava,
  ramtekkar: omRamtekkar,
  negi: prajwalPhoto,
  mahajan: snehaMahajan,
  chintada: swethaChintada,
  hemavathi: vennapusaHemavathi,
};

const DIRECTORY_ASSET_PHOTOS_BY_CODE: Record<string, StaticImageData> = {
  IF2025002: omRamtekkar,
  IF2026009: sumanthReddy,
  "IF-PENDING-SA": sumanthReddy,
  IF2026010: swethaChintada,
};

function normalizePersonKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function personKeys(person: {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
}) {
  return [
    normalizePersonKey(person.fullName ?? ""),
    normalizePersonKey(`${person.firstName ?? ""} ${person.lastName ?? ""}`),
    normalizePersonKey(person.firstName ?? ""),
    normalizePersonKey(person.lastName ?? ""),
  ].filter(Boolean);
}

/** Local headshots from `src/assets` for directory cards. */
export function getDirectoryAssetPhoto(person: {
  employeeCode?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
}): StaticImageData | null {
  const code = (person.employeeCode ?? "").trim().toUpperCase();
  const byCode = code ? DIRECTORY_ASSET_PHOTOS_BY_CODE[code] : undefined;
  if (byCode) return byCode;

  const keys = personKeys(person);

  for (const key of keys) {
    const exact = DIRECTORY_ASSET_PHOTOS[key];
    if (exact) return exact;
  }

  const lastName = normalizePersonKey(person.lastName ?? "");
  if (lastName && DIRECTORY_ASSET_PHOTOS_BY_LAST_NAME[lastName]) {
    return DIRECTORY_ASSET_PHOTOS_BY_LAST_NAME[lastName];
  }

  for (const key of keys) {
    const first = key.split(" ")[0];
    const byFirst = first ? DIRECTORY_ASSET_PHOTOS[first] : undefined;
    if (byFirst) return byFirst;
  }

  const haystack = keys.filter((key) => key.includes(" "));
  for (const [name, image] of Object.entries(DIRECTORY_ASSET_PHOTOS)) {
    if (name.split(" ").length < 2) continue;
    if (haystack.some((value) => value.includes(name) || name.includes(value))) {
      return image;
    }
  }

  return null;
}

export function getDirectoryAssetPhotoUrl(person: {
  employeeCode?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
}): string | null {
  return getDirectoryAssetPhoto(person)?.src ?? null;
}
