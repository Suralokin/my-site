/* ===== 3D EARTH GLOBE — IMAGE TEXTURE ===== */
(function() {
  var canvas = document.getElementById('globeCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var SIZE = 420;
  canvas.width = SIZE * 2;
  canvas.height = SIZE * 2;
  canvas.style.width = SIZE + 'px';
  canvas.style.height = SIZE + 'px';
  ctx.scale(2, 2);

  var cx = SIZE / 2, cy = SIZE / 2, R = 155;
  var rotY = 0;
  var dragging = false, lastX;
  var autoRotate = true;
  var time = 0;

  var texImg = new Image();
  texImg.crossOrigin = 'anonymous';
  var textureReady = false;
  texImg.onload = function() { textureReady = true; };
  texImg.src = 'images/earth-texture.jpg';

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
    {lat:0,lng:-30,name:'Атлантический океан',size:'large'},
    {lat:0,lng:170,name:'Тихий океан',size:'large'},
    {lat:-25,lng:70,name:'Индийский океан',size:'large'},
    {lat:78,lng:0,name:'Сев. Ледовитый',size:'large'},
    {lat:-60,lng:0,name:'Южный океан',size:'large'},
    {lat:32,lng:-5,name:'Средиземное м.',size:'medium'},
    {lat:42,lng:50,name:'Каспийское м.',size:'medium'},
  ];

  /* ===== PROJECT ===== */
  function projectToScreen(lat, lng) {
    var phi = (90 - lat) * Math.PI / 180;
    var theta = (lng + 180) * Math.PI / 180;
    var px = -R * Math.sin(phi) * Math.cos(theta);
    var py = R * Math.cos(phi);
    var pz = R * Math.sin(phi) * Math.sin(theta);
    var x1 = px * Math.cos(rotY) - pz * Math.sin(rotY);
    var z1 = px * Math.sin(rotY) + pz * Math.cos(rotY);
    if (z1 < 0) return null;
    return { x: cx + x1, y: cy + py, z: z1 };
  }

  /* ===== DRAW GLOBE ===== */
  function drawGlobe() {
    if (!textureReady) {
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = '#0a3050';
      ctx.fill();
      return;
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();

    var texW = texImg.naturalWidth;
    var texH = texImg.naturalHeight;
    var offsetX = -(rotY / (Math.PI * 2)) * texW * 2;
    var drawW = texW * 2;

    ctx.drawImage(texImg, offsetX, 0, drawW, texH, cx - texW, cy - R, texW * 2, R * 2);
    ctx.drawImage(texImg, offsetX + drawW, 0, drawW, texH, cx - texW, cy - R, texW * 2, R * 2);

    ctx.restore();

    /* Lighting overlay */
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
    var light = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.05, cx, cy, R);
    light.addColorStop(0, 'rgba(255,255,255,0.15)');
    light.addColorStop(0.4, 'rgba(255,255,255,0.0)');
    light.addColorStop(0.7, 'rgba(0,0,0,0.1)');
    light.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = light;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();
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

  /* ===== DRAW BORDER ===== */
  function drawBorder() {
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(66,165,245,0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  /* ===== DRAW LABELS ===== */
  function drawLabels() {
    for (var w = 0; w < waterBodies.length; w++) {
      var wb = waterBodies[w];
      var pos = projectToScreen(wb.lat, wb.lng);
      if (!pos) continue;
      var fs = wb.size === 'large' ? 10 : 8;
      ctx.font = '700 ' + fs + 'px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0,10,30,0.9)';
      ctx.lineWidth = 3;
      ctx.strokeText(wb.name, pos.x, pos.y);
      ctx.fillStyle = 'rgba(80,170,255,0.8)';
      ctx.fillText(wb.name, pos.x, pos.y);
    }

    for (var cl = 0; cl < countryLabels.length; cl++) {
      var lb = countryLabels[cl];
      var pos = projectToScreen(lb.lat, lb.lng);
      if (!pos) continue;
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lb.flag, pos.x, pos.y - 12);
      ctx.font = '700 9px "Segoe UI", system-ui, sans-serif';
      ctx.strokeStyle = 'rgba(0,0,0,0.9)';
      ctx.lineWidth = 3;
      ctx.strokeText(lb.name, pos.x, pos.y + 2);
      ctx.fillStyle = '#fff';
      ctx.fillText(lb.name, pos.x, pos.y + 2);
    }
  }

  /* ===== MAIN LOOP ===== */
  function render() {
    ctx.clearRect(0, 0, SIZE, SIZE);
    time += 0.016;
    if (autoRotate && !dragging) rotY += 0.003;
    while (rotY > Math.PI * 2) rotY -= Math.PI * 2;
    while (rotY < 0) rotY += Math.PI * 2;

    drawGlobe();
    drawLabels();
    drawAtmosphere();
    drawBorder();
    requestAnimationFrame(render);
  }

  /* ===== MOUSE ===== */
  canvas.addEventListener('mousedown', function(e) {
    dragging = true; lastX = e.clientX; autoRotate = false;
  });
  window.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    rotY += (e.clientX - lastX) * 0.005;
    lastX = e.clientX;
  });
  window.addEventListener('mouseup', function() {
    if (dragging) { dragging = false; setTimeout(function() { autoRotate = true; }, 2000); }
  });

  /* ===== TOUCH ===== */
  canvas.addEventListener('touchstart', function(e) {
    e.preventDefault(); dragging = true;
    lastX = e.touches[0].clientX; autoRotate = false;
  }, { passive: false });
  canvas.addEventListener('touchmove', function(e) {
    e.preventDefault(); if (!dragging) return;
    rotY += (e.touches[0].clientX - lastX) * 0.005;
    lastX = e.touches[0].clientX;
  }, { passive: false });
  canvas.addEventListener('touchend', function() {
    dragging = false; setTimeout(function() { autoRotate = true; }, 2000);
  });

  render();
})();
