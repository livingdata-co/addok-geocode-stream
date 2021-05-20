/* eslint camelcase: off */
const test = require('ava')
const {prepareItem, expandItemWithResult} = require('../geocode')

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

  t.deepEqual(prepareItem(item, options), {
    geocoder__address: 'toto tata titi',
    geocoder__citycode: 'gamma'
  })
})

test('expandItemWithResult', t => {
  const item = {
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
      result_id: '123456789',
      score: '0.99'
    }
  }

  t.deepEqual(expandItemWithResult(item, resultItems[1], ['result_type', 'score']), {
    a: 'toto',
    b: 'tata',
    c: 'titi',
    d: 'alpha',
    e: 'gamma',
    result_type: 'housenumber',
    score: '0.99'
  })
})
