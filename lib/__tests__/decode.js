import {Buffer} from 'node:buffer'
import {Readable} from 'node:stream'
import test from 'ava'
import {normalizeEncodingName, detectBufferEncoding, decodeStream} from '../decode.js'

test('normalizeEncodingName - windows-1252', t => {
  t.is(normalizeEncodingName('windows-1252'), 'latin1')
})

test('normalizeEncodingName - utf-8', t => {
  t.is(normalizeEncodingName('utf-8'), 'utf8')
})

test('normalizeEncodingName - ascii', t => {
  t.is(normalizeEncodingName('ascii'), 'utf8')
})

test('normalizeEncodingName - case insensitive', t => {
  t.is(normalizeEncodingName('UTF-8'), 'utf8')
  t.is(normalizeEncodingName('Windows-1252'), 'latin1')
  t.is(normalizeEncodingName('ASCII'), 'utf8')
})

test('normalizeEncodingName - unsupported encoding', t => {
  const error = t.throws(() => {
    normalizeEncodingName('unsupported-encoding')
  }, {instanceOf: Error})
  t.is(error.message, 'Encoding currently not supported: unsupported-encoding')
})

test('detectBufferEncoding - utf-8', t => {
  const buffer = Buffer.from('Bonjour le monde! 你好世界', 'utf8')
  const encoding = detectBufferEncoding(buffer)
  t.is(encoding, 'utf8')
})

test('detectBufferEncoding - latin1 text', t => {
  // Jschardet may detect different encodings depending on content
  // Use text with accented characters
  const text = 'Café Restaurant Paris àéèêë ôîù ÀÉÈÊË ÔÎÙÇ ' + 'Bonjour '.repeat(20)
  const buffer = Buffer.from(text, 'latin1')
  const encoding = detectBufferEncoding(buffer)
  // The result should be normalized to latin1
  t.is(encoding, 'latin1')
})

test('decodeStream - auto-detect latin1 with explicit encoding', async t => {
  // For a reliable test, use explicit encoding
  const input = Buffer.from('Café Restaurant àéèêë', 'latin1')
  const stream = Readable.from([input]).pipe(decodeStream('latin1'))

  let result = ''
  for await (const chunk of stream) {
    result += chunk.toString()
  }

  t.is(result, 'Café Restaurant àéèêë')
})

test('decodeStream - with explicit encoding', async t => {
  const input = Buffer.from('Café', 'latin1')
  const stream = Readable.from([input]).pipe(decodeStream('latin1'))

  let result = ''
  for await (const chunk of stream) {
    result += chunk.toString()
  }

  t.is(result, 'Café')
})

test('decodeStream - auto-detect utf-8', async t => {
  const input = Buffer.from('Bonjour le monde! 你好世界', 'utf8')
  const stream = Readable.from([input]).pipe(decodeStream())

  let result = ''
  for await (const chunk of stream) {
    result += chunk.toString()
  }

  t.is(result, 'Bonjour le monde! 你好世界')
})

test('decodeStream - auto-detect latin1', async t => {
  // Use longer text to improve automatic detection
  const text = 'Café Restaurant Paris àéèêë ôîù ÀÉÈÊË ÔÎÙÇ ' + 'Bonjour '.repeat(20)
  const input = Buffer.from(text, 'latin1')
  const stream = Readable.from([input]).pipe(decodeStream())

  let result = ''
  for await (const chunk of stream) {
    result += chunk.toString()
  }

  // Verify that the text contains the expected characters
  t.truthy(result.includes('Caf'))
  t.truthy(result.includes('Restaurant'))
  t.truthy(result.includes('Bonjour'))
})

test('decodeStream - handles BOM for utf-8', async t => {
  const bom = Buffer.from([0xEF, 0xBB, 0xBF])
  const content = Buffer.from('Hello World', 'utf8')
  const input = Buffer.concat([bom, content])

  const stream = Readable.from([input]).pipe(decodeStream())

  let result = ''
  for await (const chunk of stream) {
    result += chunk.toString()
  }

  t.is(result, 'Hello World')
})

test('decodeStream - handles small chunks with auto-detect', async t => {
  const input = Buffer.from('A'.repeat(2048), 'utf8')
  const smallChunks = []

  // Split into small chunks
  for (let i = 0; i < input.length; i += 100) {
    smallChunks.push(input.slice(i, i + 100))
  }

  const stream = Readable.from(smallChunks).pipe(decodeStream())

  let result = ''
  for await (const chunk of stream) {
    result += chunk.toString()
  }

  t.is(result.length, 2048)
  t.is(result, 'A'.repeat(2048))
})

test('decodeStream - handles empty stream', async t => {
  const stream = Readable.from([]).pipe(decodeStream())

  const chunks = []
  for await (const chunk of stream) {
    chunks.push(chunk)
  }

  t.is(chunks.length, 0)
})
