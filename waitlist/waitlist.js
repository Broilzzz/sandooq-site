// Waitlist form. Sends the answers to a Google Apps Script web app that adds a
// row to a Google Sheet (source: tools/waitlist.gs). Sending the same email
// again updates its row, so a retry after a lost reply is harmless.
(function () {
  'use strict';

  // The Apps Script web app URL (Deploy → Web app → URL ending in /exec).
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbwqOKF0aE8yMruHcKOY2NxoF1APn0upfCSXoP5-n9i4xCfRl7VW4sLEh30HSvQQQqBWdQ/exec';

  var PAGE = 'https://broilzzz.github.io/sandooq-site/waitlist/';
  var CONTACT = 'ahilahmedhussain15@gmail.com';

  var form = document.getElementById('waitlist');
  var done = document.getElementById('done');
  var email = document.getElementById('email');
  var emailError = document.getElementById('email-error');
  var formError = document.getElementById('form-error');
  var submit = form.querySelector('.submit');
  var testerRow = document.getElementById('tester-row');
  var iphoneNote = document.getElementById('iphone-note');
  var emailHint = document.getElementById('email-hint');

  // Where the visitor came from (?ref=reel or ?utm_source=whatsapp), so we can
  // tell which posts bring people. Short, lowercase, letters and digits only.
  var params = new URLSearchParams(location.search);
  var ref = (params.get('ref') || params.get('utm_source') || '').toLowerCase()
    .replace(/[^a-z0-9_-]/g, '').slice(0, 32);

  // Early testing is on Android (Play Store) only.
  function onPhone() {
    var iphone = form.elements.phone.value === 'iphone';
    testerRow.hidden = iphone;
    iphoneNote.hidden = !iphone;
    emailHint.hidden = iphone;
    if (iphone) form.elements.tester.checked = false;
  }
  Array.prototype.forEach.call(form.elements.phone, function (r) {
    r.addEventListener('change', onPhone);
  });
  onPhone();

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function emailOk() {
    var ok = EMAIL_RE.test(email.value.trim());
    emailError.hidden = ok;
    email.setAttribute('aria-invalid', ok ? 'false' : 'true');
    return ok;
  }
  email.addEventListener('blur', function () { if (email.value) emailOk(); });
  email.addEventListener('input', function () { if (!emailError.hidden) emailOk(); });

  function showError(text) {
    formError.textContent = '';
    formError.append(text + ' If it keeps failing, email ');
    var a = document.createElement('a');
    a.href = 'mailto:' + CONTACT + '?subject=' + encodeURIComponent('Add me to the Sandooq waitlist');
    a.textContent = CONTACT;
    formError.append(a, '.');
    formError.hidden = false;
  }

  function busy(on) {
    submit.disabled = on;
    submit.classList.toggle('busy', on);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    formError.hidden = true;
    if (!emailOk()) { email.focus(); return; }

    // Honeypot filled: pretend it worked, send nothing.
    if (form.elements.website.value) { finish(false); return; }

    if (!ENDPOINT) { showError('The waitlist isn\'t open yet.'); return; }

    var docs = Array.prototype.filter.call(form.elements.docs, function (c) { return c.checked; })
      .map(function (c) { return c.value; });
    var data = {
      email: email.value.trim(),
      name: form.elements.name.value.trim(),
      phone: form.elements.phone.value,
      country: form.elements.country.value,
      language: form.elements.language.value,
      docs: docs,
      tester: form.elements.tester.checked,
      ref: ref,
      website: form.elements.website.value
    };

    busy(true);
    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);

    // text/plain keeps this a "simple" request, so the browser doesn't send a
    // CORS preflight, which Apps Script can't answer.
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data),
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res && res.ok) finish(data.tester);
        else if (res && res.error === 'email') { emailError.hidden = false; email.focus(); }
        else showError('Something went wrong on our side. Please try again.');
      })
      .catch(function () {
        showError('Couldn\'t reach the waitlist. Check your connection and try again.');
      })
      .then(function () { clearTimeout(timer); busy(false); });
  });

  function finish(tester) {
    if (tester) {
      document.getElementById('done-text').textContent =
        'We\'ll email you an invite to the early test on Google Play, and again on launch day.';
    }
    form.hidden = true;
    done.hidden = false;
    done.focus();
    window.scrollTo(0, 0);
  }

  // Sharing after joining.
  var shareUrl = PAGE + '?ref=share';
  var shareText = 'Sandooq keeps the family\'s passports, IDs and papers locked on your phone and finds them by voice. Join the waitlist: ' + shareUrl;
  document.getElementById('share-wa').href = 'https://wa.me/?text=' + encodeURIComponent(shareText);
  var copyBtn = document.getElementById('share-copy');
  copyBtn.addEventListener('click', function () {
    var copied = function () {
      copyBtn.textContent = 'Copied';
      setTimeout(function () { copyBtn.textContent = 'Copy link'; }, 2000);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(copied, function () { prompt('Copy this link:', shareUrl); });
    } else {
      prompt('Copy this link:', shareUrl);
    }
  });
})();
