import test from 'ava'
import {prepareParams} from '../prepare-params.js'

test('prepareParams with single citycode filter', t => {
  const item = {
    address: 'rue de la paix',
    citycode: '75001'
  }

  const options = {
    columns: ['address'],
    filters: {citycode: 'citycode'}
  }

  const result = prepareParams(item, options)

  t.is(result.q, 'rue de la paix')
  t.is(result.filters.citycode, '75001')
})

test('prepareParams with multiple citycode values (operator OR)', t => {
  const item = {
    address: 'rue de la paix',
    citycode: '75001+75002+75003'
  }

  const options = {
    columns: ['address'],
    filters: {citycode: 'citycode'}
  }

  const result = prepareParams(item, options)

  t.is(result.q, 'rue de la paix')
  t.deepEqual(result.filters.citycode, ['75001', '75002', '75003'])
})

test('prepareParams with single postcode filter', t => {
  const item = {
    address: 'rue de la paix',
    postcode: '75001'
  }

  const options = {
    columns: ['address'],
    filters: {postcode: 'postcode'}
  }

  const result = prepareParams(item, options)

  t.is(result.q, 'rue de la paix')
  t.is(result.filters.postcode, '75001')
})

test('prepareParams with multiple postcode values (operator OR)', t => {
  const item = {
    address: 'rue de la paix',
    postcode: '75001+75002'
  }

  const options = {
    columns: ['address'],
    filters: {postcode: 'postcode'}
  }

  const result = prepareParams(item, options)

  t.is(result.q, 'rue de la paix')
  t.deepEqual(result.filters.postcode, ['75001', '75002'])
})

test('prepareParams with both citycode and postcode filters as arrays', t => {
  const item = {
    address: 'rue de la paix',
    citycode: '75001+75002',
    postcode: '75001+75002'
  }

  const options = {
    columns: ['address'],
    filters: {
      citycode: 'citycode',
      postcode: 'postcode'
    }
  }

  const result = prepareParams(item, options)

  t.is(result.q, 'rue de la paix')
  t.deepEqual(result.filters.citycode, ['75001', '75002'])
  t.deepEqual(result.filters.postcode, ['75001', '75002'])
})

test('prepareParams ignores empty values after split', t => {
  const item = {
    address: 'rue de la paix',
    citycode: '75001++75002+'
  }

  const options = {
    columns: ['address'],
    filters: {citycode: 'citycode'}
  }

  const result = prepareParams(item, options)

  t.is(result.q, 'rue de la paix')
  t.deepEqual(result.filters.citycode, ['75001', '75002'])
})

test('prepareParams trims whitespace in multiple values', t => {
  const item = {
    address: 'rue de la paix',
    postcode: '75001 + 75002 + 75003'
  }

  const options = {
    columns: ['address'],
    filters: {postcode: 'postcode'}
  }

  const result = prepareParams(item, options)

  t.is(result.q, 'rue de la paix')
  t.deepEqual(result.filters.postcode, ['75001', '75002', '75003'])
})

test('prepareParams with generic filter names', t => {
  const item = {
    address: 'rue de la paix',
    department: '75',
    region: 'ile-de-france'
  }

  const options = {
    columns: ['address'],
    filters: {
      departmentcode: 'department',
      regioncode: 'region'
    }
  }

  const result = prepareParams(item, options)

  t.is(result.q, 'rue de la paix')
  t.is(result.filters.departmentcode, '75')
  t.is(result.filters.regioncode, 'ile-de-france')
})
