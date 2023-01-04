export function prepareParams(item, {columns, citycode, postcode, lat, lon}) {
  const params = {
    filters: {}
  }

  if (columns) {
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

  return params
}
