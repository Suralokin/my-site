/* ===== 3D EARTH GLOBE — PIXEL SPHERE ===== */
(function() {
  var canvas = document.getElementById('globeCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var S = canvas.width;
  var R = Math.round(S * 0.375);
  var cx = S / 2, cy = S / 2;

  var rotY = 0;
  var dragging = false, lastX;
  var autoRotate = true;
  var time = 0;

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
  texImg.src = 'images/earth-texture.jpg';

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
    {lat:0,lng:-30,name:'Атлантический',sz:10},
    {lat:0,lng:170,name:'Тихий',sz:10},
    {lat:-25,lng:70,name:'Индийский',sz:10},
    {lat:78,lng:0,name:'Сев. Ледовитый',sz:9},
    {lat:-60,lng:0,name:'Южный',sz:9},
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

  /* ===== RENDER TEXTURED SPHERE ===== */
  function renderSphere() {
    if (!texReady) {
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = '#061428';
      ctx.fill();
      return;
    }

    var imgData = ctx.createImageData(S, S);
    var px = imgData.data;
    var R2 = R * R;
    var cosR = Math.cos(rotY);
    var sinR = Math.sin(rotY);
    var invR = 1 / R;

    for (var y = 0; y < S; y++) {
      var dy = y - cy;
      var dy2 = dy * dy;
      for (var x = 0; x < S; x++) {
        var dx = x - cx;
        var d2 = dx * dx + dy2;
        if (d2 > R2) continue;

        var dz = Math.sqrt(R2 - d2);
        var nx = dx * invR;
        var ny = dy * invR;
        var nz = dz * invR;

        /* Inverse rotate around Y */
        var wx = nx * cosR + nz * sinR;
        var wy = ny;
        var wz = -nx * sinR + nz * cosR;

        /* Spherical to lat/lng */
        var lat = Math.asin(wy) * 57.29577951308232;
        var lng = Math.atan2(wx, wz) * 57.29577951308232;

        /* Texture UV */
        var u = (lng + 180) * 0.00277777777778 * texW;
        u = u - Math.floor(u);
        var v = (90 - lat) * 0.00555555555556 * texH;
        if (v < 0) v = 0;
        if (v >= texH) v = texH - 1;
        var ti = (~~v * texW + ~~(u * texW)) * 4;
        if (ti < 0 || ti + 2 >= texData.length) continue;

        var tr = texData[ti], tg = texData[ti+1], tb = texData[ti+2];

        /* Diffuse */
        var diff = nz * 0.55 + 0.45;

        /* Fresnel */
        var f = 1 - nz;
        f = f * f * 0.2;

        /* Specular */
        var spec = Math.pow(nz, 32) * 0.15;

        var idx = (y * S + x) * 4;
        px[idx]     = Math.min(255, tr * diff + spec * 255 + f * 20) | 0;
        px[idx + 1] = Math.min(255, tg * diff + spec * 255 + f * 55) | 0;
        px[idx + 2] = Math.min(255, tb * diff + spec * 200 + f * 90) | 0;
        px[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  /* ===== PROJECT ===== */
  function project(lat, lng) {
    var phi = lat * 0.01745329251994;
    var theta = (lng + 180) * 0.01745329251994;
    var sx = -Math.cos(phi) * Math.cos(theta);
    var sy = Math.sin(phi);
    var sz = Math.cos(phi) * Math.sin(theta);
    var x1 = sx * Math.cos(rotY) + sz * Math.sin(rotY);
    var z1 = -sx * Math.sin(rotY) + sz * Math.cos(rotY);
    if (z1 < 0) return null;
    return { x: cx + x1 * R, y: cy - sy * R };
  }

  /* ===== FLAG ===== */
  function drawFlag(x, y, code) {
    var cols = flagColors[code] || ['#333','#666','#999'];
    var w = 18, h = 12, lx = x - w/2, ly = y - h/2;
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
      drawFlag(p.x, p.y - 10, c.code);
      ctx.font = '700 8px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.lineWidth = 3;
      ctx.strokeText(c.name, p.x, p.y + 2);
      ctx.fillStyle = '#fff';
      ctx.fillText(c.name, p.x, p.y + 2);
    }
  }

  /* ===== ATMOSPHERE ===== */
  function drawAtmosphere() {
    var g = ctx.createRadialGradient(cx, cy, R - 1, cx, cy, R + 18);
    g.addColorStop(0, 'rgba(66,165,245,0)');
    g.addColorStop(0.8, 'rgba(0,229,255,0.05)');
    g.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.beginPath(); ctx.arc(cx, cy, R + 18, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();

    var p = Math.sin(time * 0.8) * 0.02 + 0.035;
    var g2 = ctx.createRadialGradient(cx, cy, R + 2, cx, cy, R + 35);
    g2.addColorStop(0, 'rgba(100,181,246,' + p + ')');
    g2.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.beginPath(); ctx.arc(cx, cy, R + 35, 0, Math.PI * 2);
    ctx.fillStyle = g2; ctx.fill();
  }

  /* ===== BORDER ===== */
  function drawBorder() {
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(66,165,245,0.12)'; ctx.lineWidth = 1;
    ctx.stroke();
  }

  /* ===== LOOP ===== */
  function render() {
    ctx.clearRect(0, 0, S, S);
    time += 0.016;
    if (autoRotate && !dragging) rotY += 0.00015;
    if (rotY > 6.28318) rotY -= 6.28318;
    if (rotY < 0) rotY += 6.28318;

    renderSphere();
    drawLabels();
    drawAtmosphere();
    drawBorder();
    requestAnimationFrame(render);
  }

  /* ===== INPUT ===== */
  canvas.addEventListener('mousedown', function(e) {
    dragging = true; lastX = e.clientX; autoRotate = false;
  });
  window.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    rotY += (e.clientX - lastX) * 0.006;
    lastX = e.clientX;
  });
  window.addEventListener('mouseup', function() {
    if (dragging) { dragging = false; setTimeout(function() { autoRotate = true; }, 2000); }
  });
  canvas.addEventListener('touchstart', function(e) {
    e.preventDefault(); dragging = true;
    lastX = e.touches[0].clientX; autoRotate = false;
  }, { passive: false });
  canvas.addEventListener('touchmove', function(e) {
    e.preventDefault(); if (!dragging) return;
    rotY += (e.touches[0].clientX - lastX) * 0.006;
    lastX = e.touches[0].clientX;
  }, { passive: false });
  canvas.addEventListener('touchend', function() {
    dragging = false; setTimeout(function() { autoRotate = true; }, 2000);
  });

  render();
})();
