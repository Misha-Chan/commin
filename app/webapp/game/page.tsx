"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import { formatMiko } from "@/lib/miko";

// ---------- إعداد شبكة الهكس (إحداثيات محورية axial) ----------
const RADIUS = 6; // لوحة أكبر (127 خانة)
const HEX_SIZE = 24;

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
const BOARD_KEYS = new Set(BOARD.map(key));
const TOTAL_TILES = BOARD.length;
const PLAYER_START: Axial = { q: -RADIUS, r: 0 };
const AI_START: Axial = { q: RADIUS, r: 0 };

function initialOwners() {
  const owners: Record<string, Owner> = {};
  for (const tile of BOARD) owners[key(tile)] = null;
  owners[key(PLAYER_START)] = "player";
  owners[key(AI_START)] = "ai";
  return owners;
}

// حركات مسموحة: فقط الخانات الفارغة (المحايدة) الملاصقة لأرضك.
// ما فيه هجوم مباشر على خانات الخصم إطلاقاً — الطريقة الوحيدة لأخذ
// خانات إضافية هي "الحصار" (تطويق منطقة فاضية بالكامل بأرضك).
function legalMoves(owners: Record<string, Owner>, side: "player" | "ai") {
  const targets = new Set<string>();
  for (const tile of BOARD) {
    if (owners[key(tile)] !== side) continue;
    for (const n of neighbors(tile)) {
      const nKey = key(n);
      if (!BOARD_KEYS.has(nKey)) continue;
      if (owners[nKey] === null) targets.add(nKey);
    }
  }
  return targets;
}

// يحصر أي منطقة فارغة أصبحت محاطة بالكامل بأراضي مملوكة (من أي جهة)
// ولا تتصل بحافة اللوحة، ويعطيها بالكامل للاعب الذي أنهى للتو حركته.
function captureEnclosedRegions(owners: Record<string, Owner>, mover: "player" | "ai") {
  const reachableFromEdge = new Set<string>();
  const stack: Axial[] = [];

  for (const tile of BOARD) {
    const k = key(tile);
    if (owners[k] !== null) continue;
    const touchesOutside = neighbors(tile).some((n) => !BOARD_KEYS.has(key(n)));
    if (touchesOutside) {
      reachableFromEdge.add(k);
      stack.push(tile);
    }
  }

  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const n of neighbors(current)) {
      const nKey = key(n);
      if (!BOARD_KEYS.has(nKey)) continue;
      if (owners[nKey] !== null) continue; // خانة مملوكة = جدار يوقف الفيضان
      if (reachableFromEdge.has(nKey)) continue;
      reachableFromEdge.add(nKey);
      stack.push(n);
    }
  }

  const next = { ...owners };
  let capturedAny = false;
  for (const tile of BOARD) {
    const k = key(tile);
    if (owners[k] === null && !reachableFromEdge.has(k)) {
      next[k] = mover;
      capturedAny = true;
    }
  }
  return { owners: next, capturedAny };
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

    for (const n of neighbors(tile)) {
      const nKey = key(n);
      if (!BOARD_KEYS.has(nKey)) continue;
      if (owners[nKey] === null) score += 1; // إمكانية توسّع مستقبلية
      if (owners[nKey] === "player") score += 2; // خانة تلامس أرض الخصم (تضيّق عليه لحصاره)
    }

    const trial = { ...owners, [candidateKey]: "ai" as Owner };
    const { capturedAny } = captureEnclosedRegions(trial, "ai");
    if (capturedAny) score += 10;

    if (score > bestScore) {
      bestScore = score;
      best = candidateKey;
    }
  }

  return best;
}

export default function HexWarGame() {
  const [owners, setOwners] = useState<Record<string, Owner>>(() => initialOwners());
  const [aiThinking, setAiThinking] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [rewardMessage, setRewardMessage] = useState<string | null>(null);
  const rewardClaimedRef = useRef(false);

  const playerCount = useMemo(
    () => Object.values(owners).filter((o) => o === "player").length,
    [owners]
  );
  const aiCount = useMemo(() => Object.values(owners).filter((o) => o === "ai").length, [owners]);
  const neutralCount = TOTAL_TILES - playerCount - aiCount;

  const playerMoves = useMemo(() => legalMoves(owners, "player"), [owners]);

  function checkGameOver(nextOwners: Record<string, Owner>) {
    const noNeutralLeft =
      Object.values(nextOwners).filter((o) => o === null).length === 0;
    const playerCanMove = legalMoves(nextOwners, "player").size > 0;
    const aiCanMove = legalMoves(nextOwners, "ai").size > 0;
    if (noNeutralLeft || (!playerCanMove && !aiCanMove)) {
      setGameOver(true);
    }
  }

  function playAiTurn(afterPlayerOwners: Record<string, Owner>) {
    setAiThinking(true);
    setTimeout(() => {
      const move = chooseAiMove(afterPlayerOwners);
      let finalOwners = afterPlayerOwners;
      if (move) {
        finalOwners = { ...afterPlayerOwners, [move]: "ai" as Owner };
        finalOwners = captureEnclosedRegions(finalOwners, "ai").owners;
      }
      setOwners(finalOwners);
      setAiThinking(false);
      checkGameOver(finalOwners);
    }, 450);
  }

  function handleTileClick(tileKey: string) {
    if (gameOver || aiThinking) return;
    if (!playerMoves.has(tileKey)) return;

    let afterPlayerOwners: Record<string, Owner> = { ...owners, [tileKey]: "player" };
    afterPlayerOwners = captureEnclosedRegions(afterPlayerOwners, "player").owners;
    setOwners(afterPlayerOwners);

    const stillNeutral = Object.values(afterPlayerOwners).some((o) => o === null);
    const aiCanMove = legalMoves(afterPlayerOwners, "ai").size > 0;
    if (!stillNeutral || !aiCanMove) {
      checkGameOver(afterPlayerOwners);
      if (!stillNeutral) return; // انتهت اللعبة بأخذ آخر بقعة، ما داعي دور الخصم
    }
    playAiTurn(afterPlayerOwners);
  }

  function resetGame() {
    setOwners(initialOwners());
    setGameOver(false);
    setAiThinking(false);
    setRewardMessage(null);
    rewardClaimedRef.current = false;
  }

  // لما تنتهي اللعبة، اطلبي مكافأة الميكو مرة وحدة فقط (يتحقق السيرفر
  // من هويتك عبر تيليجرام قبل ما يضيف أي رصيد).
  useEffect(() => {
    if (!gameOver || rewardClaimedRef.current) return;
    rewardClaimedRef.current = true;

    const result = playerCount > aiCount ? "win" : playerCount < aiCount ? "loss" : "draw";
    const initData = window.Telegram?.WebApp?.initData ?? "";

    if (!initData) {
      setRewardMessage("افتح اللعبة من داخل البوت عشان تفعّل مكافآت الميكو 🌸");
      return;
    }

    fetch("/api/webapp/game-reward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData, result }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.error) {
          setRewardMessage(data.error);
        } else if (data?.throttled) {
          setRewardMessage(null);
        } else if (data?.amount > 0) {
          setRewardMessage(`+ ${formatMiko(data.amount)} انضافت لمحفظتك 🌸`);
        }
      })
      .catch(() => {
        setRewardMessage(null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  const xs = BOARD.map((t) => axialToPixel(t).x);
  const ys = BOARD.map((t) => axialToPixel(t).y);
  const minX = Math.min(...xs) - HEX_SIZE;
  const maxX = Math.max(...xs) + HEX_SIZE;
  const minY = Math.min(...ys) - HEX_SIZE;
  const maxY = Math.max(...ys) + HEX_SIZE;

  let resultText = "";
  if (gameOver) {
    if (playerCount > aiCount) resultText = "فزت! 🎉 حاصرت أراضٍ أكثر من الخصم";
    else if (playerCount < aiCount) resultText = "خسرت 😅 الخصم حاصر أراضٍ أكثر منك";
    else resultText = "تعادل 🤝 نفس عدد الخانات بالضبط";
  }

  const playerPct = (playerCount / TOTAL_TILES) * 100;
  const aiPct = (aiCount / TOTAL_TILES) * 100;

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
          <p className="hexgame-sub">احصر كل الأرض الفاضية بأراضيك قبل ما يوخذ آخر بقعة</p>

          <div className="hexgame-scores">
            <span className="hexgame-score hexgame-score-player">🟢 أنت: {playerCount}</span>
            <span className="hexgame-score hexgame-score-neutral">فاضي: {neutralCount}</span>
            <span className="hexgame-score hexgame-score-ai">الخصم: {aiCount} 🟣</span>
          </div>

          <div className="hexgame-bar" aria-hidden="true">
            <span className="hexgame-bar-player" style={{ width: `${playerPct}%` }} />
            <span className="hexgame-bar-ai" style={{ width: `${aiPct}%` }} />
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
              {rewardMessage && <p className="hexgame-reward">{rewardMessage}</p>}
              <button onClick={resetGame}>لعبة جديدة</button>
            </div>
          ) : (
            <p className="hexgame-rules">
              وسّع أرضك (الأخضر) بالضغط على خانة محاطة بإطار ذهبي ملاصقة لها. لا يمكنك مهاجمة
              أرض الخصم (البنفسجي) مباشرة — بس لو حاصرت منطقة فاضية بالكامل بأراضيك، تاخذها
              دفعة وحدة! 🏯
            </p>
          )}
        </div>
      </main>
    </>
  );
}
