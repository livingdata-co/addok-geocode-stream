/* eslint camelcase: off */
import process from 'node:process'
import {Buffer} from 'node:buffer'
import {omit, pick, keyBy, fromPairs} from 'lodash-es'
import got from 'got'
import FormData from 'form-data'
import Papa from 'papaparse'
import {isFirstCharValid} from './util.js'

function makeRandomString(length) {
  let string = ''
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

  for (let i = 0; i < length; i++) {
    string += characters.charAt(Math.floor(Math.random() * characters.length))
  }

  return string
}

const GEOCODER_COLUMN_PREFIX = process.env.GEOCODER_COLUMN_PREFIX || `geocoder_${makeRandomString(6)}__`

const DEFAULT_RESULT_COLUMNS = [
  'latitude',
  'longitude',
  'result_label',
  'result_score',
  'result_type',
  'result_id',
  'result_housenumber',
  'result_name',
  'result_street',
  'result_postcode',
  'result_city',
  'result_context',
  'result_citycode',
  'result_oldcitycode',
  'result_oldcity',
  'result_district'
]

function getKey(key) {
  return GEOCODER_COLUMN_PREFIX + key
}

export function prepareItem(item, {columns, citycode, postcode}) {
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

  return preparedItem
}

export function expandItemWithResult(item, resultItems, resultColumns = []) {
  const id = item[getKey('line')]
  const resultItem = resultItems[id]
    || fromPairs(DEFAULT_RESULT_COLUMNS.map(resultColumn => [resultColumn, '']))

  return {
    ...(omit(item, getKey('line'))),
    ...(pick(resultItem, resultColumns))
  }
}

export async function batchGeocode(serviceURL, items, options = {}) {
  const columns = options.columns && options.columns.length > 0
    ? options.columns
    : Object.keys(items[0])

  const resultColumns = options.resultColumns && options.resultColumns.length > 0
    ? options.resultColumns
    : DEFAULT_RESULT_COLUMNS

  items.forEach((item, n) => {
    item[getKey('line')] = n
  })

  const preparedItems = items
    .map(item => prepareItem(item, {...options, columns}))
    .filter(Boolean) // Filter truthy values

  // If preparedItems is empty (all values have been filtered) we exit quickly
  if (preparedItems.length === 0) {
    return items.map(item => expandItemWithResult(item, {}, resultColumns))
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

  formData.append('encoding', 'utf-8')
  formData.append('delimiter', ',')
  formData.append('data', Buffer.from(csvContent), {filename: 'input.csv', contentType: 'text/csv'})

  // Execute request
  const response = await got.post(serviceURL + '/search/csv/', {
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
    }
  })

  // Handle CSV response
  const {data, errors} = Papa.parse(response.body, {header: true, skipEmptyLines: true})

  if (errors.length > 0) {
    const uniqueErrors = [...new Set(errors.map(e => e.code))]
    throw new Error('Invalid batch geocode response: ' + uniqueErrors.join(', '))
  }

  const indexedResultItems = keyBy(data, getKey('line'))

  return items.map(item => expandItemWithResult(item, indexedResultItems, resultColumns))
}
