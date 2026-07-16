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
    ebookPercentage: discount.ebookPercentage,
    servicePercentage: discount.servicePercentage,
    durationValue: discount.durationValue ?? discount.durationHours ?? 0,
    durationUnit: discount.durationUnit ?? "hours",
    message: discount.message,
    ebookScope: discount.ebookScope,
    selectedEbookNames: discount.selectedEbookNames,
    ebookItemPercentages: discount.ebookItemPercentages,
    serviceScope: discount.serviceScope,
    selectedServiceNames: discount.selectedServiceNames,
    serviceItemPercentages: discount.serviceItemPercentages,
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
  if (!hasDiscountConfigured(discount)) return false;

  const expiresAt = getVisitorDiscountExpiresAt(discount);
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() > Date.now();
}

function matchesSelection(scope: "all" | "some", selectedNames: string[], targetName: string) {
  if (scope === "all") return true;
  return selectedNames.includes(targetName);
}

function getItemPercentages(discount: DiscountConfig, area: DiscountArea) {
  return area === "ebook"
    ? discount.ebookItemPercentages ?? {}
    : discount.serviceItemPercentages ?? {};
}

function getScope(discount: DiscountConfig, area: DiscountArea) {
  return area === "ebook" ? discount.ebookScope : discount.serviceScope;
}

function getSelectedNames(discount: DiscountConfig, area: DiscountArea) {
  return area === "ebook" ? discount.selectedEbookNames : discount.selectedServiceNames;
}

function getMaxItemPercentage(discount: DiscountConfig, area: DiscountArea) {
  return Math.max(0, ...Object.values(getItemPercentages(discount, area)).filter(Number.isFinite));
}

export function getDiscountPercentage(discount: DiscountConfig, area: DiscountArea) {
  return area === "ebook"
    ? discount.ebookPercentage ?? discount.percentage
    : discount.servicePercentage ?? discount.percentage;
}

export function getDiscountPercentageForTarget(
  discount: DiscountConfig,
  area: DiscountArea,
  targetName: string,
) {
  const scope = getScope(discount, area);
  const selectedNames = getSelectedNames(discount, area);
  if (scope === "some" && !selectedNames.includes(targetName)) return 0;

  const itemPercentage = getItemPercentages(discount, area)[targetName];
  if (Number.isFinite(itemPercentage)) return itemPercentage;

  return getDiscountPercentage(discount, area);
}

export function getMaxDiscountPercentage(discount: DiscountConfig, area: DiscountArea) {
  if (getScope(discount, area) === "some") {
    const selectedPercentages = getSelectedNames(discount, area).map((targetName) =>
      getDiscountPercentageForTarget(discount, area, targetName),
    );
    return Math.max(0, ...selectedPercentages);
  }

  return Math.max(getDiscountPercentage(discount, area), getMaxItemPercentage(discount, area));
}

export function hasDiscountConfigured(discount: DiscountConfig) {
  return getMaxDiscountPercentage(discount, "ebook") > 0 || getMaxDiscountPercentage(discount, "service") > 0;
}

export function getDiscountSummary(discount: DiscountConfig) {
  const ebookPercentage = getMaxDiscountPercentage(discount, "ebook");
  const servicePercentage = getMaxDiscountPercentage(discount, "service");

  if (ebookPercentage > 0 && servicePercentage <= 0) {
    return `E-books até ${ebookPercentage}% off`;
  }

  if (servicePercentage > 0 && ebookPercentage <= 0) {
    return `Consultas até ${servicePercentage}% off`;
  }

  if (ebookPercentage === servicePercentage) {
    return `Até ${ebookPercentage}% off`;
  }

  return `E-books até ${ebookPercentage}% | Consultas até ${servicePercentage}%`;
}

export function doesDiscountApply(
  discount: DiscountConfig,
  area: DiscountArea,
  targetName: string,
) {
  if (!isDiscountActive(discount)) return false;
  if (getDiscountPercentageForTarget(discount, area, targetName) <= 0) return false;
  return matchesSelection(getScope(discount, area), getSelectedNames(discount, area), targetName);
}

export function getDiscountedAmount(
  discount: DiscountConfig,
  area: DiscountArea,
  targetName: string,
  amount: number,
) {
  if (!doesDiscountApply(discount, area, targetName)) return amount;
  return Math.round(amount * (1 - getDiscountPercentageForTarget(discount, area, targetName) / 100) * 100) / 100;
}

export function formatCurrency(amount: number) {
  return `R$ ${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2).replace(".", ",")}`;
}
