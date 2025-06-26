    import React, { useEffect, useState } from "react";
    import { Link } from "react-router-dom";

    // Games
    import WordSearchGame from "./WordSearchGame";
    import MemoryMatchGame from "./MemoryMatchGame";
    import QuizGame from "./QuizGame";
    import SpaceShooterGame from "./SpaceShooterGame";
    import TrueOrFalseGame from "./TrueOrFalseGame";
    import OddOneOutGame from "./OddOneOutGame";
    import JigsawPuzzleGame from "./JigsawPuzzleGame";

    // API endpoints:
    const API_URL = "https://39rg9ru5oa.execute-api.eu-west-1.amazonaws.com/prod/random-approved";
    const ANALYTICS_API_URL = "https://39rg9ru5oa.execute-api.eu-west-1.amazonaws.com/prod/log-analytics";

    type GameItem = {
        itemId: string;
        version: number;
        type: string;
        lang: string;
        status: string;
        createdAt: string;
        spec: any;
    };

    async function logAnalytics(event: {
        type: string;
        gameType?: string;
        meta?: any;
    }) {
        try {
            await fetch(ANALYTICS_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(event)
            });
        } catch {
            // fail silently, don't break the UX
        }
    }

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

                logAnalytics({
                    type: "game_loaded",
                    gameType: data.type,
                    meta: {
                        itemId: data.itemId,
                        version: data.version,
                        lang: data.lang
                    }
                });
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

        function renderGameBody() {
            if (!game) return null;
            if (game.type === "word_search") {
                return renderWordSearchGrid(game.spec);
            }
            if (game.type === "quiz_mcq") {
                return <QuizGame spec={game.spec} />;
            }
            if (game.type === "jigsaw") {
                const puzzlePieces = (() => {
                    const valid = [9, 16, 25, 36, 49, 64];
                    const closest = valid.reduce((a, b) =>
                        Math.abs(b - game.spec.pieces) < Math.abs(a - game.spec.pieces) ? b : a
                    );
                    return closest;
                })();
                return (
                    <JigsawPuzzleGame
                        imageUrl={game.spec.imageUrl}
                        pieces={puzzlePieces}
                        size={360}
                    />
                );
            }
            if (game.type === "memory_match") {
                return <MemoryMatchGame spec={game.spec} />;
            }
            if (game.type === "space_shooter") {
                return <SpaceShooterGame spec={game.spec} />;
            }
            if (game.type === "true_false" || game.type === "true_or_false") {
                return <TrueOrFalseGame spec={game.spec} />;
            }
            if (game.type === "odd_one_out") {
                return <OddOneOutGame spec={game.spec} />;
            }
            return (
                <pre style={{ background: "#f7f7f7", padding: 8, borderRadius: 8, fontSize: 14 }}>
                    {JSON.stringify(game, null, 2)}
                </pre>
            );
        }

        return (
            <div style={{
                minHeight: "100vh",
                background: "linear-gradient(135deg, #f7f8fa 60%, #e4ecfb 100%)",
                fontFamily: "system-ui, sans-serif",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center"
            }}>
                <div style={{
                    maxWidth: 500,
                    width: "100%",
                    margin: "32px auto",
                    background: "#fff",
                    borderRadius: 22,
                    boxShadow: "0 2px 16px #4f7cff18",
                    padding: "32px 18px 34px 18px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center"
                }}>
                    <h2 style={{
                        textAlign: "center",
                        fontSize: 27,
                        color: "#2b2d42",
                        fontWeight: 900,
                        letterSpacing: "-1px",
                        marginBottom: 14
                    }}>
                        Random AI-Generated Game
                    </h2>
                    <div style={{ textAlign: "center", marginBottom: 18 }}>
                        <button
                            onClick={fetchRandomGame}
                            disabled={loading}
                            style={{
                                background: "linear-gradient(90deg,#4f7cff,#68e0cf)",
                                color: "#fff",
                                border: "none",
                                borderRadius: 22,
                                fontWeight: 700,
                                fontSize: 18,
                                padding: "10px 36px",
                                marginBottom: 6,
                                boxShadow: "0 2px 8px #4f7cff1a",
                                cursor: loading ? "not-allowed" : "pointer",
                                opacity: loading ? 0.65 : 1,
                                transition: "background .18s"
                            }}>
                            {loading ? "Loading..." : "New Game Please"}
                        </button>
                    </div>
                    {error && <div style={{ color: "crimson", marginBottom: 14, textAlign: "center" }}>{error}</div>}
                    {game && (
                        <div style={{
                            background: "#f8fbff",
                            borderRadius: 16,
                            boxShadow: "0 2px 8px #e4ecfb80",
                            padding: 20,
                            marginTop: 8,
                            width: "100%"
                        }}>

                            {renderGameBody()}
                        </div>
                    )}
                </div>

            </div>
        );
    }