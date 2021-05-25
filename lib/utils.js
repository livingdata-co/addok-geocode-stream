const {omit,pick,keyBy} = require('lodash')
const got = require('got')
const FormData = require('form-data')
const csvParser = require('csv-parser')
const csvWriter = require('csv-write-stream')
const getStream = require('get-stream')

const GEOCODER_COLUMN_PREFIX = process.env.GEOCODER_COLUMN_PREFIX || 'geocoder__'

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

function expandItemsWithResult(items, resultItems, resultColumns = []) {
  const indexedResultItems = keyBy(resultItems, getKey('line'))

  return items.map((item, i) => {
    const resultItem = indexedResultItems[i]

    return {
      ...item,
      ...(pick(resultItem, resultColumns))
    }
  })
}

function prepareItems(items, prepareItem, options) {
  return items.map((item, i) => {
    const preparedItem = {
      [getKey('line')]: i
    }

    return prepareItem(item, preparedItem, options)
  })
}

async function makeRequest(path, prepareItem, items, options) {
  const preparedItems = prepareItems(items, prepareItem, options)

  const csvContent = await itemsToCsv(preparedItems)

  // Build multipart body
  const formData = new FormData()

  if (options.columns) {
    formData.append('columns', getKey('address'));
  }
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
  const response = await got.post(path, {body: formData})

  const resultItems = await csvToItems(response.body)

  const resultColumns = options.resultColumns && options.resultColumns.length > 0 ?
    options.resultColumns :
    DEFAULT_RESULT_COLUMNS

  return expandItemsWithResult(items, resultItems, resultColumns)
}

module.exports = {
  DEFAULT_RESULT_COLUMNS,
  getKey,
  itemsToCsv,
  makeRequest,
  expandItemsWithResult
};
