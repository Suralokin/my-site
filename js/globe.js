/* ===== 3D EARTH GLOBE (Canvas) ===== */
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
  var rotY = 0, rotX = -0.2;
  var dragging = false, lastX, lastY;
  var autoRotate = true;
  var autoSpeed = 0.003;
  var time = 0;

  /* ===== CONTINENTS (simplified lat/lng polygons) ===== */
  var continents = [
    { name: 'eurasia', color: '#1a7a3a', pts: [
      [-10,35],[0,40],[10,45],[20,42],[30,45],[40,50],[50,55],[60,58],[70,55],
      [80,50],[90,45],[100,40],[110,35],[120,30],[130,35],[140,40],[145,45],
      [140,50],[130,55],[120,58],[110,55],[100,60],[90,65],[80,68],[70,70],
      [60,68],[50,62],[40,58],[30,55],[20,50],[10,48],[0,45],[-10,42]
    ]},
    { name: 'africa', color: '#1a7a3a', pts: [
      [-15,15],[-10,10],[-5,5],[0,5],[5,0],[10,-5],[15,-10],[20,-15],[25,-20],
      [30,-25],[33,-30],[30,-33],[27,-34],[25,-33],[22,-30],[18,-25],[15,-20],
      [12,-15],[10,-10],[10,-5],[12,0],[15,5],[18,10],[20,15],[22,20],[25,25],
      [28,30],[30,33],[32,35],[30,37],[25,37],[20,35],[15,32],[10,30],
      [5,28],[0,25],[-5,20],[-10,18],[-15,17]
    ]},
    { name: 'namerica', color: '#1a7a3a', pts: [
      [-170,65],[-160,62],[-150,60],[-140,58],[-130,55],[-120,50],[-115,45],
      [-110,40],[-105,35],[-100,30],[-95,25],[-90,20],[-85,15],[-80,10],
      [-82,12],[-85,15],[-88,18],[-92,22],[-97,26],[-102,30],[-105,35],
      [-108,38],[-112,42],[-115,45],[-118,48],[-122,50],[-128,53],[-135,56],
      [-142,58],[-150,60],[-158,62],[-165,64]
    ]},
    { name: 'samerica', color: '#1a7a3a', pts: [
      [-80,10],[-75,5],[-70,2],[-65,0],[-60,-3],[-55,-5],[-50,-8],[-48,-12],
      [-45,-16],[-43,-20],[-42,-23],[-44,-25],[-48,-28],[-52,-32],[-55,-35],
      [-58,-38],[-62,-40],[-65,-42],[-68,-45],[-70,-48],[-72,-50],[-73,-52],
      [-72,-50],[-70,-48],[-68,-44],[-66,-42],[-64,-40],[-62,-38],[-60,-35],
      [-58,-32],[-56,-28],[-54,-24],[-52,-20],[-50,-16],[-48,-12],[-50,-8],
      [-55,-5],[-60,-3],[-65,0],[-70,2],[-75,5],[-78,8]
    ]},
    { name: 'australia', color: '#1a7a3a', pts: [
      [115,-15],[120,-14],[125,-13],[130,-12],[135,-13],[140,-15],[145,-18],
      [148,-20],[150,-23],[152,-26],[153,-28],[152,-30],[150,-33],[148,-35],
      [145,-37],[140,-38],[135,-37],[130,-35],[125,-33],[120,-30],[118,-27],
      [116,-24],[114,-22],[113,-20],[114,-18]
    ]},
    { name: 'antarctica', color: '#8ab4d0', pts: [
      [-180,-65],[-150,-68],[-120,-70],[-90,-72],[-60,-70],[-30,-68],[0,-65],
      [30,-68],[60,-70],[90,-72],[120,-70],[150,-68],[180,-65],
      [180,-90],[-180,-90]
    ]}
  ];

  /* ===== LOCATION PINS ===== */
  var pins = [
    { lat: 40.7, lng: -74, label: 'Нью-Йорк', icon: '🌍' },
    { lat: 55.75, lng: 37.6, label: 'Москва', icon: '📍' },
    { lat: -33.87, lng: 151.2, label: 'Сидней', icon: '🦘' },
    { lat: 35.68, lng: 139.69, label: 'Токио', icon: '🗼' }
  ];

  /* ===== 3D MATH ===== */
  function project(lat, lng) {
    var phi = (90 - lat) * Math.PI / 180;
    var theta = (lng + 180) * Math.PI / 180;
    var x = -R * Math.sin(phi) * Math.cos(theta);
    var y = R * Math.cos(phi);
    var z = R * Math.sin(phi) * Math.sin(theta);
    // Rotate Y
    var x1 = x * Math.cos(rotY) - z * Math.sin(rotY);
    var z1 = x * Math.sin(rotY) + z * Math.cos(rotY);
    // Rotate X
    var y1 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
    var z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);
    return { x: cx + x1, y: cy + y1, z: z2 };
  }

  function isFront(p) { return p.z > 0; }

  /* ===== DRAW ATMOSPHERE ===== */
  function drawAtmosphere() {
    var grd = ctx.createRadialGradient(cx, cy, R - 5, cx, cy, R + 30);
    grd.addColorStop(0, 'rgba(66,165,245,0.0)');
    grd.addColorStop(0.7, 'rgba(66,165,245,0.06)');
    grd.addColorStop(0.85, 'rgba(0,229,255,0.1)');
    grd.addColorStop(1, 'rgba(0,229,255,0.0)');
    ctx.beginPath();
    ctx.arc(cx, cy, R + 30, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    // Outer glow pulse
    var pulse = Math.sin(time * 0.8) * 0.03 + 0.07;
    var grd2 = ctx.createRadialGradient(cx, cy, R + 5, cx, cy, R + 50);
    grd2.addColorStop(0, 'rgba(100,181,246,' + pulse + ')');
    grd2.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, R + 50, 0, Math.PI * 2);
    ctx.fillStyle = grd2;
    ctx.fill();
  }

  /* ===== DRAW SPHERE (ocean) ===== */
  function drawSphere() {
    // Base sphere
    var grd = ctx.createRadialGradient(cx - 40, cy - 40, 10, cx, cy, R);
    grd.addColorStop(0, '#0e5a8a');
    grd.addColorStop(0.3, '#0a4a72');
    grd.addColorStop(0.7, '#073a5a');
    grd.addColorStop(1, '#042840');
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    // Specular highlight
    var spec = ctx.createRadialGradient(cx - 45, cy - 45, 5, cx - 30, cy - 30, 80);
    spec.addColorStop(0, 'rgba(255,255,255,0.18)');
    spec.addColorStop(0.5, 'rgba(255,255,255,0.04)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = spec;
    ctx.fill();

    // Shadow (terminator)
    var shadow = ctx.createRadialGradient(cx + 50, cy + 30, 10, cx + 20, cy + 10, R);
    shadow.addColorStop(0, 'rgba(0,0,0,0.5)');
    shadow.addColorStop(0.5, 'rgba(0,0,0,0.2)');
    shadow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = shadow;
    ctx.fill();
  }

  /* ===== DRAW GRID ===== */
  function drawGrid() {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();

    ctx.strokeStyle = 'rgba(66,165,245,0.08)';
    ctx.lineWidth = 0.5;

    // Longitude lines
    for (var i = 0; i < 36; i += 6) {
      ctx.beginPath();
      var started = false;
      for (var lat = -90; lat <= 90; lat += 3) {
        var p = project(lat, i);
        if (!isFront(p)) { started = false; continue; }
        if (!started) { ctx.moveTo(p.x, p.y); started = true; }
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // Latitude lines
    for (var lat = -75; lat <= 75; lat += 15) {
      ctx.beginPath();
      var started = false;
      for (var lng = 0; lng <= 360; lng += 3) {
        var p = project(lat, lng);
        if (!isFront(p)) { started = false; continue; }
        if (!started) { ctx.moveTo(p.x, p.y); started = true; }
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ===== SUBDIVIDE POLYGON (interpolate edges) ===== */
  function subdivide(pts, steps) {
    var out = [];
    for (var i = 0; i < pts.length; i++) {
      var a = pts[i];
      var b = pts[(i + 1) % pts.length];
      for (var t = 0; t < steps; t++) {
        var f = t / steps;
        out.push([
          a[0] + (b[0] - a[0]) * f,
          a[1] + (b[1] - a[1]) * f
        ]);
      }
    }
    return out;
  }

  /* ===== DRAW CONTINENTS ===== */
  function drawContinents() {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();

    for (var c = 0; c < continents.length; c++) {
      var cont = continents[c];
      var pts = subdivide(cont.pts, 8);

      // Project all points
      var projected = [];
      for (var i = 0; i < pts.length; i++) {
        projected.push(project(pts[i][0], pts[i][1]));
      }

      // --- Pass 1: Fill visible front-facing polygon ---
      ctx.beginPath();
      var started = false;
      for (var i = 0; i < projected.length; i++) {
        var p = projected[i];
        if (p.z <= 0) continue;
        if (!started) { ctx.moveTo(p.x, p.y); started = true; }
        else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(22,100,45,0.85)';
      ctx.fill();

      // --- Pass 2: Draw lit border segments ---
      for (var i = 0; i < projected.length; i++) {
        var p0 = projected[i];
        var p1 = projected[(i + 1) % projected.length];
        if (p0.z <= 0 || p1.z <= 0) continue;

        var nz = (p0.z + p1.z) / (2 * R);
        var edgeFade = Math.max(0, Math.min(1, nz * 2.5));
        var nx = ((p0.x - cx) + (p1.x - cx)) / (2 * R);
        var ny = ((p0.y - cy) + (p1.y - cy)) / (2 * R);
        var light = Math.max(0, nx * 0.3 + ny * -0.2 + 0.6);
        var combined = light * edgeFade;

        var r = Math.round(22 + 30 * combined);
        var g = Math.round(90 + 60 * combined);
        var b = Math.round(40 + 20 * combined);

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // --- Pass 3: Specular on continent edges facing light ---
      for (var i = 0; i < projected.length; i++) {
        var p0 = projected[i];
        var p1 = projected[(i + 1) % projected.length];
        if (p0.z <= 20 || p1.z <= 20) continue;

        var nx = ((p0.x - cx) + (p1.x - cx)) / (2 * R);
        var ny = ((p0.y - cy) + (p1.y - cy)) / (2 * R);
        var spec = Math.max(0, nx * -0.5 + ny * 0.4 + 0.3);
        if (spec < 0.5) continue;

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = 'rgba(120,200,140,' + (spec * 0.3) + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* ===== DRAW PINS ===== */
  function drawPins() {
    for (var i = 0; i < pins.length; i++) {
      var pin = pins[i];
      var p = project(pin.lat, pin.lng);
      if (p.z <= 10) continue; // behind globe

      var depth = p.z / R;
      var alpha = Math.max(0, Math.min(1, depth * 1.5));
      var size = 3 + depth * 2;

      // Pulse
      var pulse = (time * 1.5 + i * 1.2) % 3;
      if (pulse < 1.5) {
        var pulseR = size + pulse * 12;
        var pulseA = (1 - pulse / 1.5) * 0.4 * alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,229,255,' + pulseA + ')';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Pin dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,229,255,' + alpha + ')';
      ctx.fill();

      // Glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, size + 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,229,255,' + (alpha * 0.25) + ')';
      ctx.fill();

      // Label
      if (alpha > 0.5) {
        ctx.font = '600 11px "Segoe UI", system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,' + (alpha * 0.9) + ')';
        ctx.fillText(pin.icon + ' ' + pin.label, p.x + size + 6, p.y + 4);
      }
    }
  }

  /* ===== DRAW BORDER ===== */
  function drawBorder() {
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(66,165,245,0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  /* ===== MAIN LOOP ===== */
  function render() {
    ctx.clearRect(0, 0, W, H);
    time += 0.016;

    if (autoRotate && !dragging) {
      rotY += autoSpeed;
    }

    drawAtmosphere();
    drawSphere();
    drawGrid();
    drawContinents();
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
    var dx = e.clientX - lastX;
    var dy = e.clientY - lastY;
    rotY += dx * 0.005;
    rotX += dy * 0.005;
    rotX = Math.max(-1.2, Math.min(1.2, rotX));
    lastX = e.clientX;
    lastY = e.clientY;
  });

  window.addEventListener('mouseup', function() {
    if (dragging) {
      dragging = false;
      setTimeout(function() { autoRotate = true; }, 2000);
    }
  });

  /* ===== TOUCH SUPPORT ===== */
  canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    dragging = true;
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
    autoRotate = false;
  }, { passive: false });

  canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if (!dragging) return;
    var dx = e.touches[0].clientX - lastX;
    var dy = e.touches[0].clientY - lastY;
    rotY += dx * 0.005;
    rotX += dy * 0.005;
    rotX = Math.max(-1.2, Math.min(1.2, rotX));
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
  }, { passive: false });

  canvas.addEventListener('touchend', function() {
    dragging = false;
    setTimeout(function() { autoRotate = true; }, 2000);
  });

  render();
})();
