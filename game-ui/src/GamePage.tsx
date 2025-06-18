import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

//games
import WordSearchGame from "./WordSearchGame";
import MemoryMatchGame from "./MemoryMatchGame";

// Change to your deployed API endpoint:
const API_URL = "https://39rg9ru5oa.execute-api.eu-west-1.amazonaws.com/prod/random-approved";

type GameItem = {
    itemId: string;
    version: number;
    type: string;
    lang: string;
    status: string;
    createdAt: string;
    spec: any;
};

export default function GamePage() {
    const [game, setGame] = useState<GameItem | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function renderWordSearchGrid(spec: any) {
        if (!Array.isArray(spec.grid)) return <div>No grid data.</div>;

        const grid = spec.grid.map((row: string | string[]) =>
            Array.isArray(row) ? row : String(row).split("")
        );

        return <WordSearchGame grid={grid} words={spec.words || []} />;
    }

    const fetchRandomGame = async () => {
        setLoading(true);
        setError(null);
        setGame(null);
        try {
            const res = await fetch(API_URL);
            if (!res.ok) throw new Error("Failed to fetch game");
            const data = await res.json();
            setGame(data);
        } catch (e: any) {
            setError(e.message || "Failed to load game.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRandomGame();
        // eslint-disable-next-line
    }, []);

    // --- Render different game types simply (can extend each type) ---
    function renderGameBody() {
        if (!game) return null;
        if (game.type === "word_search") {
            return renderWordSearchGrid(game.spec);
        }

        if (game.type === "quiz_mcq") {
            return (
                <div>
                    <h3>Quiz</h3>
                    {(game.spec.questions || []).map((q: any, idx: number) => (
                        <div key={idx} style={{ marginBottom: 16 }}>
                            <b>{q.question}</b>
                            <ul>
                                {q.choices.map((c: string, ci: number) => (
                                    <li key={ci}>{c}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            );
        }

        if (game.type === "jigsaw") {
            return (
                <div>
                    <h3>Jigsaw Puzzle</h3>
                    <img
                        src={game.spec.imageUrl}
                        alt="Jigsaw"
                        style={{ maxWidth: "100%", maxHeight: 240, margin: "12px auto", display: "block" }}
                    />
                    <div><b>Pieces:</b> {game.spec.pieces}</div>
                </div>
            );
        }

        if (game.type === "memory_match") {
            return <MemoryMatchGame spec={game.spec} />;
        }

        if (game.type === "space_shooter") {
            return (
                <div>
                    <h3>Space Shooter</h3>
                    <div><b>Level:</b> {game.spec.level}</div>
                    <div><b>Enemies:</b> {(game.spec.enemyTypes || []).join(", ")}</div>
                    <div><b>Abilities:</b> {(game.spec.playerAbilities || []).join(", ")}</div>
                </div>
            );
        }

        return (
            <pre style={{ background: "#f7f7f7", padding: 8, borderRadius: 8, fontSize: 14 }}>
        {JSON.stringify(game, null, 2)}
      </pre>
        );
    }

    return (
        <div style={{ maxWidth: 480, margin: "auto", padding: "16px" }}>
            <h2 style={{ textAlign: "center" }}>Random AI-Generated Game</h2>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
                <button onClick={fetchRandomGame} disabled={loading} style={{
                    background: "#4f7cff",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 20px",
                    fontSize: 16,
                    marginBottom: 8,
                    cursor: loading ? "not-allowed" : "pointer"
                }}>
                    {loading ? "Loading..." : "New Game"}
                </button>
            </div>
            {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}
            {game && (
                <div style={{
                    background: "#fff",
                    borderRadius: 16,
                    boxShadow: "0 2px 10px #0001",
                    padding: 20,
                }}>
                    <div style={{ fontSize: 15, color: "#888", marginBottom: 4 }}>
                        <b>Type:</b> {game.type} &nbsp; | &nbsp; <b>Lang:</b> {game.lang}
                    </div>
                    {renderGameBody()}
                </div>
            )}
            <div style={{ textAlign: "center", marginTop: 28 }}>
                <Link to="/">Back to Home</Link>
            </div>
        </div>
    );
}
