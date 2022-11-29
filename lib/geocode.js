import DEFAULT_RESULT_COLUMNS from './result-columns.js'
import {geocodeMany as geocodeManyCsv} from './strategies/csv.js'

export async function batchGeocode(serviceURL, items, options = {}) {
  const columns = options.columns && options.columns.length > 0
    ? options.columns
    : Object.keys(items[0])

  const resultColumns = options.resultColumns && options.resultColumns.length > 0
    ? options.resultColumns
    : DEFAULT_RESULT_COLUMNS

  return geocodeManyCsv(items, {columns, resultColumns, serviceURL, signal: options.signal})
}
