/* ===== 3D EARTH GLOBE — CLEAN MAP ===== */
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

  /* ===== CONTINENT POLYGONS (lat,lng) ===== */
  var continents = {
    // One big blob per continent — no gaps
    northAmerica: [
      // Canada/USA/Mexico main block
      [[-130,72],[-120,72],[-110,72],[-100,72],[-90,72],[-80,72],[-70,72],[-60,72],[-55,50],[-60,48],[-65,46],[-70,44],[-75,42],[-80,40],[-85,38],[-90,36],[-95,34],[-100,32],[-105,30],[-110,28],[-115,26],[-120,24],[-125,22],[-130,20],[-135,18],[-140,16],[-145,14],[-150,12],[-155,10],[-160,8],[-165,6],[-170,4],[-175,2],[-180,0],[-180,72],[-170,72],[-160,72],[-150,72],[-140,72],[-130,72]],
      // Alaska
      [[-170,72],[-165,70],[-160,68],[-155,66],[-150,64],[-148,60],[-152,58],[-158,56],[-165,55],[-170,56],[-175,58],[-178,60],[-180,62],[-180,72]],
      // Greenland
      [[-55,60],[-50,62],[-45,64],[-40,66],[-35,68],[-30,70],[-25,72],[-20,74],[-18,76],[-20,78],[-25,80],[-30,81],[-35,82],[-40,82],[-45,81],[-50,80],[-55,78],[-58,76],[-60,74],[-62,72],[-60,70],[-58,68],[-56,66],[-54,64],[-53,62]],
      // Cuba
      [[-85,20],[-83,22],[-81,23],[-79,22],[-78,20],[-80,20],[-82,21],[-84,21]]
    ],
    southAmerica: [
      [[-82,12],[-80,10],[-78,8],[-76,6],[-74,4],[-72,2],[-70,0],[-68,-2],[-66,-4],[-64,-6],[-62,-8],[-60,-10],[-58,-12],[-56,-14],[-54,-16],[-52,-18],[-50,-20],[-48,-22],[-46,-24],[-44,-26],[-43,-28],[-44,-30],[-46,-32],[-48,-34],[-50,-36],[-52,-38],[-54,-40],[-56,-42],[-58,-44],[-60,-46],[-62,-48],[-64,-50],[-66,-52],[-68,-54],[-70,-54],[-72,-52],[-70,-50],[-68,-48],[-66,-46],[-64,-44],[-62,-42],[-60,-40],[-58,-38],[-56,-36],[-54,-34],[-52,-32],[-50,-30],[-48,-28],[-47,-26],[-48,-24],[-50,-22],[-52,-20],[-54,-18],[-56,-16],[-58,-14],[-60,-12],[-62,-10],[-64,-8],[-66,-6],[-68,-4],[-70,-2],[-72,0],[-74,2],[-76,4],[-78,6],[-80,8],[-82,10],[-82,12]]
    ],
    eurasia: [
      // Europe
      [[-10,36],[-8,38],[-9,40],[-8,42],[-5,43],[-2,43],[0,42],[3,43],[3,46],[5,48],[7,48],[8,50],[6,51],[5,52],[7,54],[8,55],[10,55],[12,56],[10,58],[12,58],[14,58],[16,56],[18,55],[20,54],[22,54],[24,52],[24,50],[22,48],[20,46],[18,44],[16,42],[14,42],[12,42],[10,42],[8,44],[6,46],[4,46],[2,46],[0,44],[-2,43],[-4,42],[-6,40],[-8,38],[-10,36]],
      // Scandinavia
      [[5,58],[7,59],[10,60],[12,62],[14,64],[16,66],[18,68],[20,69],[22,70],[25,71],[28,70],[30,69],[25,68],[20,67],[18,66],[16,64],[14,62],[12,60],[10,59],[8,58],[5,58]],
      // UK + Ireland + Iceland
      [[-6,50],[-5,52],[-4,54],[-3,56],[-5,58],[-4,57],[-2,56],[0,55],[2,53],[1,52],[0,51],[-2,51],[-4,50]],
      [[-10,51],[-9,53],[-8,55],[-6,55],[-6,53],[-7,52],[-9,51]],
      [[-24,64],[-22,66],[-18,66],[-14,65],[-14,64],[-18,63],[-22,63]],
      // Russia
      [[28,56],[30,50],[32,46],[36,44],[40,44],[45,44],[50,44],[55,44],[60,44],[65,44],[70,44],[75,44],[80,44],[85,44],[90,44],[95,44],[100,44],[105,44],[110,44],[115,44],[120,44],[125,44],[130,44],[130,50],[132,56],[135,62],[138,68],[140,72],[142,76],[140,78],[135,80],[125,80],[115,78],[105,76],[95,74],[85,72],[75,70],[65,68],[55,66],[45,64],[35,62],[30,58],[28,56]],
      // China
      [[75,44],[80,42],[85,40],[90,38],[95,36],[100,34],[105,32],[110,30],[115,28],[118,30],[120,32],[122,34],[124,36],[126,38],[128,40],[130,42],[130,44],[125,44],[120,44],[115,44],[110,44],[105,44],[100,44],[95,44],[90,44],[85,44],[80,44],[75,44]],
      // India
      [[68,30],[70,28],[72,24],[74,20],[76,16],[78,12],[80,8],[82,10],[84,14],[86,18],[88,22],[90,26],[92,28],[88,28],[84,26],[80,24],[76,22],[72,24],[70,26],[68,28],[68,30]],
      // Japan
      [[130,31],[131,33],[133,34],[135,35],[137,36],[139,37],[140,38],[141,39],[141,40],[140,41],[139,41],[137,39],[135,37],[133,35],[131,33],[130,31]],
      [[140,42],[141,43],[143,44],[145,44],[145,43],[143,42],[141,42]],
      // Korea
      [[126,34],[127,35],[128,36],[129,37],[129,38],[128,38],[127,37],[126,36],[126,35]],
      // Indonesia islands
      [[95,-6],[98,-4],[100,-2],[104,0],[106,1],[106,-1],[104,-3],[100,-5],[97,-6]],
      [[109,1],[111,2],[114,3],[116,4],[117,3],[117,1],[116,0],[114,-1],[112,-2],[110,-2],[109,-1]],
      [[105,-6],[107,-7],[110,-7],[112,-8],[114,-8],[114,-7],[112,-6],[109,-6],[106,-6]],
      [[119,-2],[120,0],[121,1],[122,0],[123,-1],[122,-3],[121,-4],[120,-3]],
      // Papua New Guinea
      [[141,-2],[143,-3],[145,-4],[147,-5],[149,-6],[150,-6],[150,-5],[148,-4],[146,-3],[144,-2],[142,-2]],
      // Philippines + Taiwan
      [[120,14],[121,16],[122,18],[121,18],[120,17],[119,16]],
      [[120,22],[121,23],[122,24],[121,25],[120,25],[119,24],[120,23]],
      // Middle East
      [[35,14],[37,16],[40,18],[42,20],[44,22],[46,24],[48,26],[50,28],[52,26],[55,24],[56,22],[55,18],[52,16],[50,15],[48,14],[45,13],[42,13],[38,13]],
      [[44,26],[46,28],[48,30],[50,32],[52,34],[54,36],[56,38],[58,38],[60,36],[62,34],[60,32],[58,30],[56,28],[54,26],[52,24],[50,24],[48,24],[46,24],[44,26]],
      // Turkey
      [[26,36],[28,38],[30,40],[32,42],[34,42],[36,42],[38,40],[40,38],[42,36],[40,34],[38,34],[36,36],[34,38],[32,38],[30,36],[28,36],[26,36]]
    ],
    africa: [
      [[-17,15],[-15,12],[-13,8],[-10,5],[-8,4],[-5,5],[-2,4],[0,5],[3,3],[5,2],[8,0],[10,-2],[12,-5],[14,-8],[16,-11],[18,-14],[20,-17],[22,-20],[25,-23],[28,-26],[30,-28],[32,-30],[33,-32],[32,-34],[30,-34],[28,-33],[26,-32],[24,-30],[22,-28],[20,-26],[18,-23],[16,-20],[14,-17],[12,-14],[11,-10],[10,-7],[10,-4],[11,-1],[12,1],[13,4],[14,7],[15,10],[16,13],[17,15],[18,18],[19,20],[20,23],[21,25],[22,27],[23,29],[24,31],[26,33],[28,34],[30,35],[32,36],[33,37],[32,38],[30,37],[28,36],[25,36],[22,35],[20,34],[17,33],[14,32],[11,31],[8,30],[5,28],[2,26],[0,24],[-3,22],[-5,20],[-8,18],[-10,17],[-12,16],[-15,15],[-17,15]],
      // Madagascar
      [[43,-12],[44,-14],[46,-16],[48,-18],[49,-20],[49,-22],[47,-24],[45,-25],[44,-24],[43,-22],[43,-20],[43,-18],[43,-16],[43,-14]]
    ],
    australia: [
      [[114,-14],[116,-13],[118,-12],[120,-12],[123,-12],[126,-13],[129,-13],[132,-12],[135,-13],[137,-14],[139,-15],[141,-16],[143,-17],[145,-19],[147,-20],[149,-22],[150,-24],[151,-26],[152,-28],[153,-29],[153,-31],[152,-33],[150,-35],[148,-36],[145,-37],[142,-38],[138,-38],[135,-37],[132,-36],[129,-35],[126,-33],[123,-32],[120,-30],[118,-28],[116,-26],[115,-24],[114,-22],[113,-20],[113,-18],[114,-16]],
      // Tasmania
      [[144,-40],[146,-41],[148,-42],[147,-44],[145,-44],[144,-43],[144,-41]],
      // New Zealand North
      [[173,-35],[175,-37],[177,-38],[178,-39],[177,-41],[175,-41],[174,-39],[173,-37]],
      // New Zealand South
      [[167,-44],[169,-43],[171,-42],[173,-43],[172,-44],[170,-46],[168,-46],[167,-45]]
    ],
    antarctica: [
      [[-180,-65],[-150,-68],[-120,-70],[-90,-72],[-60,-70],[-30,-68],[0,-65],[30,-68],[60,-70],[90,-72],[120,-70],[150,-68],[180,-65],[180,-90],[-180,-90]]
    ]
  };

  /* ===== COUNTRY LABELS with flags ===== */
  var countryLabels = [
    {lat:60,lng:40,name:'Россия',flag:'🇷🇺'},
    {lat:35,lng:105,name:'Китай',flag:'🇨🇳'},
    {lat:22,lng:78,name:'Индия',flag:'🇮🇳'},
    {lat:10,lng:8,name:'Нигерия',flag:'🇳🇬'},
    {lat:-25,lng:27,name:'ЮАР',flag:'🇿🇦'},
    {lat:25,lng:45,name:'Саудовская Аравия',flag:'🇸🇦'},
    {lat:39,lng:35,name:'Турция',flag:'🇹🇷'},
    {lat:52,lng:0,name:'Англия',flag:'🇬🇧'},
    {lat:47,lng:2,name:'Франция',flag:'🇫🇷'},
    {lat:51,lng:10,name:'Германия',flag:'🇩🇪'},
    {lat:42,lng:12,name:'Италия',flag:'🇮🇹'},
    {lat:40,lng:-4,name:'Испания',flag:'🇪🇸'},
    {lat:62,lng:15,name:'Швеция',flag:'🇸🇪'},
    {lat:48,lng:-100,name:'Канада',flag:'🇨🇦'},
    {lat:38,lng:-97,name:'США',flag:'🇺🇸'},
    {lat:-15,lng:-50,name:'Бразилия',flag:'🇧🇷'},
    {lat:-35,lng:-64,name:'Аргентина',flag:'🇦🇷'},
    {lat:23,lng:-102,name:'Мексика',flag:'🇲🇽'},
    {lat:-25,lng:134,name:'Австралия',flag:'🇦🇺'},
    {lat:-41,lng:174,name:'НЗ',flag:'🇳🇿'},
    {lat:36,lng:138,name:'Япония',flag:'🇯🇵'},
    {lat:37,lng:127,name:'Корея',flag:'🇰🇷'},
    {lat:-5,lng:120,name:'Индонезия',flag:'🇮🇩'},
    {lat:13,lng:122,name:'Филиппины',flag:'🇵🇭'},
    {lat:24,lng:54,name:'ОАЭ',flag:'🇦🇪'},
    {lat:33,lng:44,name:'Ирак',flag:'🇮🇶'},
    {lat:32,lng:53,name:'Иран',flag:'🇮🇷'},
    {lat:28,lng:84,name:'Непал',flag:'🇳🇵'},
    {lat:24,lng:90,name:'Бангладеш',flag:'🇧🇩'},
    {lat:16,lng:100,name:'Таиланд',flag:'🇹🇭'},
    {lat:19,lng:96,name:'Мьянма',flag:'🇲🇲'},
    {lat:15,lng:108,name:'Вьетнам',flag:'🇻🇳'},
    {lat:4,lng:114,name:'Малайзия',flag:'🇲🇾'},
    {lat:-1,lng:-72,name:'Колумбия',flag:'🇨🇴'},
    {lat:-5,lng:-80,name:'Перу',flag:'🇵🇪'},
    {lat:-16,lng:-68,name:'Боливия',flag:'🇧🇴'},
    {lat:-33,lng:-71,name:'Чили',flag:'🇨🇱'},
    {lat:64,lng:-20,name:'Исландия',flag:'🇮🇸'},
    {lat:53,lng:-8,name:'Ирландия',flag:'🇮🇪'},
    {lat:47,lng:8,name:'Швейцария',flag:'🇨🇭'},
    {lat:48,lng:17,name:'Словакия',flag:'🇸🇰'},
    {lat:45,lng:20,name:'Сербия',flag:'🇷🇸'},
    {lat:42,lng:23,name:'Болгария',flag:'🇧🇬'},
    {lat:38,lng:24,name:'Греция',flag:'🇬🇷'},
    {lat:47,lng:25,name:'Румыния',flag:'🇷🇴'},
    {lat:49,lng:32,name:'Украина',flag:'🇺🇦'},
    {lat:52,lng:21,name:'Польша',flag:'🇵🇱'},
    {lat:54,lng:24,name:'Литва',flag:'🇱🇹'},
    {lat:57,lng:25,name:'Латвия',flag:'🇱🇻'},
    {lat:59,lng:26,name:'Эстония',flag:'🇪🇪'},
    {lat:10,lng:-5,name:'Гана',flag:'🇬🇭'},
    {lat:-20,lng:25,name:'Ботсвана',flag:'🇧🇼'},
    {lat:15,lng:-87,name:'Гондурас',flag:'🇭🇳'},
    {lat:10,lng:-84,name:'Коста-Рика',flag:'🇨🇷'},
    {lat:60,lng:-45,name:'Гренландия',flag:'🇬🇱'},
    {lat:54,lng:150,name:'Камчатка',flag:'🇷🇺'},
  ];

  /* ===== MAJOR RIVERS ===== */
  var rivers = [
    {name:'Нил',pts:[[32,28],[33,26],[34,24],[35,22],[36,20],[37,18],[38,16],[39,14],[38,12],[37,10],[36,8],[35,6],[34,4],[33,2],[32,0],[31,-2],[30,-4],[29,-6],[28,-8],[27,-10],[26,-12],[25,-14],[24,-16],[23,-18],[22,-20]]},
    {name:'Амазонка',pts:[[-74,-4],[-72,-2],[-70,0],[-68,2],[-66,4],[-64,6],[-62,8],[-60,10],[-58,8],[-56,6],[-54,4],[-52,2],[-50,0],[-48,-2],[-46,-4]]},
    {name:'Миссисипи',pts:[[-90,48],[-88,44],[-86,40],[-84,36],[-82,32],[-80,28],[-78,24],[-76,20],[-74,16],[-72,12],[-70,8],[-68,4],[-66,0]]},
    {name:'Обь',pts:[[70,55],[74,53],[78,51],[82,49],[86,47],[90,45],[94,43],[98,41],[102,39],[106,37],[110,35],[114,33],[118,31],[120,30]]},
    {name:'Енисей',pts:[[88,68],[90,64],[92,60],[94,56],[96,52],[98,48],[100,44],[102,40],[104,36],[106,32]]},
    {name:'Лена',pts:[[120,68],[122,64],[124,60],[126,56],[128,52],[130,48],[132,44],[134,40],[136,36],[138,32]]},
    {name:'Волга',pts:[[32,58],[36,56],[40,54],[44,52],[48,50],[52,48],[56,46],[60,44],[64,42],[68,40]]},
    {name:'Дунай',pts:[[0,48],[-2,46],[0,44],[2,42],[4,40],[6,38],[8,36],[10,34],[12,32],[14,30],[16,28],[18,26],[20,24],[22,22],[24,20],[26,18],[28,16]]},
    {name:'Ганг',pts:[[70,30],[74,26],[78,22],[82,18],[86,14],[90,10],[94,6],[98,2]]},
    {name:'Меконг',pts:[[98,22],[100,18],[102,14],[104,10],[106,6],[108,2],[110,-2]]},
    {name:'Замбези',pts:[[22,-10],[26,-14],[30,-18],[34,-22],[38,-26],[42,-30],[46,-34],[50,-38]]},
    {name:'Конго',pts:[[12,-6],[16,-2],[20,2],[24,6],[28,10],[30,12]]},
    {name:'Рейн',pts:[[10,48],[8,46],[6,44],[4,42],[2,40]]}
  ];

  /* ===== SEAS AND OCEANS ===== */
  var waterBodies = [
    {lat:0,lng:-30,name:'Атлантический\nокеан',size:'large'},
    {lat:0,lng:170,name:'Тихий\nокеан',size:'large'},
    {lat:-25,lng:70,name:'Индийский\nокеан',size:'large'},
    {lat:78,lng:0,name:'Северный\nЛедовитый\nокеан',size:'large'},
    {lat:-60,lng:0,name:'Южный\nокеан',size:'large'},
    {lat:32,lng:-5,name:'Средиземное\nморе',size:'medium'},
    {lat:42,lng:50,name:'Каспийское\nморе',size:'medium'},
    {lat:20,lng:55,name:'Аравийское\nморе',size:'medium'},
    {lat:10,lng:90,name:'Бенгальский\nзалив',size:'medium'},
    {lat:70,lng:40,name:'Баренцево\nморе',size:'small'},
    {lat:72,lng:80,name:'Карское\nморе',size:'small'},
    {lat:72,lng:120,name:'Море\nЛаптевых',size:'small'},
    {lat:70,lng:160,name:'Вост.-\nСибирское\nморе',size:'small'},
    {lat:35,lng:135,name:'Японское\nморе',size:'medium'},
    {lat:15,lng:115,name:'Южно-\nКитайское\nморе',size:'medium'},
    {lat:-10,lng:115,name:'Яванское\nморе',size:'small'}
  ];

  /* ===== TERRAIN ZONES ===== */
  var terrainZones = [
    // Sahara
    {type:'desert',pts:[[-15,30],[-10,28],[0,25],[10,25],[20,25],[30,25],[33,22],[30,20],[20,18],[10,18],[0,20],[-10,22],[-15,25]]},
    // Arabian
    {type:'desert',pts:[[35,30],[40,28],[50,25],[55,22],[52,18],[45,16],[38,18]]},
    // Central Asian
    {type:'desert',pts:[[55,40],[60,38],[70,37],[75,38],[70,42],[60,42]]},
    // Australian outback
    {type:'desert',pts:[[120,-20],[125,-22],[130,-24],[135,-22],[140,-20],[140,-25],[135,-28],[130,-28],[125,-26],[120,-24]]},
    // Gobi
    {type:'desert',pts:[[90,42],[100,43],[110,42],[115,40],[110,38],[100,38],[92,40]]},
    // Thar
    {type:'desert',pts:[[68,28],[72,28],[76,26],[74,24],[70,24]]},
    // Siberian tundra
    {type:'tundra',pts:[[60,68],[80,70],[100,72],[120,70],[140,68],[160,66],[180,65],[180,72],[150,74],[120,76],[90,74],[60,72]]},
    // Canadian tundra
    {type:'tundra',pts:[[-140,68],[-120,70],[-100,72],[-80,73],[-60,72],[-50,70],[-60,68],[-80,67],[-100,68],[-120,67],[-140,66]]},
    // Arctic ice
    {type:'ice',pts:[[-180,82],[-120,84],[-60,85],[0,86],[60,85],[120,84],[180,82],[180,90],[-180,90]]},
    // Antarctic ice
    {type:'ice',pts:[[-180,-65],[-150,-68],[-120,-70],[-90,-72],[-60,-70],[-30,-68],[0,-65],[30,-68],[60,-70],[90,-72],[120,-70],[150,-68],[180,-65],[180,-90],[-180,-90]]}
  ];

  /* ===== GENERATE EQUIRECTANGULAR TEXTURE ===== */
  var texW = 2880, texH = 1440;
  var texCanvas = document.createElement('canvas');
  texCanvas.width = texW;
  texCanvas.height = texH;
  var texCtx = texCanvas.getContext('2d');

  function lngToX(lng) { return ((lng + 180) / 360) * texW; }
  function latToY(lat) { return ((90 - lat) / 180) * texH; }

  // Ocean gradient
  var oceanGrd = texCtx.createLinearGradient(0, 0, 0, texH);
  oceanGrd.addColorStop(0, '#062038');
  oceanGrd.addColorStop(0.3, '#083050');
  oceanGrd.addColorStop(0.5, '#0a4068');
  oceanGrd.addColorStop(0.7, '#083050');
  oceanGrd.addColorStop(1, '#062038');
  texCtx.fillStyle = oceanGrd;
  texCtx.fillRect(0, 0, texW, texH);

  // Draw ALL continent polygons
  var landColors = {
    northAmerica: ['#2a7a3a','#228840'],
    southAmerica: ['#228840','#1a7a3a'],
    eurasia: ['#2a7a3a','#1a7a3a'],
    africa: ['#c8a040','#b89030'],
    australia: ['#c8a040','#b89030'],
    antarctica: ['#d0e8f0','#c0d8e8']
  };

  for (var continent in continents) {
    var rings = continents[continent];
    for (var r = 0; r < rings.length; r++) {
      var pts = rings[r];
      texCtx.beginPath();
      for (var i = 0; i < pts.length; i++) {
        var x = lngToX(pts[i][1]);
        var y = latToY(pts[i][0]);
        if (i === 0) texCtx.moveTo(x, y);
        else texCtx.lineTo(x, y);
      }
      texCtx.closePath();
      var colors = landColors[continent] || ['#2a7a3a','#228840'];
      var g = texCtx.createLinearGradient(0, latToY(70), 0, latToY(-60));
      g.addColorStop(0, colors[0]);
      g.addColorStop(1, colors[1]);
      texCtx.fillStyle = g;
      texCtx.fill();
      texCtx.strokeStyle = 'rgba(20,80,40,0.5)';
      texCtx.lineWidth = 2;
      texCtx.stroke();
    }
  }

  // Draw terrain zones
  var terrainColors = {desert:'#c8a850',tundra:'#6a8a5a',ice:'#d0e8f0'};
  for (var t = 0; t < terrainZones.length; t++) {
    var zone = terrainZones[t];
    texCtx.beginPath();
    for (var i = 0; i < zone.pts.length; i++) {
      var x = lngToX(zone.pts[i][1]);
      var y = latToY(zone.pts[i][0]);
      if (i === 0) texCtx.moveTo(x, y);
      else texCtx.lineTo(x, y);
    }
    texCtx.closePath();
    texCtx.fillStyle = terrainColors[zone.type];
    texCtx.globalAlpha = zone.type === 'ice' ? 0.4 : 0.3;
    texCtx.fill();
    texCtx.globalAlpha = 1.0;
  }

  // Draw rivers
  texCtx.strokeStyle = 'rgba(20,60,120,0.5)';
  texCtx.lineWidth = 3;
  for (var r = 0; r < rivers.length; r++) {
    texCtx.beginPath();
    for (var i = 0; i < rivers[r].pts.length; i++) {
      var x = lngToX(rivers[r].pts[i][1]);
      var y = latToY(rivers[r].pts[i][0]);
      if (i === 0) texCtx.moveTo(x, y);
      else texCtx.lineTo(x, y);
    }
    texCtx.stroke();
  }

  // Add texture noise
  var texData = texCtx.getImageData(0, 0, texW, texH);
  var texPixels = texData.data;
  for (var i = 0; i < texPixels.length; i += 16) {
    var noise = (Math.random() - 0.5) * 4;
    texPixels[i] = Math.max(0, Math.min(255, texPixels[i] + noise));
    texPixels[i + 1] = Math.max(0, Math.min(255, texPixels[i + 1] + noise));
    texPixels[i + 2] = Math.max(0, Math.min(255, texPixels[i + 2] + noise));
  }
  texCtx.putImageData(texData, 0, 0);

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

        var texX = Math.floor(((lng + 180) / 360) * texW) % texW;
        var texY = Math.floor(((90 - lat) / 180) * texH);
        texY = Math.max(0, Math.min(texH - 1, texY));

        var tIdx = (texY * texW + texX) * 4;
        var tr = texPixels[tIdx];
        var tg = texPixels[tIdx + 1];
        var tb = texPixels[tIdx + 2];

        var diff = Math.max(0, nx*-lx + ny*-ly + nz*lz);
        diff = diff * 0.65 + 0.35;

        var fresnel = 1 - nz;
        fresnel = fresnel * fresnel * 0.3;

        var hx = -lx, hy = -ly, hz = 1 + lz;
        var hLen = Math.sqrt(hx*hx + hy*hy + hz*hz);
        hx /= hLen; hy /= hLen; hz /= hLen;
        var spec = Math.pow(Math.max(0, nx*hx + ny*hy + nz*hz), 32) * 0.3;

        var r = Math.min(255, Math.round(tr*diff + spec*255 + fresnel*40));
        var g = Math.min(255, Math.round(tg*diff + spec*255 + fresnel*80));
        var b = Math.min(255, Math.round(tb*diff + spec*200 + fresnel*120));

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
    if (r.z < 0) return null; // behind sphere
    return {x: cx + r.x, y: cy + r.y, z: r.z};
  }

  /* ===== DRAW 2D LABELS OVERLAY ===== */
  function drawLabels() {
    // Water labels
    for (var w = 0; w < waterBodies.length; w++) {
      var wb = waterBodies[w];
      var pos = projectToScreen(wb.lat, wb.lng);
      if (!pos) continue;
      var fontSize = wb.size === 'large' ? 11 : wb.size === 'medium' ? 9 : 7;
      ctx.font = '700 ' + fontSize + 'px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var lines = wb.name.split('\n');
      for (var li = 0; li < lines.length; li++) {
        var ly = pos.y + (li - (lines.length-1)/2) * (fontSize * 1.2);
        ctx.strokeStyle = 'rgba(0,20,60,0.8)';
        ctx.lineWidth = 3;
        ctx.strokeText(lines[li], pos.x, ly);
        ctx.fillStyle = 'rgba(60,150,230,0.75)';
        ctx.fillText(lines[li], pos.x, ly);
      }
    }

    // Country labels with flags
    for (var cl = 0; cl < countryLabels.length; cl++) {
      var lb = countryLabels[cl];
      var pos = projectToScreen(lb.lat, lb.lng);
      if (!pos) continue;
      // Flag (ABOVE name)
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lb.flag, pos.x, pos.y - 14);
      // Name (below flag)
      ctx.font = '700 10px "Segoe UI", system-ui, sans-serif';
      ctx.strokeStyle = 'rgba(0,0,0,0.9)';
      ctx.lineWidth = 3;
      ctx.strokeText(lb.name, pos.x, pos.y + 1);
      ctx.fillStyle = '#fff';
      ctx.fillText(lb.name, pos.x, pos.y + 1);
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
