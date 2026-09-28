/**
 * SISTEM SURVEY PARKIRAN ATAS vs BAWAH — code.gs
 * -------------------------------------------------
 * Backend: nyimpen jawaban ke Sheet "Responses" dan ngitung statistik
 * buat ditampilin di dashboard (satu halaman, dua tab: Survey & Dashboard).
 */

const SHEET_NAME = 'Responses';

const DAFTAR_ALASAN = [
  'Dekat pintu masuk',
  'Teduh, tidak panas',
  'Lebih luas / lega',
  'Terasa lebih aman',
  'Tidak becek / tidak licin',
  'Akses lebih mudah (tangga/lift dekat)',
  'Pencahayaan lebih terang',
  'Lainnya'
];

/** Jalankan SEKALI manual dari editor untuk siapkan sheet "Responses". */
function initializeSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  sheet.clear();
  sheet.appendRow([
    'Timestamp', 'Nama', 'Preferensi', 'Alasan', 'Alasan Lainnya',
    'Rating Atas', 'Rating Bawah', 'Saran'
  ]);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 8);
}

/** Satu-satunya route: selalu render index.html (form + dashboard dalam 1 halaman, 2 tab). */
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Survey Parkiran Atas vs Bawah')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Helper wajib untuk menggabungkan file HTML lain (Stylesheet / JavaScript)
 * ke dalam index.html, dipanggil di index.html lewat:
 *   <?!= include('Stylesheet'); ?>
 *   <?!= include('JavaScript'); ?>
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** Dipanggil dari app.js untuk simpan satu jawaban survey. */
function submitSurvey(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Sheet belum siap. Jalankan initializeSheet() dulu.');

  sheet.appendRow([
    new Date(),
    data.nama || '(tanpa nama)',
    data.preferensi,
    (data.alasan || []).join(', '),
    data.alasanLain || '',
    Number(data.ratingAtas) || 0,
    Number(data.ratingBawah) || 0,
    data.saran || ''
  ]);

  return { status: 'ok' };
}

/** Dipanggil dari app.js untuk ambil data ringkasan buat dashboard. */
function getSurveyData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) {
    return { total: 0, atas: 0, bawah: 0, avgRatingAtas: 0, avgRatingBawah: 0, alasanCount: {}, terbaru: [] };
  }

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();

  let atas = 0, bawah = 0;
  let sumRatingAtas = 0, sumRatingBawah = 0;
  let countRatingAtas = 0, countRatingBawah = 0;
  const alasanCount = {};
  DAFTAR_ALASAN.forEach(a => alasanCount[a] = 0);

  rows.forEach(r => {
    const [, , preferensi, alasanStr, , ratingAtas, ratingBawah] = r;
    if (preferensi === 'Atas') atas++;
    else if (preferensi === 'Bawah') bawah++;

    if (ratingAtas) { sumRatingAtas += Number(ratingAtas); countRatingAtas++; }
    if (ratingBawah) { sumRatingBawah += Number(ratingBawah); countRatingBawah++; }

    String(alasanStr || '').split(',').map(s => s.trim()).forEach(a => {
      if (a && alasanCount.hasOwnProperty(a)) alasanCount[a]++;
    });
  });

  const terbaru = rows.slice(-5).reverse().map(r => ({
    nama: r[1], preferensi: r[2], saran: r[7]
  })).filter(x => x.saran);

  return {
    total: rows.length,
    atas: atas,
    bawah: bawah,
    avgRatingAtas: countRatingAtas ? (sumRatingAtas / countRatingAtas).toFixed(1) : 0,
    avgRatingBawah: countRatingBawah ? (sumRatingBawah / countRatingBawah).toFixed(1) : 0,
    alasanCount: alasanCount,
    terbaru: terbaru
  };
}

/** Dipanggil dari app.js supaya daftar alasan tidak hardcode di 2 tempat. */
function getDaftarAlasan() {
  return DAFTAR_ALASAN;
}
