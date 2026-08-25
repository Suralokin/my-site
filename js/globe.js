/* ===== 3D EARTH GLOBE — FAST CANVAS ===== */
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
  var texReady = false;
  texImg.onload = function() { texReady = true; };
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

  /* ===== FLAG COLORS ===== */
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

  function drawFlag(x, y, code) {
    var cols = flagColors[code] || ['#333','#666','#999'];
    var w = 18, h = 12;
    var lx = x - w / 2, ly = y - h / 2;
    ctx.fillStyle = cols[0];
    ctx.fillRect(lx, ly, w, h / 3);
    ctx.fillStyle = cols[1];
    ctx.fillRect(lx, ly + h / 3, w, h / 3);
    ctx.fillStyle = cols[2];
    ctx.fillRect(lx, ly + 2 * h / 3, w, h / 3);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(lx, ly, w, h);
  }

  /* ===== DRAW GLOBE ===== */
  function drawGlobe() {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();

    if (texReady) {
      var texW = texImg.naturalWidth;
      var texH = texImg.naturalHeight;
      var shift = -(rotY / (Math.PI * 2)) * texW * 2;
      var drawW = texW * 2;

      ctx.drawImage(texImg, shift, 0, drawW, texH, cx - texW, cy - R, texW * 2, R * 2);
      ctx.drawImage(texImg, shift + drawW, 0, drawW, texH, cx - texW, cy - R, texW * 2, R * 2);
    } else {
      ctx.fillStyle = '#0a3050';
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    }
    ctx.restore();

    /* Lighting */
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
    var light = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.05, cx, cy, R);
    light.addColorStop(0, 'rgba(255,255,255,0.12)');
    light.addColorStop(0.35, 'rgba(255,255,255,0)');
    light.addColorStop(0.65, 'rgba(0,0,0,0.08)');
    light.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = light;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();
  }

  /* ===== ATMOSPHERE ===== */
  function drawAtmosphere() {
    var g1 = ctx.createRadialGradient(cx, cy, R - 1, cx, cy, R + 18);
    g1.addColorStop(0, 'rgba(66,165,245,0)');
    g1.addColorStop(0.8, 'rgba(0,229,255,0.05)');
    g1.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, R + 18, 0, Math.PI * 2);
    ctx.fillStyle = g1;
    ctx.fill();

    var p = Math.sin(time * 0.8) * 0.02 + 0.035;
    var g2 = ctx.createRadialGradient(cx, cy, R + 2, cx, cy, R + 35);
    g2.addColorStop(0, 'rgba(100,181,246,' + p + ')');
    g2.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, R + 35, 0, Math.PI * 2);
    ctx.fillStyle = g2;
    ctx.fill();
  }

  /* ===== BORDER ===== */
  function drawBorder() {
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(66,165,245,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /* ===== LABELS ===== */
  function drawLabels() {
    for (var i = 0; i < waterBodies.length; i++) {
      var w = waterBodies[i];
      var p = project(w.lat, w.lng);
      if (!p) continue;
      ctx.font = '700 ' + w.sz + 'px "Segoe UI", system-ui, sans-serif';
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
      drawFlag(p.x, p.y - 10, c.code);
      ctx.font = '700 8px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
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
    if (autoRotate && !dragging) rotY += 0.005;
    if (rotY > Math.PI * 2) rotY -= Math.PI * 2;
    if (rotY < 0) rotY += Math.PI * 2;

    drawGlobe();
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
