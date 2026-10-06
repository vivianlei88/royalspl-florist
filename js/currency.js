// ===== 全站幣種方案 C：IP 默認 + 手動切換 + 記住選擇 =====
// 內部金額一律保持港幣（HK$）計算，僅顯示層按當前幣種換算；固定匯率 7.8
(function () {
  var FX = 7.8;
  var KEY = 'royalspl_currency'; // 'hkd' | 'usd'
  var IP_KEY = 'royalspl_currency_ip'; // 已按 IP 決定過的國家碼快取

  function current() {
    var s = null;
    try { s = localStorage.getItem(KEY); } catch (e) {}
    return (s === 'usd' || s === 'hkd') ? s : 'hkd';
  }

  // 顯示金額字串（輸入港幣數字 → 當前幣種）
  window.siteMoney = function (hkd) {
    var n = Number(hkd) || 0;
    return current() === 'usd' ? 'US$' + Math.round(n / FX) : 'HK$' + n;
  };

  // 純金額數字（用於需要數字的場合，如免運門檻比較僅供顯示）
  window.siteMoneyNum = function (hkd) {
    var n = Number(hkd) || 0;
    return current() === 'usd' ? Math.round(n / FX) : n;
  };

  // 當前是否美金模式
  window.siteIsUSD = function () { return current() === 'usd'; };

  window.siteSetCurrency = function (c) {
    if (c !== 'usd' && c !== 'hkd') return;
    try { localStorage.setItem(KEY, c); } catch (e) {}
    window.location.reload();
  };

  // IP 決定默認幣種：僅當用戶從未手動選過時生效；香港/澳門 → 港幣，其他 → 美金
  window.siteInitCurrency = function () {
    var manual = null;
    try { manual = localStorage.getItem(KEY); } catch (e) {}
    if (manual) return;
    var ipCached = null;
    try { ipCached = localStorage.getItem(IP_KEY); } catch (e) {}
    function apply(country) {
      // 香港/澳門/中國大陸/台灣 → 港幣；其他地區 → 美金
      var isHK = country === 'HK' || country === 'MO' || country === 'CN' || country === 'TW';
      try {
        localStorage.setItem(IP_KEY, country || '');
        localStorage.setItem(KEY, isHK ? 'hkd' : 'usd');
      } catch (e) {}
      window.location.reload();
    }
    if (ipCached) {
      // 已按 IP 決定過並寫入幣種 → 直接用，不再重載頁面
      var k = null;
      try { k = localStorage.getItem(KEY); } catch (e) {}
      if (k === 'hkd' || k === 'usd') return;
      apply(ipCached);
      return;
    }
    try {
      fetch('/api/country', { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (d) { apply((d && d.country) || ''); })
        .catch(function () { try { localStorage.setItem(KEY, 'hkd'); } catch (e) {} });
    } catch (e) {}
  };

  // 渲染頁頭幣種切換按鈕（掛到指定容器；容器缺省自動找）
  window.siteRenderCurrencyBtn = function (container) {
    var host = container || document;
    var wrap = host.querySelector('.site-currency-switch');
    if (!wrap) return;
    var cur = current();
    wrap.innerHTML =
      '<a href="javascript:void(0)" onclick="siteSetCurrency(\'hkd\')" style="text-decoration:none;font-size:15px;font-weight:' + (cur === 'hkd' ? '800' : '400') + ';color:' + (cur === 'hkd' ? '#1A1A1A' : '#8A8A8A') + ';padding:2px 6px;">HK$</a>' +
      '<span style="color:#BDBDBD;">|</span>' +
      '<a href="javascript:void(0)" onclick="siteSetCurrency(\'usd\')" style="text-decoration:none;font-size:15px;font-weight:' + (cur === 'usd' ? '800' : '400') + ';color:' + (cur === 'usd' ? '#1A1A1A' : '#8A8A8A') + ';padding:2px 6px;">US$</a>';
  };
})();
