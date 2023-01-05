/* eslint camelcase: off */
import {callbackify} from 'node:util'
import parallel from 'parallel-transform'
import {mapKeys, fromPairs, pick} from 'lodash-es'

import {DEFAULT_RESULT_COLUMNS} from '../columns.js'
import {prepareParams} from '../prepare-params.js'

function createEmptyResultItem(operation, resultStatus = 'skipped') {
  return fromPairs(DEFAULT_RESULT_COLUMNS[operation].map(resultColumn => [resultColumn, resultColumn === 'result_status' ? resultStatus : '']))
}

export async function geocodeOne(cluster, row, options) {
  const operation = options.reverse ? 'reverse' : 'geocode'

  const params = prepareParams(row, {
    ...options,
    columns: operation === 'geocode' ? options.columns || Object.keys(row) : undefined
  })

  if (!params) {
    return {
      ...row,
      result_status: 'skipped'
    }
  }

  if (operation === 'geocode') {
    params.autocomplete = false
  }

  params.limit = 2

  try {
    const operationOptions = {}

    if (options.signal) {
      operationOptions.signal = options.signal
    }

    const results = await cluster[operation](params, operationOptions)

    if (results.length === 0) {
      return {
        ...row,
        result_status: 'not-found'
      }
    }

    return {
      ...row,
      result_status: 'ok',
      ...mapKeys(results[0].properties, (value, key) => `result_${key}`),
      result_score_next: results[1] ? results[1].properties.score : undefined,
      longitude: results[0].geometry.coordinates[0],
      latitude: results[0].geometry.coordinates[1]
    }
  } catch (error) {
    if (error.message === 'Aborted') {
      return {
        ...row,
        result_status: 'aborted'
      }
    }

    console.error(error.message)

    return {
      ...row,
      result_status: 'error'
    }
  }
}

export function createGeocodeStream(options) {
  const {cluster, operation} = options

  if (!cluster) {
    throw new Error('cluster is a required param')
  }

  const concurrency = options.concurrency || cluster.numNodes

  const resultColumns = options.resultColumns && options.resultColumns.length > 0
    ? options.resultColumns
    : DEFAULT_RESULT_COLUMNS[operation]

  return parallel(concurrency, callbackify(async row => {
    const result = await geocodeOne(cluster, row, options)
    return pick({...createEmptyResultItem(operation), ...result}, [...Object.keys(row), ...resultColumns])
  }))
}
