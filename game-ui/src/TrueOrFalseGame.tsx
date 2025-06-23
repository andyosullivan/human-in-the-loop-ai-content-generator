import React from "react";

export default function TrueOrFalseGame({ spec }: { spec: any }) {
    const [answers, setAnswers] = React.useState<{ [k: number]: boolean | null }>({});

    return (
        <div>
            <h3>True or False</h3>
            {spec.questions?.map((q: any, i: number) => (
                <div key={i} style={{ marginBottom: 18 }}>
                    <div style={{ fontWeight: "bold" }}>Q{i + 1}: {q.statement}</div>
                    <div>
                        <button
                            style={{
                                background: answers[i] === true
                                    ? (q.answer === true ? "green" : "crimson")
                                    : "#eee",
                                color: answers[i] === true ? "#fff" : "#333",
                                margin: 4, borderRadius: 6, border: "none", padding: "6px 18px"
                            }}
                            onClick={() => setAnswers(a => ({ ...a, [i]: true }))}
                            disabled={answers[i] !== undefined}
                        >
                            True
                        </button>
                        <button
                            style={{
                                background: answers[i] === false
                                    ? (q.answer === false ? "green" : "crimson")
                                    : "#eee",
                                color: answers[i] === false ? "#fff" : "#333",
                                margin: 4, borderRadius: 6, border: "none", padding: "6px 18px"
                            }}
                            onClick={() => setAnswers(a => ({ ...a, [i]: false }))}
                            disabled={answers[i] !== undefined}
                        >
                            False
                        </button>
                    </div>
                    {answers[i] !== undefined && (
                        <div>
                            {answers[i] === q.answer
                                ? <span style={{ color: "green" }}>Correct! 🎉</span>
                                : <span style={{ color: "crimson" }}>Nope! Correct answer: <b>{q.answer ? "True" : "False"}</b></span>
                            }
                            {q.explanation &&
                                <div style={{ color: "#555", marginTop: 4, fontSize: 13 }}>
                                    <em>Explanation:</em> {q.explanation}
                                </div>
                            }
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}