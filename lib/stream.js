import {createGeocodeStream as createCsvGeocodeStream} from './strategies/csv.js'
import {createGeocodeStream as createBatchGeocodeStream} from './strategies/batch.js'
import {createGeocodeStream as createClusterGeocodeStream} from './strategies/cluster.js'

export function createGeocodeStream(options = {}) {
  const strategy = options.strategy || 'csv'
  const operation = options.reverse ? 'reverse' : 'geocode'

  if (strategy === 'csv') {
    return createCsvGeocodeStream({...options, operation})
  }

  if (strategy === 'batch') {
    return createBatchGeocodeStream({...options, operation})
  }

  if (strategy === 'cluster') {
    return createClusterGeocodeStream({...options, operation})
  }

  throw new Error('strategy not supported: ' + strategy)
}
