import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Fusionne les classes Tailwind avec résolution des conflits
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formate une date au format français
 */
export function formatDate(date: string | Date | null, options?: Intl.DateTimeFormatOptions): string {
  if (!date) return '-';
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  };
  
  return new Intl.DateTimeFormat('fr-FR', defaultOptions).format(new Date(date));
}

/**
 * Formate une date avec heure
 */
export function formatDateTime(date: string | Date | null): string {
  if (!date) return '-';
  
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Formate un nombre en kilomètres
 */
export function formatKilometers(km: number | null): string {
  if (km === null || km === undefined) return '-';
  return `${new Intl.NumberFormat('fr-FR').format(km)} km`;
}

/**
 * Formate une vitesse en km/h
 */
export function formatSpeed(speed: number | null): string {
  if (speed === null || speed === undefined) return '-';
  return `${Math.round(speed)} km/h`;
}

/**
 * Formate un montant en euros
 */
export function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/**
 * Calcule la durée entre deux dates
 */
export function calculateDuration(start: string | Date, end: string | Date): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
}

/**
 * Tronque un texte avec ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Génère une couleur aléatoire cohérente basée sur une chaîne
 */
export function generateColorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 50%)`;
}

/**
 * Convertit des degrés en direction cardinale
 */
export function degreesToCardinal(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

/**
 * Détermine si une date est dans le futur
 */
export function isFuture(date: string | Date): boolean {
  return new Date(date) > new Date();
}

/**
 * Détermine si une date est passée
 */
export function isPast(date: string | Date): boolean {
  return new Date(date) < new Date();
}

/**
 * Calcule le nombre de jours restants avant une date
 */
export function daysUntil(date: string | Date): number {
  const target = new Date(date);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Génère un identifiant unique court
 */
export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

/**
 * Valide un numéro d'immatriculation français
 */
export function isValidFrenchPlate(plate: string): boolean {
  // Format AA-123-AA ou ancien format
  const newFormat = /^[A-Z]{2}-\d{3}-[A-Z]{2}$/;
  const oldFormat = /^\d{1,4}\s?[A-Z]{1,4}\s?\d{1,3}$/i;
  return newFormat.test(plate) || oldFormat.test(plate);
}
