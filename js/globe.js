/* ===== 3D EARTH GLOBE — TEXTURE MAPPED ===== */
(function() {
  var canvas = document.getElementById('globeCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = 420, H = 420;
  canvas.width = W * 2;
  canvas.height = H * 2;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.scale(2, 2);

  var cx = W / 2, cy = H / 2, R = 155;
  var rotY = 0, rotX = -0.15;
  var dragging = false, lastX, lastY;
  var autoRotate = true, autoSpeed = 0.004;
  var time = 0;

  /* ===== CONTINENTS (lat/lng polygons) ===== */
  var continents = [
    { land: true, pts: [ // Eurasia
      [-10,35],[0,38],[5,42],[10,44],[15,42],[20,40],[25,42],[30,44],[35,46],
      [40,48],[45,50],[50,52],[55,55],[60,57],[65,58],[70,56],[75,54],[80,52],
      [85,48],[90,45],[95,42],[100,38],[105,35],[110,32],[115,30],[120,28],
      [125,30],[128,33],[130,35],[135,38],[140,42],[143,44],[145,46],[143,48],
      [140,50],[135,53],[130,55],[125,57],[120,58],[115,56],[110,54],[105,56],
      [100,58],[95,60],[90,63],[85,66],[80,68],[75,70],[70,71],[65,70],[60,69],
      [55,67],[50,65],[45,62],[40,60],[35,58],[30,56],[25,54],[20,52],[15,50],
      [10,48],[5,46],[0,44],[-5,42],[-10,40]
    ]},
    { land: true, pts: [ // Africa
      [-17,15],[-15,12],[-13,8],[-10,5],[-8,4],[-5,5],[-2,4],[0,5],[3,3],
      [5,2],[8,0],[10,-2],[12,-5],[14,-8],[16,-11],[18,-14],[20,-17],[22,-20],
      [25,-23],[28,-26],[30,-28],[32,-30],[33,-32],[32,-34],[30,-34],[28,-33],
      [26,-32],[24,-30],[22,-28],[20,-26],[18,-23],[16,-20],[14,-17],[12,-14],
      [11,-10],[10,-7],[10,-4],[11,-1],[12,1],[13,4],[14,7],[15,10],[16,13],
      [17,15],[18,18],[19,20],[20,23],[21,25],[22,27],[23,29],[24,31],[26,33],
      [28,34],[30,35],[32,36],[33,37],[32,38],[30,37],[28,36],[25,36],[22,35],
      [20,34],[17,33],[14,32],[11,31],[8,30],[5,28],[2,26],[0,24],[-3,22],
      [-5,20],[-8,18],[-10,17],[-12,16],[-15,15],[-17,15]
    ]},
    { land: true, pts: [ // North America
      [-168,72],[-162,70],[-155,68],[-148,66],[-140,64],[-135,62],[-130,60],
      [-125,58],[-122,56],[-120,54],[-118,52],[-116,50],[-114,48],[-112,46],
      [-110,44],[-108,42],[-106,40],[-104,38],[-102,36],[-100,34],[-98,32],
      [-96,30],[-94,28],[-92,26],[-90,24],[-88,22],[-86,20],[-84,18],[-82,16],
      [-80,14],[-78,12],[-77,10],[-76,8],[-78,8],[-80,10],[-82,12],[-84,14],
      [-86,16],[-88,18],[-90,20],[-92,22],[-94,24],[-96,26],[-98,28],[-100,30],
      [-102,32],[-104,34],[-106,36],[-108,38],[-110,40],[-112,42],[-114,44],
      [-116,46],[-118,48],[-120,50],[-122,52],[-125,54],[-128,56],[-132,58],
      [-136,60],[-140,62],[-145,64],[-150,66],[-155,68],[-160,70],[-165,71]
    ]},
    { land: true, pts: [ // South America
      [-82,12],[-80,10],[-78,8],[-76,6],[-74,4],[-72,2],[-70,0],[-68,-2],
      [-66,-4],[-64,-6],[-62,-8],[-60,-10],[-58,-12],[-56,-14],[-54,-16],
      [-52,-18],[-50,-20],[-48,-22],[-46,-24],[-44,-26],[-43,-28],[-44,-30],
      [-46,-32],[-48,-34],[-50,-36],[-52,-38],[-54,-40],[-56,-42],[-58,-44],
      [-60,-46],[-62,-48],[-64,-50],[-66,-52],[-68,-54],[-70,-54],[-72,-52],
      [-70,-50],[-68,-48],[-66,-46],[-64,-44],[-62,-42],[-60,-40],[-58,-38],
      [-56,-36],[-54,-34],[-52,-32],[-50,-30],[-48,-28],[-47,-26],[-48,-24],
      [-50,-22],[-52,-20],[-54,-18],[-56,-16],[-58,-14],[-60,-12],[-62,-10],
      [-64,-8],[-66,-6],[-68,-4],[-70,-2],[-72,0],[-74,2],[-76,4],[-78,6],
      [-80,8],[-82,10]
    ]},
    { land: true, pts: [ // Australia
      [114,-14],[116,-13],[118,-12],[120,-12],[123,-12],[126,-13],[129,-13],
      [132,-12],[135,-13],[137,-14],[139,-15],[141,-16],[143,-17],[145,-19],
      [147,-20],[149,-22],[150,-24],[151,-26],[152,-28],[153,-29],[153,-31],
      [152,-33],[150,-35],[148,-36],[145,-37],[142,-38],[138,-38],[135,-37],
      [132,-36],[129,-35],[126,-33],[123,-32],[120,-30],[118,-28],[116,-26],
      [115,-24],[114,-22],[113,-20],[113,-18],[114,-16]
    ]},
    { land: true, pts: [ // Greenland
      [-55,60],[-50,62],[-45,64],[-40,66],[-35,68],[-30,70],[-25,72],
      [-20,74],[-18,76],[-20,78],[-25,80],[-30,81],[-35,82],[-40,82],
      [-45,81],[-50,80],[-55,78],[-58,76],[-60,74],[-62,72],[-60,70],
      [-58,68],[-56,66],[-54,64],[-53,62]
    ]},
    { land: false, pts: [ // Antarctica
      [-180,-65],[-150,-68],[-120,-70],[-90,-72],[-60,-70],[-30,-68],[0,-65],
      [30,-68],[60,-70],[90,-72],[120,-70],[150,-68],[180,-65],
      [180,-90],[-180,-90]
    ]}
  ];

  var pins = [
    { lat: 40.7, lng: -74, label: 'Нью-Йорк', icon: '🌍' },
    { lat: 55.75, lng: 37.6, label: 'Москва', icon: '📍' },
    { lat: -33.87, lng: 151.2, label: 'Сидней', icon: '🦘' },
    { lat: 35.68, lng: 139.69, label: 'Токио', icon: '🗼' }
  ];

  /* ===== GENERATE EQUIRECTANGULAR TEXTURE ===== */
  var texW = 720, texH = 360;
  var texCanvas = document.createElement('canvas');
  texCanvas.width = texW;
  texCanvas.height = texH;
  var texCtx = texCanvas.getContext('2d');

  // Fill ocean
  var oceanGrd = texCtx.createLinearGradient(0, 0, 0, texH);
  oceanGrd.addColorStop(0, '#0a3d5c');
  oceanGrd.addColorStop(0.3, '#0c4a6e');
  oceanGrd.addColorStop(0.5, '#0d5280');
  oceanGrd.addColorStop(0.7, '#0c4a6e');
  oceanGrd.addColorStop(1, '#0a3d5c');
  texCtx.fillStyle = oceanGrd;
  texCtx.fillRect(0, 0, texW, texH);

  // Draw continents on texture
  function lngToX(lng) { return ((lng + 180) / 360) * texW; }
  function latToY(lat) { return ((90 - lat) / 180) * texH; }

  for (var c = 0; c < continents.length; c++) {
    var cont = continents[c];
    var pts = cont.pts;
    texCtx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      var x = lngToX(pts[i][1]);
      var y = latToY(pts[i][0]);
      if (i === 0) texCtx.moveTo(x, y);
      else texCtx.lineTo(x, y);
    }
    texCtx.closePath();
    texCtx.fillStyle = cont.land ? '#1a7a3a' : '#c8dce8';
    texCtx.fill();
    texCtx.strokeStyle = cont.land ? '#156830' : '#a8bcd0';
    texCtx.lineWidth = 0.8;
    texCtx.stroke();
  }

  // Add some texture noise for realism
  var texData = texCtx.getImageData(0, 0, texW, texH);
  var texPixels = texData.data;
  for (var i = 0; i < texPixels.length; i += 4) {
    var noise = (Math.random() - 0.5) * 8;
    texPixels[i] = Math.max(0, Math.min(255, texPixels[i] + noise));
    texPixels[i + 1] = Math.max(0, Math.min(255, texPixels[i + 1] + noise));
    texPixels[i + 2] = Math.max(0, Math.min(255, texPixels[i + 2] + noise));
  }
  texCtx.putImageData(texData, 0, 0);

  /* ===== 3D MATH ===== */
  function rotate(px, py, pz) {
    // Rotate Y
    var x1 = px * Math.cos(rotY) - pz * Math.sin(rotY);
    var z1 = px * Math.sin(rotY) + pz * Math.cos(rotY);
    // Rotate X
    var y1 = py * Math.cos(rotX) - z1 * Math.sin(rotX);
    var z2 = py * Math.sin(rotX) + z1 * Math.cos(rotX);
    return { x: x1, y: y1, z: z2 };
  }

  function unrotate(x, y, z) {
    // Inverse rotate X
    var y1 = y * Math.cos(-rotX) - z * Math.sin(-rotX);
    var z1 = y * Math.sin(-rotX) + z * Math.cos(-rotX);
    // Inverse rotate Y
    var x1 = x * Math.cos(-rotY) - z1 * Math.sin(-rotY);
    var z2 = x * Math.sin(-rotY) + z1 * Math.cos(-rotY);
    return { x: x1, y: y1, z: z2 };
  }

  function project(lat, lng) {
    var phi = (90 - lat) * Math.PI / 180;
    var theta = (lng + 180) * Math.PI / 180;
    var px = -R * Math.sin(phi) * Math.cos(theta);
    var py = R * Math.cos(phi);
    var pz = R * Math.sin(phi) * Math.sin(theta);
    var r = rotate(px, py, pz);
    return { x: cx + r.x, y: cy + r.y, z: r.z };
  }

  /* ===== DRAW TEXTURED SPHERE (pixel-by-pixel) ===== */
  function drawTexturedSphere() {
    var imgData = ctx.getImageData(0, 0, W * 2, H * 2);
    var pixels = imgData.data;
    var scale = 2; // canvas is 2x

    // Light direction (from upper-left)
    var lx = -0.4, ly = -0.35, lz = 0.85;
    var lLen = Math.sqrt(lx * lx + ly * ly + lz * lz);
    lx /= lLen; ly /= lLen; lz /= lLen;

    for (var py = 0; py < H; py++) {
      for (var px = 0; px < W; px++) {
        // Screen to sphere coordinates
        var dx = px - cx;
        var dy = py - cy;
        var dist2 = dx * dx + dy * dy;
        if (dist2 > R * R) continue;

        var dz = Math.sqrt(R * R - dist2);
        // Surface normal (normalized)
        var nx = dx / R;
        var ny = dy / R;
        var nz = dz / R;

        // Inverse rotate to get world-space normal
        var world = unrotate(nx, ny, nz);

        // Convert to lat/lng
        var lat = Math.asin(Math.max(-1, Math.min(1, -world.y))) * 180 / Math.PI;
        var lng = Math.atan2(world.x, -world.z) * 180 / Math.PI - 180;
        if (lng < -180) lng += 360;
        if (lng > 180) lng -= 360;

        // Sample texture
        var texX = Math.floor(((lng + 180) / 360) * texW) % texW;
        var texY = Math.floor(((90 - lat) / 180) * texH);
        texY = Math.max(0, Math.min(texH - 1, texY));

        var tIdx = (texY * texW + texX) * 4;
        var tr = texPixels[tIdx];
        var tg = texPixels[tIdx + 1];
        var tb = texPixels[tIdx + 2];

        // Phong lighting
        var diff = Math.max(0, nx * -lx + ny * -ly + nz * lz);
        diff = diff * 0.65 + 0.35; // ambient

        // Fresnel edge glow
        var fresnel = 1 - nz;
        fresnel = fresnel * fresnel * 0.3;

        // Specular
        var hx = -lx, hy = -ly, hz = 1 + lz;
        var hLen = Math.sqrt(hx * hx + hy * hy + hz * hz);
        hx /= hLen; hy /= hLen; hz /= hLen;
        var spec = Math.pow(Math.max(0, nx * hx + ny * hy + nz * hz), 32) * 0.3;

        var r = Math.round(tr * diff + spec * 255 + fresnel * 40);
        var g = Math.round(tg * diff + spec * 255 + fresnel * 80);
        var b = Math.round(tb * diff + spec * 200 + fresnel * 120);

        r = Math.min(255, r);
        g = Math.min(255, g);
        b = Math.min(255, b);

        // Write to all 4 sub-pixels (2x2 block)
        for (var sy = 0; sy < scale; sy++) {
          for (var sx = 0; sx < scale; sx++) {
            var idx = ((py * scale + sy) * W * 2 + (px * scale + sx)) * 4;
            pixels[idx] = r;
            pixels[idx + 1] = g;
            pixels[idx + 2] = b;
            pixels[idx + 3] = 255;
          }
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  /* ===== DRAW ATMOSPHERE ===== */
  function drawAtmosphere() {
    var grd = ctx.createRadialGradient(cx, cy, R - 2, cx, cy, R + 25);
    grd.addColorStop(0, 'rgba(66,165,245,0.0)');
    grd.addColorStop(0.75, 'rgba(66,165,245,0.04)');
    grd.addColorStop(0.9, 'rgba(0,229,255,0.08)');
    grd.addColorStop(1, 'rgba(0,229,255,0.0)');
    ctx.beginPath();
    ctx.arc(cx, cy, R + 25, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    var pulse = Math.sin(time * 0.8) * 0.02 + 0.05;
    var grd2 = ctx.createRadialGradient(cx, cy, R + 3, cx, cy, R + 45);
    grd2.addColorStop(0, 'rgba(100,181,246,' + pulse + ')');
    grd2.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, R + 45, 0, Math.PI * 2);
    ctx.fillStyle = grd2;
    ctx.fill();
  }

  /* ===== DRAW GRID ===== */
  function drawGrid() {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = 'rgba(100,200,255,0.06)';
    ctx.lineWidth = 0.4;

    for (var i = 0; i < 36; i += 6) {
      ctx.beginPath();
      var started = false;
      for (var lat = -90; lat <= 90; lat += 2) {
        var p = project(lat, i);
        if (p.z <= 0) { started = false; continue; }
        if (!started) { ctx.moveTo(p.x, p.y); started = true; }
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    for (var lat = -75; lat <= 75; lat += 15) {
      ctx.beginPath();
      var started = false;
      for (var lng = 0; lng <= 360; lng += 2) {
        var p = project(lat, lng);
        if (p.z <= 0) { started = false; continue; }
        if (!started) { ctx.moveTo(p.x, p.y); started = true; }
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ===== DRAW PINS ===== */
  function drawPins() {
    for (var i = 0; i < pins.length; i++) {
      var pin = pins[i];
      var p = project(pin.lat, pin.lng);
      if (p.z <= 10) continue;

      var depth = p.z / R;
      var alpha = Math.max(0, Math.min(1, depth * 1.5));
      var size = 2.5 + depth * 2;

      var pulse = (time * 1.5 + i * 1.2) % 3;
      if (pulse < 1.5) {
        var pulseR = size + pulse * 10;
        var pulseA = (1 - pulse / 1.5) * 0.35 * alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,229,255,' + pulseA + ')';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,229,255,' + alpha + ')';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, size + 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,229,255,' + (alpha * 0.2) + ')';
      ctx.fill();

      if (alpha > 0.5) {
        ctx.font = '600 10px "Segoe UI", system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,' + (alpha * 0.85) + ')';
        ctx.fillText(pin.icon + ' ' + pin.label, p.x + size + 5, p.y + 3);
      }
    }
  }

  /* ===== DRAW BORDER ===== */
  function drawBorder() {
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(66,165,245,0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  /* ===== MAIN LOOP ===== */
  function render() {
    ctx.clearRect(0, 0, W, H);
    time += 0.016;
    if (autoRotate && !dragging) rotY += autoSpeed;

    drawTexturedSphere();
    drawAtmosphere();
    drawGrid();
    drawPins();
    drawBorder();

    requestAnimationFrame(render);
  }

  /* ===== MOUSE DRAG ===== */
  canvas.addEventListener('mousedown', function(e) {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    autoRotate = false;
  });
  window.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    rotY += (e.clientX - lastX) * 0.005;
    rotX += (e.clientY - lastY) * 0.005;
    rotX = Math.max(-1.2, Math.min(1.2, rotX));
    lastX = e.clientX;
    lastY = e.clientY;
  });
  window.addEventListener('mouseup', function() {
    if (dragging) { dragging = false; setTimeout(function() { autoRotate = true; }, 2000); }
  });

  /* ===== TOUCH ===== */
  canvas.addEventListener('touchstart', function(e) {
    e.preventDefault(); dragging = true;
    lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
    autoRotate = false;
  }, { passive: false });
  canvas.addEventListener('touchmove', function(e) {
    e.preventDefault(); if (!dragging) return;
    rotY += (e.touches[0].clientX - lastX) * 0.005;
    rotX += (e.touches[0].clientY - lastY) * 0.005;
    rotX = Math.max(-1.2, Math.min(1.2, rotX));
    lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
  }, { passive: false });
  canvas.addEventListener('touchend', function() {
    dragging = false; setTimeout(function() { autoRotate = true; }, 2000);
  });

  render();
})();
