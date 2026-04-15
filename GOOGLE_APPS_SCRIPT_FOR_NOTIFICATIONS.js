/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         PILATES HUB — Google Apps Script                    ║
 * ║  ✅ Auto-saves enquiries to Google Sheet                    ║
 * ║  ✅ Sends Email notification to owner (+ 2nd recipient)     ║
 * ║  ✅ Sends Auto-reply email to customer                      ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ── CHANGE THESE VALUES ────────────────────────────────────────
const OWNER_EMAIL       = 'giri.kumar91221@gmail.com'; // Primary email
const SECOND_EMAIL      = 'SECOND_EMAIL@gmail.com';    // ← Add 2nd recipient here
const SHEET_NAME        = 'Pilates Hub Enquiries';
// ──────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────
//  🧪 TEST OWNER EMAIL
// ─────────────────────────────────────────────────────────────
function testOwnerEmail() {
  const testData = makeDummyData();
  try {
    sendOwnerNotification(testData);
    Logger.log('✅ Owner email sent to ' + OWNER_EMAIL + ' and ' + SECOND_EMAIL);
  } catch (err) {
    Logger.log('❌ Failed: ' + err.message);
  }
}

// ─────────────────────────────────────────────────────────────
//  🧪 TEST AUTO-REPLY (sends to the dummy test email)
// ─────────────────────────────────────────────────────────────
function testAutoReply() {
  const testData = makeDummyData();
  // Change this to your own email to receive the test auto-reply
  testData.email = OWNER_EMAIL;
  try {
    sendAutoReply(testData);
    Logger.log('✅ Auto-reply sent to ' + testData.email);
  } catch (err) {
    Logger.log('❌ Failed: ' + err.message);
  }
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


// ─────────────────────────────────────────────────────────────
//  Receives POST from website form
// ─────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    // Support both FormData (e.parameter) and JSON (e.postData)
    let data = {};
    if (e.parameter && Object.keys(e.parameter).length > 0) {
      data = e.parameter;  // FormData from website form
    } else if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);  // JSON fallback
    }
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

function doGet() {
  return ContentService.createTextOutput('✅ Pilates Hub Script is live!');
}


// ─────────────────────────────────────────────────────────────
//  Save to Google Sheet
// ─────────────────────────────────────────────────────────────
function saveToSheet(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const headers = ['Timestamp','Name','Phone','Email','Equipment Interest','City','Message'];
    sheet.appendRow(headers);
    const hr = sheet.getRange(1, 1, 1, headers.length);
    hr.setFontWeight('bold');
    hr.setBackground('#D4A017');
    hr.setFontColor('#ffffff');
    hr.setFontSize(11);
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(2, 140);
    sheet.setColumnWidth(3, 130);
    sheet.setColumnWidth(4, 180);
    sheet.setColumnWidth(5, 160);
    sheet.setColumnWidth(6, 120);
    sheet.setColumnWidth(7, 260);
  }

  sheet.appendRow([
    data.timestamp || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    data.name      || '',
    data.phone     || '',
    data.email     || '',
    data.interest  || '',
    data.city      || '',
    data.message   || ''
  ]);
}


// ─────────────────────────────────────────────────────────────
//  Send notification to owner + second recipient
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
      <tr><td style="padding:11px 14px;background:#f7f7f7;font-weight:700;border-bottom:1px solid #eee;color:#555">🏋️ Interest</td>
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
    + 'Name     : ' + (data.name     || '—') + '\n'
    + 'Phone    : ' + (data.phone    || '—') + '\n'
    + 'Email    : ' + (data.email    || '—') + '\n'
    + 'City     : ' + (data.city     || '—') + '\n'
    + 'Interest : ' + (data.interest || '—') + '\n'
    + 'Message  : ' + (data.message  || '—') + '\n'
    + 'Time     : ' + (data.timestamp|| '—');

  // Send to primary owner
  MailApp.sendEmail({
    to       : OWNER_EMAIL,
    subject  : subject,
    htmlBody : htmlBody,
    body     : plainBody
  });

  // Send to second recipient (only if email is set)
  if (SECOND_EMAIL && SECOND_EMAIL !== 'SECOND_EMAIL@gmail.com') {
    MailApp.sendEmail({
      to       : SECOND_EMAIL,
      subject  : subject,
      htmlBody : htmlBody,
      body     : plainBody
    });
  }
}


// ─────────────────────────────────────────────────────────────
//  Send auto-reply to customer
// ─────────────────────────────────────────────────────────────
function sendAutoReply(data) {
  const subject = 'Thank you for your enquiry – Pilates Hub';

  const htmlBody = `
<div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;color:#111111">

  <!-- Header -->
  <div style="background:#D4A017;padding:24px 28px;border-radius:8px 8px 0 0;text-align:center">
    <h2 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.5px">
      Pilates Hub
    </h2>
    <p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:13px">
      Premium Pilates Equipment — India
    </p>
  </div>

  <!-- Body -->
  <div style="border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;padding:32px 28px">

    <p style="font-size:16px;font-weight:600;margin:0 0 8px">
      Dear ${data.name || 'there'},
    </p>

    <p style="font-size:14px;color:#444;line-height:1.8;margin:0 0 20px">
      Thank you for reaching out to <strong>Pilates Hub</strong>! We have received your enquiry
      regarding <strong>${data.interest || 'our equipment'}</strong> and our team will get back
      to you within <strong>24 hours</strong>.
    </p>

    <!-- Enquiry Summary -->
    <div style="background:#f8f8f8;border-radius:8px;padding:20px 22px;margin-bottom:24px">
      <p style="margin:0 0 12px;font-weight:700;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.08em">
        Your Enquiry Summary
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr><td style="padding:6px 0;color:#888;width:110px">Equipment</td>
            <td style="padding:6px 0;font-weight:600">${data.interest || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#888">City</td>
            <td style="padding:6px 0">${data.city || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#888">Message</td>
            <td style="padding:6px 0">${data.message || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#888">Submitted</td>
            <td style="padding:6px 0">${data.timestamp || ''}</td></tr>
      </table>
    </div>

    <p style="font-size:14px;color:#444;line-height:1.8;margin:0 0 24px">
      In the meantime, feel free to browse our full range of equipment at
      <a href="https://pilateshub.in" style="color:#D4A017;font-weight:600">pilateshub.in</a>
      or reach us directly:
    </p>

    <!-- Contact -->
    <div style="display:flex;gap:12px;margin-bottom:28px">
      <a href="tel:+919738062630"
         style="display:inline-block;padding:11px 22px;background:#D4A017;color:#fff;border-radius:50px;font-size:13px;font-weight:600;text-decoration:none;margin-right:10px">
        📞 Call Us
      </a>
      <a href="https://wa.me/919738062630?text=Hi%2C%20I%20submitted%20an%20enquiry%20on%20your%20website"
         style="display:inline-block;padding:11px 22px;background:#25D366;color:#fff;border-radius:50px;font-size:13px;font-weight:600;text-decoration:none">
        💬 WhatsApp
      </a>
    </div>

    <p style="font-size:14px;color:#444;margin:0">
      Warm regards,<br>
      <strong>The Pilates Hub Team</strong><br>
      <span style="color:#888;font-size:13px">+91 97380 62630 &nbsp;|&nbsp; info@pilateshub.in &nbsp;|&nbsp; pilateshub.in</span>
    </p>
  </div>

  <p style="text-align:center;font-size:11px;color:#bbb;margin-top:16px">
    You're receiving this because you submitted an enquiry on pilateshub.in
  </p>
</div>`;

  MailApp.sendEmail({
    to      : data.email,
    subject : subject,
    htmlBody: htmlBody,
    body    :
      'Dear ' + (data.name || 'there') + ',\n\n'
      + 'Thank you for contacting Pilates Hub!\n\n'
      + 'We have received your enquiry for ' + (data.interest || 'our equipment') + '.\n'
      + 'Our team will get back to you within 24 hours.\n\n'
      + 'In the meantime, you can reach us at:\n'
      + 'Phone   : +91 97380 62630\n'
      + 'Email   : info@pilateshub.in\n'
      + 'Website : pilateshub.in\n\n'
      + 'Warm regards,\n'
      + 'The Pilates Hub Team'
  });
}
