/* ===== 3D EARTH GLOBE ===== */
(function() {
  var canvas = document.getElementById('globeCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var S = 400;
  canvas.width = S;
  canvas.height = S;
  canvas.style.width = S + 'px';
  canvas.style.height = S + 'px';

  var cx = S / 2, cy = S / 2, R = 150;
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
    texW = c.width;
    texH = c.height;
    texData = tc.getImageData(0, 0, texW, texH).data;
    texReady = true;
  };
  texImg.src = 'images/earth-texture.jpg';

  /* Light direction */
  var lx = 0.35, ly = -0.25, lz = 0.9;
  var lLen = Math.sqrt(lx*lx + ly*ly + lz*lz);
  lx /= lLen; ly /= lLen; lz /= lLen;

  /* ===== COUNTRY LABELS ===== */
  var countryLabels = [
    {lat:60,lng:40,name:'Россия',flag:'🇷🇺'},
    {lat:35,lng:105,name:'Китай',flag:'🇨🇳'},
    {lat:22,lng:78,name:'Индия',flag:'🇮🇳'},
    {lat:38,lng:-97,name:'США',flag:'🇺🇸'},
    {lat:-15,lng:-50,name:'Бразилия',flag:'🇧🇷'},
    {lat:-25,lng:134,name:'Австралия',flag:'🇦🇺'},
    {lat:36,lng:138,name:'Япония',flag:'🇯🇵'},
    {lat:48,lng:-100,name:'Канада',flag:'🇨🇦'},
    {lat:52,lng:-1,name:'Англия',flag:'🇬🇧'},
    {lat:10,lng:8,name:'Нигерия',flag:'🇳🇬'},
  ];

  var waterBodies = [
    {lat:0,lng:-30,name:'Атлантический',size:'large'},
    {lat:0,lng:170,name:'Тихий',size:'large'},
    {lat:-25,lng:70,name:'Индийский',size:'large'},
    {lat:78,lng:0,name:'Сев. Ледовитый',size:'large'},
    {lat:-60,lng:0,name:'Южный',size:'large'},
    {lat:32,lng:-5,name:'Средиземное м.',size:'medium'},
  ];

  /* ===== RENDER TEXTURED SPHERE ===== */
  function renderSphere() {
    if (!texReady) {
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = '#0a3050';
      ctx.fill();
      return;
    }

    var imgData = ctx.getImageData(0, 0, S, S);
    var px = imgData.data;
    var R2 = R * R;

    for (var y = 0; y < S; y++) {
      for (var x = 0; x < S; x++) {
        var dx = x - cx, dy = y - cy;
        var d2 = dx * dx + dy * dy;
        if (d2 > R2) continue;

        var dz = Math.sqrt(R2 - d2);
        var nx = dx / R, ny = dy / R, nz = dz / R;

        /* Inverse rotation: only Y axis */
        var wx = nx * Math.cos(rotY) + nz * Math.sin(rotY);
        var wy = ny;
        var wz = -nx * Math.sin(rotY) + nz * Math.cos(rotY);

        /* Spherical coords */
        var lat = Math.asin(wy) * (180 / Math.PI);
        var lng = Math.atan2(wx, wz) * (180 / Math.PI);

        /* Texture UV */
        var u = ((lng + 180) / 360) * texW;
        u = u - Math.floor(u / texW) * texW;
        var v = ((90 - lat) / 180) * texH;
        if (v < 0) v = 0; if (v >= texH) v = texH - 1;
        var ti = (Math.floor(v) * texW + Math.floor(u)) * 4;
        if (ti < 0 || ti + 2 >= texData.length) continue;

        var tr = texData[ti], tg = texData[ti+1], tb = texData[ti+2];

        /* Diffuse lighting */
        var diff = Math.max(0, -(nx * lx + ny * ly + nz * lz));
        diff = diff * 0.55 + 0.45;

        /* Fresnel rim */
        var fresnel = 1 - nz;
        fresnel = fresnel * fresnel * 0.2;

        /* Specular highlight */
        var hx = -lx, hy = -ly, hz = 1 - lz;
        var hL = Math.sqrt(hx*hx + hy*hy + hz*hz);
        if (hL > 0) { hx /= hL; hy /= hL; hz /= hL; }
        var spec = Math.pow(Math.max(0, -(nx*hx + ny*hy + nz*hz)), 32) * 0.2;

        var r = Math.min(255, tr * diff + spec * 255 + fresnel * 20) | 0;
        var g = Math.min(255, tg * diff + spec * 255 + fresnel * 55) | 0;
        var b = Math.min(255, tb * diff + spec * 200 + fresnel * 90) | 0;

        var idx = (y * S + x) * 4;
        px[idx] = r;
        px[idx + 1] = g;
        px[idx + 2] = b;
        px[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  /* ===== ATMOSPHERE ===== */
  function drawAtmosphere() {
    var grd = ctx.createRadialGradient(cx, cy, R - 2, cx, cy, R + 20);
    grd.addColorStop(0, 'rgba(66,165,245,0)');
    grd.addColorStop(0.8, 'rgba(0,229,255,0.06)');
    grd.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, R + 20, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    var p = Math.sin(time * 0.8) * 0.02 + 0.04;
    var g2 = ctx.createRadialGradient(cx, cy, R + 2, cx, cy, R + 40);
    g2.addColorStop(0, 'rgba(100,181,246,' + p + ')');
    g2.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, R + 40, 0, Math.PI * 2);
    ctx.fillStyle = g2;
    ctx.fill();
  }

  /* ===== BORDER ===== */
  function drawBorder() {
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(66,165,245,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /* ===== PROJECT ===== */
  function project(lat, lng) {
    var phi = (90 - lat) * Math.PI / 180;
    var theta = (lng + 180) * Math.PI / 180;
    var sx = -Math.sin(phi) * Math.cos(theta);
    var sy = Math.cos(phi);
    var sz = Math.sin(phi) * Math.sin(theta);
    var x1 = sx * Math.cos(rotY) + sz * Math.sin(rotY);
    var z1 = -sx * Math.sin(rotY) + sz * Math.cos(rotY);
    if (z1 < 0) return null;
    return { x: cx + x1 * R, y: cy + sy * R };
  }

  /* ===== LABELS ===== */
  function drawLabels() {
    for (var i = 0; i < waterBodies.length; i++) {
      var w = waterBodies[i];
      var p = project(w.lat, w.lng);
      if (!p) continue;
      var fs = w.size === 'large' ? 9 : 7;
      ctx.font = '700 ' + fs + 'px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0,10,30,0.9)';
      ctx.lineWidth = 3;
      ctx.strokeText(w.name, p.x, p.y);
      ctx.fillStyle = 'rgba(80,170,255,0.7)';
      ctx.fillText(w.name, p.x, p.y);
    }
    for (var j = 0; j < countryLabels.length; j++) {
      var c = countryLabels[j];
      var p = project(c.lat, c.lng);
      if (!p) continue;
      ctx.font = '14px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.flag, p.x, p.y - 10);
      ctx.font = '700 8px "Segoe UI", system-ui, sans-serif';
      ctx.strokeStyle = 'rgba(0,0,0,0.9)';
      ctx.lineWidth = 3;
      ctx.strokeText(c.name, p.x, p.y + 2);
      ctx.fillStyle = '#fff';
      ctx.fillText(c.name, p.x, p.y + 2);
    }
  }

  /* ===== LOOP ===== */
  function render() {
    ctx.clearRect(0, 0, S, S);
    time += 0.016;
    if (autoRotate && !dragging) rotY += 0.004;
    if (rotY > Math.PI * 2) rotY -= Math.PI * 2;
    if (rotY < 0) rotY += Math.PI * 2;

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
