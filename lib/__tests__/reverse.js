/* eslint camelcase: off */
const test = require('ava')
const {prepareItem} = require('../reverse')

test('prepareItem', t => {
  const item = {
    a: 'toto',
    b: 'tata',
    c: 'titi',
    d: 'alpha',
    e: 'gamma'
  }

  const options = {
    longitude: 'a',
    latitude: 'b'
  }

  t.deepEqual(prepareItem(item, {geocoder__line: 1}, options), {
    geocoder__line: 1,
    longitude: 'toto',
    latitude: 'tata'
  })
})

test('prepareItem default', t => {
  const item = {
    lat: 'toto',
    lon: 'tata',
    c: 'titi',
    d: 'alpha',
    e: 'gamma'
  }

  const options = {}

  t.deepEqual(prepareItem(item, {geocoder__line: 1}, options), {
    geocoder__line: 1,
    latitude: 'toto',
    longitude: 'tata'
  })
})
