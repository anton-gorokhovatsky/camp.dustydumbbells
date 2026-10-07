import { photos } from "./content.js";
import {
  clamp,
  clockText,
  environmentAt,
  normalizeWeather,
  phaseLabels,
  placeClock,
  SCENARIOS,
  weatherLabel,
  weatherURL,
  windDirection,
} from "./environment.js";

const root = document.documentElement;
const $ = (selector) => document.querySelector(selector);
const range = $("#day-range");
const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
let savedMotion;
try {
  savedMotion = localStorage.getItem("dd-motion");
} catch {
  /* Storage is optional. */
}
const state = {
  minutes: null,
  scenario: "actual",
  weather: null,
  motion: !motionQuery.matches && savedMotion !== "off",
  frozenDate: new Date(),
  loading: false,
  fetchTime: 0,
};
let environment;
let weatherFailed = false;

const captions = {
  morning: "Пробежка по набережной.\nМоре рядом, горы впереди.",
  day: "Зайти в гавань. Посмотреть на лодки.\nОставить время для себя.",
  evening: "Проводить солнце за горы.\nОстаться ещё ненадолго.",
  night: "Гавань стихает, свет уходит.\nЗавтра снова будет утро.",
};

function updateScene(announce = false) {
  const now = state.motion ? new Date() : state.frozenDate;
  if (
    state.weather &&
    Date.now() - Date.parse(state.weather.stamp) > 2 * 60 * 60 * 1000
  ) {
    state.weather = null;
    weatherFailed = true;
  }
  environment = environmentAt({
    date: now,
    minutes: state.minutes,
    weather: state.weather,
    scenario: state.scenario,
  });
  const { solar, minute, phase, daylight } = environment;
  root.dataset.phase = phase;
  root.dataset.motion = state.motion ? "on" : "off";
  root.dataset.weather = state.scenario;
  for (const [property, value] of Object.entries(environment.css))
    root.style.setProperty(property, value);
  $('meta[name="theme-color"]').content = environment.css["--paper"];
  $("#local-time").textContent = clockText(minute);
  $("#phase-label").textContent = phaseLabels[phase];
  $("#today-label").textContent = new Intl.DateTimeFormat("ru", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Istanbul",
  }).format(now);
  $("#time-mode").textContent =
    state.minutes !== null
      ? "Просмотр дня в Анталье"
      : state.motion
        ? "Сейчас в Анталье"
        : "Анталья · время остановлено";
  $("#sunrise").textContent = clockText(solar.sunrise);
  $("#sunset").textContent = clockText(solar.sunset);
  const length = solar.sunset - solar.sunrise;
  $("#daylight-label").textContent =
    `${Math.floor(length / 60)} ч ${length % 60} мин света`;
  range.value = String(minute);
  range.setAttribute(
    "aria-valuetext",
    `${clockText(minute)}, ${phaseLabels[phase].toLowerCase()}, Анталья`,
  );
  $("#live-time").hidden = state.minutes === null;
  for (const button of document.querySelectorAll("[data-now]"))
    button.hidden = state.minutes === null;
  for (const label of document.querySelectorAll("[data-scene-time]"))
    label.textContent = `${clockText(minute)} · ${state.minutes === null ? "сейчас" : "просмотр"}`;
  for (const button of document.querySelectorAll(
    "#motion-toggle,[data-motion-toggle]",
  )) {
    button.textContent = state.motion
      ? "Остановить движение"
      : "Продолжить движение";
    button.setAttribute("aria-pressed", String(!state.motion));
    button.title =
      "Управляет движением среды и автоматическим обновлением времени и погоды";
  }
  const x = 24 + 552 * daylight;
  const y = 155 - 566 * daylight * (1 - daylight);
  $("#sun-point").setAttribute("cx", x.toFixed(1));
  $("#sun-point").setAttribute("cy", y.toFixed(1));
  $("#sun-point").style.opacity =
    minute >= solar.sunrise && minute <= solar.sunset ? "1" : ".35";
  $("#sun-ray").setAttribute("d", `M${x.toFixed(1)} ${y.toFixed(1)} V155`);
  for (const button of document.querySelectorAll("[data-time]"))
    button.setAttribute(
      "aria-pressed",
      String(state.minutes !== null && button.dataset.time === phase),
    );
  $("#scene-caption").textContent = captions[phase];
  $(".scene-note").textContent = phase === "night"
    ? "Ночной свет — обработка дневного кадра DD"
    : "Архивные кадры DD / свет — художественный просмотр";
  const scenario = SCENARIOS[state.scenario];
  const weather = state.weather;
  $("#weather-description").textContent = scenario
    ? scenario.label
    : weatherLabel(weather);
  $("#weather-temperature").textContent =
    !scenario && weather ? `${Math.round(weather.temperature)}°` : "";
  $("#weather-wind").textContent = scenario
    ? "Художественный просмотр"
    : weather
      ? `Ветер ${weather.wind.toLocaleString("ru")} м/с · ${windDirection(weather.direction)}`
      : state.loading
        ? "Получаем погоду…"
        : "Без погодных данных";
  $("#weather-metrics").textContent =
    !scenario && weather
      ? `Облачность ${weather.clouds}%, влажность ${weather.humidity}%${weather.uv !== null ? `, UV ${weather.uv.toLocaleString("ru")} (прогноз на текущий час)` : ""}.`
      : "";
  $("#weather-source").textContent = scenario
    ? "Это эскиз погоды для знакомства с атмосферой, а не наблюдение или прогноз. Вернись к реальной погоде, чтобы увидеть доступные данные."
    : weather
      ? `Open-Meteo, ${weather.time} по времени Антальи. Погодная модель для побережья Коньяалты; при просмотре другого часа эти данные остаются текущими.`
      : state.loading
        ? "Загружаем данные Open-Meteo для побережья Коньяалты. Местный свет уже работает."
        : "Погода сейчас недоступна. Солнце рассчитывается для побережья Коньяалты; спокойная рябь и цвет сохраняют настроение места.";
  $("#weather-retry").hidden = !weatherFailed || state.loading;
  $("#time-explanation").textContent =
    state.minutes === null
      ? "Свет следует сегодняшнему дню в Анталье. Это настроение места, а не прогноз на октябрь 2027 года."
      : "Меняется свет в выбранный час сегодняшнего дня. Погодные данные остаются последними полученными; расписание кэмпа не меняется.";
  if (announce)
    $("#scene-announcement").textContent =
      `${clockText(minute)}, ${phaseLabels[phase]}. ${scenario ? scenario.label : "Анталья"}.`;
  renderWater();
}

async function loadWeather() {
  if (state.loading) return;
  state.loading = true;
  updateScene();
  try {
    const response = await fetch(weatherURL(), {
      signal: AbortSignal.timeout(8000),
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    if (!response.ok) throw new Error("Weather unavailable");
    const weather = normalizeWeather(await response.json());
    if (!weather) throw new Error("Weather data is stale or incomplete");
    state.weather = weather;
    state.fetchTime = Date.now();
    weatherFailed = false;
  } catch {
    weatherFailed = true;
  } finally {
    state.loading = false;
    updateScene();
  }
}

range.addEventListener("input", () => {
  state.minutes = Number(range.value);
  updateScene();
});
range.addEventListener("change", () => updateScene(true));
for (const button of document.querySelectorAll("[data-time]")) {
  button.addEventListener("click", () => {
    const { sunrise, sunset, noon } = environment.solar;
    state.minutes = {
      morning: sunrise + 35,
      day: noon,
      evening: sunset - 12,
      night: Math.min(1380, sunset + 150),
    }[button.dataset.time];
    updateScene(true);
  });
}
$("#live-time").addEventListener("click", () => {
  state.minutes = null;
  state.frozenDate = new Date();
  updateScene(true);
  range.focus();
});
for (const button of document.querySelectorAll("[data-now]"))
  button.addEventListener("click", () => {
    state.minutes = null;
    state.frozenDate = new Date();
    updateScene(true);
    button
      .closest(".scene-controls,.footer-atmosphere")
      ?.querySelector(`[data-time="${environment.phase}"]`)
      ?.focus({ preventScroll: true });
  });
for (const button of document.querySelectorAll(
  "#motion-toggle,[data-motion-toggle]",
))
  button.addEventListener("click", () => {
    state.motion = !state.motion;
    state.frozenDate = new Date();
    try {
      localStorage.setItem("dd-motion", state.motion ? "on" : "off");
    } catch {
      /* Nonessential preference. */
    }
    updateScene();
    $("#scene-announcement").textContent = state.motion
      ? "Движение и обновление времени продолжены."
      : "Движение и обновление времени остановлены. Выбранный свет сохранён.";
    scheduleWater();
  });
motionQuery.addEventListener("change", (event) => {
  if (event.matches) {
    state.motion = false;
    state.frozenDate = new Date();
    updateScene();
  }
  scheduleWater();
});
$("#weather-scene").addEventListener("change", (event) => {
  state.scenario = event.target.value;
  updateScene(true);
});
$("#weather-retry").addEventListener("click", loadWeather);

const menu = $(".mobile-menu");
for (const link of menu.querySelectorAll("a"))
  link.addEventListener("click", () => {
    menu.open = false;
  });
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu.open) {
    menu.open = false;
    menu.querySelector("summary").focus();
  }
});
document.addEventListener("click", (event) => {
  if (menu.open && !menu.contains(event.target)) menu.open = false;
});
const mobileWidth = matchMedia("(max-width: 720px)");
mobileWidth.addEventListener("change", (event) => {
  if (!event.matches) menu.open = false;
});

// Original full-size photographs, with ordinary image links when JS is off.
const dialog = $("#gallery");
let photoIndex = 0;
let photoTrigger;
const assetBase = new URL("{{BASE}}assets/", location.origin);
function showPhoto(index) {
  photoIndex = clamp(index, 0, photos.length - 1);
  const photo = photos[photoIndex];
  $("#gallery-image").src = new URL(photo.file, assetBase).href;
  $("#gallery-image").alt = photo.alt;
  $("#gallery-caption").textContent = photo.alt;
  $("#gallery-counter").textContent =
    `${photoIndex + 1} / ${photos.length} · Из поездки DD`;
  // Keep controls focusable at the ends; cycling avoids focus loss on disable.
}
for (const trigger of document.querySelectorAll("[data-photo]")) {
  trigger.addEventListener("click", (event) => {
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      typeof dialog.showModal !== "function"
    )
      return;
    event.preventDefault();
    photoTrigger = trigger;
    showPhoto(Number(trigger.dataset.photo));
    dialog.showModal();
    $("#gallery-close").focus();
  });
}
$("#gallery-close").addEventListener("click", () => dialog.close());
$("#gallery-prev").addEventListener("click", () =>
  showPhoto((photoIndex - 1 + photos.length) % photos.length),
);
$("#gallery-next").addEventListener("click", () =>
  showPhoto((photoIndex + 1) % photos.length),
);
dialog.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    showPhoto((photoIndex - 1 + photos.length) % photos.length);
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    showPhoto((photoIndex + 1) % photos.length);
  }
});
dialog.addEventListener("close", () =>
  photoTrigger?.focus({ preventScroll: true }),
);

// Water, rain and air are decorative layers; all content remains normal HTML.
// Stop work offscreen, in background tabs, in dialogs, and when paused.
const waters = [...document.querySelectorAll(".water-canvas, .rain-canvas, .air-canvas")].map(
  (canvas) => ({
    canvas,
    context: canvas.getContext("2d"),
    visible: false,
    width: 0,
    height: 0,
  }),
);
let frame = 0;
let lastFrame = 0;
let waterTime = 0;
function drawWater(water, time) {
  if (!water.context || !water.width || !environment) return;
  const { context: ctx, width, height } = water;
  const { wind, direction, rain } = environment;
  ctx.clearRect(0, 0, width, height);
  const amplitude = 2 + clamp(wind / 15) * 14;
  const drift = Math.sin((direction * Math.PI) / 180);
  const color = environment.phase === "night" ? "178,210,220" : "255,242,211";
  // Flowing lines suggest the air around the postcard. Wind changes their
  // curvature and drift; this shares the sea's pause and visibility lifecycle.
  if (water.canvas.classList.contains("air-canvas")) {
    ctx.strokeStyle = environment.css["--accent"];
    ctx.lineWidth = 0.65;
    for (let row = 0; row < 30; row++) {
      const baseline = (row / 29) * height;
      ctx.beginPath();
      for (let x = 0; x <= width + 8; x += 8) {
        const reach = Math.exp(-Math.pow((x / width - 0.74) * 3, 2));
        const curl = Math.sin(row * 0.11 + time * drift * 0.09);
        const y = baseline + reach * (
          Math.sin(x / width * 5 + row * 0.045 + time * 0.08) * height * 0.17 +
          curl * amplitude * 2
        );
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  if (water.canvas.classList.contains("water-canvas")) {
    for (let row = 0; row < 34; row++) {
      const depth = row / 34;
      const baseline = height * (0.43 + depth * 0.62);
      ctx.beginPath();
      for (let x = -20; x <= width + 20; x += 12) {
        const y =
          baseline +
          Math.sin(
            x * (0.012 - depth * 0.006) + row * 1.65 + time * drift * 0.7,
          ) *
            amplitude *
            (0.3 + depth) +
          Math.sin(x * 0.032 + time * 0.65 + row) * 2;
        if (x === -20) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(${color},${0.08 + depth * 0.18})`;
      ctx.lineWidth = 0.5 + depth * 0.7;
      ctx.stroke();
    }
  }
  if (rain > 0 && water.canvas.classList.contains("rain-canvas")) {
    ctx.strokeStyle = `rgba(${color},${rain * 0.3})`;
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 140; i++) {
      const x =
        ((((i * 137.3 + time * drift * 27) % (width + 80)) + width + 80) %
          (width + 80)) -
        40;
      const y = (i * 83.9 + time * 96) % height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + drift * 12, y + 18);
      ctx.stroke();
    }
  }
}
function renderWater() {
  for (const water of waters) if (water.visible) drawWater(water, waterTime);
}
function tick(timestamp) {
  frame = 0;
  if (
    !state.motion ||
    document.hidden ||
    dialog.open ||
    !waters.some((water) => water.visible)
  )
    return;
  if (timestamp - lastFrame >= 33) {
    waterTime +=
      (Math.min(60, timestamp - lastFrame) / 1000) *
      (1 + (environment?.wind ?? 1.5) * 0.06);
    lastFrame = timestamp;
    renderWater();
  }
  frame = requestAnimationFrame(tick);
}
function scheduleWater() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  if (
    state.motion &&
    !document.hidden &&
    !dialog.open &&
    waters.some((water) => water.visible)
  ) {
    lastFrame = performance.now();
    frame = requestAnimationFrame(tick);
  }
}
const resize = new ResizeObserver((entries) => {
  for (const { target, contentRect } of entries) {
    const water = waters.find((item) => item.canvas === target);
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    water.width = contentRect.width;
    water.height = contentRect.height;
    target.width = Math.round(water.width * ratio);
    target.height = Math.round(water.height * ratio);
    water.context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawWater(water, waterTime);
  }
});
const visibility = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const water = waters.find((item) => item.canvas === entry.target);
    water.visible = entry.isIntersecting;
    if (water.visible) drawWater(water, waterTime);
  }
  scheduleWater();
});
for (const water of waters) {
  resize.observe(water.canvas);
  visibility.observe(water.canvas);
}
new MutationObserver(scheduleWater).observe(dialog, {
  attributes: true,
  attributeFilter: ["open"],
});
document.addEventListener("visibilitychange", () => {
  scheduleWater();
  if (!document.hidden && state.motion) {
    updateScene();
    if (Date.now() - state.fetchTime > 30 * 60 * 1000) loadWeather();
  }
});
setInterval(() => {
  if (!state.motion || document.hidden || dialog.open) return;
  updateScene();
  if (Date.now() - state.fetchTime > 30 * 60 * 1000) loadWeather();
}, 60_000);

$("[data-gallery-label]").textContent = `Все ${photos.length} фотографий`;
$(".interactive-time").hidden = false;
$(".weather-control").hidden = false;
for (const controls of document.querySelectorAll(
  ".scene-controls, .motion-controls",
)) controls.hidden = false;
$(".footer-atmosphere").hidden = false;
updateScene();
loadWeather();
