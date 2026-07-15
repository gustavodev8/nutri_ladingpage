import type { SiteContent } from "@/contexts/ContentContext";

export type DiscountConfig = SiteContent["discount"];
export type DiscountArea = "ebook" | "service";

export function isDiscountActive(discount: DiscountConfig) {
  if (!discount.active) return false;
  if (!discount.expiresAt) return true;
  return new Date(discount.expiresAt).getTime() > Date.now();
}

function matchesSelection(scope: "all" | "some", selectedNames: string[], targetName: string) {
  if (scope === "all") return true;
  return selectedNames.includes(targetName);
}

export function doesDiscountApply(
  discount: DiscountConfig,
  area: DiscountArea,
  targetName: string,
) {
  if (!isDiscountActive(discount)) return false;

  if (area === "ebook") {
    return matchesSelection(discount.ebookScope, discount.selectedEbookNames, targetName);
  }

  return matchesSelection(discount.serviceScope, discount.selectedServiceNames, targetName);
}

export function getDiscountedAmount(
  discount: DiscountConfig,
  area: DiscountArea,
  targetName: string,
  amount: number,
) {
  if (!doesDiscountApply(discount, area, targetName)) return amount;
  return Math.round(amount * (1 - discount.percentage / 100) * 100) / 100;
}

export function formatCurrency(amount: number) {
  return `R$ ${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2).replace(".", ",")}`;
}
