import {Transform} from 'node:stream'
import {Buffer} from 'node:buffer'
import jschardet from 'jschardet'
import stripBomStream from 'strip-bom-stream'
import iconv from 'iconv-lite'

const BUFFER_MIN_LENGTH = 1024 * 1024 // 1MB

const CHARDET_TO_NODEJS_ENCODINGS = {
  'windows-1252': 'latin1',
  'utf-8': 'utf8',
  ascii: 'utf8' // Compat
}

export function normalizeEncodingName(encoding) {
  const lcEncoding = encoding.toLowerCase()
  if (!(lcEncoding in CHARDET_TO_NODEJS_ENCODINGS)) {
    throw new Error('Encoding currently not supported: ' + encoding)
  }

  return CHARDET_TO_NODEJS_ENCODINGS[lcEncoding]
}

export function detectBufferEncoding(buffer) {
  const result = jschardet.detect(buffer)
  if (!result || !result.encoding) {
    throw new Error('Unable to detect encoding')
  }

  return normalizeEncodingName(result.encoding)
}

class AutoDecodeStream extends Transform {
  constructor() {
    super()
    this.buffer = []
    this.bufferLength = 0
  }

  createInternalStream() {
    const buffer = Buffer.concat(this.buffer)
    const decodeFrom = detectBufferEncoding(buffer)
    this.internalStream = decodeFrom === 'utf8'
      ? stripBomStream()
      : iconv.decodeStream(decodeFrom)
    this.internalStream.on('data', chunk => {
      this.push(chunk)
    })
    this.internalStream.on('error', error => {
      this.emit('error', error)
    })
    this.internalStream.on('end', () => {
      this._flushCb()
    })
    this.internalStream.write(buffer)
  }

  _transform(chunk, encoding, cb) {
    if (this.internalStream) {
      this.internalStream.write(chunk)
    } else if (this.bufferLength < BUFFER_MIN_LENGTH) {
      this.buffer.push(chunk)
      this.bufferLength += chunk.length
    } else {
      this.createInternalStream()
      this.internalStream.write(chunk)
    }

    cb()
  }

  _flush(cb) {
    if (this.internalStream) {
      this.internalStream.end()
      this._flushCb = cb
    } else if (this.buffer.length > 0) {
      this._flushCb = cb
      this.createInternalStream()
      this.internalStream.end()
    } else {
      cb()
    }
  }
}

export function decodeStream(decodeFrom) {
  if (decodeFrom) {
    return iconv.decodeStream(decodeFrom)
  }

  return new AutoDecodeStream()
}
