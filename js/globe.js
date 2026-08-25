/* ===== 3D EARTH GLOBE — IMAGE TEXTURE ===== */
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
  var autoRotate = true, autoSpeed = 0.003;
  var time = 0;
  var textureReady = false;
  var texPixels = null, texW = 0, texH = 0;

  /* ===== LOAD TEXTURE ===== */
  var texImg = new Image();
  texImg.crossOrigin = 'anonymous';
  texImg.onload = function() {
    var tc = document.createElement('canvas');
    tc.width = texImg.naturalWidth;
    tc.height = texImg.naturalHeight;
    var tctx = tc.getContext('2d');
    tctx.drawImage(texImg, 0, 0);
    texW = tc.width;
    texH = tc.height;
    texPixels = tctx.getImageData(0, 0, texW, texH).data;
    textureReady = true;
  };
  texImg.src = 'images/earth-texture.jpg';

  /* ===== COUNTRY LABELS with flags ===== */
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

  /* ===== SEAS AND OCEANS ===== */
  var waterBodies = [
    {lat:0,lng:-30,name:'Атлантический океан',size:'large'},
    {lat:0,lng:170,name:'Тихий океан',size:'large'},
    {lat:-25,lng:70,name:'Индийский океан',size:'large'},
    {lat:78,lng:0,name:'Сев. Ледовитый океан',size:'large'},
    {lat:-60,lng:0,name:'Южный океан',size:'large'},
    {lat:32,lng:-5,name:'Средиземное море',size:'medium'},
    {lat:42,lng:50,name:'Каспийское море',size:'medium'},
    {lat:20,lng:58,name:'Аравийское море',size:'medium'},
    {lat:10,lng:90,name:'Бенгальский зал.',size:'medium'},
    {lat:35,lng:135,name:'Японское море',size:'medium'},
    {lat:15,lng:115,name:'Южно-Китайское м.',size:'medium'},
    {lat:70,lng:40,name:'Баренцево море',size:'small'},
    {lat:72,lng:80,name:'Карское море',size:'small'},
  ];

  /* ===== 3D MATH ===== */
  function rotate(px, py, pz) {
    var x1 = px * Math.cos(rotY) - pz * Math.sin(rotY);
    var z1 = px * Math.sin(rotY) + pz * Math.cos(rotY);
    var y1 = py * Math.cos(rotX) - z1 * Math.sin(rotX);
    var z2 = py * Math.sin(rotX) + z1 * Math.cos(rotX);
    return {x: x1, y: y1, z: z2};
  }

  function unrotate(x, y, z) {
    var y1 = y * Math.cos(-rotX) - z * Math.sin(-rotX);
    var z1 = y * Math.sin(-rotX) + z * Math.cos(-rotX);
    var x1 = x * Math.cos(-rotY) - z1 * Math.sin(-rotY);
    var z2 = x * Math.sin(-rotY) + z1 * Math.cos(-rotY);
    return {x: x1, y: y1, z: z2};
  }

  /* ===== DRAW TEXTURED SPHERE ===== */
  function drawTexturedSphere() {
    if (!textureReady) {
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = '#0a3050';
      ctx.fill();
      return;
    }

    var imgData = ctx.getImageData(0, 0, W * 2, H * 2);
    var pixels = imgData.data;
    var scale = 2;

    var lx = -0.4, ly = -0.35, lz = 0.85;
    var lLen = Math.sqrt(lx*lx + ly*ly + lz*lz);
    lx /= lLen; ly /= lLen; lz /= lLen;

    for (var py = 0; py < H; py++) {
      for (var px = 0; px < W; px++) {
        var dx = px - cx;
        var dy = py - cy;
        var dist2 = dx*dx + dy*dy;
        if (dist2 > R*R) continue;

        var dz = Math.sqrt(R*R - dist2);
        var nx = dx / R;
        var ny = dy / R;
        var nz = dz / R;

        var world = unrotate(nx, ny, nz);
        var lat = Math.asin(Math.max(-1, Math.min(1, -world.y))) * 180 / Math.PI;
        var lng = Math.atan2(world.x, -world.z) * 180 / Math.PI - 180;
        if (lng < -180) lng += 360;
        if (lng > 180) lng -= 360;

        var texX = ((lng + 180) / 360) * texW;
        texX = texX - Math.floor(texX / texW) * texW;
        if (texX < 0) texX = 0;
        if (texX >= texW) texX = texW - 1;
        texX = Math.floor(texX);
        var texY = Math.floor(((90 - lat) / 180) * texH);
        texY = Math.max(0, Math.min(texH - 1, texY));

        var tIdx = (texY * texW + texX) * 4;
        var tr = texPixels[tIdx];
        var tg = texPixels[tIdx + 1];
        var tb = texPixels[tIdx + 2];

        var diff = Math.max(0, nx*-lx + ny*-ly + nz*lz);
        diff = diff * 0.6 + 0.4;

        var fresnel = 1 - nz;
        fresnel = fresnel * fresnel * 0.25;

        var hx = -lx, hy = -ly, hz = 1 + lz;
        var hLen = Math.sqrt(hx*hx + hy*hy + hz*hz);
        hx /= hLen; hy /= hLen; hz /= hLen;
        var spec = Math.pow(Math.max(0, nx*hx + ny*hy + nz*hz), 48) * 0.25;

        var r = Math.min(255, Math.round(tr*diff + spec*255 + fresnel*30));
        var g = Math.min(255, Math.round(tg*diff + spec*255 + fresnel*70));
        var b = Math.min(255, Math.round(tb*diff + spec*200 + fresnel*110));

        for (var sy = 0; sy < scale; sy++) {
          for (var sx = 0; sx < scale; sx++) {
            var idx = ((py*scale + sy)*W*2 + (px*scale + sx)) * 4;
            pixels[idx] = r;
            pixels[idx+1] = g;
            pixels[idx+2] = b;
            pixels[idx+3] = 255;
          }
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  /* ===== DRAW ATMOSPHERE ===== */
  function drawAtmosphere() {
    var grd = ctx.createRadialGradient(cx, cy, R-2, cx, cy, R+25);
    grd.addColorStop(0, 'rgba(66,165,245,0.0)');
    grd.addColorStop(0.75, 'rgba(66,165,245,0.04)');
    grd.addColorStop(0.9, 'rgba(0,229,255,0.08)');
    grd.addColorStop(1, 'rgba(0,229,255,0.0)');
    ctx.beginPath();
    ctx.arc(cx, cy, R+25, 0, Math.PI*2);
    ctx.fillStyle = grd;
    ctx.fill();

    var pulse = Math.sin(time*0.8)*0.02 + 0.05;
    var grd2 = ctx.createRadialGradient(cx, cy, R+3, cx, cy, R+45);
    grd2.addColorStop(0, 'rgba(100,181,246,'+pulse+')');
    grd2.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, R+45, 0, Math.PI*2);
    ctx.fillStyle = grd2;
    ctx.fill();
  }

  /* ===== DRAW BORDER ===== */
  function drawBorder() {
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(66,165,245,0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  /* ===== PROJECT LAT/LNG TO SCREEN ===== */
  function projectToScreen(lat, lng) {
    var phi = (90 - lat) * Math.PI / 180;
    var theta = (lng + 180) * Math.PI / 180;
    var px = -R * Math.sin(phi) * Math.cos(theta);
    var py = R * Math.cos(phi);
    var pz = R * Math.sin(phi) * Math.sin(theta);
    var r = rotate(px, py, pz);
    if (r.z < 0) return null;
    return {x: cx + r.x, y: cy + r.y, z: r.z};
  }

  /* ===== DRAW 2D LABELS ===== */
  function drawLabels() {
    // Water labels
    for (var w = 0; w < waterBodies.length; w++) {
      var wb = waterBodies[w];
      var pos = projectToScreen(wb.lat, wb.lng);
      if (!pos) continue;
      var fontSize = wb.size === 'large' ? 10 : wb.size === 'medium' ? 8 : 7;
      ctx.font = '700 ' + fontSize + 'px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0,10,30,0.9)';
      ctx.lineWidth = 3;
      ctx.strokeText(wb.name, pos.x, pos.y);
      ctx.fillStyle = 'rgba(80,170,255,0.8)';
      ctx.fillText(wb.name, pos.x, pos.y);
    }

    // Country labels with flags
    for (var cl = 0; cl < countryLabels.length; cl++) {
      var lb = countryLabels[cl];
      var pos = projectToScreen(lb.lat, lb.lng);
      if (!pos) continue;
      // Flag ABOVE name
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lb.flag, pos.x, pos.y - 12);
      // Name
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
    ctx.clearRect(0, 0, W, H);
    time += 0.016;
    if (autoRotate && !dragging) rotY += autoSpeed;

    drawTexturedSphere();
    drawLabels();
    drawAtmosphere();
    drawBorder();

    requestAnimationFrame(render);
  }

  /* ===== MOUSE ===== */
  canvas.addEventListener('mousedown', function(e) {
    dragging = true; lastX = e.clientX; lastY = e.clientY; autoRotate = false;
  });
  window.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    rotY += (e.clientX - lastX) * 0.005;
    rotX += (e.clientY - lastY) * 0.005;
    rotX = Math.max(-1.2, Math.min(1.2, rotX));
    lastX = e.clientX; lastY = e.clientY;
  });
  window.addEventListener('mouseup', function() {
    if (dragging) { dragging = false; setTimeout(function(){ autoRotate = true; }, 2000); }
  });

  /* ===== TOUCH ===== */
  canvas.addEventListener('touchstart', function(e) {
    e.preventDefault(); dragging = true;
    lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; autoRotate = false;
  }, {passive:false});
  canvas.addEventListener('touchmove', function(e) {
    e.preventDefault(); if (!dragging) return;
    rotY += (e.touches[0].clientX - lastX) * 0.005;
    rotX += (e.touches[0].clientY - lastY) * 0.005;
    rotX = Math.max(-1.2, Math.min(1.2, rotX));
    lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
  }, {passive:false});
  canvas.addEventListener('touchend', function() {
    dragging = false; setTimeout(function(){ autoRotate = true; }, 2000);
  });

  render();
})();
