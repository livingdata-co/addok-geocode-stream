import {createGeocodeStream as createCsvGeocodeStream} from './strategies/csv.js'
import {createGeocodeStream as createBatchGeocodeStream} from './strategies/batch.js'
import {createGeocodeStream as createClusterGeocodeStream} from './strategies/cluster.js'

export function createGeocodeStream(options = {}) {
  const strategy = options.strategy || 'csv'

  if (strategy === 'csv') {
    return createCsvGeocodeStream(options)
  }

  if (strategy === 'batch') {
    return createBatchGeocodeStream(options)
  }

  if (strategy === 'cluster') {
    return createClusterGeocodeStream(options)
  }

  throw new Error('strategy not supported: ' + strategy)
}
