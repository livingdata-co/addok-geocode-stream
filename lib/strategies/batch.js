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
    operation: options.reverse ? 'reverse' : 'geocode',
    id: item.__id,
    params
  }
}

function createEmptyResultItem(resultStatus = 'skipped', options) {
  return fromPairs(DEFAULT_RESULT_COLUMNS[options.operation].map(resultColumn => [resultColumn, resultColumn === 'result_status' ? resultStatus : '']))
}

function convertResultItem(resultItem, options) {
  const {status, result} = resultItem
  const emptyResultItem = createEmptyResultItem(status, options)

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

export function expandItemWithResult(item, resultItems, resultStatus, options) {
  const id = item.__id
  const resultItem = resultItems[id] ? convertResultItem(resultItems[id], options) : createEmptyResultItem(resultStatus, options)

  return {
    ...(omit(item, '__id')),
    ...(pick(resultItem, options.resultColumns))
  }
}

export async function geocodeMany(items, options) {
  const {serviceUrl, signal} = options

  items.forEach((item, n) => {
    item.__id = n
  })

  const preparedRequests = items
    .map(item => prepareRequest(item, options))
    .filter(Boolean) // Filter truthy values

  // If preparedRequests is empty (all values have been filtered) we exit quickly
  if (preparedRequests.length === 0) {
    return items.map(item => expandItemWithResult(item, {}, 'skipped', options))
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

    return items.map(item => expandItemWithResult(item, indexedResultItems, 'skipped', options))
  } catch (error) {
    if (error.code !== 'ERR_ABORTED' && options.debug) {
      console.error(error)
    }

    return items.map(item => expandItemWithResult(item, {}, 'error', options))
  }
}

export async function batchGeocode(items, options) {
  const columns = options.columns && options.columns.length > 0
    ? options.columns
    : Object.keys(items[0])

  const resultColumns = options.resultColumns && options.resultColumns.length > 0
    ? options.resultColumns
    : DEFAULT_RESULT_COLUMNS[options.operation]

  return geocodeMany(items, {...options, columns, resultColumns})
}

export function createGeocodeStream(options = {}) {
  if (!options.serviceUrl) {
    throw new Error('serviceUrl is a required param')
  }

  return pumpify.obj(
    createBuckets(100),
    parallel(options.concurrency || 1, callbackify(async bucket => batchGeocode(bucket, options))),
    createUnwrapBuckets(options)
  )
}
