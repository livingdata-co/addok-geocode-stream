/* eslint camelcase: off */
const test = require('ava')
const {prepareItem} = require('../geocode')

test('prepareItem', t => {
  const item = {
    a: 'toto',
    b: 'tata',
    c: 'titi',
    d: 'alpha',
    e: 'gamma'
  }

  const options = {
    columns: ['a', 'b', 'c'],
    citycode: 'e'
  }

  t.deepEqual(prepareItem(item, {geocoder__line: 1}, options), {
    geocoder__line: 1,
    geocoder__address: 'toto tata titi',
    geocoder__citycode: 'gamma'
  })
})
