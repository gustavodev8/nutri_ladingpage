import type { SiteContent } from "@/contexts/ContentContext";

export type DiscountConfig = SiteContent["discount"];
export type DiscountArea = "ebook" | "service";

const DISCOUNT_STORAGE_PREFIX = "fillipe-david-discount-window";

function getDurationHours(discount: DiscountConfig) {
  const durationValue = discount.durationValue ?? discount.durationHours ?? 0;
  const durationUnit = discount.durationUnit ?? "hours";
  return durationUnit === "days" ? durationValue * 24 : durationValue;
}

function getDurationMs(discount: DiscountConfig) {
  return getDurationHours(discount) * 60 * 60 * 1000;
}

function getCampaignKey(discount: DiscountConfig) {
  return JSON.stringify({
    activatedAt: discount.activatedAt ?? discount.expiresAt ?? null,
    percentage: discount.percentage,
    durationValue: discount.durationValue ?? discount.durationHours ?? 0,
    durationUnit: discount.durationUnit ?? "hours",
    message: discount.message,
    ebookScope: discount.ebookScope,
    selectedEbookNames: discount.selectedEbookNames,
    serviceScope: discount.serviceScope,
    selectedServiceNames: discount.selectedServiceNames,
  });
}

function getStorageKey(discount: DiscountConfig) {
  return `${DISCOUNT_STORAGE_PREFIX}:${getCampaignKey(discount)}`;
}

export function getVisitorDiscountExpiresAt(discount: DiscountConfig) {
  if (!discount.active) return null;

  const durationMs = getDurationMs(discount);
  if (durationMs <= 0) return null;
  if (typeof window === "undefined") return null;

  const storageKey = getStorageKey(discount);
  const storedValue = window.localStorage.getItem(storageKey);

  if (storedValue) {
    const storedTs = Number(storedValue);
    if (Number.isFinite(storedTs)) {
      return new Date(storedTs).toISOString();
    }
  }

  const expiresAtTs = Date.now() + durationMs;
  window.localStorage.setItem(storageKey, String(expiresAtTs));
  return new Date(expiresAtTs).toISOString();
}

export function isDiscountActive(discount: DiscountConfig) {
  if (!discount.active) return false;

  const expiresAt = getVisitorDiscountExpiresAt(discount);
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() > Date.now();
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
