const {callbackify} = require('util')
const {pipeline, through, parallel} = require('mississippi')
const {batchGeocode} = require('./geocode')
const {batchReverseGeocode} = require('./reverse')

function createBuckets(size = 100) {
  let bucket = []
  return through.obj(
    // Iterate
    (line, enc, done) => {
      if (bucket.length < size) {
        bucket.push(line)
        done()
      } else {
        const completedBucket = bucket
        bucket = [line]
        done(null, completedBucket)
      }
    },
    // Flush
    done => {
      if (bucket.length > 0) {
        done(null, bucket)
      } else {
        done()
      }
    }
  )
}

function createUnwrapBuckets({onUnwrap}) {
  let totalCount = 0
  return through.obj(function (bucket, enc, done) {
    bucket.forEach(item => this.push(item))
    totalCount += bucket.length

    if (onUnwrap) {
      onUnwrap(totalCount)
    }

    done()
  })
}

function createBatchStream(type, serviceURL, options = {}) {
  return parallel(options.concurrency || 1, callbackify(async bucket => {
    return type === 'reverse' ?
      batchReverseGeocode(serviceURL, bucket, options) :
      batchGeocode(serviceURL, bucket, options)
  }))
}

function createStream(type) {
  return function (serviceURL, options = {}) {
    if (!serviceURL) {
      throw new Error('serviceURL is a required param')
    }

    return pipeline.obj(
      createBuckets(options.bucketSize),
      createBatchStream(type, serviceURL, options),
      createUnwrapBuckets(options)
    )
  }
}

module.exports = {
  createGeocodeStream: createStream('geocode'),
  createReverseGeocodeStream: createStream('reverse')
}
