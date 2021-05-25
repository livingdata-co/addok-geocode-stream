#!/usr/bin/env node
const {pipeline} = require('stream')
const yargs = require('yargs')
const parse = require('csv-parser')
const stringify = require('csv-write-stream')
const {decodeStream} = require('./lib/decode')
const {createReverseGeocodeStream} = require('.')

const {argv} = yargs
  .usage('$0 [options]')
  .detectLocale(false)
  .option('service', {
    describe: 'Set geocoding service URL',
    default: 'https://api-adresse.data.gouv.fr'
  })
  .option('longitude', {
    describe: 'Select longitude column'
  })
  .option('longitude', {
    describe: 'Select latitude column'
  })
  .option('semicolon', {
    alias: 'semi',
    describe: 'Use semicolon (;) as separator',
    boolean: true
  })
  .option('tab', {
    describe: 'Use tabulation as separator',
    boolean: true
  })
  .option('pipe', {
    describe: 'Use pipe as separator',
    boolean: true
  })
  .option('result', {
    describe: 'Select columns you want to be added to the result by the geocoder. Default: all',
    coerce: c => c.split(',')
  })
  .option('bucket', {
    describe: 'Set how many rows are sent in each request',
    type: 'number',
    default: 200
  })
  .option('concurrency', {
    describe: 'Set how many requests must be executed concurrently',
    type: 'number',
    coerce: v => {
      if (!v) {
        return 1
      }

      if (!v.match(/\d+/)) {
        throw new Error('Not supported value for concurrency')
      }

      const parsedValue = parseInt(v, 10)
      if (parsedValue <= 0) {
        throw new Error('Not supported value for concurrency')
      }

      return parsedValue
    },
    default: '1'
  })
  .option('encoding', {
    describe: 'Set data encoding. Can be detected automatically',
    choices: ['utf8', 'latin1']
  })

function getSeparator(argv) {
  if (argv.semicolon) {
    return ';'
  }

  if (argv.tab) {
    return '\t'
  }

  if (argv.pipe) {
    return '|'
  }

  return ','
}

const separator = getSeparator(argv)
const {service, concurrency, longitude, latitude, bucket, result} = argv

function onUnwrap(totalCount) {
  console.error(`    geocoding progress: ${totalCount}`)
}

pipeline(
  process.stdin,
  decodeStream(),
  parse({separator}),
  createReverseGeocodeStream(service, {
    longitude,
    latitude,
    concurrency,
    bucketSize: bucket,
    resultColumns: result,
    onUnwrap
  }),
  stringify({separator}),
  process.stdout,
  err => {
    if (err) {
      console.error(err)
      process.exit(1)
    }
  }
)
