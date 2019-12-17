/* eslint camelcase: off */
const test = require('ava')
const {prepareItem, expandItemWithResult} = require('../geocode')

test('prepareItem', t => {
  const item = {
    geocoder__line: 1,
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

  t.deepEqual(prepareItem(item, options), {
    geocoder__line: 1,
    geocoder__address: 'toto tata titi',
    geocoder__citycode: 'gamma'
  })
})

test('expandItemWithResult', t => {
  const item = {
    geocoder__line: 1,
    a: 'toto',
    b: 'tata',
    c: 'titi',
    d: 'alpha',
    e: 'gamma'
  }

  const resultItems = {
    1: {
      geocoder__address: 'toto tata titi',
      geocoder__citycode: 'gamma',
      result_type: 'housenumber',
      score: '0.99'
    }
  }

  t.deepEqual(expandItemWithResult(item, resultItems), {
    a: 'toto',
    b: 'tata',
    c: 'titi',
    d: 'alpha',
    e: 'gamma',
    result_type: 'housenumber',
    score: '0.99'
  })
})
