const ones = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(value: number): string {
  if (value < 20) return ones[value];
  const ten = Math.floor(value / 10);
  const one = value % 10;
  return `${tens[ten]}${one ? ` ${ones[one]}` : ""}`.trim();
}

function threeDigits(value: number): string {
  const hundred = Math.floor(value / 100);
  const rest = value % 100;
  const hundredPart = hundred ? `${ones[hundred]} Hundred` : "";
  const restPart = rest ? twoDigits(rest) : "";
  return [hundredPart, restPart].filter(Boolean).join(" ");
}

function integerToWords(value: number): string {
  if (value === 0) return "Zero";

  const parts: string[] = [];
  const crore = Math.floor(value / 10_000_000);
  const lakh = Math.floor((value % 10_000_000) / 100_000);
  const thousand = Math.floor((value % 100_000) / 1000);
  const hundred = value % 1000;

  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));

  return parts.join(" ");
}

export function amountToIndianWords(amount: number, currencyLabel = "Indian Rupee"): string {
  const rounded = Math.round(amount * 100) / 100;
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  const rupeeWords = `${currencyLabel} ${integerToWords(rupees)}`;
  if (paise > 0) {
    return `${rupeeWords} and ${integerToWords(paise)} Paise Only`;
  }
  return `${rupeeWords} Only`;
}
