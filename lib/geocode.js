/* eslint camelcase: off */
import {Buffer} from 'node:buffer'
import {omit, pick, keyBy} from 'lodash-es'
import got from 'got'
import FormData from 'form-data'
import csvParser from 'csv-parser'
import csvWriter from 'csv-write-stream'
import getStream from 'get-stream'

function makeRandomString(length) {
  let string = ''
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

  for (let i = 0; i < length; i++) {
    string += characters.charAt(Math.floor(Math.random() * characters.length))
  }

  return string
}

const GEOCODER_COLUMN_PREFIX = makeRandomString(6)

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

async function itemsToCsv(items) {
  const stream = csvWriter()
  items.forEach(item => stream.write(item))
  stream.end()
  return getStream(stream)
}

async function csvToItems(csvContent) {
  const stream = csvParser()
  stream.write(csvContent)
  stream.end()
  return getStream.array(stream)
}

export function prepareItem(item, {columns, citycode, postcode}) {
  const preparedItem = {
    [getKey('line')]: item[getKey('line')],
    [getKey('address')]: columns
      .map(c => c in item ? item[c].trim() : '')
      .join(' ')
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

  const csvContent = await itemsToCsv(items.map(item => prepareItem(item, {...options, columns})))

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
  const response = await got.post(serviceURL + '/search/csv/', {body: formData})

  const resultItems = await csvToItems(response.body)
  const indexedResultItems = keyBy(resultItems, getKey('line'))

  return items.map(item => expandItemWithResult(item, indexedResultItems, resultColumns))
}
