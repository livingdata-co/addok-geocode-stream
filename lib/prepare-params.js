import {isFirstCharValid} from './util/string.js'

export function prepareParams(item, {reverse, columns, citycode, postcode, lat, lon}) {
  const params = {
    filters: {}
  }

  if (!reverse && columns) {
    const stringToGeocode = columns
      .map(c => c in item ? item[c].trim() : '')
      .join(' ')
      .trim()

    params.q = stringToGeocode
  }

  if (citycode && item[citycode]) {
    params.filters.citycode = item[citycode]
  }

  if (postcode && item[postcode]) {
    params.filters.postcode = item[postcode]
  }

  if (lon && item[lon]) {
    params.lon = Number.parseFloat(item[lon])
  }

  if (lat && item[lat]) {
    params.lat = Number.parseFloat(item[lat])
  }

  if (reverse && (!params.lat || !params.lon)) {
    return null
  }

  if (!reverse && (!params.q || params.q.length < 3 || !isFirstCharValid(params.q.charAt(0)))) {
    return null
  }

  return params
}
