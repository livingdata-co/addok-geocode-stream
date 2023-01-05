import {callbackify} from 'node:util'
import {omit, pick, keyBy, fromPairs, mapKeys} from 'lodash-es'
import got from 'got'
import pumpify from 'pumpify'
import parallel from 'parallel-transform'

import {createBuckets, createUnwrapBuckets} from '../util/wrap.js'
import {DEFAULT_RESULT_COLUMNS} from '../columns.js'
import {prepareParams} from '../prepare-params.js'

export function prepareRequest(item, options) {
  const params = prepareParams(item, options)

  if (!params) {
    return null
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
  const {serviceUrl, columns, resultColumns, signal} = options

  items.forEach((item, n) => {
    item.__id = n
  })

  const preparedRequests = items
    .map(item => prepareRequest(item, {...options, columns}))
    .filter(Boolean) // Filter truthy values

  // If preparedRequests is empty (all values have been filtered) we exit quickly
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

    const {results} = await got.post(serviceUrl + '/batch', gotOptions).json()

    const indexedResultItems = keyBy(results, 'id')

    return items.map(item => expandItemWithResult(item, indexedResultItems, resultColumns, 'skipped'))
  } catch (error) {
    if (error.code !== 'ERR_ABORTED' && options.debug) {
      console.error(error)
    }

    return items.map(item => expandItemWithResult(item, {}, resultColumns, 'error'))
  }
}

export async function batchGeocode(serviceUrl, items, options = {}) {
  const columns = options.columns && options.columns.length > 0
    ? options.columns
    : Object.keys(items[0])

  const resultColumns = options.resultColumns && options.resultColumns.length > 0
    ? options.resultColumns
    : DEFAULT_RESULT_COLUMNS

  return geocodeMany(items, {columns, resultColumns, serviceUrl, signal: options.signal})
}

export function createGeocodeStream(options = {}) {
  if (!options.serviceUrl) {
    throw new Error('serviceUrl is a required param')
  }

  return pumpify.obj(
    createBuckets(100),
    parallel(options.concurrency || 1, callbackify(async bucket => batchGeocode(options.serviceUrl, bucket, options))),
    createUnwrapBuckets(options)
  )
}
