/**
 * Formatters pour les données analytics
 * Fichier utilitaire (non server-action)
 */

/**
 * Formatte un montant en euros
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formatte un grand nombre (K, M)
 */
export function formatCompact(value: number): string {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + "M€";
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + "K€";
  }
  return value + "€";
}

/**
 * Formatte un pourcentage
 */
export function formatPercent(value: number, decimals = 1): string {
  return value.toFixed(decimals) + "%";
}

/**
 * Formatte un nombre avec séparateurs de milliers
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}
