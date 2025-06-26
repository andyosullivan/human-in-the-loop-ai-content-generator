import React from "react";

export default function OddOneOutGame({ spec }: { spec: any }) {
    const [selected, setSelected] = React.useState<{ [k: number]: number | null }>({});
    return (
        <div>
            <h2 style={{ marginTop: 0, textAlign: "center" }}>Odd One Out</h2>
            {spec.rounds?.map((round: any, i: number) => (
                <div key={i} style={{ marginBottom: 18 }}>
                    <div><b>Round {i + 1}:</b></div>
                    <div>
                        {round.options.map((option: string, j: number) => (
                            <button
                                key={j}
                                style={{
                                    background: selected[i] === j
                                        ? (j === round.answer ? "green" : "crimson")
                                        : "#eee",
                                    color: selected[i] === j ? "#fff" : "#333",
                                    margin: 4, borderRadius: 6, border: "none", padding: "6px 16px",
                                    fontWeight: selected[i] === j ? "bold" : "normal"
                                }}
                                onClick={() => setSelected(sel => ({ ...sel, [i]: j }))}
                                disabled={selected[i] !== undefined}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                    {selected[i] !== undefined && (
                        <div>
                            {selected[i] === round.answer
                                ? <span style={{ color: "green" }}>Correct! 🎉</span>
                                : <span style={{ color: "crimson" }}>Nope! Correct answer: {round.options[round.answer]}</span>
                            }
                            {round.explanation &&
                                <div style={{ color: "#555", marginTop: 4, fontSize: 13 }}>
                                    <em>Explanation:</em> {round.explanation}
                                </div>
                            }
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}