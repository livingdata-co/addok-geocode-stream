/* eslint camelcase: off */
import test from 'ava'
import {prepareCsvItem, expandItemWithResult} from '../csv.js'

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

  t.deepEqual(prepareCsvItem(item, options), {
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
      result_id: '123456789',
      score: '0.99'
    }
  }

  t.deepEqual(expandItemWithResult(item, resultItems, 'skipped', {resultColumns: ['result_type', 'score']}), {
    a: 'toto',
    b: 'tata',
    c: 'titi',
    d: 'alpha',
    e: 'gamma',
    result_type: 'housenumber',
    score: '0.99'
  })
})
