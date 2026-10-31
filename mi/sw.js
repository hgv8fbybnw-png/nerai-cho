/* 狙い目だけのページ（mi/）の控え係 ― 2026-10-31（決定70。狙い目帳の控え係 ../sw.js を写して、名前と範囲だけ変えた）
 *
 * 開くとき：スマホの中の控えをすぐ出す（速い・電波がなくても開ける）。同時に裏で新しい版を取りにいき、控えを入れかえる。
 * 新しい版が出ていることは、ページ側が version.json（mi/version.json）で気づいて「更新する」を出す。
 * 範囲は /nerai-cho/mi/ だけ（このファイルが mi/ にあるため）。狙い目帳（/nerai-cho/）の控え係とは別のもの。
 * ★ 同じ住所（hgv8fbybnw-png.github.io）に狙い目帳・収支帳・鬣犬などほかのアプリもいる。控えの箱は住所ごとに共有なので、
 *   消すのは自分の箱（neraimi- で始まる名前）だけ。狙い目帳の箱（neraicho- で始まる名前）には手を出さない。
 * ★ 「更新する」はページから cache:'reload' で取りにくる。ここで控えを返すと古い版をまた入れてしまうので、ネットに通す。
 */
var BUILD = '2d25e665e23b';
var CACHE = 'neraimi-v1';
var PAGE = new URL('./', self.registration.scope).href;
var STATIC = ['manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // cache:'reload'：ブラウザが前から持っている古いものを控えに入れないため
      return Promise.all([PAGE].concat(STATIC).map(function (u) {
        return fetch(new Request(u, { cache: 'reload' })).then(function (res) {
          if (res && res.ok) return c.put(u === PAGE ? PAGE : new URL(u, self.registration.scope).href, res);
        }).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (n) { return n.indexOf('neraimi-') === 0 && n !== CACHE ? caches.delete(n) : null; }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (/\/(sw\.js|version\.json)$/.test(url.pathname)) return;   // いつもネットから
  if (req.cache === 'reload' || req.cache === 'no-store' || req.cache === 'no-cache') return;   // 「更新する」など、新しいのがほしいとき

  if (req.mode === 'navigate') {
    var net = fetch(new Request(PAGE, { cache: 'no-cache' })).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        return caches.open(CACHE).then(function (c) { return c.put(PAGE, copy); }).then(function () { return res; });
      }
      return res;
    });
    e.waitUntil(net.catch(function () {}));
    e.respondWith(
      caches.match(PAGE).then(function (hit) {
        return hit || net.catch(function () {
          return new Response('<meta charset="utf-8"><p style="font:16px sans-serif;padding:24px">電波がありません。つながる場所で、もう一度開いてください。</p>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      return hit || fetch(req);
    })
  );
});
