// ─────────────────────────────────────────────────────────────────────────────
// Google Apps Script — Portfolio Videos CRUD Database
// Paste this ENTIRE file into your Apps Script editor and re-deploy as Web App
// (Execute as: Me | Access: Anyone)
// ─────────────────────────────────────────────────────────────────────────────

var SHEET_NAME = 'Sheet1';
var HEADERS = ['id', 'type', 'title', 'youtubeId', 'description', 'position', 'createdAt'];

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
  }
  return sheet;
}

// ── Ensure headers exist ──────────────────────────────────────────────────────
function ensureHeaders(sheet) {
  var firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  var hasHeaders = firstRow[0] === 'id';
  if (!hasHeaders) {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
}

// ── Read all rows as objects ──────────────────────────────────────────────────
function getAllRows(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0].map(function(h) { return String(h).trim().toLowerCase(); });
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue; // skip empty rows
    var obj = {};
    headers.forEach(function(h, idx) { obj[h] = row[idx] !== undefined ? String(row[idx]) : ''; });
    rows.push(obj);
  }
  return rows;
}

// ── CORS headers helper ───────────────────────────────────────────────────────
function corsOutput(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ── GET — return all videos as JSON ──────────────────────────────────────────
function doGet(e) {
  try {
    var sheet = getSheet();
    ensureHeaders(sheet);
    var rows = getAllRows(sheet);
    return corsOutput({ status: 'success', videos: rows });
  } catch(err) {
    return corsOutput({ status: 'error', message: err.toString() });
  }
}

// ── POST — handle CRUD operations ────────────────────────────────────────────
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var sheet = getSheet();
    ensureHeaders(sheet);

    if (action === 'ADD') {
      return handleAdd(sheet, payload.video);
    } else if (action === 'UPDATE') {
      return handleUpdate(sheet, payload.video);
    } else if (action === 'DELETE') {
      return handleDelete(sheet, payload.id);
    } else if (action === 'REORDER') {
      return handleReorder(sheet, payload.videos);
    } else if (action === 'RESET') {
      return handleReset(sheet, payload.videos);
    } else {
      return corsOutput({ status: 'error', message: 'Unknown action: ' + action });
    }
  } catch(err) {
    return corsOutput({ status: 'error', message: err.toString() });
  }
}

// ── ADD — append one row at end ───────────────────────────────────────────────
function handleAdd(sheet, video) {
  if (!video || !video.id) return corsOutput({ status: 'error', message: 'Missing video data' });
  
  // Calculate position: count existing rows of same type, insert at specified position
  var rows = getAllRows(sheet);
  var sameType = rows.filter(function(r) { return r.type === video.type; });
  var position = video.position || (sameType.length + 1);
  
  sheet.appendRow([
    video.id,
    video.type || 'long',
    video.title || '',
    video.youtubeId || '',
    video.description || '',
    position,
    video.createdAt || new Date().toISOString()
  ]);
  return corsOutput({ status: 'success', action: 'ADD', id: video.id });
}

// ── UPDATE — find row by id, update in place ──────────────────────────────────
function handleUpdate(sheet, video) {
  if (!video || !video.id) return corsOutput({ status: 'error', message: 'Missing video id' });
  
  var data = sheet.getDataRange().getValues();
  var idCol = 0; // 'id' is first column
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(video.id)) {
      sheet.getRange(i + 1, 1, 1, HEADERS.length).setValues([[
        video.id,
        video.type || data[i][1],
        video.title || data[i][2],
        video.youtubeId || data[i][3],
        video.description !== undefined ? video.description : data[i][4],
        video.position !== undefined ? video.position : data[i][5],
        data[i][6] // keep original createdAt
      ]]);
      return corsOutput({ status: 'success', action: 'UPDATE', id: video.id });
    }
  }
  return corsOutput({ status: 'error', message: 'Video not found: ' + video.id });
}

// ── DELETE — find row by id, delete it ────────────────────────────────────────
function handleDelete(sheet, id) {
  if (!id) return corsOutput({ status: 'error', message: 'Missing id' });
  
  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return corsOutput({ status: 'success', action: 'DELETE', id: id });
    }
  }
  return corsOutput({ status: 'error', message: 'Video not found: ' + id });
}

// ── REORDER — rewrite all rows in new order ───────────────────────────────────
function handleReorder(sheet, videos) {
  if (!videos || !videos.length) return corsOutput({ status: 'error', message: 'No videos to reorder' });
  
  // Clear everything after header
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);
  
  // Write in new order
  var rows = videos.map(function(v, idx) {
    return [v.id, v.type, v.title, v.youtubeId, v.description || '', idx + 1, v.createdAt || ''];
  });
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
  }
  return corsOutput({ status: 'success', action: 'REORDER', count: videos.length });
}

// ── RESET — replace everything with given list ────────────────────────────────
function handleReset(sheet, videos) {
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);
  
  if (videos && videos.length) {
    var rows = videos.map(function(v, idx) {
      return [v.id, v.type, v.title, v.youtubeId, v.description || '', idx + 1, v.createdAt || new Date().toISOString()];
    });
    sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
  }
  return corsOutput({ status: 'success', action: 'RESET', count: (videos || []).length });
}
