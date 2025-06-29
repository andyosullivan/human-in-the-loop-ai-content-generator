import React, { useEffect, useState } from "react";

type Pair = { term: string; match: string };
type MemoryMatchSpec = { pairs: Pair[] };

type Card = {
    id: string;
    value: string;
    pairId: number;
    flipped: boolean;
    matched: boolean;
    color: string;
};

const PASTELS = [
    "#BEE3F8", // blue
    "#FBC2EB", // pink
    "#C1F7C0", // mint
    "#FFF6B7", // yellow
    "#FFD6E0", // blush
    "#B5D0FF", // sky
    "#FDE1A9", // peach
    "#F8D6FF", // lilac
    "#FEE4CB", // orange
    "#D1F2EB", // teal
];

function getPairColors(n: number): string[] {
    // Repeat colors if more than palette
    let arr: string[] = [];
    while (arr.length < n) arr = arr.concat(PASTELS);
    return arr.slice(0, n);
}

function shuffle<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export default function MemoryMatchGame({ spec }: { spec: MemoryMatchSpec }) {
    // Cards: for each pair, create two cards, one for term, one for match.
    const [cards, setCards] = useState<Card[]>([]);
    const [flipped, setFlipped] = useState<number[]>([]);
    const [moves, setMoves] = useState(0);
    const [gameWon, setGameWon] = useState(false);

    // Build and shuffle cards, assign pastel color per pair
    useEffect(() => {
        const colors = getPairColors(spec.pairs.length);
        const freshCards: Card[] = [];
        spec.pairs.forEach((pair, idx) => {
            const color = colors[idx];
            freshCards.push(
                { id: `term-${idx}`, value: pair.term, pairId: idx, flipped: false, matched: false, color },
                { id: `match-${idx}`, value: pair.match, pairId: idx, flipped: false, matched: false, color }
            );
        });
        setCards(shuffle(freshCards));
        setFlipped([]);
        setMoves(0);
        setGameWon(false);
    }, [spec]);

    // Card flip handler
    function handleCardClick(i: number) {
        if (flipped.length === 2 || cards[i].flipped || cards[i].matched) return;
        const newFlipped = [...flipped, i];
        const newCards = [...cards];
        newCards[i].flipped = true;
        setCards(newCards);
        setFlipped(newFlipped);

        if (newFlipped.length === 2) {
            setMoves((m) => m + 1);
            const [i1, i2] = newFlipped;
            if (
                i1 !== i2 &&
                cards[i1].pairId === cards[i2].pairId &&
                cards[i1].id !== cards[i2].id // must not be the same card!
            ) {
                // Matched!
                setTimeout(() => {
                    const updated = [...newCards];
                    updated[i1].matched = true;
                    updated[i2].matched = true;
                    setCards(updated);
                    setFlipped([]);
                    if (updated.every((c) => c.matched)) setGameWon(true);
                }, 350); // slightly faster for better feel
            } else {
                setTimeout(() => {
                    const updated = [...newCards];
                    updated[i1].flipped = false;
                    updated[i2].flipped = false;
                    setCards(updated);
                    setFlipped([]);
                }, 700);
            }
        }
    }

    function handleReset() {
        const colors = getPairColors(spec.pairs.length);
        const freshCards: Card[] = [];
        spec.pairs.forEach((pair, idx) => {
            const color = colors[idx];
            freshCards.push(
                { id: `term-${idx}`, value: pair.term, pairId: idx, flipped: false, matched: false, color },
                { id: `match-${idx}`, value: pair.match, pairId: idx, flipped: false, matched: false, color }
            );
        });
        setCards(shuffle(freshCards));
        setFlipped([]);
        setMoves(0);
        setGameWon(false);
    }

    // Responsive grid: 2–4 columns, never overflows
    const gridCols =
        cards.length <= 4
            ? 2
            : cards.length <= 6
                ? 3
                : cards.length <= 12
                    ? 4
                    : Math.min(5, Math.ceil(Math.sqrt(cards.length)));

    return (
        <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            fontFamily: "system-ui", margin: "1rem 0",
            width: "100%",
            maxWidth: 440
        }}>
            <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 28, fontWeight: 800, letterSpacing: -1, color: "#222" }}>
                Memory Match
            </h2>
            <div style={{ marginBottom: 12, color: "#555", fontSize: 17, textAlign: "center" }}>
                Match each word with a word that relates to it! Moves: <b>{moves}</b>
                <button
                    style={{
                        marginLeft: 16,
                        background: "#f1f3f5",
                        border: "none",
                        borderRadius: 8,
                        padding: "5px 16px",
                        cursor: "pointer",
                        fontWeight: 500,
                        fontSize: 16,
                        boxShadow: "0 2px 4px #0001",
                        transition: "background 0.15s"
                    }}
                    onClick={handleReset}
                >
                    Reset
                </button>
            </div>
            {gameWon && (
                <div style={{
                    color: "#39984a",
                    fontWeight: "bold",
                    margin: "14px 0",
                    fontSize: 20,
                    background: "#e5ffe7",
                    borderRadius: 10,
                    padding: "8px 18px",
                    boxShadow: "0 2px 8px #d2ffea"
                }}>
                    🎉 You matched all pairs in {moves} moves!
                </div>
            )}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${gridCols}, minmax(70px, 1fr))`,
                    gap: "14px",
                    width: "100%",
                    maxWidth: 400,
                    margin: "0 auto",
                    boxSizing: "border-box"
                }}
            >
                {cards.map((card, i) => (
                    <div
                        key={card.id}
                        onClick={() => handleCardClick(i)}
                        style={{
                            aspectRatio: "7/5",
                            width: "100%",
                            background: card.matched
                                ? "#c9fad5"
                                : card.flipped
                                    ? card.color
                                    : "#b1b9f9",
                            color: card.flipped || card.matched ? "#29324a" : "#fff",
                            border: "none",
                            borderRadius: 16,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: card.flipped || card.matched ? "default" : "pointer",
                            fontSize: card.flipped || card.matched ? 19 : 30,
                            fontWeight: 700,
                            boxShadow: card.matched
                                ? "0 2px 16px #8dffc380"
                                : "0 2px 8px #c5cef540",
                            transition: "background 0.28s, color 0.16s, box-shadow 0.3s",
                            outline: card.flipped ? "2.5px solid #679dff" : "none",
                            opacity: card.matched ? 0.82 : 1,
                            userSelect: "none",
                            overflow: "hidden",
                        }}
                        aria-label={card.flipped || card.matched ? card.value : "Card"}
                        tabIndex={0}
                    >
                        {card.flipped || card.matched ? (
                            <span
                                style={{
                                    transition: "color 0.22s, opacity 0.22s",
                                    textShadow: "0 1px 1px #fff7",
                                    whiteSpace: "normal",
                                    overflowWrap: "break-word",
                                    wordBreak: "break-word",
                                    textAlign: "center",
                                    padding: "2px 6px",
                                    width: "100%", // so it uses the card width for wrapping
                                    display: "block",
                                }}
                            >
    {card.value}
  </span>
                        ) : (
                            <span style={{ fontSize: 30, opacity: 0.75 }}>?</span>
                        )}

                    </div>
                ))}
            </div>
        </div>
    );
}
