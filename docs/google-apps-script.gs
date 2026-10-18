/** Paste into Extensions → Apps Script from your restaurant's spreadsheet. */
const SPREADSHEET_ID = 'PASTE_YOUR_SPREADSHEET_ID_HERE';
const MENU_TAB = 'Specials';

function doGet() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(MENU_TAB);
    if (!sheet) throw new Error('Menu tab missing');
    const values = sheet.getDataRange().getValues();
    const headers = values.shift().map(value => String(value).trim().toLowerCase());
    if (!['name', 'category', 'available'].every(name => headers.includes(name))) {
      throw new Error('Required headers missing');
    }
    const fields = ['id', 'category', 'name', 'price', 'description', 'image',
      'featured', 'available', 'order', 'video'];
    const enabled = value => value === true || value === 1 ||
      ['true', 'yes', '1'].includes(String(value).trim().toLowerCase());
    const rows = values.map(row => {
      const item = {};
      fields.forEach(field => {
        const index = headers.indexOf(field);
        item[field] = index < 0 ? '' : row[index];
      });
      return item;
    }).filter(item => String(item.name).trim() && enabled(item.available) &&
      /^specials?$/i.test(String(item.category).trim()));
    // Only approved menu fields and published specials become public.
    return ContentService.createTextOutput(JSON.stringify(rows))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    // Do not expose spreadsheet IDs, internal columns, or stack traces to guests.
    return ContentService.createTextOutput(JSON.stringify({error: 'menu_unavailable'}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
