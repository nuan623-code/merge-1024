const SIZE = 4;
// const debugBadge = document.createElement("div");
// debugBadge.textContent = "水果模式已加载";
// debugBadge.style.cssText =
//   "position:fixed;left:10px;bottom:10px;z-index:9999;background:#222;color:#fff;padding:4px 8px;border-radius:4px;font-size:12px;opacity:0.85;";
// document.body.appendChild(debugBadge);
const boardEl = document.getElementById("board");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const overlayEl = document.getElementById("overlay");
const resultTextEl = document.getElementById("result-text");

let board = [];
let tiles = [];
let tileId = 0;
let score = 0;
let best = Number(localStorage.getItem("best-1024") || 0);
let safeSnapshot = null;
let moveCount = 0;
const tileElements = new Map();

bestEl.textContent = best;

const tileColors = {
  2: "#eee4da",
  4: "#ede0c8",
  8: "#f2b179",
  16: "#f59563",
  32: "#f67c5f",
  64: "#f65e3b",
  128: "#edcf72",
  256: "#edcc61",
  512: "#edc850",
  1024: "#edc53f",
  2048: "#edc22e",
};
// const tileFruits = {
//   2: "🍒",
//   4: "🍓",
//   8: "🍊",
//   16: "🍎",
//   32: "🍉",
//   64: "🍍",
//   128: "🍇",
//   256: "🥭",
//   512: "🍑",
//   1024: "🍉🍉",
// };

function createTile(row, col, value) {
  const tile = {
    id: (tileId += 1),
    row,
    col,
    value,
    isNew: true,
    merged: false,
    removing: false,
    mergeTo: null,
  };
  tiles.push(tile);
  return tile;
}

function setCell(row, col, tile) {
  board[row][col] = tile;
  if (tile) {
    tile.row = row;
    tile.col = col;
  }
}

function clearTiles() {
  tiles = [];
  tileId = 0;
  tileElements.forEach((el) => el.remove());
  tileElements.clear();
}

function startGame() {
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  clearTiles();
  score = 0;
  moveCount = 0;
  updateScore(0);
  overlayEl.classList.remove("show");
  safeSnapshot = null;
  addRandomTile();
  addRandomTile();
  render();
}

function updateScore(delta) {
  score += delta;
  scoreEl.textContent = score;
  if (score > best) {
    best = score;
    bestEl.textContent = best;
    localStorage.setItem("best-1024", best);
  }
}

function emptyCells() {
  const cells = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!board[r][c]) cells.push([r, c]);
    }
  }
  return cells;
}

function getSpawnValue() {
  if (moveCount < 6) return Math.random() < 0.85 ? 2 : 4;
  if (moveCount < 14) return Math.random() < 0.65 ? 2 : 4;
  if (moveCount < 24) return Math.random() < 0.4 ? 2 : 4;
  if (moveCount < 36) return Math.random() < 0.6 ? 4 : 8;
  if (moveCount < 50) return Math.random() < 0.5 ? 4 : 8;
  return Math.random() < 0.7 ? 8 : 16;
}

function addRandomTile() {
  const cells = emptyCells();
  if (cells.length === 0) return;
  const [r, c] = cells[Math.floor(Math.random() * cells.length)];
  const value = getSpawnValue();
  const tile = createTile(r, c, value);
  setCell(r, c, tile);
}

function processLine(line) {
  const filtered = line.filter(Boolean);
  const result = [];
  let gained = 0;
  const removed = [];

  for (let i = 0; i < filtered.length; i++) {
    const current = filtered[i];
    const next = filtered[i + 1];
    if (next && current.value === next.value) {
      current.value *= 2;
      current.merged = true;
      gained += current.value;
      next.removing = true;
      next.mergeTo = result.length;
      removed.push(next);
      result.push(current);
      i++;
    } else {
      result.push(current);
    }
  }

  while (result.length < SIZE) result.push(null);
  return { result, gained, removed };
}

function moveLeft() {
  let moved = false;
  let gainedTotal = 0;
  const removedTiles = [];

  for (let r = 0; r < SIZE; r++) {
    const original = board[r].slice();
    const { result, gained, removed } = processLine(original);
    gainedTotal += gained;
    removedTiles.push(...removed);

    for (let c = 0; c < SIZE; c++) {
      if (original[c] !== result[c]) moved = true;
      setCell(r, c, result[c]);
    }

    removed.forEach((tile) => {
      tile.row = r;
      tile.col = tile.mergeTo;
    });
  }

  return { moved, gainedTotal, removedTiles };
}

function moveRight() {
  let moved = false;
  let gainedTotal = 0;
  const removedTiles = [];

  for (let r = 0; r < SIZE; r++) {
    const original = board[r].slice();
    const reversed = original.slice().reverse();
    const { result, gained, removed } = processLine(reversed);
    gainedTotal += gained;
    removedTiles.push(...removed);
    const finalRow = result.reverse();

    for (let c = 0; c < SIZE; c++) {
      if (original[c] !== finalRow[c]) moved = true;
      setCell(r, c, finalRow[c]);
    }

    removed.forEach((tile) => {
      tile.row = r;
      tile.col = SIZE - 1 - tile.mergeTo;
    });
  }

  return { moved, gainedTotal, removedTiles };
}

function moveUp() {
  let moved = false;
  let gainedTotal = 0;
  const removedTiles = [];

  for (let c = 0; c < SIZE; c++) {
    const original = [];
    for (let r = 0; r < SIZE; r++) original.push(board[r][c]);

    const { result, gained, removed } = processLine(original);
    gainedTotal += gained;
    removedTiles.push(...removed);

    for (let r = 0; r < SIZE; r++) {
      if (original[r] !== result[r]) moved = true;
      setCell(r, c, result[r]);
    }

    removed.forEach((tile) => {
      tile.row = tile.mergeTo;
      tile.col = c;
    });
  }

  return { moved, gainedTotal, removedTiles };
}

function moveDown() {
  let moved = false;
  let gainedTotal = 0;
  const removedTiles = [];

  for (let c = 0; c < SIZE; c++) {
    const original = [];
    for (let r = 0; r < SIZE; r++) original.push(board[r][c]);
    const reversed = original.slice().reverse();
    const { result, gained, removed } = processLine(reversed);
    gainedTotal += gained;
    removedTiles.push(...removed);
    const finalCol = result.reverse();

    for (let r = 0; r < SIZE; r++) {
      if (original[r] !== finalCol[r]) moved = true;
      setCell(r, c, finalCol[r]);
    }

    removed.forEach((tile) => {
      tile.row = SIZE - 1 - tile.mergeTo;
      tile.col = c;
    });
  }

  return { moved, gainedTotal, removedTiles };
}

function move(direction) {
  if (overlayEl.classList.contains("show")) return;

  const snapshotBeforeMove = makeSnapshot();
  let result = { moved: false, gainedTotal: 0, removedTiles: [] };

  if (direction === "left") result = moveLeft();
  if (direction === "right") result = moveRight();
  if (direction === "up") result = moveUp();
  if (direction === "down") result = moveDown();

  if (result.moved) {
    moveCount++;
    safeSnapshot = snapshotBeforeMove;
    updateScore(result.gainedTotal);
    addRandomTile();
    render();

    if (result.removedTiles.length) {
      setTimeout(() => {
        result.removedTiles.forEach((tile) => {
          const el = tileElements.get(tile.id);
          if (el) el.remove();
          tileElements.delete(tile.id);
          const idx = tiles.indexOf(tile);
          if (idx >= 0) tiles.splice(idx, 1);
        });
      }, 220);
    }

    checkGameOver();
  }
}

function checkGameOver() {
  if (emptyCells().length > 0) return;

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const current = board[r][c];
      const right = board[r][c + 1];
      const down = board[r + 1]?.[c];
      if (current && (current === right || current === down)) return;
    }
  }

  resultTextEl.textContent = "游戏结束";
  overlayEl.classList.add("show");
}

function makeSnapshot() {
  return {
    board: board.map((row) =>
      row.map((tile) =>
        tile
          ? {
              id: tile.id,
              row: tile.row,
              col: tile.col,
              value: tile.value,
            }
          : null
      )
    ),
    score,
    tileId,
  };
}

function restoreSnapshot(snapshot) {
  if (!snapshot) return;

  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  tiles = [];
  tileElements.forEach((el) => el.remove());
  tileElements.clear();

  tileId = snapshot.tileId;
  score = snapshot.score;
  scoreEl.textContent = score;

  snapshot.board.forEach((row, r) => {
    row.forEach((tileData, c) => {
      if (!tileData) return;
      const tile = { ...tileData };
      tiles.push(tile);
      setCell(r, c, tile);
    });
  });

  render();
}

function render() {
  const gap = 10;
  const cell = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue("--cell"),
    10
  );

  tiles.forEach((tile) => {
    let el = tileElements.get(tile.id);
    if (!el) {
      el = document.createElement("div");
      el.className = "tile";
      el.innerHTML = '<div class="tile-inner"></div>';
      boardEl.appendChild(el);
      tileElements.set(tile.id, el);
    }

    const inner = el.firstElementChild;
    // const fruit = tileFruits[String(tile.value)];
    // inner.textContent = fruit ? fruit : tile.value;
    // inner.setAttribute("data-fruit", fruit ? fruit : tile.value);
    inner.textContent = tile.value;
    inner.style.background = tileColors[tile.value] || "#3c3a32";
    inner.style.color = tile.value <= 4 ? "#776e65" : "#f9f6f2";

    el.style.transform = `translate(${tile.col * (cell + gap)}px, ${
      tile.row * (cell + gap)
    }px)`;
  });
}

function handleKey(e) {
  const keyMap = {
    ArrowUp: "up",
    ArrowRight: "right",
    ArrowDown: "down",
    ArrowLeft: "left",
  };
  const dir = keyMap[e.key];
  if (!dir) return;
  e.preventDefault();
  move(dir);
}

let touchStart = null;
function onTouchStart(e) {
  const t = e.touches[0];
  touchStart = { x: t.clientX, y: t.clientY };
}

function onTouchEnd(e) {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  const threshold = 24;

  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
    move(dx > 0 ? "right" : "left");
  } else if (Math.abs(dy) > threshold) {
    move(dy > 0 ? "down" : "up");
  }

  touchStart = null;
}

document.addEventListener("keydown", handleKey);
boardEl.addEventListener("touchstart", onTouchStart, { passive: true });
boardEl.addEventListener("touchend", onTouchEnd, { passive: true });
document.getElementById("restart").addEventListener("click", startGame);
document.getElementById("retry").addEventListener("click", startGame);
document.getElementById("continue").addEventListener("click", () => {
  if (!safeSnapshot) return;
  overlayEl.classList.remove("show");
  restoreSnapshot(safeSnapshot);
});

startGame();
