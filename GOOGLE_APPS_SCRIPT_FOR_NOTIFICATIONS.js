/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         PILATES HUB — Google Apps Script                    ║
 * ║  ✅ Auto-saves enquiries to Google Sheet                    ║
 * ║  ✅ Sends Email notification to owner (+ 2nd recipient)     ║
 * ║  ✅ Sends Auto-reply email to customer                      ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * DEPLOYMENT STEPS (do this every time you update the script):
 * 1. Click Deploy → Manage Deployments
 * 2. Click the pencil (edit) icon on your deployment
 * 3. Set "Who has access" → Anyone
 * 4. Change version → "New version"
 * 5. Click Deploy and copy the /exec URL
 * 6. Paste that URL into SCRIPT_URL in all your HTML files
 */

// ── CHANGE THESE VALUES ────────────────────────────────────────
const OWNER_EMAIL  = 'giri.kumar91221@gmail.com'; // Primary email
const SECOND_EMAIL = 'info@pilateshub.in';         // 2nd recipient (leave '' to skip)
const SHEET_NAME   = 'Pilates Hub Enquiries';
// ──────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────
//  doGet — handles form submissions sent as GET with URL params
//  (used by all HTML pages with mode:'no-cors')
// ─────────────────────────────────────────────────────────────
function doGet(e) {
  // CORS preflight or ping — just confirm alive
  if (!e || !e.parameter || !e.parameter.name) {
    return ContentService
      .createTextOutput('✅ Pilates Hub Script is live!')
      .setMimeType(ContentService.MimeType.TEXT);
  }

  try {
    const data = normaliseData(e.parameter);
    saveToSheet(data);
    sendOwnerNotification(data);
    if (data.email) sendAutoReply(data);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log('❌ doGet error: ' + err.message);
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


// ─────────────────────────────────────────────────────────────
//  doPost — fallback handler for POST submissions
// ─────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    let raw = {};
    if (e.parameter && Object.keys(e.parameter).length > 0) {
      raw = e.parameter;
    } else if (e.postData && e.postData.contents) {
      raw = JSON.parse(e.postData.contents);
    }
    const data = normaliseData(raw);
    saveToSheet(data);
    sendOwnerNotification(data);
    if (data.email) sendAutoReply(data);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log('❌ doPost error: ' + err.message);
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


// ─────────────────────────────────────────────────────────────
//  Normalise field names — handles both form field variations:
//  - 'interest' (index.html enquiry form)
//  - 'machine'  (product page buy form, sent as machineName)
//  - 'interest' set to machineName in product pages JS
// ─────────────────────────────────────────────────────────────
function normaliseData(raw) {
  const data = Object.assign({}, raw);

  // Unify equipment field: product pages send interest=machineName
  // If machine field also sent, prefer it
  if (!data.interest && data.machine) data.interest = data.machine;
  if (!data.interest) data.interest = '—';

  // Ensure timestamp
  if (!data.timestamp) {
    data.timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  }

  return data;
}


// ─────────────────────────────────────────────────────────────
//  Save to Google Sheet
// ─────────────────────────────────────────────────────────────
function saveToSheet(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const headers = ['Timestamp', 'Name', 'Phone', 'Email', 'Equipment Interest', 'City', 'Message'];
    sheet.appendRow(headers);
    const hr = sheet.getRange(1, 1, 1, headers.length);
    hr.setFontWeight('bold');
    hr.setBackground('#D4A017');
    hr.setFontColor('#ffffff');
    hr.setFontSize(11);
    sheet.setFrozenRows(1);
    [160, 140, 130, 180, 160, 120, 260].forEach((w, i) => sheet.setColumnWidth(i + 1, w));
  }

  sheet.appendRow([
    data.timestamp || '',
    data.name      || '',
    data.phone     || '',
    data.email     || '',
    data.interest  || '',
    data.city      || '',
    data.message   || ''
  ]);
}


// ─────────────────────────────────────────────────────────────
//  Send notification email to owner (+ optional 2nd recipient)
// ─────────────────────────────────────────────────────────────
function sendOwnerNotification(data) {
  const subject = '🔔 New Enquiry on Pilates Hub – ' + (data.name || 'Unknown Visitor');

  const htmlBody = `
<div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;color:#111111">
  <div style="background:#D4A017;padding:22px 28px;border-radius:8px 8px 0 0">
    <h2 style="margin:0;color:#ffffff;font-size:22px;font-weight:700">🔔 New Enquiry — Pilates Hub</h2>
    <p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:13px">Received: ${data.timestamp || ''}</p>
  </div>
  <div style="border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;padding:24px 28px">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:11px 14px;background:#f7f7f7;font-weight:700;width:150px;border-bottom:1px solid #eee;color:#555">👤 Name</td>
          <td style="padding:11px 14px;border-bottom:1px solid #eee;font-weight:600">${data.name || '—'}</td></tr>
      <tr><td style="padding:11px 14px;font-weight:700;border-bottom:1px solid #eee;color:#555">📞 Phone</td>
          <td style="padding:11px 14px;border-bottom:1px solid #eee">${data.phone || '—'}</td></tr>
      <tr><td style="padding:11px 14px;background:#f7f7f7;font-weight:700;border-bottom:1px solid #eee;color:#555">📧 Email</td>
          <td style="padding:11px 14px;border-bottom:1px solid #eee">${data.email || '—'}</td></tr>
      <tr><td style="padding:11px 14px;font-weight:700;border-bottom:1px solid #eee;color:#555">🏙️ City</td>
          <td style="padding:11px 14px;border-bottom:1px solid #eee">${data.city || '—'}</td></tr>
      <tr><td style="padding:11px 14px;background:#f7f7f7;font-weight:700;border-bottom:1px solid #eee;color:#555">🏋️ Equipment</td>
          <td style="padding:11px 14px;border-bottom:1px solid #eee">${data.interest || '—'}</td></tr>
      <tr><td style="padding:11px 14px;font-weight:700;vertical-align:top;color:#555">💬 Message</td>
          <td style="padding:11px 14px;color:#333">${data.message || '—'}</td></tr>
    </table>
    <div style="margin-top:20px;padding:14px 18px;background:#fff8e1;border-left:4px solid #D4A017;border-radius:4px;font-size:13px;color:#666">
      💡 Respond within <strong>24 hours</strong> for best chance of conversion.
    </div>
  </div>
  <p style="text-align:center;font-size:11px;color:#aaa;margin-top:16px">Pilates Hub — pilateshub.in</p>
</div>`;

  const plainBody =
    'New Enquiry – Pilates Hub\n\n'
    + 'Name      : ' + (data.name      || '—') + '\n'
    + 'Phone     : ' + (data.phone     || '—') + '\n'
    + 'Email     : ' + (data.email     || '—') + '\n'
    + 'City      : ' + (data.city      || '—') + '\n'
    + 'Equipment : ' + (data.interest  || '—') + '\n'
    + 'Message   : ' + (data.message   || '—') + '\n'
    + 'Time      : ' + (data.timestamp || '—');

  MailApp.sendEmail({ to: OWNER_EMAIL, subject, htmlBody, body: plainBody });

  // Send to second recipient only if set and not placeholder
  if (SECOND_EMAIL && SECOND_EMAIL.includes('@') && SECOND_EMAIL !== OWNER_EMAIL) {
    MailApp.sendEmail({ to: SECOND_EMAIL, subject, htmlBody, body: plainBody });
  }
}


// ─────────────────────────────────────────────────────────────
//  Send auto-reply to customer
// ─────────────────────────────────────────────────────────────
function sendAutoReply(data) {
  if (!data.email || !data.email.includes('@')) return;

  const subject = 'Thank you for your enquiry – Pilates Hub';

  const htmlBody = `
<div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;color:#111111">
  <div style="background:#D4A017;padding:24px 28px;border-radius:8px 8px 0 0;text-align:center">
    <h2 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.5px">Pilates Hub</h2>
    <p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:13px">Premium Pilates Equipment — India</p>
  </div>
  <div style="border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;padding:32px 28px">
    <p style="font-size:16px;font-weight:600;margin:0 0 8px">Dear ${data.name || 'there'},</p>
    <p style="font-size:14px;color:#444;line-height:1.8;margin:0 0 20px">
      Thank you for reaching out to <strong>Pilates Hub</strong>! We have received your enquiry
      regarding <strong>${data.interest || 'our equipment'}</strong> and our team will get back
      to you within <strong>24 hours</strong>.
    </p>
    <div style="background:#f8f8f8;border-radius:8px;padding:20px 22px;margin-bottom:24px">
      <p style="margin:0 0 12px;font-weight:700;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.08em">Your Enquiry Summary</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr><td style="padding:6px 0;color:#888;width:110px">Equipment</td><td style="padding:6px 0;font-weight:600">${data.interest || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#888">City</td><td style="padding:6px 0">${data.city || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#888">Message</td><td style="padding:6px 0">${data.message || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#888">Submitted</td><td style="padding:6px 0">${data.timestamp || ''}</td></tr>
      </table>
    </div>
    <p style="font-size:14px;color:#444;line-height:1.8;margin:0 0 24px">
      In the meantime, feel free to browse our full range at
      <a href="https://pilateshub.in" style="color:#D4A017;font-weight:600">pilateshub.in</a>
      or reach us directly:
    </p>
    <div style="margin-bottom:28px">
      <a href="tel:+919738115407" style="display:inline-block;padding:11px 22px;background:#D4A017;color:#fff;border-radius:50px;font-size:13px;font-weight:600;text-decoration:none;margin-right:10px">📞 Call Us</a>
      <a href="https://wa.me/919738115407?text=Hi%2C%20I%20submitted%20an%20enquiry%20on%20your%20website" style="display:inline-block;padding:11px 22px;background:#25D366;color:#fff;border-radius:50px;font-size:13px;font-weight:600;text-decoration:none">💬 WhatsApp</a>
    </div>
    <p style="font-size:14px;color:#444;margin:0">
      Warm regards,<br>
      <strong>The Pilates Hub Team</strong><br>
      <span style="color:#888;font-size:13px">+91 97381 15407 &nbsp;|&nbsp; info@pilateshub.in &nbsp;|&nbsp; pilateshub.in</span>
    </p>
  </div>
  <p style="text-align:center;font-size:11px;color:#bbb;margin-top:16px">You're receiving this because you submitted an enquiry on pilateshub.in</p>
</div>`;

  MailApp.sendEmail({
    to: data.email,
    subject,
    htmlBody,
    body:
      'Dear ' + (data.name || 'there') + ',\n\n'
      + 'Thank you for contacting Pilates Hub!\n\n'
      + 'We have received your enquiry for ' + (data.interest || 'our equipment') + '.\n'
      + 'Our team will get back to you within 24 hours.\n\n'
      + 'Phone   : +91 97381 15407\n'
      + 'Email   : info@pilateshub.in\n'
      + 'Website : pilateshub.in\n\n'
      + 'Warm regards,\nThe Pilates Hub Team'
  });
}


// ─────────────────────────────────────────────────────────────
//  TEST FUNCTIONS — run these from the Apps Script editor
// ─────────────────────────────────────────────────────────────
function testOwnerEmail() {
  sendOwnerNotification(makeDummyData());
  Logger.log('✅ Owner email sent');
}

function testAutoReply() {
  const d = makeDummyData();
  d.email = OWNER_EMAIL; // sends test reply to yourself
  sendAutoReply(d);
  Logger.log('✅ Auto-reply sent to ' + d.email);
}

function testSaveToSheet() {
  saveToSheet(makeDummyData());
  Logger.log('✅ Row saved to sheet');
}

function makeDummyData() {
  return {
    timestamp : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    name      : 'Test Customer',
    phone     : '9876543210',
    email     : 'test@example.com',
    interest  : 'Reformer',
    city      : 'Bangalore',
    message   : 'This is a test enquiry.'
  };
}
