/** "$3.99" (or "$4" with decimals = 0). */
export function formatMoney(cents: number, decimals = 2) {
  return `$${(cents / 100).toFixed(decimals)}`;
}
