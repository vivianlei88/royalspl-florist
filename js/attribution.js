// ===== 全站首跳來源歸因 =====
// 記住客人最初從哪個渠道進入網站（首跳落地頁、外部引薦、UTM、廣告點擊 ID），
// 下單時一併寫入訂單，方便後台查詢每筆訂單的獲客來源。
(function () {
  var KEY = 'royalspl_attribution';

  function qs(name) {
    try {
      var m = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
      return m ? decodeURIComponent(m[1].replace(/\+/g, '%20')) : '';
    } catch (e) { return ''; }
  }

  function hostOf(url) {
    if (!url) return '';
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
  }

  function isSelfHost(h) {
    return !!h && h.indexOf('royalspl.shop') !== -1;
  }

  function readStore() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }

  function writeStore(obj) {
    try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) {}
  }

  function capture() {
    var prev = readStore();
    var cur = {
      utm_source: qs('utm_source'),
      utm_medium: qs('utm_medium'),
      utm_campaign: qs('utm_campaign'),
      gclid: qs('gclid'),
      fbclid: qs('fbclid')
    };
    var ref = document.referrer || '';
    var refHost = hostOf(ref);

    // 首跳：固化落地頁與外部引薦；後續站內訪問不覆蓋這兩項
    if (!prev.landing_page) {
      prev.landing_page = window.location.href;
      prev.referrer = (!isSelfHost(refHost) && ref) ? ref : '';
      prev.first_visit_at = new Date().toISOString();
    }

    // 廣告點擊參數：當前 URL 帶上時以最新點擊為準
    if (cur.utm_source) prev.utm_source = cur.utm_source;
    if (cur.utm_medium) prev.utm_medium = cur.utm_medium;
    if (cur.utm_campaign) prev.utm_campaign = cur.utm_campaign;
    if (cur.gclid) prev.gclid = cur.gclid;
    if (cur.fbclid) prev.fbclid = cur.fbclid;

    writeStore(prev);
    return prev;
  }

  function classify(a) {
    if (a.gclid) return 'Google 廣告';
    if (a.fbclid) return 'Facebook / Instagram 廣告';
    if (a.utm_source) {
      var label = a.utm_source;
      if (a.utm_medium) label += ' / ' + a.utm_medium;
      return label;
    }
    var h = hostOf(a.referrer);
    if (!h) return '直接訪問 / 未知';
    if (/google\./.test(h)) return 'Google 自然搜尋';
    if (/(facebook\.com|fb\.com|instagram\.com)$/.test(h)) return '社交平台';
    return '引薦：' + h;
  }

  // 供結帳頁下單時讀取，直接對應 orders 表來源欄位
  function getAttribution() {
    var a = readStore();
    return {
      traffic_source: classify(a),
      utm_source: a.utm_source || '',
      utm_medium: a.utm_medium || '',
      utm_campaign: a.utm_campaign || '',
      referrer: a.referrer || '',
      landing_page: a.landing_page || '',
      gclid: a.gclid || '',
      fbclid: a.fbclid || ''
    };
  }

  window.RoyalSplAttribution = { get: getAttribution };
  capture();
})();
