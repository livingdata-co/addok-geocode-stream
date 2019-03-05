const request = require('superagent')
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

  const req = request.post(serviceURL + '/search/csv/')

  // Build multipart
  columns.forEach(column => req.field('columns', column))
  req.field('encoding', 'utf-8')
  req.field('delimiter', ',')
  req.attach('data', Buffer.from(csvContent), 'input.csv', {filename: 'input.csv', contentType: 'text/csv'})

  // Execute request
  const response = await req

  return csvToItems(response.text)
}

module.exports = {batchGeocode}
