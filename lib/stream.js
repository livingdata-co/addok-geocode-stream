import {callbackify} from 'node:util'

import pumpify from 'pumpify'
import parallel from 'parallel-transform'
import {batchGeocode} from './geocode.js'

import {createBuckets, createUnwrapBuckets} from './util/wrap.js'

function createBatchGeocodeStream(serviceUrl, options = {}) {
  return parallel(options.concurrency || 1, callbackify(async bucket => batchGeocode(serviceUrl, bucket, options)))
}

export function createGeocodeStream(serviceUrl, options = {}) {
  if (!serviceUrl) {
    throw new Error('serviceUrl is a required param')
  }

  return pumpify.obj(
    createBuckets(options.serviceType === 'batch' ? 100 : options.bucketSize),
    createBatchGeocodeStream(serviceUrl, options),
    createUnwrapBuckets(options)
  )
}
