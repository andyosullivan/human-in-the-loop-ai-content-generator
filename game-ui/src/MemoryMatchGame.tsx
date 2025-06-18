import React, { useEffect, useState } from "react";

type Pair = { term: string; match: string };
type MemoryMatchSpec = { pairs: Pair[] };

type Card = {
    id: string;
    value: string;
    pairId: number;
    flipped: boolean;
    matched: boolean;
};

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

    // Build and shuffle cards
    useEffect(() => {
        const freshCards: Card[] = [];
        spec.pairs.forEach((pair, idx) => {
            freshCards.push(
                { id: `term-${idx}`, value: pair.term, pairId: idx, flipped: false, matched: false },
                { id: `match-${idx}`, value: pair.match, pairId: idx, flipped: false, matched: false }
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
                    // Check for win
                    if (updated.every((c) => c.matched)) setGameWon(true);
                }, 500);
            } else {
                // Not matched, flip back after a delay
                setTimeout(() => {
                    const updated = [...newCards];
                    updated[i1].flipped = false;
                    updated[i2].flipped = false;
                    setCards(updated);
                    setFlipped([]);
                }, 900);
            }
        }
    }

    function handleReset() {
        const freshCards: Card[] = [];
        spec.pairs.forEach((pair, idx) => {
            freshCards.push(
                { id: `term-${idx}`, value: pair.term, pairId: idx, flipped: false, matched: false },
                { id: `match-${idx}`, value: pair.match, pairId: idx, flipped: false, matched: false }
            );
        });
        setCards(shuffle(freshCards));
        setFlipped([]);
        setMoves(0);
        setGameWon(false);
    }

    return (
        <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            fontFamily: "system-ui", margin: "1rem 0"
        }}>
            <h2 style={{ marginBottom: 8 }}>Memory Match</h2>
            <div style={{ marginBottom: 12, color: "#555", fontSize: 16 }}>
                Match each word with a word that relates to it! Moves: <b>{moves}</b>
                <button
                    style={{
                        marginLeft: 16,
                        background: "#eee",
                        border: "none",
                        borderRadius: 6,
                        padding: "4px 12px",
                        cursor: "pointer"
                    }}
                    onClick={handleReset}
                >
                    Reset
                </button>
            </div>
            {gameWon && (
                <div style={{ color: "green", fontWeight: "bold", margin: "10px 0" }}>
                    🎉 You matched all pairs in {moves} moves!
                </div>
            )}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${Math.min(cards.length / 2, 4)}, minmax(90px, 1fr))`,
                    gap: "16px",
                    maxWidth: 440,
                    margin: "0 auto"
                }}
            >
                {cards.map((card, i) => (
                    <div
                        key={card.id}
                        onClick={() => handleCardClick(i)}
                        style={{
                            width: 90,
                            height: 60,
                            background: card.matched
                                ? "#d6ffd6"
                                : card.flipped
                                    ? "#fff"
                                    : "#415bff",
                            color: card.flipped || card.matched ? "#222" : "#fff",
                            border: card.flipped ? "2px solid #415bff" : "2px solid #888",
                            borderRadius: 12,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: card.flipped || card.matched ? "default" : "pointer",
                            fontSize: 17,
                            fontWeight: 600,
                            boxShadow: "0 2px 10px #0001",
                            transition: "background 0.3s, color 0.2s, border 0.2s"
                        }}
                        aria-label={card.flipped || card.matched ? card.value : "Card"}
                        tabIndex={0}
                    >
                        {card.flipped || card.matched ? card.value : <span style={{fontSize: 22}}>🃏</span>}
                    </div>
                ))}
            </div>
        </div>
    );
}
