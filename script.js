
const $ = id => document.getElementById(id);

const video = $("video");
const statusText = $("status");
const captureBtn = $("capture");
const resultBox = $("result");
const confirmation = $("confirmation");
const emotionSelect = $("emotionSelect");
const saveBtn = $("save");
const forest = $("forest");
const plantsLayer = $("plantsLayer");

const STORAGE_KEY = "kokoro_forest_records_v1";

const emotions = {
  happy: "喜び",
  sad: "悲しみ",
  angry: "怒り",
  fear: "恐れ",
  surprise: "驚き",
  disgust: "嫌悪",
  neutral: "中立"
};

const seasons = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬"
};

const palettes = {
  spring: {
    happy: "#f6a8c6",
    sad: "#a4a5e8",
    angry: "#e77d89",
    fear: "#b6a9e1",
    surprise: "#f4ca78",
    disgust: "#82b69b",
    neutral: "#a7cf8b"
  },
  summer: {
    happy: "#f5cc4e",
    sad: "#87b4e8",
    angry: "#ed7569",
    fear: "#c4a1df",
    surprise: "#f5a5c3",
    disgust: "#6ba98b",
    neutral: "#5faf70"
  },
  autumn: {
    happy: "#eeb56c",
    sad: "#a3a4c6",
    angry: "#cb6e56",
    fear: "#bd9b83",
    surprise: "#f2d18b",
    disgust: "#8baf83",
    neutral: "#d3a15f"
  },
  winter: {
    happy: "#e9b3ca",
    sad: "#9db5d6",
    angry: "#c58eaa",
    fear: "#c7c0df",
    surprise: "#f4e3ad",
    disgust: "#8eb4ac",
    neutral: "#a3bdba"
  }
};

let records = loadRecords();
let pendingEmotion = null;
let calendarDate = new Date();
calendarDate.setDate(1);

function loadRecords() {
  try {
    const value = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function persistRecords(nextRecords) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(nextRecords)
  );
  records = nextRecords;
}

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

function getSeason(date) {
  const month = date.getMonth() + 1;

  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

function plantEmoji(emotion) {
  const map = {
    happy: "🌸",
    sad: "🪻",
    angry: "🌹",
    fear: "🌿",
    surprise: "🌻",
    disgust: "🌵",
    neutral: "🌳"
  };
  return map[emotion] || "🌱";
}

// 既存の絵文字データも読み込めるようにする
function normalizeRecord(record) {
  if (!record || !record.date || !emotions[record.emotion]) {
    return null;
  }
  return {
    date: record.date,
    emotion: record.emotion,
    plant: record.plant || plantEmoji(record.emotion)
  };
}

records = records.map(normalizeRecord).filter(Boolean);

// SVGの共通部品
function svgWrap(content) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg"
         viewBox="0 0 100 120"
         aria-hidden="true">
      ${content}
    </svg>
  `;
}


// 丸い樹冠の高木
function tallTreeSVG(color) {
  return svgWrap(`
    <path d="M46 112 V56"
          stroke="#95735a" stroke-width="13"
          stroke-linecap="round"/>
    <circle cx="30" cy="52" r="25" fill="${color}"/>
    <circle cx="69" cy="50" r="26" fill="${color}"/>
    <circle cx="49" cy="29" r="30" fill="${color}"/>
    <circle cx="38" cy="29" r="9"
            fill="white" opacity="0.18"/>
  `);
}

// 小さな丸い木
function smallTreeSVG(color) {
  return svgWrap(`
    <rect x="45" y="65" width="10" height="47"
          rx="5" fill="#98775c"/>
    <ellipse cx="50" cy="60" rx="36" ry="31"
             fill="${color}"/>
    <ellipse cx="39" cy="49" rx="13" ry="9"
             fill="white" opacity="0.14"/>
  `);
}

// 三角形の針葉樹
function pineTreeSVG(color) {
  return svgWrap(`
    <rect x="45" y="85" width="10" height="28"
          fill="#92715c"/>
    <path d="M50 8 L80 62 H67 L88 93
             H12 L33 62 H20 Z"
          fill="${color}"
          stroke="#ffffff"
          stroke-width="2"
          stroke-linejoin="round"/>
  `);
}

// アジサイのような丸い花房を持つ低木
function hydrangeaSVG(color) {
  let blossoms = "";

  const positions = [
    [30, 58], [47, 45], [65, 53],
    [23, 76], [44, 70], [67, 75],
    [53, 88]
  ];

  for (const [x, y] of positions) {
    blossoms += `
      <circle cx="${x}" cy="${y}" r="13"
              fill="${color}"
              stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="${x}" cy="${y}" r="3"
              fill="#fff1b5"/>
    `;
  }

  return svgWrap(`
    <path d="M50 110 L50 70
             M50 90 L28 73
             M50 88 L70 72"
          fill="none"
          stroke="#608c5f"
          stroke-width="6"
          stroke-linecap="round"/>
    <ellipse cx="31" cy="94" rx="20" ry="9"
             fill="#77ad75"/>
    <ellipse cx="69" cy="94" rx="20" ry="9"
             fill="#77ad75"/>
    ${blossoms}
  `);
}

// 密集した丸い低木
function bushSVG(color) {
  return svgWrap(`
    <path d="M15 110 Q4 80 28 66
             Q30 39 53 50
             Q76 38 81 68
             Q100 81 86 110 Z"
          fill="${color}"/>
    <circle cx="36" cy="72" r="10"
            fill="white" opacity="0.12"/>
  `);
}

// 表情に応じた植物の種類
function getTreeType(emotion, season) {
  if (emotion === "happy") {
    return {
      spring: "sakura",
      summer: "hydrangea",
      autumn: "osmanthus",
      winter: "camellia"
    }[season];
  }

  const types = {
    sad: "dead",
    angry: "spiky",
    fear: "small",
    surprise: "tall",
    disgust: "thorny",
    neutral: "normal"
  };

  return types[emotion] || "normal";
}

function createPlantSVG(emotion, season) {
  const type = getTreeType(emotion, season);
  const color = palettes[season][emotion];

  switch (type) {
    case "sakura":
      return floweringTreeSVG("#f5a9c8", "#fff0f5");
    case "hydrangea":
      return hydrangeaSVG("#91a8e8");
    case "osmanthus":
      return floweringTreeSVG("#e9aa4c", "#ffe38a");
    case "camellia":
      return floweringTreeSVG("#477c60", "#e46d82");
    case "dead":
      return deadTreeSVG();
    case "spiky":
      return spikyTreeSVG();
    case "thorny":
      return thornyBushSVG();
    case "small":
      return smallTreeSVG(color);
    case "tall":
      return tallTreeSVG(color);
    default:
      return smallTreeSVG(color);
  }
}



function floweringTreeSVG(leafColor, flowerColor) {
  const flowers = [
    [29, 42], [44, 24], [64, 35],
    [77, 53], [25, 66], [48, 55],
    [61, 70], [42, 78]
  ];

  let flowerShapes = "";

  for (const [x, y] of flowers) {
    flowerShapes += `
      <circle cx="${x}" cy="${y}" r="5"
              fill="${flowerColor}"/>
      <circle cx="${x}" cy="${y}" r="2"
              fill="#f6d17a"/>
    `;
  }

  return svgWrap(`
    <path d="M48 111 L48 63"
          stroke="#967257"
          stroke-width="12"
          stroke-linecap="round"/>

    <circle cx="30" cy="55" r="25" fill="${leafColor}"/>
    <circle cx="69" cy="54" r="27" fill="${leafColor}"/>
    <circle cx="49" cy="34" r="31" fill="${leafColor}"/>

    ${flowerShapes}
  `);
}


function deadTreeSVG() {
  return svgWrap(`
    <path d="
      M50 112
      Q46 88 50 66
      L44 42
      M49 70 L26 51
      L20 31
      M31 55 L14 57
      M49 67 L72 45
      L78 23
      M67 50 L88 55
      M44 42 L39 20
    "
      fill="none"
      stroke="#8d735f"
      stroke-width="8"
      stroke-linecap="round"
      stroke-linejoin="round"/>

    <path d="M50 110 Q47 85 50 65"
          fill="none"
          stroke="#b69a80"
          stroke-width="2"/>
  `);
}


function spikyTreeSVG() {
  return svgWrap(`
    <rect x="45" y="85" width="10" height="28"
          fill="#765b48"/>

    <path d="
      M50 5
      L65 35
      L60 35
      L83 62
      L69 59
      L94 92
      L50 84
      L6 92
      L31 59
      L17 62
      L40 35
      L35 35
      Z
    "
      fill="#3f7860"
      stroke="#2e5e4c"
      stroke-width="3"
      stroke-linejoin="miter"/>

    <path d="M50 14 L50 82"
          stroke="#7daf8b"
          stroke-width="2"
          opacity="0.6"/>
  `);
}


function thornyBushSVG() {
  const spikes = [];

  for (let i = 0; i < 9; i++) {
    const x = 15 + i * 9;
    const y = 65 - 19 * Math.sin(i / 8 * Math.PI);

    spikes.push(`
      <path d="M${x - 6} ${y + 10}
               L${x} ${y - 12}
               L${x + 6} ${y + 10}"
            fill="#618b67"/>
    `);
  }

  return svgWrap(`
    ${spikes.join("")}
    <path d="M13 110
             Q4 75 30 65
             Q43 39 58 55
             Q83 50 90 85
             L86 110 Z"
          fill="#719b78"/>
    <path d="M30 91 L23 78
             M61 77 L70 65
             M75 100 L86 90"
          stroke="#3e654b"
          stroke-width="3"
          stroke-linecap="round"/>
  `);
}


// 表示中の月を管理
let forestDate = new Date();
forestDate.setDate(1);

// 日付ごとの固定位置

function positionForDay(day) {
  const index = day - 1;

  // 1〜16日：奥の地面
  if (index < 16) {
    return {
      x: 5 + index * 6,
      bottom: 29,
      row: "back"
    };
  }

  // 17〜31日：手前の地面
  return {
    x: 7 + (index - 16) * 6.1,
    bottom: 9,
    row: "front"
  };
}

function renderForest() {
  plantsLayer.replaceChildren();

  const year = forestDate.getFullYear();
  const month = forestDate.getMonth();

  $("forestMonthTitle").textContent =
    `${year}年 ${month + 1}月`;

  const monthRecords = records.filter(record => {
    const date = parseDate(record.date);
    return date.getFullYear() === year &&
           date.getMonth() === month;
  });

  $("count").textContent =
    `${year}年${month + 1}月：${monthRecords.length}日分`;

  const season = getSeason(forestDate);
  forest.className = `forest ${season}`;

  $("seasonLabel").textContent =
    `${seasons[season]}の森 ・ ${monthRecords.length}本`;

  // 奥の木から順に描画
  const sorted = [...monthRecords].sort(
    (a, b) => parseDate(a.date).getDate() -
              parseDate(b.date).getDate()
  );

  for (const record of sorted) {
    const day = parseDate(record.date).getDate();
    const position = positionForDay(day);
    const type = getTreeType(record.emotion);

    const plant = document.createElement("div");
    plant.className =
      `plant ${position.row === "back" ? "back-row" : "front-row"}`;

    if (type === "tall" || type === "pine") {
      plant.classList.add("tall");
    } else if (type === "small") {
      plant.classList.add("small");
    } else {
      plant.classList.add("shrub");
    }

    plant.style.left = `${position.x}%`;
    plant.style.bottom = `${position.bottom}%`;
    plant.style.zIndex =
      position.row === "back" ? "2" : "4";

    // 木の種類と色は記録日の季節で決める
    const recordSeason = getSeason(parseDate(record.date));

    plant.innerHTML = createPlantSVG(
      record.emotion,
      recordSeason
    );

    plant.title =
      `${record.date}：${emotions[record.emotion]}`;

    plantsLayer.appendChild(plant);
  }
}


// カレンダー描画
function renderCalendar() {
  const grid = $("calendarGrid");
  grid.replaceChildren();

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  $("calendarTitle").textContent =
    `${year}年 ${month + 1}月`;

  const weekdays = [
    "日", "月", "火", "水", "木", "金", "土"
  ];

  weekdays.forEach(day => {
    const el = document.createElement("div");
    el.className = "weekday";
    el.textContent = day;
    grid.appendChild(el);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth =
    new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const blank = document.createElement("div");
    blank.className = "calendar-empty";
    grid.appendChild(blank);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day, 12);
    const key = dateKey(date);
    const record = records.find(r => r.date === key);

    const cell = document.createElement("button");
    cell.className = "calendar-day";

    if (record) cell.classList.add("has-record");
    if (key === dateKey(new Date())) {
      cell.classList.add("today");
    }

    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = day;
    cell.appendChild(number);

    if (record) {
      const plant = document.createElement("span");
      plant.className = "day-plant";
      plant.textContent = plantEmoji(record.emotion);
      cell.appendChild(plant);
    }

    cell.addEventListener("click", () => {
      showDayDetail(key, record);
    });

    grid.appendChild(cell);
  }
}

function showDayDetail(key, record) {
  const detail = $("dayDetail");

  if (!record) {
    detail.textContent =
      `${key}：この日の記録はありません。`;
    return;
  }

  detail.textContent =
    `${key}　${plantEmoji(record.emotion)} ` +
    `${emotions[record.emotion]} の記録`;
}

// 表情選択
for (const [key, name] of Object.entries(emotions)) {
  const option = document.createElement("option");
  option.value = key;
  option.textContent = name;
  emotionSelect.appendChild(option);
}

// カメラとモデルの起動
async function initialize() {
  try {
    if (typeof faceapi === "undefined") {
      throw new Error("face-api.jsが読み込めません");
    }

    statusText.textContent = "AIモデルを準備中...";

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("./models"),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri("./models"),
      faceapi.nets.faceExpressionNet.loadFromUri("./models")
    ]);

    statusText.textContent = "カメラを起動中...";

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });

    video.srcObject = stream;
    await video.play();

    captureBtn.disabled = false;
    statusText.textContent = "準備完了！";

  } catch (error) {
    console.error(error);
    statusText.textContent = "起動エラー：" + error.message;
  }
}

// 表情判定
captureBtn.addEventListener("click", async () => {
  captureBtn.disabled = true;
  confirmation.hidden = true;
  pendingEmotion = null;
  resultBox.textContent = "表情を分析しています...";

  try {
    const detection = await faceapi
      .detectSingleFace(
        video,
        new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: 0.3
        })
      )
      .withFaceLandmarks(true)
      .withFaceExpressions();

    if (!detection) {
      resultBox.textContent =
        "顔が見つかりません。もう一度撮影してください。";
      return;
    }

    const sorted = Object.entries(detection.expressions)
      .sort((a, b) => b[1] - a[1]);

    const [emotion, confidence] = sorted[0];

    pendingEmotion = emotion;
    emotionSelect.value = emotion;

    resultBox.textContent =
      `推定：${emotions[emotion]} ` +
      `(${(confidence * 100).toFixed(1)}%)`;

    confirmation.hidden = false;

  } catch (error) {
    console.error(error);
    resultBox.textContent =
      "判定エラー：" + error.message;
  } finally {
    captureBtn.disabled = false;
  }
});

// 今日の植物を保存
saveBtn.addEventListener("click", () => {
  if (!pendingEmotion) return;

  const today = new Date();
  const key = dateKey(today);
  const emotion = emotionSelect.value;

  const record = {
    date: key,
    emotion,
    plant: plantEmoji(emotion)
  };

  const updated = records
    .filter(r => r.date !== key)
    .concat(record)
    .sort((a, b) => a.date.localeCompare(b.date));

  try {
    persistRecords(updated);

    forestDate = new Date();
    forestDate.setDate(1);
    calendarDate = new Date(forestDate);
    mapYear = forestDate.getFullYear();

    renderForest();
    renderCalendar();

    if (yearlyMode) renderYearMap();

    confirmation.hidden = true;
    pendingEmotion = null;

    resultBox.textContent =
      "🌱 今日の植物が森に生まれました！";

  } catch (error) {
    alert("保存エラー：" + error.message);
  }
});


$("prevMonth").addEventListener("click", () => {
  moveForestMonth(-1);
});

$("nextMonth").addEventListener("click", () => {
  moveForestMonth(1);
});


// デモデータ生成
$("demo").addEventListener("click", () => {
  const keys = Object.keys(emotions);
  let updated = [...records];

  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - i);

    const key = dateKey(date);
    const emotion = keys[
      Math.floor(Math.random() * keys.length)
    ];

    updated = updated.filter(r => r.date !== key);
    updated.push({
      date: key,
      emotion,
      plant: plantEmoji(emotion)
    });
  }

  updated.sort((a, b) => a.date.localeCompare(b.date));

  try {
    persistRecords(updated);
    renderForest();
    renderCalendar();
    if (yearlyMode) renderYearMap();
  } catch (error) {
    alert("保存エラー：" + error.message);
  }
});

// 全記録削除
$("clear").addEventListener("click", () => {
  if (!confirm("すべての記録を削除しますか？")) return;

  try {
    localStorage.removeItem(STORAGE_KEY);
    records = [];
    renderForest();
    renderCalendar();
    if (yearlyMode) renderYearMap();
    $("dayDetail").textContent =
      "日付を選ぶと記録が表示されます。";
  } catch (error) {
    alert("削除エラー：" + error.message);
  }
});



const SVG_NS = "http://www.w3.org/2000/svg";
let yearlyMode = false;
let mapYear = new Date().getFullYear();

function svgElement(tag, attrs = {}) {
  const element = document.createElementNS(SVG_NS, tag);

  for (const [key, value] of Object.entries(attrs)) {
    element.setAttribute(key, String(value));
  }

  return element;
}

function polar(cx, cy, r, angle) {
  const rad = angle * Math.PI / 180;
  return {
    x: cx + Math.cos(rad) * r,
    y: cy + Math.sin(rad) * r
  };
}


// 俯瞰で見た木を描画
function createTopDownTree(emotion, season, x, y, size = 11) {
  const group = svgElement("g", {
    transform: `translate(${x}, ${y})`
  });

  const type = getTreeType(emotion, season);
  const color = palettes[season][emotion];

  function addCircle(cx, cy, r, fill, stroke = "none") {
    group.appendChild(svgElement("circle", {
      cx, cy, r, fill, stroke,
      "stroke-width": 1
    }));
  }

  function addPath(d, fill, stroke = "none", width = 1) {
    group.appendChild(svgElement("path", {
      d, fill, stroke,
      "stroke-width": width,
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    }));
  }

  // 枯れ木：放射状の枝
  if (type === "dead") {
    for (let i = 0; i < 7; i++) {
      const angle = i * Math.PI * 2 / 7;
      const x2 = Math.cos(angle) * size;
      const y2 = Math.sin(angle) * size;

      addPath(
        `M0 0 L${x2} ${y2}`,
        "none",
        "#8d735f",
        2.5
      );
    }
    addCircle(0, 0, 3, "#98735d");
    return group;
  }

  // 怒り：ギザギザした樹冠
  if (type === "spiky" || type === "thorny") {
    const points = [];
    const count = type === "spiky" ? 12 : 9;

    for (let i = 0; i < count * 2; i++) {
      const angle = i * Math.PI / count;
      const r = i % 2 === 0 ? size : size * 0.55;
      points.push([
        Math.cos(angle) * r,
        Math.sin(angle) * r
      ]);
    }

    addPath(
      "M" + points.map(p => p.join(" ")).join(" L") + " Z",
      color,
      "#426b4b",
      1
    );

    return group;
  }

  // 通常の木・花木：丸い樹冠
  const crownSize = type === "hydrangea" ? size * 0.85 : size;

  addCircle(0, 0, crownSize, color, "#ffffff");

  // 樹冠の立体感
  addCircle(
    -crownSize * 0.25,
    -crownSize * 0.25,
    crownSize * 0.4,
    "#ffffff33"
  );

  // 季節の花木
  if (["sakura", "hydrangea", "osmanthus", "camellia"].includes(type)) {
    const flowerColor = {
      sakura: "#fff1f6",
      hydrangea: "#d7c9f8",
      osmanthus: "#ffe29a",
      camellia: "#e95f7b"
    }[type];

    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * 2 / 5;
      const radius = crownSize * 0.55;

      addCircle(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        crownSize * 0.19,
        flowerColor
      );
    }
  }

  return group;
}

function sectorPath(cx, cy, inner, outer, start, end) {
  const a = polar(cx, cy, outer, start);
  const b = polar(cx, cy, outer, end);
  const c = polar(cx, cy, inner, end);
  const d = polar(cx, cy, inner, start);

  return `
    M ${a.x} ${a.y}
    A ${outer} ${outer} 0 0 1 ${b.x} ${b.y}
    L ${c.x} ${c.y}
    A ${inner} ${inner} 0 0 0 ${d.x} ${d.y}
    Z
  `;
}



const DIORAMA = {
  cx: 450,
  cy: 335,
  rx: 345,
  ry: 185,
  thickness: 28
};

// 真上から見た円を、斜め俯瞰の楕円へ投影
function projectGround(radius, angle) {
  const rad = angle * Math.PI / 180;

  return {
    x: DIORAMA.cx + Math.cos(rad) * radius,
    y: DIORAMA.cy + Math.sin(rad) *
       radius * (DIORAMA.ry / DIORAMA.rx)
  };
}

// 扇形の地面を斜め俯瞰で描く
function dioramaSectorPath(start, end, inner = 0) {
  const outer = DIORAMA.rx;
  const steps = 24;
  const points = [];

  for (let i = 0; i <= steps; i++) {
    const angle = start + (end - start) * i / steps;
    points.push(projectGround(outer, angle));
  }

  if (inner === 0) {
    points.push({
      x: DIORAMA.cx,
      y: DIORAMA.cy
    });
  } else {
    for (let i = steps; i >= 0; i--) {
      const angle = start + (end - start) * i / steps;
      points.push(projectGround(inner, angle));
    }
  }

  return points.map((p, i) =>
    `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`
  ).join(" ") + " Z";
}

// 既存の木のSVGを年間マップに組み込む
function createDioramaTree(record, x, y, scale) {
  const season = getSeason(parseDate(record.date));

  // 月間モードと同じイラスト生成関数
  const svgString = createPlantSVG(record.emotion, season);

  const parser = new DOMParser();
  const documentSVG = parser.parseFromString(
    svgString,
    "image/svg+xml"
  );

  if (documentSVG.querySelector("parsererror")) {
    return null;
  }

  const sourceSVG = documentSVG.documentElement;

  const group = svgElement("g", {
    class: "year-tree",
    transform:
      `translate(${x} ${y}) ` +
      `scale(${scale}) translate(-50 -112)`
  });

  // svgWrapのviewBoxは 0 0 100 120
  // 木の根元を (50,112) として地面に固定
  for (const child of [...sourceSVG.children]) {
    group.appendChild(
      document.importNode(child, true)
    );
  }

  const title = svgElement("title");
  title.textContent =
    `${record.date}：${emotions[record.emotion]}`;
  group.appendChild(title);

  return group;
}

// 日付から年間マップ内の固定位置を決める
function yearTreePosition(month, day) {
  const start = -90 + month * 30;

  // 1〜31日を3つの帯に配置
  const ring = Math.floor((day - 1) / 11);
  const slot = (day - 1) % 11;

  // 中央寄りから外側へ
  const radii = [145, 220, 290];
  const radius = radii[ring];

  // 各月30度の範囲内に配置
  const angle = start + 3.5 + slot * 2.3;

  return projectGround(radius, angle);
}


function renderYearMap() {
  const container = $("yearMap");
  container.replaceChildren();

  $("yearTitle").textContent = `${mapYear}年`;

  const svg = svgElement("svg", {
    viewBox: "0 0 900 680",
    role: "group",
    "aria-label": `${mapYear}年の年間ジオラマ`
  });

  const { cx, cy, rx, ry, thickness } = DIORAMA;

  // 背景
  const bg = svgElement("rect", {
    x: 0, y: 0,
    width: 900, height: 680,
    rx: 24,
    fill: "#eef5f1"
  });
  svg.appendChild(bg);

  // 地面の影
  svg.appendChild(svgElement("ellipse", {
    cx,
    cy: cy + thickness + 15,
    rx: rx + 12,
    ry: ry + 10,
    fill: "#607968",
    opacity: 0.16
  }));

  // 土台の側面
  svg.appendChild(svgElement("ellipse", {
    cx,
    cy: cy + thickness,
    rx,
    ry,
    fill: "#8caa7b"
  }));

  // 手前側だけに土の厚みを描く
  svg.appendChild(svgElement("path", {
    d: `
      M ${cx - rx} ${cy}
      A ${rx} ${ry} 0 0 0 ${cx + rx} ${cy}
      L ${cx + rx} ${cy + thickness}
      A ${rx} ${ry} 0 0 1 ${cx - rx} ${cy + thickness}
      Z
    `,
    fill: "#8caa7b"
  }));

  // 上面の円盤
  svg.appendChild(svgElement("ellipse", {
    cx, cy, rx, ry,
    fill: "#c4d9b4"
  }));

  const seasonColors = {
    spring: "#e9cbd5",
    summer: "#91c58d",
    autumn: "#dfbd87",
    winter: "#d8e9ed"
  };

  const sectorGroups = [];
  const allTrees = [];

  // 12か月分の地面を描画
  for (let month = 0; month < 12; month++) {
    const season = getSeason(
      new Date(mapYear, month, 1)
    );

    const start = -90 + month * 30;
    const end = start + 30;

    const group = svgElement("g", {
      class: "year-sector",
      tabindex: "0",
      role: "button",
      "aria-label": `${month + 1}月の森を表示`
    });

    const ground = svgElement("path", {
      d: dioramaSectorPath(start, end),
      fill: seasonColors[season],
      stroke: "#ffffff",
      "stroke-width": 2.5,
      class: "year-ground-edge"
    });

    group.appendChild(ground);

    const openMonth = () => {
      forestDate = new Date(mapYear, month, 1);
      calendarDate = new Date(mapYear, month, 1);

      setForestMode(false);
      renderForest();
      renderCalendar();
    };

    group.addEventListener("click", openMonth);
    group.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openMonth();
      }
    });

    svg.appendChild(group);
    sectorGroups.push(group);

    // この月の記録を取得
    const monthRecords = records.filter(record => {
      const date = parseDate(record.date);
      return date.getFullYear() === mapYear &&
             date.getMonth() === month;
    });

    for (const record of monthRecords) {
      const day = parseDate(record.date).getDate();
      const position = yearTreePosition(month, day);

      // 奥の木は少し小さく、手前は大きく
      const depth = (
        position.y - (cy - ry)
      ) / (ry * 2);

      const type = getTreeType(record.emotion, season);

      let scale = 0.30 + depth * 0.12;

      if (type === "hydrangea" ||
          type === "thorny" ||
          type === "small") {
        scale *= 0.82;
      }

      allTrees.push({
        record,
        x: position.x,
        y: position.y,
        scale,
        month
      });
    }
  }

  // 木の影を描画
  const shadowLayer = svgElement("g", {
    "pointer-events": "none"
  });

  // 奥から手前へ並べる
  allTrees.sort((a, b) => a.y - b.y);

  for (const tree of allTrees) {
    shadowLayer.appendChild(svgElement("ellipse", {
      cx: tree.x + 3,
      cy: tree.y + 2,
      rx: 12 * tree.scale / 0.35,
      ry: 4 * tree.scale / 0.35,
      fill: "#476b4a",
      opacity: 0.18
    }));
  }

  svg.appendChild(shadowLayer);

  // 木を奥から手前に描画
  const treeLayer = svgElement("g", {
    "pointer-events": "none"
  });

  for (const tree of allTrees) {
    const element = createDioramaTree(
      tree.record,
      tree.x,
      tree.y,
      tree.scale
    );

    if (element) treeLayer.appendChild(element);
  }

  svg.appendChild(treeLayer);

  // 中央の広場
  const center = svgElement("ellipse", {
    cx, cy,
    rx: 82,
    ry: 44,
    fill: "#f9f5e9",
    stroke: "#ffffff",
    "stroke-width": 3
  });
  svg.appendChild(center);

  const title = svgElement("text", {
    x: cx,
    y: cy - 5,
    "text-anchor": "middle",
    "font-size": 20,
    "font-weight": "bold",
    fill: "#58745f"
  });
  title.textContent = "こころの森";
  svg.appendChild(title);

  const yearText = svgElement("text", {
    x: cx,
    y: cy + 20,
    "text-anchor": "middle",
    "font-size": 16,
    fill: "#819583"
  });
  yearText.textContent = `${mapYear}年`;
  svg.appendChild(yearText);

  // 月ラベルを円盤の外周に配置
  for (let month = 0; month < 12; month++) {
    const middle = -90 + month * 30 + 15;
    const p = projectGround(375, middle);

    const label = svgElement("text", {
      x: p.x,
      y: p.y + 5,
      "text-anchor": "middle",
      "font-size": 16,
      "font-weight": "bold",
      fill: "#536c58",
      "pointer-events": "none"
    });

    label.textContent = `${month + 1}月`;
    svg.appendChild(label);
  }

  container.appendChild(svg);
}


function setForestMode(isYearly) {
  yearlyMode = isYearly;

  $("monthlyView").hidden = isYearly;
  $("yearlyView").hidden = !isYearly;

  $("monthlyMode").className =
    isYearly ? "secondary" : "";
  $("yearlyMode").className =
    isYearly ? "" : "secondary";

  if (isYearly) renderYearMap();
}

$("monthlyMode").addEventListener("click", () => {
  setForestMode(false);
});

$("yearlyMode").addEventListener("click", () => {
  mapYear = forestDate.getFullYear();
  setForestMode(true);
});

function moveForestMonth(offset) {
  forestDate = new Date(
    forestDate.getFullYear(),
    forestDate.getMonth() + offset,
    1
  );

  calendarDate = new Date(
    forestDate.getFullYear(),
    forestDate.getMonth(),
    1
  );

  renderForest();
  renderCalendar();
}

$("prevForestMonth").addEventListener("click", () => {
  moveForestMonth(-1);
});

$("nextForestMonth").addEventListener("click", () => {
  moveForestMonth(1);
});

$("prevYear").addEventListener("click", () => {
  mapYear--;
  renderYearMap();
});

$("nextYear").addEventListener("click", () => {
  mapYear++;
  renderYearMap();
});


// 起動
renderForest();
renderCalendar();
initialize();