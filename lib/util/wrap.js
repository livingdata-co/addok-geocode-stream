import {Transform} from 'node:stream'

export function createBuckets(size = 100) {
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

export function createUnwrapBuckets({onUnwrap}) {
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
