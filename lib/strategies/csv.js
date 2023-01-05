/* eslint camelcase: off */
import process from 'node:process'
import {callbackify} from 'node:util'
import {Buffer} from 'node:buffer'
import {omit, pick, keyBy, fromPairs} from 'lodash-es'
import got from 'got'
import FormData from 'form-data'
import Papa from 'papaparse'
import pumpify from 'pumpify'
import parallel from 'parallel-transform'

import {createBuckets, createUnwrapBuckets} from '../util/wrap.js'
import {DEFAULT_RESULT_COLUMNS} from '../columns.js'
import {prepareParams} from '../prepare-params.js'

function makeRandomString(length) {
  let string = ''
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

  for (let i = 0; i < length; i++) {
    string += characters.charAt(Math.floor(Math.random() * characters.length))
  }

  return string
}

const GEOCODER_COLUMN_PREFIX = process.env.GEOCODER_COLUMN_PREFIX || `geocoder_${makeRandomString(6)}__`

function getKey(key) {
  return GEOCODER_COLUMN_PREFIX + key
}

export function prepareCsvItem(item, options) {
  const params = prepareParams(item, options)

  if (!params) {
    return null
  }

  const preparedItem = {
    [getKey('line')]: item[getKey('line')]
  }

  if (!options.reverse) {
    preparedItem[getKey('address')] = params.q
  }

  // Not supported in reverse/csv
  if (!options.reverse && params.filters.citycode) {
    preparedItem[getKey('citycode')] = params.filters.citycode
  }

  // Not supported in reverse/csv
  if (!options.reverse && params.filters.postcode) {
    preparedItem[getKey('postcode')] = params.filters.postcode
  }

  // Not supported in reverse/csv
  if (!options.reverse && params.lon) {
    preparedItem[getKey('lon')] = params.lon
  }

  // Not supported in reverse/csv
  if (!options.reverse && params.lat) {
    preparedItem[getKey('lat')] = params.lat
  }

  if (options.reverse) {
    preparedItem.longitude = params.lon
    preparedItem.latitude = params.lat
  }

  return preparedItem
}

function createEmptyResultItem(operation, resultStatus) {
  return fromPairs(DEFAULT_RESULT_COLUMNS[operation].map(resultColumn => [resultColumn, resultColumn === 'result_status' ? resultStatus : '']))
}

export function expandItemWithResult(item, resultItems, resultStatus = 'skipped', options) {
  const id = item[getKey('line')]
  const resultItem = resultItems[id]
    || createEmptyResultItem(options.operation, resultStatus)

  return {
    ...(omit(item, getKey('line'))),
    ...(pick(resultItem, options.resultColumns))
  }
}

export async function geocodeMany(items, options) {
  const {serviceUrl, signal} = options

  items.forEach((item, n) => {
    item[getKey('line')] = n
  })

  const preparedItems = items
    .map(item => prepareCsvItem(item, options))
    .filter(Boolean) // Filter truthy values

  // If preparedItems is empty (all values have been filtered) we exit quickly
  if (preparedItems.length === 0) {
    return items.map(item => expandItemWithResult(item, {}, 'skipped', options))
  }

  // We compute columns to handle in CSV file
  const csvColumns = new Set()
  for (const prepareItem of preparedItems) {
    for (const key of Object.keys(prepareItem)) {
      csvColumns.add(key)
    }
  }

  const csvContent = Papa.unparse(preparedItems, {columns: [...csvColumns]})

  // Build multipart body
  const formData = new FormData()

  if (!options.reverse) {
    formData.append('columns', getKey('address'))
  }

  // Not supported in reverse/csv
  if (!options.reverse && options.citycode) {
    formData.append('citycode', getKey('citycode'))
  }

  // Not supported in reverse/csv
  if (!options.reverse && options.postcode) {
    formData.append('postcode', getKey('postcode'))
  }

  // Not supported in reverse/csv
  if (!options.reverse && options.lon) {
    formData.append('lon', getKey('lon'))
  }

  // Not supported in reverse/csv
  if (!options.reverse && options.lat) {
    formData.append('lat', getKey('lat'))
  }

  formData.append('encoding', 'utf-8')
  formData.append('delimiter', ',')
  formData.append('data', Buffer.from(csvContent), {filename: 'input.csv', contentType: 'text/csv'})

  try {
    // Execute request
    const gotOptions = {
      body: formData,
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
      },
      responseType: 'text'
    }

    if (signal instanceof AbortSignal) {
      gotOptions.signal = signal
    }

    const requestUrl = options.reverse
      ? serviceUrl + '/reverse/csv/'
      : serviceUrl + '/search/csv/'

    const response = await got.post(requestUrl, gotOptions)

    // Handle CSV response
    const {data, errors} = Papa.parse(response.body, {header: true, skipEmptyLines: true})

    if (errors.length > 0) {
      const uniqueErrors = [...new Set(errors.map(error => error.code))]
      throw new Error('Invalid batch geocode response: ' + uniqueErrors.join(', '))
    }

    for (const row of data) {
      row.result_status = 'ok'
    }

    const indexedResultItems = keyBy(data, getKey('line'))

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

export function createGeocodeStream(options) {
  if (!options.serviceUrl) {
    throw new Error('serviceUrl is a required param')
  }

  return pumpify.obj(
    createBuckets(options.bucketSize),
    parallel(options.concurrency || 1, callbackify(async bucket => batchGeocode(bucket, options))),
    createUnwrapBuckets(options)
  )
}
