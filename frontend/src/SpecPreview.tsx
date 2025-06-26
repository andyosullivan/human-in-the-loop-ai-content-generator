import React from "react";

// ----- TypeScript types for specs -----
type WordSearchSpec = {
    grid: string[][],
    words: string[]
};

type QuizMCQSpec = {
    questions: { question: string, choices: string[], answer: number }[]
};

type MemoryMatchSpec = {
    pairs: { term: string, match: string }[]
};

type SpaceShooterSpec = {
    level: number,
    enemyTypes: string[],
    playerAbilities: string[]
};

type JigsawSpec = {
    imageUrl: string,
    pieces: number
};

type OddOneOutSpec = {
    rounds: { options: string[], answer: number, explanation?: string }[]
};

type TrueOrFalseSpec = {
    questions: { statement: string, answer: boolean, explanation?: string }[]
};

export default function SpecPreview({ type, spec }: { type: string, spec: any }) {
    if (!spec || typeof spec !== "object") return <div>No preview available.</div>;

    switch (type) {
        case "word_search":
            return <WordSearchPreview spec={spec} />;
        case "quiz_mcq":
            return <QuizMCQPreview spec={spec} />;
        case "memory_match":
            return <MemoryMatchPreview spec={spec} />;
        case "space_shooter":
            return <SpaceShooterPreview spec={spec} />;
        case "jigsaw":
            return <JigsawPreview spec={spec} />;
        case "odd_one_out":
            return <OddOneOutPreview spec={spec} />;
        case "true_false":
            return <TrueOrFalsePreview spec={spec} />;
        default:
            return <div>Unknown type: {type}</div>;
    }
}

// ---- Individual Renderers -----

function WordSearchPreview({ spec }: { spec: WordSearchSpec }) {
    // Handle both array-of-arrays and array-of-strings
    const grid = spec.grid.map((row: any) =>
        typeof row === "string" ? row.split("") : row
    );

    return (
        <div>
            <h4>Word Search</h4>
            <div style={{ display: "inline-block", border: "1px solid #ccc", marginBottom: 8 }}>
                <table style={{ borderCollapse: "collapse", fontFamily: "monospace" }}>
                    <tbody>
                    {grid.map((row, i) =>
                        <tr key={i}>
                            {row.map((ch: string, j: number) =>
                                <td key={j} style={{
                                    border: "1px solid #ccc",
                                    width: 28,
                                    height: 28,
                                    textAlign: "center",
                                    fontWeight: "bold",
                                    fontSize: 20,
                                }}>{ch}</td>
                            )}
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
            <div>
                <strong>Words:</strong> {spec.words?.join(", ") || "No words"}
            </div>
        </div>
    );
}

function QuizMCQPreview({ spec }: { spec: QuizMCQSpec }) {
    const [selected, setSelected] = React.useState<{ [k: number]: number }>({});

    return (
        <div>
            <h4>Quiz (Multiple Choice)</h4>
            {spec.questions?.map((q, i) =>
                <div key={i} style={{ marginBottom: 20 }}>
                    <div><strong>Q{i+1}:</strong> {q.question}</div>
                    <ul style={{ listStyle: "none", padding: 0 }}>
                        {q.choices.map((choice, j) =>
                            <li key={j}>
                                <button
                                    style={{
                                        background: selected[i] === j
                                            ? (j === q.answer ? "green" : "crimson")
                                            : "#eee",
                                        color: selected[i] === j ? "#fff" : "#333",
                                        margin: 4, borderRadius: 6, border: "none", padding: "6px 16px"
                                    }}
                                    onClick={() => setSelected(sel => ({ ...sel, [i]: j }))}
                                >
                                    {choice}
                                </button>
                            </li>
                        )}
                    </ul>
                    {selected[i] !== undefined &&
                        <div>
                            {selected[i] === q.answer
                                ? <span style={{ color: "green" }}>Correct! 🎉</span>
                                : <span style={{ color: "crimson" }}>Nope! Correct answer: {q.choices[q.answer]}</span>}
                        </div>
                    }
                </div>
            )}
        </div>
    );
}

function MemoryMatchPreview({ spec }: { spec: MemoryMatchSpec }) {
    return (
        <div>
            <h4>Memory Match (Preview)</h4>
            <ul>
                {spec.pairs?.map((pair, i) =>
                    <li key={i}>{pair.term} — {pair.match}</li>
                )}
            </ul>
            <em>Full game: flip cards to match pairs (coming soon)</em>
        </div>
    );
}

function SpaceShooterPreview({ spec }: { spec: SpaceShooterSpec }) {
    return (
        <div>
            <h4>Space Shooter Level</h4>
            <div>Level: <b>{spec.level}</b></div>
            <div>Enemies: {spec.enemyTypes?.join(", ")}</div>
            <div>Player Abilities: {spec.playerAbilities?.join(", ")}</div>
            <em>Preview: Only shows level info, not a full game. (coming soon)</em>
        </div>
    );
}

function JigsawPreview({ spec }: { spec: JigsawSpec }) {
    return (
        <div>
            <h4>Jigsaw Puzzle</h4>
            <img src={spec.imageUrl} alt="jigsaw preview" style={{ width: 240, borderRadius: 12, border: "1px solid #ccc" }} />
            <div>Number of pieces: {spec.pieces}</div>
            <em>Preview: shows image, but not interactive yet</em>
        </div>
    );
}

// NEW: Odd One Out Preview
function OddOneOutPreview({ spec }: { spec: OddOneOutSpec }) {
    return (
        <div>
            <h4>Odd One Out</h4>
            {spec.rounds?.map((round, i) =>
                <div key={i} style={{ marginBottom: 18 }}>
                    <div><b>Round {i + 1}:</b></div>
                    <ul style={{ listStyle: "none", paddingLeft: 0 }}>
                        {round.options.map((option, j) =>
                            <li
                                key={j}
                                style={{
                                    display: "inline-block",
                                    marginRight: 16,
                                    padding: "4px 10px",
                                    borderRadius: 6,
                                    background: j === round.answer ? "#ffd6e0" : "#eee",
                                    fontWeight: j === round.answer ? "bold" : "normal"
                                }}
                            >
                                {option}
                                {j === round.answer ? <span style={{ marginLeft: 6, color: "#c90076" }}>★</span> : ""}
                            </li>
                        )}
                    </ul>
                    {round.explanation && <div style={{ fontSize: 14, color: "#555" }}>Explanation: {round.explanation}</div>}
                </div>
            )}
        </div>
    );
}

// NEW: True or False Preview
function TrueOrFalsePreview({ spec }: { spec: TrueOrFalseSpec }) {
    const [selected, setSelected] = React.useState<{ [k: number]: boolean | null }>({});

    return (
        <div>
            <h4>True or False</h4>
            {spec.questions?.map((q, i) =>
                <div key={i} style={{ marginBottom: 18 }}>
                    <div><strong>Q{i + 1}:</strong> {q.statement}</div>
                    <div>
                        <button
                            style={{
                                background: selected[i] === true
                                    ? (q.answer === true ? "green" : "crimson")
                                    : "#eee",
                                color: selected[i] === true ? "#fff" : "#333",
                                margin: 4, borderRadius: 6, border: "none", padding: "6px 18px"
                            }}
                            onClick={() => setSelected(sel => ({ ...sel, [i]: true }))}
                        >
                            True
                        </button>
                        <button
                            style={{
                                background: selected[i] === false
                                    ? (q.answer === false ? "green" : "crimson")
                                    : "#eee",
                                color: selected[i] === false ? "#fff" : "#333",
                                margin: 4, borderRadius: 6, border: "none", padding: "6px 18px"
                            }}
                            onClick={() => setSelected(sel => ({ ...sel, [i]: false }))}
                        >
                            False
                        </button>
                    </div>
                    {selected[i] !== undefined && selected[i] !== null && (
                        <div>
                            {selected[i] === q.answer
                                ? <span style={{ color: "green" }}>Correct! 🎉</span>
                                : <span style={{ color: "crimson" }}>Nope! Correct answer: <b>{q.answer ? "True" : "False"}</b></span>
                            }
                            {q.explanation &&
                                <div style={{ color: "#555", marginTop: 4, fontSize: 13 }}>Explanation: {q.explanation}</div>
                            }
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
