/* eslint complexity: off */
import {isFirstCharValid} from './util/string.js'

export function getLon(item, fieldName) {
  if (fieldName) {
    return Number.parseFloat(item[fieldName])
  }

  if (item.longitude) {
    return Number.parseFloat(item.longitude)
  }

  if (item.lon) {
    return Number.parseFloat(item.lon)
  }

  if (item.lng) {
    return Number.parseFloat(item.lng)
  }

  if (item.long) {
    return Number.parseFloat(item.long)
  }
}

export function getLat(item, fieldName) {
  if (fieldName) {
    return Number.parseFloat(item[fieldName])
  }

  if (item.latitude) {
    return Number.parseFloat(item.latitude)
  }

  if (item.lat) {
    return Number.parseFloat(item.lat)
  }
}

export function prepareParams(item, {reverse, columns, filters, lat, lon}) {
  const params = {
    filters: {}
  }

  if (!reverse && columns) {
    const stringToGeocode = columns
      .map(c => typeof item[c] === 'string' ? item[c].trim() : '')
      .join(' ')
      .trim()

    params.q = stringToGeocode
  }

  // Process generic filters
  if (filters) {
    for (const [filterName, columnName] of Object.entries(filters)) {
      if (item[columnName]) {
        const value = item[columnName]
        // Support for multiple values separated by '+' (OR operator)
        params.filters[filterName] = typeof value === 'string' && value.includes('+')
          ? value.split('+').map(v => v.trim()).filter(Boolean)
          : value
      }
    }
  }

  if (reverse) {
    params.lat = getLat(item, lat)
    params.lon = getLon(item, lon)

    if (!params.lat || !params.lon || Number.isNaN(params.lat) || Number.isNaN(params.lat)) {
      return null
    }
  } else {
    if (lon && item[lon]) {
      params.lon = Number.parseFloat(item[lon])
    }

    if (lat && item[lat]) {
      params.lat = Number.parseFloat(item[lat])
    }

    if (!params.q || params.q.length < 3 || !isFirstCharValid(params.q.charAt(0))) {
      return null
    }
  }

  return params
}
