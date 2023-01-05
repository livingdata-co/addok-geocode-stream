/* eslint camelcase: off */
import {callbackify} from 'node:util'
import parallel from 'parallel-transform'
import {mapKeys, fromPairs, pick} from 'lodash-es'

import {DEFAULT_RESULT_COLUMNS} from '../columns.js'
import {prepareParams} from '../prepare-params.js'
import {isFirstCharValid} from '../util/string.js'

function createEmptyResultItem(resultStatus = 'skipped') {
  return fromPairs(DEFAULT_RESULT_COLUMNS.map(resultColumn => [resultColumn, resultColumn === 'result_status' ? resultStatus : '']))
}

export async function geocodeOne(cluster, operation, row, options) {
  const params = prepareParams(row, {
    ...options,
    columns: operation === 'geocode' ? options.columns || Object.keys(row) : undefined
  })

  if (operation === 'geocode') {
    if (params.q.length < 3 || !isFirstCharValid(params.q.charAt(0))) {
      return {
        ...row,
        result_status: 'skipped'
      }
    }

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
      result_next_score: results[1] ? results[1].properties.score : undefined,
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

export function createGeocodeStream(options = {}) {
  const {cluster} = options

  if (!cluster) {
    throw new Error('cluster is a required param')
  }

  const operation = options.operation || 'geocode'
  const concurrency = options.concurrency || cluster.numNodes

  const resultColumns = options.resultColumns && options.resultColumns.length > 0
    ? options.resultColumns
    : DEFAULT_RESULT_COLUMNS

  return parallel(concurrency, callbackify(async row => {
    const result = await geocodeOne(cluster, operation, row, options)
    return pick({...createEmptyResultItem(), ...result}, [...Object.keys(row), ...resultColumns])
  }))
}
