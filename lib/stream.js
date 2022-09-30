import {callbackify} from 'node:util'
import {Transform} from 'node:stream'
import pumpify from 'pumpify'
import parallel from 'parallel-transform'
import {batchGeocode} from './geocode.js'

function createBuckets(size = 100) {
  let bucket = []

  return new Transform({
    transform(row, enc, cb) {
      if (bucket.length < size) {
        bucket.push(row)
        cb()
      } else {
        const completedBucket = bucket
        bucket = [row]
        cb(null, completedBucket)
      }
    },

    flush(cb) {
      if (bucket.length > 0) {
        cb(null, bucket)
      } else {
        cb()
      }
    },

    objectMode: true
  })
}

function createUnwrapBuckets({onUnwrap}) {
  let totalCount = 0

  return new Transform({
    transform(bucket, enc, cb) {
      bucket.forEach(item => this.push(item))
      totalCount += bucket.length

      if (onUnwrap) {
        onUnwrap(totalCount)
      }

      cb()
    },

    objectMode: true
  })
}

function createBatchGeocodeStream(serviceURL, options = {}) {
  return parallel(options.concurrency || 1, callbackify(async bucket => batchGeocode(serviceURL, bucket, options)))
}

export function createGeocodeStream(serviceURL, options = {}) {
  if (!serviceURL) {
    throw new Error('serviceURL is a required param')
  }

  return pumpify.obj(
    createBuckets(options.bucketSize),
    createBatchGeocodeStream(serviceURL, options),
    createUnwrapBuckets(options)
  )
}
