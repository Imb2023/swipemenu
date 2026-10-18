import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../docs/google-apps-script.gs', import.meta.url), 'utf8');
function run(values) {
  const context = vm.createContext({
    SpreadsheetApp: {openById: () => ({getSheetByName: () => ({getDataRange: () => ({getValues: () => structuredClone(values)})})})},
    ContentService: {MimeType: {JSON: 'application/json'}, createTextOutput: text => ({setMimeType: () => text})}
  });
  vm.runInContext(source, context);
  return JSON.parse(vm.runInContext('doGet()', context));
}
test('public Sheet template only exports published menu fields', () => {
  const values = [['name', 'category', 'available', 'staff notes'],
    ['Public', 'Specials', true, 'private supplier cost'],
    ['Sold out', 'Specials', false, 'private'],
    ['Draft', 'Draft', true, 'private'],
    ['', 'Specials', true, 'private']];
  const copy = structuredClone(values);
  const rows = run(values);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'Public');
  assert.ok(!JSON.stringify(rows).includes('private'));
  assert.deepEqual(values, copy);
});
test('Sheet template handles invalid headers without exposing internals', () => {
  assert.deepEqual(run([['secret'], ['private']]), {error: 'menu_unavailable'});
  assert.deepEqual(run([]), {error: 'menu_unavailable'});
});
