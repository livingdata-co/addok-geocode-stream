#!/usr/bin/env node
import process from 'node:process'
import {pipeline} from 'node:stream'
import yargs from 'yargs'
import parse from 'csv-parser'
import stringify from 'csv-write-stream'
import {decodeStream} from './lib/decode.js'
import {createGeocodeStream} from './index.js'

const {argv} = yargs
  .usage('$0 [options]')
  .detectLocale(false)
  .option('service', {
    describe: 'Set geocoding service URL',
    default: 'https://api-adresse.data.gouv.fr'
  })
  .option('columns', {
    describe: 'Select columns to geocode, in the right order',
    coerce: c => c.split(',')
  })
  .option('citycode', {
    describe: 'Filter results by citycode'
  })
  .option('postcode', {
    describe: 'Filter results by postcode'
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
    coerce: c => c ? c.split(',') : []
  })
  .option('bucket', {
    describe: 'Set how many rows are sent in each request',
    type: 'number',
    default: 200
  })
  .option('concurrency', {
    describe: 'Set how many requests must be executed concurrently',
    type: 'number',
    coerce(v) {
      if (!v) {
        return 1
      }

      if (!/\d+/.test(v)) {
        throw new Error('Not supported value for concurrency')
      }

      const parsedValue = Number.parseInt(v, 10)
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
const {service, concurrency, columns, bucket, result} = argv

function onUnwrap(totalCount) {
  console.error(`    geocoding progress: ${totalCount}`)
}

pipeline(
  process.stdin,
  decodeStream(),
  parse({separator}),
  createGeocodeStream(service, {
    columns,
    concurrency,
    bucketSize: bucket,
    resultColumns: result,
    onUnwrap
  }),
  stringify({separator}),
  process.stdout,
  error => {
    if (error) {
      console.error(error)
      process.exit(1)
    }
  }
)
