/* ===== 3D EARTH GLOBE — PIXEL SPHERE (PERFORMANCE-OPTIMIZED) =====
   Оптимизация под мобильные устройства БЕЗ уменьшения глобуса:
   1) Геометрия сферы (размер, положение, R) полностью совпадает с
      оригиналом: S = canvas.width, R = 0.375*S, центр в (S/2, S/2).
   2) Тяжёлая «попиксельная» заливка текстуры идёт в отдельный off-screen
      буфер пониженного разрешения, затем результат просто растягивается
      браузером ровно на ту же окружность сферы (cx-R, cy-R, R*2, R*2).
      Это сокращает объём вычислений в 3–4 раза, но размер глобуса и
      положение подписей/флагов/атмосферы не меняются.
   3) Автоповорот прореживается (на телефоне каждый 2-й кадр), пока
      пользователь не крутит глобус — тогда рендер идёт на каждом кадре.
*/
(function() {
  var canvas = document.getElementById('globeCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  /* Размер сферы = внутренний битмап canvas (canvas.width из HTML = 420).
     CSS лишь масштабирует отображение; рисуем всегда в координатах битмапа,
     поэтому глобус не меняет размер и всё чётко выравнивается. */
  var S = canvas.width;
  var R = Math.round(S * 0.375);
  var cx = S / 2, cy = S / 2;

  /* Коэффициент понижения РАЗРЕШЕНИЯ буфера сферы (не размера!).
     На телефоне сильнее режем, чтобы снизить нагрузку на CPU. */
  var isMobile = window.matchMedia && window.matchMedia('(max-width: 640px)').matches;
  var SCALE = isMobile ? 0.55 : 0.78;

  var rotY = 0.3, rotX = -0.25;
  var dragging = false, lastX, lastY;
  var autoRotate = true;
  var time = 0;
  var touchStartX = 0, touchStartY = 0, touchIsDrag = false, touchLocked = false;

  /* ==== off-screen буфер сферы (пониженное разрешение) ==== */
  var g = document.createElement('canvas');
  var gB = Math.max(2, Math.round(S * SCALE));
  g.width = gB; g.height = gB;
  var gctx = g.getContext('2d');
  var gR = Math.round(gB * 0.375);
  var gcx = gB / 2, gcy = gB / 2;

  var texImg = new Image();
  texImg.crossOrigin = 'anonymous';
  var texReady = false, texData = null, texW = 0, texH = 0;
  texImg.onload = function() {
    var c = document.createElement('canvas');
    c.width = texImg.naturalWidth;
    c.height = texImg.naturalHeight;
    var tc = c.getContext('2d');
    tc.drawImage(texImg, 0, 0);
    texW = c.width; texH = c.height;
    texData = tc.getImageData(0, 0, texW, texH).data;
    texReady = true;
  };
  texImg.src = 'images/planet-texture.jpg';

  var countryLabels = [
    {lat:60,lng:40,name:'Россия',code:'RU'},
    {lat:35,lng:105,name:'Китай',code:'CN'},
    {lat:22,lng:78,name:'Индия',code:'IN'},
    {lat:38,lng:-97,name:'США',code:'US'},
    {lat:-15,lng:-50,name:'Бразилия',code:'BR'},
    {lat:-25,lng:134,name:'Австралия',code:'AU'},
    {lat:36,lng:138,name:'Япония',code:'JP'},
    {lat:48,lng:-100,name:'Канада',code:'CA'},
    {lat:52,lng:-1,name:'Англия',code:'GB'},
    {lat:10,lng:8,name:'Нигерия',code:'NG'},
  ];

  var waterBodies = [
    {lat:0,lng:-30,name:'Атлантический',sz:12},
    {lat:0,lng:170,name:'Тихий',sz:12},
    {lat:-25,lng:70,name:'Индийский',sz:12},
    {lat:78,lng:0,name:'Сев. Ледовитый',sz:11},
    {lat:-60,lng:0,name:'Южный',sz:11},
  ];

  var flagColors = {
    RU: ['#fff','#0039a6','#d52b1e'],
    CN: ['#de2910','#ffde00','#de2910'],
    IN: ['#ff9933','#fff','#138808'],
    US: ['#b22234','#fff','#3c3b6e'],
    BR: ['#009b3a','#fedf00','#002776'],
    AU: ['#00008b','#fff','#009b3a'],
    JP: ['#fff','#bc002d','#fff'],
    CA: ['#ff0000','#fff','#ff0000'],
    GB: ['#012169','#fff','#c8102e'],
    NG: ['#008751','#fff','#008751'],
  };

  /* ===== INVERSE ROTATE ===== */
  var cosY, sinY, cosX, sinX;
  function updateTrig() {
    cosY = Math.cos(rotY); sinY = Math.sin(rotY);
    cosX = Math.cos(rotX); sinX = Math.sin(rotX);
  }

  function inverseRotate(nx, ny, nz) {
    var y1 = ny * cosX - nz * sinX;
    var z1 = ny * sinX + nz * cosX;
    var x1 = nx * cosY + z1 * sinY;
    var z2 = -nx * sinY + z1 * cosY;
    return { x: x1, y: y1, z: z2 };
  }

  /* ===== RENDER TEXTURED SPHERE =====
     Рисуем сферу в пониженном разрешении (буфер g), затем растягиваем
     результат ровно на окружность (cx-R, cy-R, R*2, R*2) основного
     canvas. Размер и положение глобуса не меняются. */
  function renderSphere() {
    if (!texReady) {
      gctx.beginPath();
      gctx.arc(gcx, gcy, gR, 0, Math.PI * 2);
      gctx.fillStyle = '#061428';
      gctx.fill();
      ctx.drawImage(g, 0, 0, gB, gB, cx - R, cy - R, R * 2, R * 2);
      return;
    }

    updateTrig();
    var imgData = gctx.createImageData(gB, gB);
    var px = imgData.data;
    var R2 = gR * gR;
    var invR = 1 / gR;

    for (var y = 0; y < gB; y++) {
      var dy = y - gcy;
      var dy2 = dy * dy;
      for (var x = 0; x < gB; x++) {
        var dx = x - gcx;
        var d2 = dx * dx + dy2;
        if (d2 > R2) continue;

        var dz = Math.sqrt(R2 - d2);
        var nx = dx * invR;
        var ny = dy * invR;
        var nz = dz * invR;

        var w = inverseRotate(nx, ny, nz);

        var lat = Math.asin(w.y) * 57.29577951308232;
        var lng = Math.atan2(w.x, w.z) * 57.29577951308232;

        var u = ((lng + 180) / 360) * texW;
        u = u - Math.floor(u / texW) * texW;
        var v = ((90 - lat) / 180) * texH;
        if (v < 0) v = 0;
        if (v >= texH) v = texH - 1;
        var ti = (~~v * texW + ~~u) * 4;
        if (ti < 0 || ti + 2 >= texData.length) continue;

        var tr = texData[ti], tg = texData[ti+1], tb = texData[ti+2];

        var diff = nz * 0.55 + 0.45;
        var f = 1 - nz;
        f = f * f * 0.2;
        var spec = Math.pow(nz, 32) * 0.15;

        var idx = (y * gB + x) * 4;
        px[idx]     = Math.min(255, tr * diff + spec * 255 + f * 20) | 0;
        px[idx + 1] = Math.min(255, tg * diff + spec * 255 + f * 55) | 0;
        px[idx + 2] = Math.min(255, tb * diff + spec * 200 + f * 90) | 0;
        px[idx + 3] = 255;
      }
    }
    gctx.putImageData(imgData, 0, 0);

    ctx.drawImage(g, 0, 0, gB, gB, cx - R, cy - R, R * 2, R * 2);
  }

  /* ===== PROJECT ===== */
  function project(lat, lng) {
    var phi = lat * 0.01745329251994;
    var theta = (lng + 180) * 0.01745329251994;
    var sx = -Math.cos(phi) * Math.cos(theta);
    var sy = Math.sin(phi);
    var sz = Math.cos(phi) * Math.sin(theta);

    var y1 = sy * cosX - sz * sinX;
    var z1 = sy * sinX + sz * cosX;
    var x1 = sx * cosY + z1 * sinY;
    var z2 = -sx * sinY + z1 * cosY;

    if (z2 < 0) return null;
    return { x: cx + x1 * R, y: cy - y1 * R };
  }

  /* ===== FLAG ===== */
  function drawFlag(x, y, code) {
    var cols = flagColors[code] || ['#333','#666','#999'];
    var w = 22, h = 14, lx = x - w/2, ly = y - h/2;
    ctx.fillStyle = cols[0]; ctx.fillRect(lx, ly, w, h/3);
    ctx.fillStyle = cols[1]; ctx.fillRect(lx, ly+h/3, w, h/3);
    ctx.fillStyle = cols[2]; ctx.fillRect(lx, ly+2*h/3, w, h/3);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 0.5;
    ctx.strokeRect(lx, ly, w, h);
  }

  /* ===== LABELS ===== */
  function drawLabels() {
    var i, p, c, w;
    for (i = 0; i < waterBodies.length; i++) {
      w = waterBodies[i];
      p = project(w.lat, w.lng);
      if (!p) continue;
      ctx.font = '700 ' + w.sz + 'px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0,10,30,0.9)'; ctx.lineWidth = 3;
      ctx.strokeText(w.name, p.x, p.y);
      ctx.fillStyle = 'rgba(80,170,255,0.7)';
      ctx.fillText(w.name, p.x, p.y);
    }
    for (i = 0; i < countryLabels.length; i++) {
      c = countryLabels[i];
      p = project(c.lat, c.lng);
      if (!p) continue;
      drawFlag(p.x, p.y - 14, c.code);
      ctx.font = '700 11px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.lineWidth = 3;
      ctx.strokeText(c.name, p.x, p.y + 2);
      ctx.fillStyle = '#fff';
      ctx.fillText(c.name, p.x, p.y + 2);
    }
  }

  /* ===== ATMOSPHERE ===== */
  function drawAtmosphere() {
    var a1 = ctx.createRadialGradient(cx, cy, R - 1, cx, cy, R + 18);
    a1.addColorStop(0, 'rgba(66,165,245,0)');
    a1.addColorStop(0.8, 'rgba(0,229,255,0.05)');
    a1.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.beginPath(); ctx.arc(cx, cy, R + 18, 0, Math.PI * 2);
    ctx.fillStyle = a1; ctx.fill();

    var p = Math.sin(time * 0.8) * 0.02 + 0.035;
    var a2 = ctx.createRadialGradient(cx, cy, R + 2, cx, cy, R + 35);
    a2.addColorStop(0, 'rgba(100,181,246,' + p + ')');
    a2.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.beginPath(); ctx.arc(cx, cy, R + 35, 0, Math.PI * 2);
    ctx.fillStyle = a2; ctx.fill();
  }

  /* ===== BORDER ===== */
  function drawBorder() {
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(66,165,245,0.12)'; ctx.lineWidth = 1;
    ctx.stroke();
  }

  /* ===== LOOP (пониженная частота при автоповороте) ===== */
  var frame = 0;
  var frameSkip = isMobile ? 2 : 1;
  function render() {
    frame++;
    time += 0.016;
    if (autoRotate && !dragging) rotY += 0.00015;
    if (rotY > 6.28318) rotY -= 6.28318;
    if (rotY < 0) rotY += 6.28318;

    /* Пока не крутим пальцем/мышью — можно прореживать кадры */
    if (frame % frameSkip === 0) {
      ctx.clearRect(0, 0, S, S);
      renderSphere();
      drawLabels();
      drawAtmosphere();
      drawBorder();
    }
    requestAnimationFrame(render);
  }

  /* ===== MOUSE ===== */
  canvas.addEventListener('mousedown', function(e) {
    dragging = true; lastX = e.clientX; lastY = e.clientY; autoRotate = false; frameSkip = 1;
  });
  window.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    rotY += (e.clientX - lastX) * 0.006;
    rotX += (e.clientY - lastY) * 0.006;
    rotX = Math.max(-1.2, Math.min(1.2, rotX));
    lastX = e.clientX; lastY = e.clientY;
  });
  window.addEventListener('mouseup', function() {
    if (dragging) { dragging = false; frameSkip = isMobile ? 2 : 1; setTimeout(function() { autoRotate = true; }, 2000); }
  });

  /* ===== TOUCH =====
     IMPORTANT: we must NOT block vertical page scrolling.
     We only capture the touch as a globe-drag once the finger has
     clearly moved horizontally. Vertical swipes are left to the browser
     so the page can scroll on phones. */
  canvas.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchIsDrag = false;
    touchLocked = false;
    dragging = true; autoRotate = false; frameSkip = 1;
  }, { passive: true });

  canvas.addEventListener('touchmove', function(e) {
    if (touchLocked) return; // gesture is a page scroll, ignore it
    var mx = e.touches[0].clientX;
    var my = e.touches[0].clientY;
    var dx = mx - touchStartX;
    var dy = my - touchStartY;

    if (!touchIsDrag) {
      // Decide: if finger moved mostly HORIZONTALLY -> this is a globe drag.
      // If it moved mostly VERTICALLY (or too little) -> let the page scroll.
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        touchIsDrag = true;
      } else if (Math.abs(dy) > 12) {
        // Vertical intent -> lock scroll and give the browser control
        touchLocked = true;
        touchIsDrag = false;
        return;
      } else {
        return; // still too early to decide
      }
    }

    e.preventDefault();
    dragging = true;
    autoRotate = false;
    rotY += dx * 0.006;
    rotX += dy * 0.006;
    rotX = Math.max(-1.2, Math.min(1.2, rotX));
    touchStartX = mx;
    touchStartY = my;
  }, { passive: false });

  canvas.addEventListener('touchend', function() {
    if (dragging) { dragging = false; frameSkip = isMobile ? 2 : 1; setTimeout(function() { autoRotate = true; }, 2000); }
  });

  render();
})();
