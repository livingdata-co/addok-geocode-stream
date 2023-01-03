import {callbackify} from 'node:util'

import pumpify from 'pumpify'
import parallel from 'parallel-transform'
import {batchGeocode} from './geocode.js'

import {createBuckets, createUnwrapBuckets} from './util/wrap.js'

function createBatchGeocodeStream(serviceURL, options = {}) {
  return parallel(options.concurrency || 1, callbackify(async bucket => batchGeocode(serviceURL, bucket, options)))
}

export function createGeocodeStream(serviceURL, options = {}) {
  if (!serviceURL) {
    throw new Error('serviceURL is a required param')
  }

  return pumpify.obj(
    createBuckets(options.serviceType === 'batch' ? 100 : options.bucketSize),
    createBatchGeocodeStream(serviceURL, options),
    createUnwrapBuckets(options)
  )
}
