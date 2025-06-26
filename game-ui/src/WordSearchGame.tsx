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


    const handleMouseDown = (i: number, j: number) => {
        setIsMouseDown(true);
        setStartCell([i, j]);
        setSelectedCells([[i, j]]);
    };

    const handleMouseEnter = (i: number, j: number) => {
        if (!isMouseDown || !startCell) return;

        const dx = i - startCell[0];
        const dy = j - startCell[1];

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

        while ((dx === 0 || x !== ex + dx) && (dy === 0 || y !== ey + dy)) {
            line.push([x, y]);
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

    const buildLine = (start: Coord, dir: Coord, maxRows: number, maxCols: number): Coord[] => {
        const [dx, dy] = dir;
        let line: Coord[] = [];
        let [x, y] = start;

        while (x >= 0 && x < maxRows && y >= 0 && y < maxCols) {
            line.push([x, y]);
            x += dx;
            y += dy;
        }

        return line;
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
        <div onMouseLeave={() => setIsMouseDown(false)} onMouseUp={handleMouseUp}>
            <h4 style={{ marginTop: 0, textAlign: "center", fontSize: 22, fontWeight: 800, marginBottom: 20 }}>
                Wordsearch
            </h4>
            <table style={{ borderCollapse: "collapse", margin: "1rem 0" }}>
                <tbody>
                {grid.map((row, i) => (
                    <tr key={i}>
                        {row.map((cell, j) => (
                            <td
                                key={j}
                                onMouseDown={() => handleMouseDown(i, j)}
                                onMouseEnter={() => handleMouseEnter(i, j)}
                                style={{
                                    border: "1px solid #ccc",
                                    padding: "6px 10px",
                                    fontFamily: "monospace",
                                    fontWeight: 600,
                                    backgroundColor: isInFoundPath(i, j)
                                        ? "#c6f6c6" // light green for found
                                        : isSelected(i, j)
                                            ? "#d1eaff" // blue for current selection
                                            : undefined,
                                    userSelect: "none",
                                    cursor: "pointer",
                                }}
                            >
                                {cell}
                            </td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>

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