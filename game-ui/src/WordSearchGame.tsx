import React, { useState } from "react";
import "./WordSearch.css";

type WordSearchGameProps = {
    grid: string[][];
    words?: string[];
};

type Coord = [number, number];

export default function WordSearchGame({ grid, words = [] }: WordSearchGameProps) {
    const [selectedCells, setSelectedCells] = useState<Coord[]>([]);
    const [isMouseDown, setIsMouseDown] = useState(false);
    const [startCell, setStartCell] = useState<Coord | null>(null);
    const lowerWords = words.map((w) => w.toLowerCase());
    const [foundWords, setFoundWords] = useState<string[]>([]);
    const [foundPaths, setFoundPaths] = useState<Coord[][]>([]);

    // For mobile drag: track if a touch drag is active
    const [touchActive, setTouchActive] = useState(false);

    // --- Touch support: main fix! ---
    const handleWrapperTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!touchActive) return;
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            // Find the element under the finger
            const el = document.elementFromPoint(touch.clientX, touch.clientY);
            if (el && el.tagName === "TD" && (el as HTMLElement).dataset.row && (el as HTMLElement).dataset.col) {
                const i = parseInt((el as HTMLElement).dataset.row!, 10);
                const j = parseInt((el as HTMLElement).dataset.col!, 10);
                handleTouchMove(i, j);
            }
        }
    };

    const handleTouchStart = (i: number, j: number) => {
        setTouchActive(true);
        handleMouseDown(i, j);
    };
    const handleTouchMove = (i: number, j: number) => {
        handleMouseEnter(i, j);
    };
    const handleTouchEnd = () => {
        setTouchActive(false);
        handleMouseUp();
    };

    // --- Mouse handlers (desktop) ---
    const handleMouseDown = (i: number, j: number) => {
        setIsMouseDown(true);
        setStartCell([i, j]);
        setSelectedCells([[i, j]]);
    };

    const handleMouseEnter = (i: number, j: number) => {
        if (!(isMouseDown || touchActive) || !startCell) return;

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

        while (true) {
            line.push([x, y]);
            if (x === ex && y === ey) break;
            x += dx;
            y += dy;
        }
        return line;
    };

    const handleMouseUp = () => {
        if (currentWord.length === 0) return;

        if (lowerWords.includes(currentWord) && !foundWords.includes(currentWord)) {
            setFoundWords([...foundWords, currentWord]);
            setFoundPaths([...foundPaths, selectedCells]);
        }

        setIsMouseDown(false);
        setStartCell(null);
        setSelectedCells([]);
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

    const currentWord = selectedCells.map(([i, j]) => grid[i][j]).join("").toLowerCase();

    const getLiveFeedback = () => {
        if (currentWord.length === 0) return null;
        if (foundWords.includes(currentWord)) return `🟡 Already found: ${currentWord.toUpperCase()}`;
        if (lowerWords.includes(currentWord)) return `✅ Found: ${currentWord.toUpperCase()}`;
        return `❌ Not in list: ${currentWord.toUpperCase()}`;
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
                // key mobile fix: track drag across the whole grid
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
                                    onMouseDown={() => handleMouseDown(i, j)}
                                    onMouseEnter={() => handleMouseEnter(i, j)}
                                    onMouseUp={handleMouseUp}
                                    onTouchStart={e => {
                                        e.preventDefault();
                                        handleTouchStart(i, j);
                                    }}
                                    onTouchEnd={e => {
                                        e.preventDefault();
                                        handleTouchEnd();
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
                                    {cell}
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

            {words.length > 0 && (
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