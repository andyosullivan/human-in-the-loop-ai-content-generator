import React, { useState } from "react";
import "./WordSearch.css";

type WordSearchGameProps = {
    grid: string[][];
    words?: string[];
};

type Coord = [number, number];

function safeParseInt(val: any, fallback: number): number {
    const n = parseInt(val, 10);
    return isNaN(n) ? fallback : n;
}

export default function WordSearchGame({ grid, words = [] }: WordSearchGameProps) {
    // --- All hooks must go at the top! ---
    const [selectedCells, setSelectedCells] = useState<Coord[]>([]);
    const [isMouseDown, setIsMouseDown] = useState(false);
    const [startCell, setStartCell] = useState<Coord | null>(null);
    const lowerWords = Array.isArray(words) ? words.map((w) => String(w).toLowerCase()) : [];
    const [foundWords, setFoundWords] = useState<string[]>([]);
    const [foundPaths, setFoundPaths] = useState<Coord[][]>([]);
    const [touchActive, setTouchActive] = useState(false);

    // Defensive: grid size
    const maxRow = Array.isArray(grid) && grid.length > 0 && Array.isArray(grid[0]) ? grid.length : 0;
    const maxCol = Array.isArray(grid) && grid.length > 0 && Array.isArray(grid[0]) ? grid[0].length : 0;

    // --- Now do early return (after hooks) ---
    if (!Array.isArray(grid) || grid.length === 0 || !Array.isArray(grid[0])) {
        return <div style={{ color: "crimson" }}>Grid data is invalid.</div>;
    }

    // --- Touch support for mobile drag ---
    const handleWrapperTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        try {
            if (!touchActive) return;
            if (!grid || grid.length === 0) return;
            if (e.touches.length !== 1) return;
            const touch = e.touches[0];
            const el = document.elementFromPoint(touch.clientX, touch.clientY);
            if (
                el &&
                el.tagName === "TD" &&
                (el as HTMLElement).dataset.row !== undefined &&
                (el as HTMLElement).dataset.col !== undefined
            ) {
                const i = safeParseInt((el as HTMLElement).dataset.row, -1);
                const j = safeParseInt((el as HTMLElement).dataset.col, -1);
                if (
                    i >= 0 &&
                    j >= 0 &&
                    i < maxRow &&
                    j < maxCol &&
                    typeof grid[i]?.[j] !== "undefined"
                ) {
                    handleTouchMove(i, j);
                }
            }
        } catch (err) {
            // No crash, just ignore
        }
    };

    const handleTouchStart = (i: number, j: number) => {
        try {
            if (!grid[i] || typeof grid[i][j] === "undefined") return;
            setTouchActive(true);
            handleMouseDown(i, j);
        } catch {}
    };
    const handleTouchMove = (i: number, j: number) => {
        try {
            if (!grid[i] || typeof grid[i][j] === "undefined") return;
            handleMouseEnter(i, j);
        } catch {}
    };
    const handleTouchEnd = () => {
        try {
            setTouchActive(false);
            handleMouseUp();
        } catch {}
    };

    // --- Mouse handlers (desktop) ---
    const handleMouseDown = (i: number, j: number) => {
        if (!grid[i] || typeof grid[i][j] === "undefined") return;
        setIsMouseDown(true);
        setStartCell([i, j]);
        setSelectedCells([[i, j]]);
    };

    const handleMouseEnter = (i: number, j: number) => {
        if (!(isMouseDown || touchActive) || !startCell) return;
        if (!grid[i] || typeof grid[i][j] === "undefined") return;

        let dx = i - startCell[0];
        let dy = j - startCell[1];

        const direction = getDirection(dx, dy);
        if (!direction) return;

        const newSelection = buildLineToTarget(startCell, [i, j], direction);
        setSelectedCells(newSelection);
    };

    const buildLineToTarget = (start: Coord, end: Coord, dir: Coord): Coord[] => {
        const [sx, sy] = start;
        const [ex, ey] = end;
        const [dx, dy] = dir;

        let line: Coord[] = [];
        let x = sx;
        let y = sy;

        let safetyCounter = 0;
        const maxSafety = Math.max(maxRow, maxCol) + 3; // should never exceed grid size
        while (true) {
            if (x < 0 || y < 0 || x >= maxRow || y >= maxCol) break;
            line.push([x, y]);
            if (x === ex && y === ey) break;
            x += dx;
            y += dy;
            safetyCounter++;
            if (safetyCounter > maxSafety) break; // prevent infinite loop
        }
        return line;
    };

    const handleMouseUp = () => {
        try {
            if (currentWord.length === 0) return;

            if (lowerWords.includes(currentWord) && !foundWords.includes(currentWord)) {
                setFoundWords([...foundWords, currentWord]);
                setFoundPaths([...foundPaths, selectedCells]);
            }

            setIsMouseDown(false);
            setStartCell(null);
            setSelectedCells([]);
        } catch {}
    };

    const isInFoundPath = (i: number, j: number) =>
        foundPaths.some((path) => path.some(([x, y]) => x === i && y === j));

    const getDirection = (dx: number, dy: number): [number, number] | null => {
        if (dx === 0 && dy === 0) return null;
        if (dx !== 0) dx = dx / Math.abs(dx);
        if (dy !== 0) dy = dy / Math.abs(dy);
        return [dx, dy];
    };

    const isSelected = (i: number, j: number) =>
        selectedCells.some(([x, y]) => x === i && y === j);

    const isFound = (word: string) => foundWords.includes(word.toLowerCase());

    // Defensive: only build word from valid cells
    const currentWord = selectedCells
        .filter(([i, j]) => grid[i] && typeof grid[i][j] !== "undefined")
        .map(([i, j]) => grid[i][j])
        .join("")
        .toLowerCase();

    const getLiveFeedback = () => {
        try {
            if (currentWord.length === 0) return null;
            if (foundWords.includes(currentWord)) return `🟡 Already found: ${currentWord.toUpperCase()}`;
            if (lowerWords.includes(currentWord)) return `✅ Found: ${currentWord.toUpperCase()}`;
            return `❌ Not in list: ${currentWord.toUpperCase()}`;
        } catch {
            return null;
        }
    };

    return (
        <div
            onMouseLeave={() => setIsMouseDown(false)}
            onMouseUp={handleMouseUp}
            onTouchEnd={handleTouchEnd}
            style={{ width: "100%" }}
        >
            <h4 style={{ marginTop: 0, textAlign: "center", fontSize: 22, fontWeight: 800, marginBottom: 20 }}>
                Wordsearch
            </h4>
            <div
                style={{
                    width: "100%",
                    maxWidth: "100%",
                    overflowX: "auto",
                    WebkitOverflowScrolling: "touch",
                    touchAction: "none"
                }}
                onTouchMove={handleWrapperTouchMove}
            >
                <table
                    style={{
                        borderCollapse: "collapse",
                        margin: "1rem 0",
                        width: "100%",
                        minWidth: 240,
                        fontSize: "clamp(14px, 4vw, 22px)",
                        tableLayout: "fixed",
                    }}
                >
                    <tbody>
                    {grid.map((row, i) => (
                        <tr key={i}>
                            {row.map((cell, j) => (
                                <td
                                    key={j}
                                    data-row={i}
                                    data-col={j}
                                    onMouseDown={() => {
                                        try {
                                            handleMouseDown(i, j);
                                        } catch {}
                                    }}
                                    onMouseEnter={() => {
                                        try {
                                            handleMouseEnter(i, j);
                                        } catch {}
                                    }}
                                    onMouseUp={() => {
                                        try {
                                            handleMouseUp();
                                        } catch {}
                                    }}
                                    onTouchStart={e => {
                                        try {
                                            e.preventDefault();
                                            handleTouchStart(i, j);
                                        } catch {}
                                    }}
                                    onTouchEnd={e => {
                                        try {
                                            e.preventDefault();
                                            handleTouchEnd();
                                        } catch {}
                                    }}
                                    style={{
                                        border: "1px solid #ccc",
                                        padding: "clamp(7px, 3vw, 18px) clamp(10px, 3vw, 18px)",
                                        fontFamily: "monospace",
                                        fontWeight: 600,
                                        textAlign: "center",
                                        backgroundColor: isInFoundPath(i, j)
                                            ? "#c6f6c6"
                                            : isSelected(i, j)
                                                ? "#d1eaff"
                                                : undefined,
                                        userSelect: "none",
                                        cursor: "pointer",
                                        transition: "background 0.15s",
                                        minWidth: 28,
                                        maxWidth: 42,
                                    }}
                                >
                                    {typeof cell === "string" && cell.length === 1 ? cell : " "}
                                </td>
                            ))}
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {currentWord && (
                <div style={{ marginTop: 10, fontWeight: 500 }}>{getLiveFeedback()}</div>
            )}

            {Array.isArray(words) && words.length > 0 && (
                <div style={{ marginTop: 16 }}>
                    <b>Words to Find:</b>
                    <ul>
                        {words.map((word) => (
                            <li
                                key={word}
                                style={{
                                    textDecoration: isFound(word) ? "line-through" : undefined,
                                    color: isFound(word) ? "green" : undefined,
                                }}
                            >
                                {word}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
