/**
 * Utilitaires de manipulation des dates - Fleet-Master
 * Gère la conversion sécurisée entre Date objects et strings ISO
 */

/**
 * Parse une date de façon sécurisée (accepte Date, string ISO, ou null/undefined)
 * Retourne un objet Date valide ou null
 */
export function safeParseDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value
  }
  const parsed = new Date(value)
  return isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Formate une date au format français court (01 janv. 2024)
 */
export function formatDateFR(value: Date | string | null | undefined): string {
  const date = safeParseDate(value)
  if (!date) return '—'
  return date.toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  })
}

/**
 * Formate une date au format français complet (01/01/2024)
 */
export function formatDateFRShort(value: Date | string | null | undefined): string {
  const date = safeParseDate(value)
  if (!date) return '—'
  return date.toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  })
}

/**
 * Formate une date avec heure (01/01/2024 14:30)
 */
export function formatDateTimeFR(value: Date | string | null | undefined): string {
  const date = safeParseDate(value)
  if (!date) return '—'
  return date.toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Convertit une date en string ISO (YYYY-MM-DD) de façon sécurisée
 */
export function toISODate(value: Date | string | null | undefined): string | null {
  const date = safeParseDate(value)
  if (!date) return null
  return date.toISOString().split('T')[0]
}
