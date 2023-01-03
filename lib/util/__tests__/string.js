import test from 'ava'
import {isFirstCharValid} from '../string.js'

test('isFirstCharValid', t => {
  t.true(isFirstCharValid('a'))
  t.true(isFirstCharValid('à'))
  t.true(isFirstCharValid('É'))
  t.true(isFirstCharValid('1'))
  t.false(isFirstCharValid('-'))
  t.false(isFirstCharValid('@'))
  t.false(isFirstCharValid('('))
})
