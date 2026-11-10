import { formatInTimeZone } from "date-fns-tz";

export const INDIA_TIMEZONE = "Asia/Kolkata";

/**
 * Formats an amount in paise to Indian Rupee with Indian digit grouping.
 * @param paise Amount in paise (integer)
 * @param options.showPaise If true, always shows decimal paise (.00)
 */
export function formatINR(
  paise: number,
  options?: { showPaise?: boolean }
): string {
  if (isNaN(paise)) return "₹0";

  const rupees = paise / 100;
  const hasDecimals = paise % 100 !== 0;

  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: options?.showPaise || hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });

  return formatter.format(rupees);
}

/**
 * Formats a plain number with Indian digit grouping (e.g. 12,50,000).
 */
export function formatNumberIN(num: number): string {
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-IN");
}

/**
 * Formats a date into "14 Dec 2026" in Indian Standard Time (Asia/Kolkata).
 */
export function formatDate(
  dateInput: Date | string | number,
  pattern = "dd MMM yyyy"
): string {
  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    return formatInTimeZone(date, INDIA_TIMEZONE, pattern);
  } catch {
    return "";
  }
}

/**
 * Formats a date-time into "14 Dec 2026, 3:30 pm" in Indian Standard Time.
 */
export function formatDateTime(
  dateInput: Date | string | number,
  pattern = "dd MMM yyyy, h:mm a"
): string {
  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    const formatted = formatInTimeZone(date, INDIA_TIMEZONE, pattern);
    return formatted.replace("AM", "am").replace("PM", "pm");
  } catch {
    return "";
  }
}

/**
 * Formats a time into "3:30 pm" in Indian Standard Time.
 */
export function formatTime(
  dateInput: Date | string | number,
  pattern = "h:mm a"
): string {
  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    const formatted = formatInTimeZone(date, INDIA_TIMEZONE, pattern);
    return formatted.replace("AM", "am").replace("PM", "pm");
  } catch {
    return "";
  }
}
