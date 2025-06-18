import React, { useState } from "react";

type QuizQuestion = {
    question: string;
    choices: string[];
    answer: number;
};
type QuizMCQSpec = {
    questions: QuizQuestion[];
};

export default function QuizGame({ spec }: { spec: QuizMCQSpec }) {
    const questions = spec.questions ?? [];
    const [current, setCurrent] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);

    function handleSelect(idx: number) {
        if (selected !== null) return; // Don't allow multiple answers
        setSelected(idx);
        if (idx === questions[current].answer) setScore(s => s + 1);
        setTimeout(() => {
            if (current + 1 < questions.length) {
                setCurrent(c => c + 1);
                setSelected(null);
            } else {
                setShowResult(true);
            }
        }, 900);
    }

    function handleRestart() {
        setCurrent(0);
        setSelected(null);
        setScore(0);
        setShowResult(false);
    }

    if (!questions.length) return <div>No quiz data!</div>;

    if (showResult) {
        return (
            <div style={{ textAlign: "center", margin: "2rem 0" }}>
                <h2>Quiz Complete!</h2>
                <div style={{ fontSize: 22, margin: "1.5rem 0" }}>
                    You scored <b>{score}</b> out of <b>{questions.length}</b>!
                </div>
                <button onClick={handleRestart} style={btnStyle}>
                    Try Again
                </button>
            </div>
        );
    }

    const q = questions[current];

    return (
        <div style={{
            maxWidth: 480,
            margin: "2rem auto",
            padding: "2rem",
            borderRadius: 16,
            background: "#fff",
            boxShadow: "0 3px 18px #0001"
        }}>
            <div style={{ color: "#666", marginBottom: 12, fontSize: 15 }}>
                Question <b>{current + 1}</b> of <b>{questions.length}</b>
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 18 }}>
                {q.question}
            </div>
            <div>
                {q.choices.map((choice, idx) => {
                    let bg = "#f6f7ff";
                    let color = "#222";
                    if (selected !== null) {
                        if (idx === q.answer) {
                            bg = "#b6f7ba";
                            color = "#236a2d";
                        } else if (idx === selected) {
                            bg = "#ffb9b0";
                            color = "#7b1915";
                        }
                    }
                    return (
                        <button
                            key={idx}
                            style={{
                                ...btnStyle,
                                display: "block",
                                width: "100%",
                                background: bg,
                                color,
                                fontWeight: 500,
                                margin: "10px 0",
                                border: selected !== null && idx === q.answer ? "2px solid #3a995a"
                                    : selected !== null && idx === selected ? "2px solid #b9493e"
                                        : "1px solid #ddd"
                            }}
                            onClick={() => handleSelect(idx)}
                            disabled={selected !== null}
                        >
                            {choice}
                        </button>
                    );
                })}
            </div>
            {selected !== null && (
                <div style={{ margin: "10px 0", fontWeight: 600 }}>
                    {selected === q.answer ? (
                        <span style={{ color: "#218739" }}>Correct! 🎉</span>
                    ) : (
                        <span style={{ color: "#b94e3b" }}>
              Nope! The correct answer is <b>{q.choices[q.answer]}</b>
            </span>
                    )}
                </div>
            )}
        </div>
    );
}

const btnStyle: React.CSSProperties = {
    borderRadius: 8,
    padding: "14px 18px",
    fontSize: 17,
    border: "1px solid #ddd",
    cursor: "pointer",
    outline: "none",
    margin: "2px 0",
    background: "#f6f7ff",
    transition: "all 0.2s"
};
