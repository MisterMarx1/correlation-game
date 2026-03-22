import { useState, useEffect, useRef } from "react";

const W = 8;
const H = 8;
const MAX_LIFE = 10;
const ROUNDS = 10;
const BASE_TURN = 11000;

const ALL_PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];

function k(x, y) { return `${x},${y}`; }
function isPrime(n) {
  n = Math.abs(n);
  if (n < 2) return false;
  if (n < 4) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) if (n % i === 0 || n % (i + 2) === 0) return false;
  return true;
}
function randVal(maxPrime = 97) { 
  const primes = ALL_PRIMES.filter(p => p <= maxPrime);
  return primes[Math.floor(Math.random() * primes.length)];
}
function adj(a, b) { return Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1 && (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 0); }

function isComposite(n) {
  if (n < 4) return false;
  return !isPrime(n);
}

function genTargets(maxPrime = 97) {
  const t = [];
  for (let i = 0; i < ROUNDS; i++) {
    const diff = i;
    const types = [
      () => ({ label: `Σ = composite (${Math.floor(Math.random() * Math.min(20, maxPrime)) + 4})`, type: "sum", val: Math.floor(Math.random() * Math.min(20, maxPrime)) + 4, min: 3 }),
      () => ({ label: `Σ = composite (${Math.floor(Math.random() * Math.min(40, maxPrime * 2)) + 10})`, type: "sum", val: Math.floor(Math.random() * Math.min(40, maxPrime * 2)) + 10, min: 3 }),
      () => ({ label: `Σ is composite`, type: "composite", val: 0, min: 3 }),
      () => ({ label: `Σ ≡ 0 mod ${3 + Math.floor(Math.random() * 4)}`, type: "mod", val: 3 + Math.floor(Math.random() * 4), min: 3 }),
      () => ({ label: `Σ = composite (min 4)`, type: "composite", val: 0, min: 4 }),
      () => ({ label: `Σ = composite (${Math.floor(Math.random() * Math.min(60, maxPrime * 3)) + 20})`, type: "sum", val: Math.floor(Math.random() * Math.min(60, maxPrime * 3)) + 20, min: 3 + Math.floor(diff / 3) }),
    ];
    const pick = diff < 2 ? types[Math.floor(Math.random() * 2)]()
      : diff < 5 ? types[Math.floor(Math.random() * 4)]()
      : types[Math.floor(Math.random() * types.length)]();
    t.push(pick);
  }
  return t;
}

function checkTarget(tgt, values) {
  if (values.length < (tgt.min || 3)) return false;
  const s = values.reduce((a, b) => a + b, 0);
  if (tgt.type === "sum") return isComposite(s) && s === tgt.val;
  if (tgt.type === "composite") return isComposite(s);
  if (tgt.type === "mod") return s !== 0 && s % tgt.val === 0;
  return false;
}

function initBoard(maxPrime = 97) {
  const b = {};
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      b[k(x, y)] = { val: randVal(maxPrime), life: MAX_LIFE, dead: false };
  return b;
}

const LBL = { fontSize: 9, letterSpacing: 3, color: "#333350", textTransform: "uppercase", marginBottom: 3 };

const CONTROL_ITEMS = [
  {
    title: "DRAG",
    body: "Click and hold on a cell, then drag through adjacent cells (diagonals allowed) to draw a connected path."
  },
  {
    title: "RELEASE",
    body: "Release the mouse button to submit the path. The path must satisfy the target condition shown on the right."
  },
  {
    title: "ESC",
    body: "Press the Escape key to cancel the current path selection and start over."
  }
];

const RULE_ITEMS = [
  {
    title: "PRIME BOARD",
    body: "Board contains only prime numbers. Each cell starts with 10 life that drains every turn. Cells die at 0 life."
  },
  {
    title: "PATH DRAWING",
    body: "Drag through adjacent cells (diagonals allowed) to draw a connected path. Release to submit the path."
  },
  {
    title: "TARGET CONDITIONS",
    body: "Path must satisfy the target condition shown on the right. Common targets: sum equals composite number, sum is composite, or sum divisible by a number."
  },
  {
    title: "CELL REFRESH",
    body: "Used cells refresh with new prime values and full life. Strategic path selection is key to survival."
  },
  {
    title: "SURVIVAL",
    body: "Survive 10 rounds to win. Each round gets faster with less turn time. Balance speed and accuracy."
  }
];

function RuleCard({ item }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "10px 14px",
        backgroundColor: "rgba(15,23,42,0.6)",
        borderRadius: 6,
        borderLeft: "3px solid #9b5de5"
      }}
    >
      <span style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", fontFamily: "'Georgia', serif" }}>
        {item.title}
      </span>
      <span style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5, fontFamily: "'Georgia', serif" }}>
        {item.body}
      </span>
    </div>
  );
}

function RulesPanel({ items, maxWidth = 480 }) {
  return (
    <div
      style={{
        maxWidth,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        width: "100%"
      }}
    >
      {items.map((item) => (
        <RuleCard key={item.title} item={item} />
      ))}
    </div>
  );
}

export default function SigmaPrime() {
  const [, bump] = useState(0);
  const re = () => bump(c => c + 1);
  const [showRules, setShowRules] = useState(false);
  const [showControls, setShowControls] = useState(false);

  const g = useRef({
    board: {}, sel: [], score: 0, round: 0, turn: 0,
    targets: [], gameOver: false, won: false, started: false,
    flash: null, combo: 0, totalPaths: 0, lastTurn: 0, timeLeft: BASE_TURN,
    dragging: false, shakeUntil: 0, clearAnim: [], turnTime: BASE_TURN,
    deadCount: 0, maxPrime: 97,
  }).current;

  const timerRef = useRef(null);
  const boardRef = useRef(null);

  function turnTime() { return Math.max(4000, BASE_TURN - g.round * 700); }

  function doTurn() {
    let died = 0;
    for (const ky in g.board) {
      const c = g.board[ky];
      if (!c.dead) { c.life -= 1; if (c.life <= 0) { c.dead = true; c.life = 0; died++; } }
    }
    g.deadCount += died;
    g.turn += 1; g.sel = []; g.dragging = false;
    let alive = false;
    for (const ky in g.board) if (!g.board[ky].dead) { alive = true; break; }
    if (!alive) { g.gameOver = true; stopTimer(); }
    g.lastTurn = Date.now(); g.turnTime = turnTime(); g.timeLeft = g.turnTime;
    re();
  }

  function startTimer() {
    stopTimer();
    g.lastTurn = Date.now(); g.turnTime = turnTime(); g.timeLeft = g.turnTime;
    timerRef.current = setInterval(() => {
      const el = Date.now() - g.lastTurn;
      if (el >= g.turnTime) doTurn();
      g.timeLeft = Math.max(0, g.turnTime - el);
      re();
    }, 80);
  }

  function stopTimer() { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } }

  function isPath(sel) {
    if (sel.length < 3) return false;
    for (let i = 0; i < sel.length - 1; i++) if (!adj(sel[i], sel[i + 1])) return false;
    return new Set(sel.map(s => k(s.x, s.y))).size === sel.length;
  }

  function tryClose() {
    const sel = g.sel;
    if (!isPath(sel)) return false;
    const vals = sel.map(s => g.board[k(s.x, s.y)].val);
    const tgt = g.targets[g.round];
    if (!checkTarget(tgt, vals)) {
      g.flash = { text: "NOT SATISFIED", bad: true };
      g.shakeUntil = Date.now() + 400;
      setTimeout(() => { g.flash = null; re(); }, 800);
      g.sel = []; g.combo = 0; g.dragging = false; re(); return false;
    }
    const pathSum = vals.reduce((a, b) => a + b, 0);
    g.combo += 1;
    const pts = sel.length * 40 + Math.abs(pathSum) * 8 + g.combo * 25 + g.round * 15;
    g.score += pts; g.totalPaths += 1;
    g.clearAnim = sel.map(s => ({ x: s.x, y: s.y, t: Date.now() }));
    setTimeout(() => { g.clearAnim = []; re(); }, 500);
    for (const s of sel) {
      const c = g.board[k(s.x, s.y)];
      c.val = randVal(g.maxPrime); c.life = MAX_LIFE; c.dead = false;
    }
    g.deadCount = Object.values(g.board).filter(c => c.dead).length;
    g.flash = { text: `+${pts}${g.combo > 1 ? ` ×${g.combo}` : ""} [Σ=${pathSum}]`, bad: false };
    setTimeout(() => { g.flash = null; re(); }, 1100);
    g.sel = []; g.dragging = false;
    g.round += 1;
    if (g.round >= ROUNDS) { g.won = true; g.gameOver = true; stopTimer(); re(); return true; }
    g.lastTurn = Date.now(); g.turnTime = turnTime(); g.timeLeft = g.turnTime;
    re(); return true;
  }

  function cellFromEvent(e) {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cellW = rect.width / W, cellH = rect.height / H;
    const mx = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const my = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    const cx = Math.floor(mx / cellW), cy = Math.floor(my / cellH);
    if (cx < 0 || cx >= W || cy < 0 || cy >= H) return null;
    return { x: cx, y: cy };
  }

  function addToSel(x, y) {
    const c = g.board[k(x, y)];
    if (!c || c.dead) return;
    const sel = g.sel;
    const idx = sel.findIndex(s => s.x === x && s.y === y);
    if (idx > 0) { g.sel = sel.slice(0, idx + 1); re(); return; }
    if (sel.length === 0 || adj(sel[sel.length - 1], { x, y })) {
      // Don't add duplicates
      if (!sel.find(s => s.x === x && s.y === y)) {
        g.sel = [...sel, { x, y }]; re();
      }
    }
  }

  function onPointerDown(e) {
    if (g.gameOver) return;
    e.preventDefault();
    const c = cellFromEvent(e);
    if (!c) return;
    g.sel = []; g.combo = Math.max(0, g.combo);
    g.dragging = true;
    addToSel(c.x, c.y);
  }

  function onPointerMove(e) {
    if (!g.dragging || g.gameOver) return;
    e.preventDefault();
    const c = cellFromEvent(e);
    if (!c) return;
    const last = g.sel[g.sel.length - 1];
    if (last && last.x === c.x && last.y === c.y) return;
    // Allow backtracking
    if (g.sel.length >= 2) {
      const prev = g.sel[g.sel.length - 2];
      if (prev.x === c.x && prev.y === c.y) {
        g.sel = g.sel.slice(0, -1); re(); return;
      }
    }
    addToSel(c.x, c.y);
  }

  function onPointerUp(e) {
    if (!g.dragging) return;
    g.dragging = false;
    // Check if path is valid and satisfies target
    const sel = g.sel;
    if (sel.length >= 3 && isPath(sel)) {
      tryClose();
    } else {
      g.sel = []; re();
    }
  }

  function startGame() {
    g.board = initBoard(g.maxPrime); g.sel = []; g.score = 0; g.round = 0; g.turn = 0;
    g.targets = genTargets(g.maxPrime); g.gameOver = false; g.won = false; g.started = true;
    g.flash = null; g.combo = 0; g.totalPaths = 0; g.dragging = false;
    g.shakeUntil = 0; g.clearAnim = []; g.deadCount = 0;
    startTimer(); re();
  }

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") { g.sel = []; g.combo = 0; g.dragging = false; re(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  useEffect(() => () => stopTimer(), []);

  const selKeys = new Set(g.sel.map(s => k(s.x, s.y)));
  const canClose = g.sel.length >= 3 && isPath(g.sel);
  const selSum = g.sel.reduce((s, p) => s + (g.board[k(p.x, p.y)]?.val || 0), 0);
  const target = g.targets[g.round] || { label: "—", min: 3 };
  const timePct = g.timeLeft / g.turnTime;
  const shaking = Date.now() < g.shakeUntil;
  const clearKeys = new Set(g.clearAnim.map(c => k(c.x, c.y)));
  const boardDarkness = Math.min(0.4, g.deadCount / (W * H) * 0.6);

  // Hint: which values would satisfy target if added to current sum
  const hintVals = new Set();
  if (g.sel.length >= 2 && !g.gameOver) {
    const tgt = g.targets[g.round];
    if (tgt) {
      for (let v = 2; v <= g.maxPrime; v++) {
        if (isPrime(v)) {
          const testVals = [...g.sel.map(s => g.board[k(s.x, s.y)]?.val || 0), v];
          if (checkTarget({ ...tgt, min: 3 }, testVals)) hintVals.add(v);
        }
      }
    }
  }

  // Board pixel calc
  const CELL_CSS = `min(calc((100vh - 100px) / ${H}), calc((100vw - 280px) / ${W}), 68px)`;

  if (!g.started) {
    return (
      <div style={{
        width: "100vw", height: "100vh", overflow: "hidden",
        background: "linear-gradient(160deg, #04040c 0%, #08081a 50%, #100818 100%)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        fontFamily: "Georgia, 'Times New Roman', serif", color: "#c8c8e0", padding: 16,
      }}>
        <div style={{ fontSize: 11, letterSpacing: 12, color: "#9b5de5", marginBottom: 12, opacity: 0.5 }}>∮ · Σ · ↻ · ∃</div>
        <h1 style={{
          fontSize: "clamp(36px, 7vw, 56px)", fontWeight: 400, margin: "0 0 4px 0",
          background: "linear-gradient(90deg, #00f5d4, #9b5de5, #f15bb5)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 5,
        }}>Σ PRIME</h1>
        <div style={{ fontSize: 11, color: "#3a3a55", letterSpacing: 7, marginBottom: 28, textTransform: "uppercase" }}>prime number closure</div>
        
        <div style={{ maxWidth: 420, textAlign: "center", lineHeight: 1.9, fontSize: 13, color: "#606080", marginBottom: 20 }}>
          <strong>There are 25 prime numbers between 1 and 100:</strong><br/>
          2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: "#9b5de5", marginBottom: 8, letterSpacing: 2, textTransform: "uppercase" }}>SELECT MAXIMUM PRIME</div>
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center",
            maxWidth: 500, padding: "12px", background: "rgba(15,23,42,0.4)", borderRadius: 12,
            border: "1px solid rgba(155,93,229,0.2)"
          }}>
            {ALL_PRIMES.map(prime => (
              <div
                key={prime}
                onClick={() => { g.maxPrime = prime; re(); }}
                style={{
                  padding: "6px 10px",
                  fontSize: "clamp(10px, 1.2vw, 12px)",
                  border: prime === g.maxPrime ? "2px solid #00f5d4" 
                    : prime < g.maxPrime ? "1px solid rgba(0,245,212,0.4)" 
                    : "1px solid rgba(155,93,229,0.3)",
                  borderRadius: 6,
                  background: prime === g.maxPrime ? "rgba(0,245,212,0.15)" 
                    : prime < g.maxPrime ? "rgba(0,245,212,0.05)" 
                    : "rgba(155,93,229,0.08)",
                  color: prime === g.maxPrime ? "#00f5d4" 
                    : prime < g.maxPrime ? "rgba(0,245,212,0.7)" 
                    : "#9b5de5",
                  cursor: "pointer",
                  fontFamily: "'Courier New', monospace",
                  fontWeight: prime === g.maxPrime ? 700 : prime < g.maxPrime ? 600 : 400,
                  transition: "all 0.2s",
                  textAlign: "center",
                  minWidth: "28px"
                }}
                onMouseEnter={(e) => {
                  if (prime === g.maxPrime) {
                    e.target.style.background = "rgba(0,245,212,0.2)";
                  } else if (prime < g.maxPrime) {
                    e.target.style.background = "rgba(0,245,212,0.1)";
                    e.target.style.borderColor = "rgba(0,245,212,0.6)";
                  } else {
                    e.target.style.background = "rgba(155,93,229,0.15)";
                    e.target.style.borderColor = "rgba(155,93,229,0.5)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (prime === g.maxPrime) {
                    e.target.style.background = "rgba(0,245,212,0.15)";
                  } else if (prime < g.maxPrime) {
                    e.target.style.background = "rgba(0,245,212,0.05)";
                    e.target.style.borderColor = "rgba(0,245,212,0.4)";
                  } else {
                    e.target.style.background = "rgba(155,93,229,0.08)";
                    e.target.style.borderColor = "rgba(155,93,229,0.3)";
                  }
                }}
              >
                {prime}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "#666", marginTop: 6, textAlign: "center" }}>
            Selected: <span style={{ color: "#00f5d4", fontFamily: "'Courier New', monospace", fontWeight: 700 }}>
              {g.maxPrime === 97 ? "All Primes (2-97)" : `Primes ≤ ${g.maxPrime}`}
            </span>
          </div>
        </div>

        <div onClick={() => startGame()} style={{
          padding: "13px 48px", fontSize: 14, letterSpacing: 7,
          border: "1px solid #9b5de5", color: "#9b5de5", cursor: "pointer",
          borderRadius: 2, textTransform: "uppercase", fontFamily: "Georgia, serif",
        }}>BEGIN</div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 16 }}>
          <div onClick={() => setShowRules(true)} style={{
            fontSize: 11, letterSpacing: 3, color: "#00f5d4", cursor: "pointer",
            textTransform: "uppercase", fontFamily: "Georgia, serif",
            textShadow: "0 0 8px rgba(0,245,212,0.6), 0 0 16px rgba(0,245,212,0.3)",
            animation: "glowPulse 2s ease-in-out infinite"
          }}>view rules</div>
          
          <div onClick={() => setShowControls(true)} style={{
            fontSize: 11, letterSpacing: 3, color: "#00f5d4", cursor: "pointer",
            textTransform: "uppercase", fontFamily: "Georgia, serif",
            textShadow: "0 0 8px rgba(0,245,212,0.6), 0 0 16px rgba(0,245,212,0.3)",
            animation: "glowPulse 2s ease-in-out infinite"
          }}>view controls</div>
        </div>

        {/* Rules Popup */}
        {showRules && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(4,4,12,0.95)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 20
          }}>
            <div style={{
              maxWidth: 500, width: "100%", maxHeight: "80vh", overflowY: "auto",
              background: "rgba(8,8,26,0.95)", borderRadius: 12, border: "1px solid rgba(155,93,229,0.3)",
              padding: 24, position: "relative"
            }}>
              <div style={{
                position: "absolute", top: 12, right: 12,
                width: 32, height: 32, borderRadius: "50%",
                background: "rgba(155,93,229,0.2)", border: "1px solid rgba(155,93,229,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#9b5de5", fontSize: 18, fontWeight: 700,
                fontFamily: "'Georgia', serif"
              }} onClick={() => setShowRules(false)}>
                ×
              </div>
              
              <h2 style={{
                fontSize: "clamp(20px, 3vw, 28px)", letterSpacing: 4, color: "#9b5de5",
                textAlign: "center", margin: "0 0 20px 0", fontFamily: "Georgia, serif",
                fontWeight: 400
              }}>RULES</h2>
              
              <RulesPanel items={RULE_ITEMS} maxWidth={400} />
              
              <div onClick={() => setShowRules(false)} style={{
                marginTop: 20, padding: "10px 24px", fontSize: 12, letterSpacing: 4,
                border: "1px solid #9b5de5", color: "#9b5de5", cursor: "pointer",
                borderRadius: 2, textTransform: "uppercase", fontFamily: "Georgia, serif",
                margin: "20px auto 0 auto", textAlign: "center", width: "fit-content"
              }}>CLOSE</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      width: "100vw", height: "100vh", overflow: "hidden",
      background: `linear-gradient(160deg, rgba(4,4,12,${1}) 0%, rgba(8,8,26,${1}) 50%, rgba(16,8,24,${1}) 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Georgia, serif", color: "#c8c8e0", userSelect: "none", padding: 8,
    }}>
      <div style={{
        display: "flex", gap: "clamp(8px, 1.5vw, 20px)", alignItems: "flex-start",
        transform: shaking ? `translate(${Math.random() * 6 - 3}px, ${Math.random() * 4 - 2}px)` : "none",
        transition: shaking ? "none" : "transform 0.1s",
      }}>

        {/* Left panel */}
        <div style={{ width: "clamp(64px, 9vw, 100px)", display: "flex", flexDirection: "column", gap: 12, paddingTop: 4, flexShrink: 0 }}>
          <div>
            <div style={LBL}>Score</div>
            <div style={{ fontSize: "clamp(16px, 2.4vw, 24px)", fontFamily: "'Courier New', monospace", color: "#00f5d4" }}>{g.score}</div>
          </div>
          <div>
            <div style={LBL}>Round</div>
            <div style={{ fontSize: "clamp(13px, 1.8vw, 18px)", fontFamily: "'Courier New', monospace", color: "#9b5de5" }}>
              {g.round + 1}<span style={{ color: "#333", fontSize: 10 }}>/{ROUNDS}</span>
            </div>
          </div>
          <div>
            <div style={LBL}>Turn</div>
            <div style={{ fontSize: "clamp(12px, 1.6vw, 15px)", fontFamily: "'Courier New', monospace", color: "#f15bb5" }}>{g.turn}</div>
          </div>
          {g.combo > 1 && <div style={{ fontSize: 12, color: "#fee440", fontFamily: "monospace" }}>×{g.combo}</div>}
          <div>
            <div style={LBL}>Time</div>
            <div style={{
              width: "100%", maxWidth: 72, height: 5, background: "#151522", borderRadius: 3, overflow: "hidden",
              boxShadow: timePct < 0.2 ? "0 0 8px #ff6b6b44" : "none",
            }}>
              <div style={{
                width: `${timePct * 100}%`, height: "100%",
                background: timePct < 0.2 ? "#ff6b6b" : timePct < 0.4 ? "#fee440" : "#00f5d4",
                borderRadius: 3, transition: "width 0.08s linear",
              }} />
            </div>
          </div>
          <div>
            <div style={LBL}>Progress</div>
            <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 2 }}>
              {Array.from({ length: ROUNDS }, (_, i) => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: i < g.round ? "#00f5d4" : i === g.round ? "#9b5de5" : "#1a1a2e",
                  border: i === g.round ? "1px solid #9b5de5" : "none",
                }} />
              ))}
            </div>
          </div>

          {/* Selection info */}
          {g.sel.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <div style={LBL}>Path</div>
              <div style={{
                fontSize: "clamp(14px, 2vw, 20px)", fontFamily: "'Courier New', monospace",
                color: canClose ? "#00f5d4" : "#888",
              }}>
                Σ={selSum}
              </div>
              <div style={{ fontSize: 10, color: "#444", fontFamily: "'Courier New', monospace", marginTop: 2 }}>
                {g.sel.length} cells
                {canClose && <span style={{ color: "#00f5d4" }}> ✓</span>}
              </div>
            </div>
          )}
        </div>

        {/* Board */}
        <div style={{
          position: "relative", flexShrink: 1,
          filter: `brightness(${1 - boardDarkness})`,
          transition: "filter 0.5s",
        }}>
          <div ref={boardRef}
            onMouseDown={onPointerDown} onMouseMove={onPointerMove} onMouseUp={onPointerUp}
            onMouseLeave={() => { if (g.dragging) { g.dragging = false; re(); } }}
            onTouchStart={onPointerDown} onTouchMove={onPointerMove} onTouchEnd={onPointerUp}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${W}, ${CELL_CSS})`,
              gridTemplateRows: `repeat(${H}, ${CELL_CSS})`,
              gap: 0, touchAction: "none",
              borderRadius: 8,
              boxShadow: "0 0 40px rgba(0,0,0,0.5)",
            }}
          >
            {Array.from({ length: H }, (_, y) =>
              Array.from({ length: W }, (_, x) => {
                const ky = k(x, y);
                const cell = g.board[ky];
                if (!cell) return <div key={ky} />;

                const isSel = selKeys.has(ky);
                const isClearing = clearKeys.has(ky);
                const lifePct = cell.life / MAX_LIFE;
                const isHint = !isSel && !cell.dead && hintVals.has(cell.val);
                const isLow = cell.life <= 3 && !cell.dead;

                return (
                  <div key={ky} style={{
                    position: "relative", width: "100%", height: "100%",
                    cursor: cell.dead ? "default" : "pointer",
                  }}>
                    {/* Bg */}
                    <div style={{
                      position: "absolute", inset: "7%", borderRadius: "16%",
                      background: isClearing ? "rgba(254,228,64,0.4)"
                        : cell.dead ? "#08080f"
                        : isSel ? "rgba(155,93,229,0.3)"
                        : isHint ? "rgba(0,245,212,0.06)"
                        : "rgba(12,12,25,0.85)",
                      border: isClearing ? "2px solid #fee440"
                        : cell.dead ? "1px solid #0c0c18"
                        : isSel ? "2px solid #9b5de5aa"
                        : isHint ? "1px solid rgba(0,245,212,0.15)"
                        : `1px solid rgba(80,80,130,${0.06 + lifePct * 0.1})`,
                      boxShadow: isClearing ? "0 0 20px #fee44055"
                        : isSel ? "0 0 10px rgba(155,93,229,0.2)"
                        : "none",
                      transition: "all 0.12s",
                      animation: isClearing ? "pop 0.4s ease-out" : isLow ? "lowPulse 1.5s ease-in-out infinite" : "none",
                    }} />

                    {/* Life indicators */}
                    {!cell.dead && Array.from({ length: MAX_LIFE }, (_, i) => {
                      const angle = (i / MAX_LIFE) * Math.PI * 2 - Math.PI / 2;
                      const alive = i < cell.life;
                      return (
                        <div key={i} style={{
                          position: "absolute",
                          left: `${50 + Math.cos(angle) * 38}%`,
                          top: `${50 + Math.sin(angle) * 38}%`,
                          width: "7%", height: "7%", borderRadius: "50%",
                          transform: "translate(-50%,-50%)",
                          background: alive
                            ? (cell.life <= 2 ? "#ff4444" : cell.life <= 4 ? "#ffaa33" : "#00f5d455")
                            : "#12121f",
                          transition: "background 0.3s",
                        }} />
                      );
                    })}

                    {/* Dead X */}
                    {cell.dead && (
                      <div style={{
                        position: "absolute", inset: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "clamp(10px, 1.4vw, 16px)", color: "#1a1a28",
                        fontFamily: "'Courier New', monospace",
                      }}>✕</div>
                    )}

                    {/* Number */}
                    {!cell.dead && (
                      <div style={{
                        position: "absolute", inset: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "clamp(12px, 1.8vw, 18px)", fontWeight: 700,
                        color: isSel ? "#ffffff" : `rgba(255,255,255,${0.35 + lifePct * 0.55})`,
                        fontFamily: "'Courier New', monospace",
                        textShadow: isSel ? "0 0 8px rgba(155,93,229,0.6)" : "none",
                        transition: "color 0.15s",
                      }}>
                        {cell.val}
                      </div>
                    )}
                  </div>
                );
              })
            ).flat()}
          </div>

          {/* SVG path */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
            viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            {g.sel.length >= 2 && (
              <path d={g.sel.map((s, i) => `${i ? "L" : "M"}${s.x + .5},${s.y + .5}`).join(" ")}
                fill="none" stroke="#9b5de5" strokeWidth={0.07} strokeLinecap="round" strokeLinejoin="round" opacity={0.75} />
            )}
            {canClose && (
              <line x1={g.sel[g.sel.length-1].x+.5} y1={g.sel[g.sel.length-1].y+.5}
                x2={g.sel[0].x+.5} y2={g.sel[0].y+.5}
                stroke="#00f5d4" strokeWidth={0.06} strokeDasharray="0.1 0.07" strokeLinecap="round" opacity={0.65}>
                <animate attributeName="stroke-dashoffset" from="0" to="0.34" dur="1s" repeatCount="indefinite" />
              </line>
            )}
          </svg>

          {/* Flash */}
          {g.flash && (
            <div style={{
              position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)",
              fontSize: g.flash.bad ? "clamp(12px, 2vw, 16px)" : "clamp(16px, 2.5vw, 24px)",
              fontWeight: 700, zIndex: 10, pointerEvents: "none", whiteSpace: "nowrap",
              color: g.flash.bad ? "#ff6b6b" : "#fee440",
              textShadow: g.flash.bad ? "0 0 10px #ff6b6b44" : "0 0 14px #fee440, 0 0 28px #fee44044",
              fontFamily: "'Courier New', monospace",
              animation: "fu 1s ease-out forwards",
            }}>{g.flash.text}</div>
          )}

          {/* Game over overlay */}
          {g.gameOver && (
            <div style={{
              position: "absolute", inset: 0, background: "rgba(4,4,12,0.95)", borderRadius: 8,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 12, zIndex: 20,
              animation: "fadeIn 0.6s ease-out",
            }}>
              <div style={{ fontSize: "clamp(18px, 3vw, 28px)", letterSpacing: 5, color: g.won ? "#00f5d4" : "#f15bb5" }}>
                {g.won ? "PRIME CLOSURE" : "COLLAPSED"}
              </div>
              <div style={{ fontSize: 13, color: "#555", fontFamily: "monospace", textAlign: "center", lineHeight: 1.8 }}>
                {g.score} pts · {g.totalPaths} paths · {g.turn} turns
                {!g.won && <><br />Round {g.round + 1}/{ROUNDS} · {Math.round((1 - g.deadCount / (W * H)) * 100)}% survived</>}
              </div>
              <div onClick={() => startGame()} style={{
                marginTop: 6, padding: "10px 30px", fontSize: 12,
                border: "1px solid #9b5de5", color: "#9b5de5", cursor: "pointer",
                borderRadius: 2, letterSpacing: 4, textTransform: "uppercase", fontFamily: "Georgia, serif",
              }}>AGAIN</div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ width: "clamp(72px, 11vw, 130px)", display: "flex", flexDirection: "column", gap: 14, paddingTop: 4, flexShrink: 0 }}>
          <div>
            <div style={LBL}>Target</div>
            <div style={{
              fontSize: "clamp(12px, 1.5vw, 16px)", color: "#fee440", fontFamily: "'Courier New', monospace",
              lineHeight: 1.7, padding: "4px 0 8px", borderBottom: "1px solid #1a1a2e",
            }}>
              {target.label}
              {target.min > 3 && <div style={{ fontSize: 9, color: "#666", marginTop: 2 }}>min {target.min} cells</div>}
            </div>
          </div>
          <div>
            <div style={LBL}>Next</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 2 }}>
              {g.targets.slice(g.round + 1, g.round + 4).map((t, i) => (
                <div key={i} style={{ fontSize: 10, color: "#3a3a55", fontFamily: "'Courier New', monospace", opacity: 1 - i * 0.25 }}>
                  {t.label}
                </div>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 9, color: "#1e1e30", lineHeight: 1.6, fontFamily: "'Courier New', monospace", marginTop: 4 }}>
            Drag paths. Diag OK. Min {target.min || 3}. Used cells refresh + full life. Sum primes to make composites.
          </div>
          <div style={{ marginTop: "auto" }}>
            <div onClick={() => setShowRules(true)} style={{
              padding: "8px 12px", fontSize: 10, letterSpacing: 2,
              border: "1px solid #9b5de5", color: "#9b5de5", cursor: "pointer",
              borderRadius: 2, textTransform: "uppercase", fontFamily: "Georgia, serif",
              textAlign: "center", width: "100%"
            }}>RULES</div>
            <div onClick={() => setShowControls(true)} style={{
              padding: "8px 12px", fontSize: 10, letterSpacing: 2,
              border: "1px solid #00f5d4", color: "#00f5d4", cursor: "pointer",
              borderRadius: 2, textTransform: "uppercase", fontFamily: "Georgia, serif",
              textAlign: "center", width: "100%"
            }}>CONTROLS</div>
          </div>
        </div>
      )

        {/* Controls Popup */}
        {showControls && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(4,4,12,0.95)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 20
          }}>
            <div style={{
              maxWidth: 500, width: "100%", maxHeight: "80vh", overflowY: "auto",
              background: "rgba(8,8,26,0.95)", borderRadius: 12, border: "1px solid rgba(0,245,212,0.3)",
              padding: 24, position: "relative"
            }}>
              <div style={{
                position: "absolute", top: 12, right: 12,
                width: 32, height: 32, borderRadius: "50%",
                background: "rgba(0,245,212,0.2)", border: "1px solid rgba(0,245,212,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#00f5d4", fontSize: 18, fontWeight: 700,
                fontFamily: "'Georgia', serif"
              }} onClick={() => setShowControls(false)}>
                ×
              </div>
              
              <h2 style={{
                fontSize: "clamp(20px, 3vw, 28px)", letterSpacing: 4, color: "#00f5d4",
                textAlign: "center", margin: "0 0 20px 0", fontFamily: "Georgia, serif",
                fontWeight: 400
              }}>CONTROLS</h2>
              
              <RulesPanel items={CONTROL_ITEMS} maxWidth={400} />
              
              <div onClick={() => setShowControls(false)} style={{
                marginTop: 20, padding: "10px 24px", fontSize: 12, letterSpacing: 4,
                border: "1px solid #00f5d4", color: "#00f5d4", cursor: "pointer",
                borderRadius: 2, textTransform: "uppercase", fontFamily: "Georgia, serif",
                margin: "20px auto 0 auto", textAlign: "center", width: "fit-content"
              }}>CLOSE</div>
            </div>
          </div>
        )}

        {/* Rules Popup */}
        {showRules && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(4,4,12,0.95)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 20
          }}>
            <div style={{
              maxWidth: 500, width: "100%", maxHeight: "80vh", overflowY: "auto",
              background: "rgba(8,8,26,0.95)", borderRadius: 12, border: "1px solid rgba(155,93,229,0.3)",
              padding: 24, position: "relative"
            }}>
              <div style={{
                position: "absolute", top: 12, right: 12,
                width: 32, height: 32, borderRadius: "50%",
                background: "rgba(155,93,229,0.2)", border: "1px solid rgba(155,93,229,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#9b5de5", fontSize: 18, fontWeight: 700,
                fontFamily: "'Georgia', serif"
              }} onClick={() => setShowRules(false)}>
                ×
              </div>
              
              <h2 style={{
                fontSize: "clamp(20px, 3vw, 28px)", letterSpacing: 4, color: "#9b5de5",
                textAlign: "center", margin: "0 0 20px 0", fontFamily: "Georgia, serif",
                fontWeight: 400
              }}>RULES</h2>
              
              <RulesPanel items={RULE_ITEMS} maxWidth={400} />
              
              <div onClick={() => setShowRules(false)} style={{
                marginTop: 20, padding: "10px 24px", fontSize: 12, letterSpacing: 4,
                border: "1px solid #9b5de5", color: "#9b5de5", cursor: "pointer",
                borderRadius: 2, textTransform: "uppercase", fontFamily: "Georgia, serif",
                margin: "20px auto 0 auto", textAlign: "center", width: "fit-content"
              }}>CLOSE</div>
            </div>
          </div>
        )}
      </div>

      <style>{`
          @keyframes fu{0%{opacity:1;transform:translate(-50%,-50%) scale(.85)}50%{opacity:1;transform:translate(-50%,-65%) scale(1.1)}100%{opacity:0;transform:translate(-50%,-85%) scale(1)}}
          @keyframes pop{0%{transform:scale(1)}40%{transform:scale(1.15);background:rgba(254,228,64,0.5)}100%{transform:scale(1);background:transparent}}
          @keyframes lowPulse{0%,100%{border-color:rgba(255,68,68,0.15)}50%{border-color:rgba(255,68,68,0.35)}}
          @keyframes fadeIn{0%{opacity:0}100%{opacity:1}}
          @keyframes glowPulse{0%,100%{opacity:0.7}50%{opacity:1}}
        `}</style>
    </div>
  );
}
