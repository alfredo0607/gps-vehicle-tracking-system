import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export const formatDate = (date) => {
  if (!date) return 'N/A'
  return format(new Date(date), 'dd/MM/yyyy', { locale: es })
}

export const formatDateTime = (date) => {
  if (!date) return 'N/A'
  return format(new Date(date), 'dd/MM/yyyy HH:mm:ss', { locale: es })
}

export const formatTimeAgo = (date) => {
  if (!date) return 'N/A'
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
}

export const formatSpeed = (speed) => {
  return `${speed || 0} km/h`
}

export const formatDistance = (distance) => {
  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(2)} km`
  }
  return `${distance.toFixed(0)} m`
}

export const formatCoordinate = (coord) => {
  if (!coord) return 'N/A'
  return coord.toFixed(6)
}

export const formatPlate = (plate) => {
  return plate?.toUpperCase() || ''
}