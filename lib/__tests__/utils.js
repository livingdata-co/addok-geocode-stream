/* eslint camelcase: off */
const test = require('ava')
const {expandItemsWithResult} = require('../utils')

test('expandItemsWithResult', t => {
  const item = {
    a: 'toto',
    b: 'tata',
    c: 'titi',
    d: 'alpha',
    e: 'gamma'
  }

  const resultItems = [{
    geocoder__line: 0,
    geocoder__address: 'toto tata titi',
    geocoder__citycode: 'gamma',
    result_type: 'housenumber',
    result_id: '123456789',
    score: '0.99'
  }]

  t.deepEqual(expandItemsWithResult([item], resultItems, ['result_type', 'score']), [{
    a: 'toto',
    b: 'tata',
    c: 'titi',
    d: 'alpha',
    e: 'gamma',
    result_type: 'housenumber',
    score: '0.99'
  }])
})
