const fs = require("fs-extra");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const { Readable, Transform } = require("stream");
const { pipeline } = require("stream/promises");

const TMP = path.join(__dirname, "tmp_sing");
const CACHE = path.join(__dirname, "cache_sing");

const YTDLP = process.env.YTDLP_PATH || "yt-dlp";
const MAX_MIN = Number(process.env.SING_MAX_MIN || 10);
const MAX_MB = Number(process.env.SING_MAX_MB || 24);
const QUEUE_MAX = Number(process.env.SING_QUEUE_MAX || 5);
const FORMAT = String(process.env.SING_FORMAT || "m4a").toLowerCase() === "mp3" ? "mp3" : "m4a";
const CONCURRENCY = Number(process.env.SING_CONCURRENCY || 2);
const CACHE_MAX = Number(process.env.SING_CACHE_MAX || 25);
const EXTRA = String(process.env.YTDLP_EXTRA || "").split(/\s+/).filter(Boolean);
const DL_TIMEOUT = 90 * 1000;
const ENGINES = String(process.env.SING_ENGINES || "innertube,ytdlcore,ytdlp").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);

const log = (...a) => console.log(`[SING]`, ...a);
const has = (cmd, flag = "--version") => { try { return spawnSync(cmd, [flag], { stdio: "ignore", timeout: 8000 }).status === 0; } catch (e) { return false; } };
const safeUnlink = (f) => { try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch (e) {} };

let _yd = null;
const hasYtdlp = () => (_yd === null ? (_yd = has(YTDLP)) : _yd);
const withTimeout = (p, ms, label) => { let t; return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`${label} timeout`)), ms); })]).finally(() => clearTimeout(t)); };

let _ff = null;
const hasFfmpeg = () => (_ff === null ? (_ff = has("ffmpeg", "-version")) : _ff);

function sweep() {
  try {
    fs.ensureDirSync(TMP);
    for (const f of fs.readdirSync(TMP)) {
      const p = path.join(TMP, f);
      if (Date.now() - fs.statSync(p).mtimeMs > 3600 * 1000) safeUnlink(p);
    }
  } catch (e) {}
}

function run(cmd, args, timeout = DL_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    const t = setTimeout(() => { p.kill("SIGKILL"); reject(new Error("download timeout")); }, timeout);
    p.stdout.on("data", (d) => { out += d; if (out.length > 1e6) out = out.slice(-1e5); });
    p.stderr.on("data", (d) => { err += d; if (err.length > 1e6) err = err.slice(-1e5); });
    p.on("error", (e) => { clearTimeout(t); reject(e); });
    p.on("close", (code) => { clearTimeout(t); resolve({ code, out, err }); });
  });
}

// ---------------- Engine 3: yt-dlp ----------------
async function viaYtDlp(query) {
  const args = [
    `ytsearch3:${query}`,
    "--no-playlist", "--no-warnings", "--no-progress", "--ignore-config",
    "-N", "4", "--socket-timeout", "15", "--retries", "2", "--extractor-retries", "1", "--no-part", "--no-mtime",
    "--match-filter", `duration<=${MAX_MIN * 60} & !is_live`,
    "--max-downloads", "1",
    "-f", `bestaudio[ext=m4a][filesize<?${MAX_MB}M]/bestaudio[acodec^=mp4a]/bestaudio[ext=m4a]/bestaudio`,
    "--max-filesize", `${MAX_MB}M`,
    "-o", path.join(TMP, "%(id)s.%(ext)s"),
    "--no-simulate", "--print", "%(id)s\t%(title)s\t%(duration)s",
    ...EXTRA,
  ];
  const r = await run(YTDLP, args);
  if (r.code !== 0 && r.code !== 101) throw new Error(`yt-dlp failed: ${r.err.split("\n").filter(Boolean).slice(-2).join(" | ") || "code " + r.code}`);
  const line = r.out.split("\n").map((x) => x.trim()).filter(Boolean).pop();
  if (!line) throw new Error("NOT_FOUND");
  const [id, title, dur] = line.split("\t");
  const file = fs.readdirSync(TMP).map((f) => path.join(TMP, f)).find((f) => path.basename(f).startsWith(id + ".") && !/\.(part|ytdl)$/i.test(f));
  if (!file) throw new Error("NOT_FOUND");
  return { file, title: title || query, seconds: Number(dur) || 0 };
}

// ---------------- Stream Saver ----------------
async function saveStream(readable, file) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), DL_TIMEOUT);
  const cap = new Transform({
    transform(chunk, _enc, cb) {
      this.size = (this.size || 0) + chunk.length;
      cb(this.size > MAX_MB * 1048576 ? new Error("TOO_BIG") : null, chunk);
    },
  });
  try {
    await pipeline(readable, cap, fs.createWriteStream(file), { signal: ac.signal });
  } catch (e) {
    safeUnlink(file);
    throw e;
  } finally {
    clearTimeout(t);
  }
}

// ---------------- Engine 1: youtubei.js (innertube) ----------------
let _yt = null;
function innertube() {
  if (!_yt) {
    _yt = import("youtubei.js")
      .then((m) => (m.Innertube || (m.default && m.default.Innertube)).create({ generate_session_locally: true }))
      .catch((e) => { _yt = null; throw e; });
  }
  return _yt;
}
const durOf = (x) => (x && x.duration && typeof x.duration.seconds === "number" ? x.duration.seconds : Number(x && x.length_seconds) || 0);

async function viaInnertube(query) {
  let yt;
  try { yt = await withTimeout(innertube(), 20000, "innertube start"); } catch (e) { throw new Error("NO_ENGINE"); }
  const res = await withTimeout(yt.search(query, { type: "video" }), 12000, "search");
  const list = res.results || res.videos || [];
  const v = list.find((x) => x && (x.id || x.video_id) && durOf(x) > 0 && durOf(x) <= MAX_MIN * 60 && x.is_live !== true);
  if (!v) throw new Error("NOT_FOUND");
  const id = String(v.id || v.video_id);
  const file = path.join(TMP, `${id}.m4a`);
  fs.ensureDirSync(TMP);
  let lastErr;
  for (const client of ["IOS", "ANDROID", null]) {
    try {
      const opts = { type: "audio", quality: "best", format: "mp4" };
      if (client) opts.client = client;
      const web = await withTimeout(yt.download(id, opts), 20000, "stream");
      const rs = web && typeof web.getReader === "function" ? Readable.fromWeb(web) : web;
      await saveStream(rs, file);
      return { file, title: (v.title && (v.title.text || String(v.title))) || query, seconds: durOf(v) };
    } catch (e) {
      lastErr = e;
      if (e && e.message === "TOO_BIG") throw e;
    }
  }
  throw lastErr || new Error("NOT_FOUND");
}

// ---------------- Engine 2: yt-search + ytdl-core ----------------
async function viaYtdlCore(query) {
  let ytsr, ytdl;
  try { ytsr = require("yt-search"); ytdl = require("@distube/ytdl-core"); } catch (e) { throw new Error("NO_ENGINE"); }
  const res = await withTimeout(ytsr(query), 12000, "search");
  const v = (res.videos || []).find((x) => x.seconds > 0 && x.seconds <= MAX_MIN * 60);
  if (!v) throw new Error("NOT_FOUND");
  const file = path.join(TMP, `${v.videoId}.m4a`);
  fs.ensureDirSync(TMP);
  const stream = ytdl(v.url, { filter: (f) => f.hasAudio && !f.hasVideo && f.container === "mp4", quality: "highestaudio", highWaterMark: 1 << 24, dlChunkSize: 0 });
  await saveStream(stream, file);
  return { file, title: v.title || query, seconds: v.seconds };
}

// ---------------- Converter ----------------
async function toAudio(info) {
  const base = info.file.replace(/\.[^.]+$/, "");
  const ext = path.extname(info.file).toLowerCase();
  if (hasFfmpeg() && (FORMAT === "mp3" ? ext !== ".mp3" : !/\.(m4a|mp4)$/.test(ext))) {
    const out = base + (FORMAT === "mp3" ? ".mp3" : ".m4a");
    const args = FORMAT === "mp3"
      ? ["-y", "-loglevel", "error", "-i", info.file, "-vn", "-map_metadata", "-1", "-c:a", "libmp3lame", "-b:a", "128k", out]
      : ["-y", "-loglevel", "error", "-i", info.file, "-vn", "-map_metadata", "-1", "-c:a", "aac", "-b:a", "128k", out];
    const r = await run("ffmpeg", args, 3 * 60 * 1000);
    safeUnlink(info.file);
    if (r.code !== 0) { safeUnlink(out); throw new Error("convert failed: " + r.err.split("\n").filter(Boolean).pop()); }
    return { ...info, file: out };
  }
  if (/\.(mp3|m4a|aac|mp4)$/.test(ext)) return info;
  safeUnlink(info.file);
  throw new Error("NEED_FFMPEG");
}

// ---------------- Cache System ----------------
const keyOf = (q) => q.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const idxFile = path.join(CACHE, "index.json");
let idx = {};
try { idx = JSON.parse(fs.readFileSync(idxFile, "utf8")); } catch (e) {}
const saveIdx = () => { try { fs.ensureDirSync(CACHE); fs.writeFileSync(idxFile, JSON.stringify(idx)); } catch (e) {} };

function cacheGet(query) {
  const e = idx[keyOf(query)];
  if (!e) return null;
  try { if (fs.statSync(e.file).size > 10 * 1024) { e.t = Date.now(); return { file: e.file, title: e.title, seconds: e.seconds, cached: true }; } } catch (err) {}
  delete idx[keyOf(query)]; saveIdx();
  return null;
}

function cachePut(query, info) {
  try {
    fs.ensureDirSync(CACHE);
    const file = path.join(CACHE, path.basename(info.file));
    if (file !== info.file) { fs.copyFileSync(info.file, file); safeUnlink(info.file); }
    idx[keyOf(query)] = { file, title: info.title, seconds: info.seconds, t: Date.now() };
    const keys = Object.keys(idx).sort((x, y) => idx[x].t - idx[y].t);
    while (keys.length > CACHE_MAX) { const k = keys.shift(); const used = Object.keys(idx).some((o) => o !== k && idx[o].file === idx[k].file); if (!used) safeUnlink(idx[k].file); delete idx[k]; }
    saveIdx();
    return { ...info, file, cached: true };
  } catch (e) { return info; }
}

const ENGINE_FN = {
  innertube: viaInnertube,
  ytdlcore: viaYtdlCore,
  ytdlp: (q) => { if (!hasYtdlp()) throw new Error("NO_ENGINE"); return viaYtDlp(q); }
};

async function fetchSong(query) {
  const hit = cacheGet(query);
  if (hit) return hit;
  sweep();
  let info, lastErr;
  for (const name of ENGINES) {
    const fn = ENGINE_FN[name];
    if (!fn) continue;
    try { info = await fn(query); if (info) break; }
    catch (e) {
      lastErr = e;
      if (!(e && (e.message === "NO_ENGINE" || e.message === "NOT_FOUND"))) log(`${name} failed (${e.message}) -> next engine`);
    }
  }
  if (!info) throw lastErr || new Error("NOT_FOUND");
  info = await toAudio(info);
  const size = fs.statSync(info.file).size;
  if (size > MAX_MB * 1024 * 1024) { safeUnlink(info.file); throw new Error("TOO_BIG"); }
  if (size < 10 * 1024) { safeUnlink(info.file); throw new Error("NOT_FOUND"); }
  return cachePut(query, info);
}

// Queue Management
const queue = [];
let active = 0;

function pump(api) {
  while (active < CONCURRENCY && queue.length) {
    active++;
    job(api, queue.shift()).catch((e) => log("Queue error:", e)).finally(() => { active--; pump(api); });
  }
}

async function job(api, { threadID, query, messageID }) {
  let info;
  const react = (emoji) => api.setMessageReaction(emoji, messageID, () => {}, true);
  try {
    info = await fetchSong(query);
    const audioStream = fs.createReadStream(info.file);
    
    // Audio পাঠানো হচ্ছে - কোনো প্রকার Text Msg ছাড়াই
    await api.sendMessage({ attachment: audioStream }, threadID);
    react("✅");
  } catch (e) {
    log("Error processing song:", e.message);
    react("❌");
  } finally {
    if (info && !info.cached) safeUnlink(info.file);
  }
}

// ---------------- GoatBot Module Definition ----------------
module.exports = {
  config: {
    name: "sing",
    aliases: ["song", "music"],
    version: "2.0.0",
    author: "MJ Hamim",
    countDown: 5,
    role: 0,
    shortDescription: "Play and download audio songs",
    longDescription: "Download audio track instantly with multi-engine fallback and caching.",
    category: "media",
    guide: {
      en: "{p}sing <song name>"
    }
  },

  onStart: async function ({ api, event, args }) {
    const threadID = event.threadID;
    const messageID = event.messageID;
    const query = args.join(" ").replace(/\s+/g, " ").trim().slice(0, 120);

    const react = (emoji) => api.setMessageReaction(emoji, messageID, () => {}, true);

    if (!query) return react("❓");
    if (queue.length >= QUEUE_MAX) return react("❌");

    react("⏳"); // Reaction added while working
    queue.push({ threadID, query, messageID });
    pump(api);
  }
};
