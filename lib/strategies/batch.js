import {omit, pick, keyBy, fromPairs, mapKeys} from 'lodash-es'
import got from 'got'

import {isFirstCharValid} from '../util.js'
import DEFAULT_RESULT_COLUMNS from '../result-columns.js'

export function prepareRequest(item, {columns, citycode, postcode, lat, lon}) {
  const stringToGeocode = columns
    .map(c => c in item ? item[c].trim() : '')
    .join(' ')
    .trim()

  if (stringToGeocode.length < 3 || !isFirstCharValid(stringToGeocode.charAt(0))) {
    return null
  }

  const params = {q: stringToGeocode, filters: {}}

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

  return {
    operation: 'geocode',
    id: item.__id,
    params
  }
}

function createEmptyResultItem(resultStatus = 'skipped') {
  return fromPairs(DEFAULT_RESULT_COLUMNS.map(resultColumn => [resultColumn, resultColumn === 'result_status' ? resultStatus : '']))
}

function convertResultItem(resultItem) {
  const {status, result} = resultItem
  const emptyResultItem = createEmptyResultItem(status)

  return {
    ...emptyResultItem,
    ...mapKeys(result, (value, key) => {
      if (key === 'lon') {
        return 'longitude'
      }

      if (key === 'lat') {
        return 'latitude'
      }

      return `result_${key}`
    })
  }
}

export function expandItemWithResult(item, resultItems, resultColumns = [], resultStatus = 'skipped') {
  const id = item.__id
  const resultItem = resultItems[id] ? convertResultItem(resultItems[id]) : createEmptyResultItem(resultStatus)

  return {
    ...(omit(item, '__id')),
    ...(pick(resultItem, resultColumns))
  }
}

export async function geocodeMany(items, options) {
  const {serviceURL, columns, resultColumns, signal} = options

  items.forEach((item, n) => {
    item.__id = n
  })

  const preparedRequests = items
    .map(item => prepareRequest(item, {...options, columns}))
    .filter(Boolean) // Filter truthy values

  // If preparedItems is empty (all values have been filtered) we exit quickly
  if (preparedRequests.length === 0) {
    return items.map(item => expandItemWithResult(item, {}, resultColumns, 'skipped'))
  }

  try {
    // Execute request
    const gotOptions = {
      json: {
        requests: preparedRequests
      },
      retry: {
        limit: 2,
        methods: ['POST'],
        statusCodes: [502, 503, 504],
        errorCodes: [
          'ETIMEDOUT',
          'ECONNRESET',
          'EADDRINUSE',
          'ECONNREFUSED',
          'EPIPE',
          'ENOTFOUND',
          'ENETUNREACH',
          'EAI_AGAIN'
        ]
      }
    }

    if (signal instanceof AbortSignal) {
      gotOptions.signal = signal
    }

    const {results} = await got.post(serviceURL + '/batch', gotOptions).json()

    const indexedResultItems = keyBy(results, 'id')

    return items.map(item => expandItemWithResult(item, indexedResultItems, resultColumns, 'skipped'))
  } catch (error) {
    if (error.code !== 'ERR_ABORTED' && options.debug) {
      console.error(error)
    }

    return items.map(item => expandItemWithResult(item, {}, resultColumns, 'error'))
  }
}