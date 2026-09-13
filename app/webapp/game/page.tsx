"use client";

import { useMemo, useState } from "react";
import Script from "next/script";

// ---------- إعداد شبكة الهكس (إحداثيات محورية axial) ----------
const RADIUS = 4;
const HEX_SIZE = 26;
const ROUNDS_LIMIT = 16; // كل جولة = دورك + دور الخصم

type Axial = { q: number; r: number };
type Owner = "player" | "ai" | null;

function key(hex: Axial) {
  return `${hex.q},${hex.r}`;
}

function buildBoard(radius: number): Axial[] {
  const tiles: Axial[] = [];
  for (let q = -radius; q <= radius; q++) {
    const rMin = Math.max(-radius, -q - radius);
    const rMax = Math.min(radius, -q + radius);
    for (let r = rMin; r <= rMax; r++) {
      tiles.push({ q, r });
    }
  }
  return tiles;
}

const DIRECTIONS: Axial[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

function neighbors(hex: Axial): Axial[] {
  return DIRECTIONS.map((d) => ({ q: hex.q + d.q, r: hex.r + d.r }));
}

function axialToPixel(hex: Axial) {
  const x = HEX_SIZE * Math.sqrt(3) * (hex.q + hex.r / 2);
  const y = HEX_SIZE * 1.5 * hex.r;
  return { x, y };
}

function hexCorners(cx: number, cy: number) {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    points.push(`${cx + HEX_SIZE * Math.cos(angle)},${cy + HEX_SIZE * Math.sin(angle)}`);
  }
  return points.join(" ");
}

const BOARD = buildBoard(RADIUS);
const PLAYER_START: Axial = { q: -RADIUS, r: 0 };
const AI_START: Axial = { q: RADIUS, r: 0 };

function initialOwners() {
  const owners: Record<string, Owner> = {};
  for (const tile of BOARD) owners[key(tile)] = null;
  owners[key(PLAYER_START)] = "player";
  owners[key(AI_START)] = "ai";
  return owners;
}

function legalMoves(owners: Record<string, Owner>, side: "player" | "ai") {
  const targets = new Set<string>();
  for (const tile of BOARD) {
    if (owners[key(tile)] !== side) continue;
    for (const n of neighbors(tile)) {
      const nKey = key(n);
      if (owners[nKey] === undefined) continue; // خارج حدود اللوحة
      if (owners[nKey] !== side) targets.add(nKey);
    }
  }
  return targets;
}

function chooseAiMove(owners: Record<string, Owner>) {
  const candidates = [...legalMoves(owners, "ai")];
  if (candidates.length === 0) return null;

  let best = candidates[0];
  let bestScore = -Infinity;

  for (const candidateKey of candidates) {
    const [q, r] = candidateKey.split(",").map(Number);
    const tile = { q, r };
    let score = Math.random(); // كسر التعادل بعشوائية بسيطة

    if (owners[candidateKey] === "player") score += 3; // هجوم على أرض الخصم
    for (const n of neighbors(tile)) {
      const nKey = key(n);
      if (!(nKey in owners)) continue;
      if (owners[nKey] === null) score += 1; // إمكانية توسّع مستقبلية
      if (owners[nKey] === "player") score += 1.5; // خانة تلامس أرض الخصم (خط جبهة)
    }

    if (score > bestScore) {
      bestScore = score;
      best = candidateKey;
    }
  }

  return best;
}

export default function HexWarGame() {
  const [owners, setOwners] = useState<Record<string, Owner>>(() => initialOwners());
  const [roundsLeft, setRoundsLeft] = useState(ROUNDS_LIMIT);
  const [aiThinking, setAiThinking] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const playerCount = useMemo(
    () => Object.values(owners).filter((o) => o === "player").length,
    [owners]
  );
  const aiCount = useMemo(() => Object.values(owners).filter((o) => o === "ai").length, [owners]);

  const playerMoves = useMemo(() => legalMoves(owners, "player"), [owners]);

  function endRoundIfNeeded(nextOwners: Record<string, Owner>, nextRoundsLeft: number) {
    const playerCanMove = legalMoves(nextOwners, "player").size > 0;
    const aiCanMove = legalMoves(nextOwners, "ai").size > 0;
    if (nextRoundsLeft <= 0 || (!playerCanMove && !aiCanMove)) {
      setGameOver(true);
    }
  }

  function playAiTurn(afterPlayerOwners: Record<string, Owner>, nextRoundsLeft: number) {
    setAiThinking(true);
    setTimeout(() => {
      const move = chooseAiMove(afterPlayerOwners);
      const finalOwners = move ? { ...afterPlayerOwners, [move]: "ai" as Owner } : afterPlayerOwners;
      setOwners(finalOwners);
      setRoundsLeft(nextRoundsLeft);
      setAiThinking(false);
      endRoundIfNeeded(finalOwners, nextRoundsLeft);
    }, 500);
  }

  function handleTileClick(tileKey: string) {
    if (gameOver || aiThinking) return;
    if (!playerMoves.has(tileKey)) return;

    const afterPlayerOwners = { ...owners, [tileKey]: "player" as Owner };
    setOwners(afterPlayerOwners);
    playAiTurn(afterPlayerOwners, roundsLeft - 1);
  }

  function resetGame() {
    setOwners(initialOwners());
    setRoundsLeft(ROUNDS_LIMIT);
    setGameOver(false);
    setAiThinking(false);
  }

  const xs = BOARD.map((t) => axialToPixel(t).x);
  const ys = BOARD.map((t) => axialToPixel(t).y);
  const minX = Math.min(...xs) - HEX_SIZE;
  const maxX = Math.max(...xs) + HEX_SIZE;
  const minY = Math.min(...ys) - HEX_SIZE;
  const maxY = Math.max(...ys) + HEX_SIZE;

  let resultText = "";
  if (gameOver) {
    if (playerCount > aiCount) resultText = "فزت! 🎉 أراضيك أكبر من الخصم";
    else if (playerCount < aiCount) resultText = "خسرت 😅 وسّع الخصم أراضيه أكثر منك";
    else resultText = "تعادل 🤝 نفس عدد الخانات بالضبط";
  }

  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
        onReady={() => {
          window.Telegram?.WebApp?.ready();
          window.Telegram?.WebApp?.expand();
        }}
      />
      <main className="hexgame-wrap">
        <div className="hexgame-card">
          <h1>🦊 حرب الأراضي</h1>
          <p className="hexgame-sub">وسّع أراضيك أكثر من الخصم قبل ما تنتهي الجولات</p>

          <div className="hexgame-scores">
            <span className="hexgame-score hexgame-score-player">أنت: {playerCount}</span>
            <span className="hexgame-score hexgame-score-rounds">جولات متبقية: {roundsLeft}</span>
            <span className="hexgame-score hexgame-score-ai">الخصم: {aiCount}</span>
          </div>

          <svg
            className="hexgame-board"
            viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
            role="img"
            aria-label="لوحة اللعبة السداسية"
          >
            {BOARD.map((tile) => {
              const tileKey = key(tile);
              const { x, y } = axialToPixel(tile);
              const owner = owners[tileKey];
              const isPlayable = !gameOver && !aiThinking && playerMoves.has(tileKey);
              const cls = [
                "hex-tile",
                owner === "player" ? "hex-tile-player" : "",
                owner === "ai" ? "hex-tile-ai" : "",
                isPlayable ? "hex-tile-playable" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <polygon
                  key={tileKey}
                  points={hexCorners(x, y)}
                  className={cls}
                  onClick={() => handleTileClick(tileKey)}
                />
              );
            })}
          </svg>

          {gameOver ? (
            <div className="hexgame-banner">
              <p>{resultText}</p>
              <button onClick={resetGame}>لعبة جديدة</button>
            </div>
          ) : (
            <p className="hexgame-rules">
              اضغط على خانة مضيئة ملاصقة لأرضك (الأخضر) لتوسيعها. الخصم (الكحلي) يتحرك تلقائياً بعدك.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
