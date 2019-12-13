/* eslint camelcase: off */
const test = require('ava')
const {prepareItem, expandItemWithResult} = require('../geocode')

test('prepareItem', t => {
  const item = {
    c_line: 1,
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
    c_line: 1,
    c_columns: 'toto tata titi',
    c_citycode: 'gamma'
  })
})

test('expandItemWithResult', t => {
  const item = {
    c_line: 1,
    a: 'toto',
    b: 'tata',
    c: 'titi',
    d: 'alpha',
    e: 'gamma'
  }

  const resultItems = {
    1: {
      c_columns: 'toto tata titi',
      c_citycode: 'gamma',
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
