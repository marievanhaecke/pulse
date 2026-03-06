import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, startOfWeek, endOfWeek, addDays, isToday } from 'date-fns'
import { fr } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- Dates ---
export function formatDate(date: string | Date, fmt = 'dd/MM/yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt, { locale: fr })
}

export function formatTime(time: string): string {
  // "HH:MM:SS" -> "HH:MM"
  return time.slice(0, 5)
}

export function formatDateTime(date: string, time: string): string {
  return `${formatDate(date)} à ${formatTime(time)}`
}

export function getWeekDays(referenceDate: Date = new Date()): Date[] {
  const start = startOfWeek(referenceDate, { weekStartsOn: 1 }) // Lundi
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function isTodayDate(date: Date): boolean {
  return isToday(date)
}

export function formatWeekRange(date: Date): string {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  const end = endOfWeek(date, { weekStartsOn: 1 })
  return `${format(start, 'd MMM', { locale: fr })} – ${format(end, 'd MMM yyyy', { locale: fr })}`
}

// --- Labels ---
export const ROLE_LABELS: Record<string, string> = {
  admin:    'Administrateur',
  coach:    'Coach',
  adherent: 'Adhérent',
}

export const MEMBERSHIP_LABELS: Record<string, string> = {
  session: 'À la séance',
  monthly: 'Mensuel',
  yearly:  'Annuel',
}

export const MEMBERSHIP_STATUS_LABELS: Record<string, string> = {
  active:    'Actif',
  cancelled: 'Annulé',
  expired:   'Expiré',
  pending:   'En attente',
  past_due:  'Impayé',
}

export const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Planifiée',
  cancelled: 'Annulée',
  completed: 'Terminée',
}

export const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
export const DAYS_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

// --- Couleurs ---
export const COURSE_COLORS = [
  '#4f46e5', // indigo
  '#0ea5e9', // sky
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo light
]

// --- Format prix ---
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

// --- Initiales ---
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
