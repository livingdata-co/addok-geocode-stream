const got = require('got')
const FormData = require('form-data')
const csvParser = require('csv-parser')
const csvWriter = require('csv-write-stream')
const getStream = require('get-stream')

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

async function batchGeocode(serviceURL, items, options = {}) {
  const columns = options.columns || Object.keys(items[0])
  const csvContent = await itemsToCsv(items)

  // Build multipart body
  const formData = new FormData()
  columns.forEach(column => formData.append('columns', column))

  if (options.citycode) {
    formData.append('citycode', options.citycode)
  }

  if (options.postcode) {
    formData.append('postcode', options.postcode)
  }

  formData.append('encoding', 'utf-8')
  formData.append('delimiter', ',')
  formData.append('data', Buffer.from(csvContent), {filename: 'input.csv', contentType: 'text/csv'})

  // Execute request
  const response = await got.post(serviceURL + '/search/csv/', {body: formData})

  return csvToItems(response.body)
}

module.exports = {batchGeocode}
