import React, { useState, useEffect, useRef } from "react";

type Props = {
    imageUrl: string;
    pieces: number; // e.g. 16, 25, 36, etc. Must be a perfect square
    size?: number;  // optional max width in px, default 360
};

function shuffleArray<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

export default function JigsawPuzzleGame({ imageUrl, pieces, size = 360 }: Props) {
    const gridSize = Math.sqrt(pieces);
    const [tiles, setTiles] = useState<number[]>([]);
    const [selected, setSelected] = useState<number | null>(null);
    const [solved, setSolved] = useState(false);

    // Setup tiles
    useEffect(() => {
        const initialTiles = Array.from({ length: pieces }, (_, i) => i);
        setTiles(shuffleArray(initialTiles));
        setSolved(false);
        setSelected(null);
    }, [imageUrl, pieces]);

    // Check if solved
    useEffect(() => {
        setSolved(tiles.every((val, idx) => val === idx));
    }, [tiles]);

    // Swap handler
    function handleClick(idx: number) {
        if (solved) return;
        if (selected === null) {
            setSelected(idx);
        } else if (selected === idx) {
            setSelected(null);
        } else {
            // Swap tiles
            const newTiles = [...tiles];
            [newTiles[selected], newTiles[idx]] = [newTiles[idx], newTiles[selected]];
            setTiles(newTiles);
            setSelected(null);
        }
    }

    // Render a tile
    function renderTile(tileIdx: number, posIdx: number) {
        const tileRow = Math.floor(tileIdx / gridSize);
        const tileCol = tileIdx % gridSize;

        return (
            <div
                key={posIdx}
                onClick={() => handleClick(posIdx)}
                style={{
                    width: "100%",
                    height: "100%",
                    boxSizing: "border-box",
                    border: selected === posIdx ? "2px solid #4f7cff" : "1px solid #bbb",
                    cursor: solved ? "default" : "pointer",
                    backgroundImage: `url(${imageUrl})`,
                    backgroundPosition: `${(-tileCol * 100) / (gridSize - 1)}% ${(-tileRow * 100) / (gridSize - 1)}%`,
                    backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
                    opacity: solved ? 0.8 : 1,
                    transition: "border 0.2s",
                }}
            />
        );
    }

    return (
        <div>
            <h4 style={{ marginTop: 0, textAlign: "center", fontSize: 22, fontWeight: 800, marginBottom: 20 }}>
                Jigsaw Puzzle
            </h4>
            <div
                style={{
                    width: "100%",
                    maxWidth: size,
                    aspectRatio: "1/1",
                    display: "grid",
                    gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                    gridTemplateRows: `repeat(${gridSize}, 1fr)`,
                    gap: 0,
                    margin: "auto",
                    userSelect: "none",
                    background: "#e4ecfb"
                }}
            >
                {tiles.map((tileIdx, i) => renderTile(tileIdx, i))}
            </div>
            {solved && <div style={{ color: "green", fontWeight: "bold", marginTop: 10 }}>🎉 You solved it!</div>}
            <div style={{ textAlign: "center", fontSize: 13, marginTop: 8 }}>
                Click two tiles to swap them. Complete the image to win!
            </div>
        </div>
    );
}
