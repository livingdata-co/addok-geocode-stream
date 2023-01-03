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
import {isFirstCharValid} from '../util/string.js'
import DEFAULT_RESULT_COLUMNS from '../result-columns.js'

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

export function prepareItem(item, {columns, citycode, postcode, lat, lon}) {
  const stringToGeocode = columns
    .map(c => c in item ? item[c].trim() : '')
    .join(' ')
    .trim()

  if (stringToGeocode.length < 3 || !isFirstCharValid(stringToGeocode.charAt(0))) {
    return null
  }

  const preparedItem = {
    [getKey('line')]: item[getKey('line')],
    [getKey('address')]: stringToGeocode
  }

  if (citycode) {
    preparedItem[getKey('citycode')] = item[citycode]
  }

  if (postcode) {
    preparedItem[getKey('postcode')] = item[postcode]
  }

  if (lon) {
    preparedItem[getKey('lon')] = item[lon]
  }

  if (lat) {
    preparedItem[getKey('lat')] = item[lat]
  }

  return preparedItem
}

function createEmptyResultItem(resultStatus = 'skipped') {
  return fromPairs(DEFAULT_RESULT_COLUMNS.map(resultColumn => [resultColumn, resultColumn === 'result_status' ? resultStatus : '']))
}

export function expandItemWithResult(item, resultItems, resultColumns = [], resultStatus = 'skipped') {
  const id = item[getKey('line')]
  const resultItem = resultItems[id]
    || createEmptyResultItem(resultStatus)

  return {
    ...(omit(item, getKey('line'))),
    ...(pick(resultItem, resultColumns))
  }
}

export async function geocodeMany(items, options) {
  const {serviceUrl, columns, resultColumns, signal} = options

  items.forEach((item, n) => {
    item[getKey('line')] = n
  })

  const preparedItems = items
    .map(item => prepareItem(item, {...options, columns}))
    .filter(Boolean) // Filter truthy values

  // If preparedItems is empty (all values have been filtered) we exit quickly
  if (preparedItems.length === 0) {
    return items.map(item => expandItemWithResult(item, {}, resultColumns, 'skipped'))
  }

  const csvContent = Papa.unparse(preparedItems)

  // Build multipart body
  const formData = new FormData()
  formData.append('columns', getKey('address'))

  if (options.citycode) {
    formData.append('citycode', getKey('citycode'))
  }

  if (options.postcode) {
    formData.append('postcode', getKey('postcode'))
  }

  if (options.lon) {
    formData.append('lon', getKey('lon'))
  }

  if (options.lat) {
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

    const response = await got.post(serviceUrl + '/search/csv/', gotOptions)

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
    createBuckets(options.bucketSize),
    parallel(options.concurrency || 1, callbackify(async bucket => batchGeocode(options.serviceUrl, bucket, options))),
    createUnwrapBuckets(options)
  )
}
