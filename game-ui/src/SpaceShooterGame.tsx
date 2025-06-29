import React, { useRef, useEffect, useState } from "react";

type SpaceShooterSpec = {
    level: number,
    enemyTypes: string[],
    playerAbilities: string[]
};

type Enemy = {
    x: number,
    y: number,
    dx: number,
    dy: number,
    type: string,
    id: number
};

type Bullet = { x: number, y: number, dy: number };

const VIRTUAL_WIDTH = 400;
const VIRTUAL_HEIGHT = 420;
const ENEMY_ROWS = 2;
const ENEMY_SIZE = 54; // made bigger!
const ENEMY_SPEED = 1.1;
const PLAYER_SIZE = 48; // made bigger!
const PLAYER_SPEED = 6;
const BULLET_SIZE = 13; // made bigger!
const BULLET_SPEED = 11;

export default function SpaceShooterGame({ spec }: { spec: SpaceShooterSpec }) {
    // Responsive canvas
    const [canvasWidth, setCanvasWidth] = useState(VIRTUAL_WIDTH);
    useEffect(() => {
        function handleResize() {
            setCanvasWidth(Math.min(VIRTUAL_WIDTH, Math.floor(window.innerWidth * 0.97)));
        }
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gameState, setGameState] = useState<"start" | "playing" | "won" | "lost">("start");
    const [score, setScore] = useState(0);
    const [frame, setFrame] = useState(0);

    // Use refs for these during game
    const player = useRef({ x: 180, y: 360 });
    const enemies = useRef<Enemy[]>([]);
    const bullets = useRef<Bullet[]>([]);
    const lives = useRef(3);
    const enemyId = useRef(0);

    const [touch, setTouch] = useState({ x: 0, left: false, right: false, fire: false });

    // Reset function for all game variables
    const resetGame = () => {
        player.current = { x: 180, y: 360 };
        bullets.current = [];
        enemyId.current = 0;
        lives.current = 3;
        setScore(0);

        // build enemies - always start them *safely high up* and avoid right wall spawn
        let startEnemies: Enemy[] = [];
        let nCols = 5 + spec.level;
        let types = spec.enemyTypes.length ? spec.enemyTypes : ["Alien"];
        for (let row = 0; row < ENEMY_ROWS; row++) {
            for (let col = 0; col < nCols; col++) {
                let type = types[(row * nCols + col) % types.length];
                // Stagger x start to avoid instant right wall hits
                let xStart = 20 + col * ((360) / (nCols - 1));
                startEnemies.push({
                    x: xStart,
                    y: 40 + row * 56,
                    dx: ENEMY_SPEED * (Math.random() > 0.5 ? 1 : -1) * (1 + spec.level * 0.1),
                    dy: 0,
                    type,
                    id: enemyId.current++
                });
            }
        }
        enemies.current = startEnemies;
    };

    // Start/restart logic
    useEffect(() => {
        if (gameState === "playing") {
            resetGame();
            setFrame(f => f + 1);
        }
        // eslint-disable-next-line
    }, [gameState, spec.level, spec.enemyTypes.join(",")]);

    useEffect(() => {
        function handle(e: KeyboardEvent, isDown: boolean) {
            if (gameState !== "playing") return;
            keys.current[e.key.toLowerCase()] = isDown;
        }
        function down(e: KeyboardEvent) { handle(e, true); }
        function up(e: KeyboardEvent) { handle(e, false); }
        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);
        return () => {
            window.removeEventListener("keydown", down);
            window.removeEventListener("keyup", up);
        };
        // eslint-disable-next-line
    }, [gameState]);

    const keys = useRef<{ [k: string]: boolean }>({});

    useEffect(() => {
        if (gameState !== "playing") return;
        let raf: number;
        let lastFire = 0;

        function loop() {
            // Movement
            if (keys.current["arrowleft"] || keys.current["a"] || touch.left) player.current.x -= PLAYER_SPEED;
            if (keys.current["arrowright"] || keys.current["d"] || touch.right) player.current.x += PLAYER_SPEED;
            player.current.x = Math.max(0, Math.min(VIRTUAL_WIDTH - PLAYER_SIZE, player.current.x));

            // Fire
            if ((keys.current[" "] || keys.current["arrowup"] || keys.current["w"] || touch.fire) && Date.now() - lastFire > 350) {
                bullets.current.push({
                    x: player.current.x + PLAYER_SIZE / 2 - BULLET_SIZE / 2,
                    y: player.current.y - BULLET_SIZE,
                    dy: -BULLET_SPEED
                });
                lastFire = Date.now();
            }

            // Bullet movement
            bullets.current.forEach(b => b.y += b.dy);
            bullets.current = bullets.current.filter(b => b.y > -10 && b.y < VIRTUAL_HEIGHT);

            // Enemy movement
            enemies.current.forEach(e => {
                e.x += e.dx;
                if (e.x < 5 || e.x > VIRTUAL_WIDTH - ENEMY_SIZE - 5) {
                    e.dx *= -1;
                    e.y += 18;
                }
            });

            // Bullet/enemy collision
            let hit: { bulletIdx: number; enemyIdx: number } | null = null;
            outer: for (let bi = 0; bi < bullets.current.length; bi++) {
                for (let ei = 0; ei < enemies.current.length; ei++) {
                    const b = bullets.current[bi];
                    const e = enemies.current[ei];
                    if (
                        b.x < e.x + ENEMY_SIZE &&
                        b.x + BULLET_SIZE > e.x &&
                        b.y < e.y + ENEMY_SIZE &&
                        b.y + BULLET_SIZE > e.y
                    ) {
                        hit = { bulletIdx: bi, enemyIdx: ei };
                        break outer;
                    }
                }
            }
            if (hit) {
                bullets.current.splice(hit.bulletIdx, 1);
                enemies.current.splice(hit.enemyIdx, 1);
                setScore(s => s + 100);
            }

            // Enemy/player collision
            enemies.current.forEach(e => {
                if (
                    e.x < player.current.x + PLAYER_SIZE &&
                    e.x + ENEMY_SIZE > player.current.x &&
                    e.y + ENEMY_SIZE > player.current.y
                ) {
                    lives.current -= 1;
                    enemies.current = enemies.current.filter(en => en.id !== e.id);
                    player.current.x = 180;
                }
                if (e.y + ENEMY_SIZE > VIRTUAL_HEIGHT - 20) {
                    lives.current -= 1;
                    enemies.current = enemies.current.filter(en => en.id !== e.id);
                }
            });

            // Win/lose checks
            if (enemies.current.length === 0) {
                setGameState("won");
                return;
            }
            if (lives.current <= 0) {
                setGameState("lost");
                return;
            }

            draw();
            setFrame(f => f + 1);
            raf = requestAnimationFrame(loop);
        }

        function draw() {
            const ctx = canvasRef.current?.getContext("2d");
            if (!ctx) return;
            // Responsive scale
            const scale = canvasWidth / VIRTUAL_WIDTH;
            ctx.setTransform(scale, 0, 0, scale, 0, 0);

            ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

            // Draw player as big emoji
            ctx.font = "48px system-ui";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("🚀", player.current.x + PLAYER_SIZE / 2, player.current.y + PLAYER_SIZE / 2);

            // Draw enemies as big emojis
            enemies.current.forEach(e => {
                ctx.font = "44px system-ui";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(getEnemySprite(e.type), e.x + ENEMY_SIZE / 2, e.y + ENEMY_SIZE / 2);
            });

            // Draw bullets
            ctx.fillStyle = "#fff";
            bullets.current.forEach(b => {
                ctx.fillRect(b.x, b.y, BULLET_SIZE, BULLET_SIZE);
            });

            // Draw score/lives
            ctx.font = "bold 18px system-ui";
            ctx.textAlign = "left";
            ctx.textBaseline = "alphabetic";
            ctx.fillStyle = "#333";
            ctx.fillText(`Score: ${score}`, 10, VIRTUAL_HEIGHT - 2);
            ctx.fillText(`Lives: ${lives.current}`, VIRTUAL_WIDTH - 100, VIRTUAL_HEIGHT - 2);

            // Reset transform for safety
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }

        loop();
        return () => cancelAnimationFrame(raf);
        // eslint-disable-next-line
    }, [gameState, touch, canvasWidth]);

    function TouchControls() {
        // Helper to set a given control on
        function handleDown(ctrl: "left" | "right" | "fire") {
            setTouch(t => ({ ...t, [ctrl]: true }));
        }
        // Helper to set a given control off
        function handleUp(ctrl: "left" | "right" | "fire") {
            setTouch(t => ({ ...t, [ctrl]: false }));
        }

        // Pass these handlers to both pointer and touch events
        const addHandlers = (ctrl: "left" | "right" | "fire") => ({
            onTouchStart: (e: React.TouchEvent) => { e.preventDefault(); handleDown(ctrl); },
            onTouchEnd: () => handleUp(ctrl),
            onTouchCancel: () => handleUp(ctrl),
            onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); handleDown(ctrl); },
            onPointerUp: () => handleUp(ctrl),
            onPointerCancel: () => handleUp(ctrl),
        });

        return (
            <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
                <button {...addHandlers("left")} style={ctrlBtn}>◀️</button>
                <button {...addHandlers("right")} style={ctrlBtn}>▶️</button>
                <button {...addHandlers("fire")} style={ctrlBtn}>🔫</button>
            </div>
        );
    }

    function getEnemySprite(type: string) {
        return {
            "Astro-Bots": "🤖",
            "CometCrawlers": "☄️",
            "StarScourges": "👾",
            "Alien": "👾",
            "Comet": "☄️",
            "Asteroid": "🪨"
        }[type] || "👾";
    }

    return (
        <div style={{ textAlign: "center", marginTop: 24 }}>
            <h2>🚀 Space Shooter</h2>
            <div style={{ color: "#444", marginBottom: 8 }}>
                <b>Level:</b> {spec.level}{" "}
                <b>Enemies:</b> {spec.enemyTypes.join(", ") || "👾"}{" "}
                <b>Abilities:</b> {spec.playerAbilities?.join(", ") || "N/A"}
            </div>
            {gameState === "start" && (
                <div>
                    <button style={ctrlBtn} onClick={() => setGameState("playing")}>Start Game</button>
                </div>
            )}
            {gameState === "playing" && (
                <>
                    <canvas
                        ref={canvasRef}
                        width={canvasWidth}
                        height={VIRTUAL_HEIGHT}
                        style={{
                            borderRadius: 14,
                            boxShadow: "0 2px 10px #0002",
                            background: "#1a2133",
                            margin: "0 auto",
                            maxWidth: "97vw",
                            width: "100%",
                            display: "block",
                            touchAction: "none"
                        }}
                    />
                    <TouchControls />
                </>
            )}
            {(gameState === "won" || gameState === "lost") && (
                <div>
                    <h2>
                        {gameState === "won" ? "You Win! 🎉" : "Game Over 💀"}
                    </h2>
                    <div style={{ margin: "18px 0" }}>Final Score: <b>{score}</b></div>
                    <button style={ctrlBtn} onClick={() => setGameState("start")}>Play Again</button>
                </div>
            )}
            <div style={{ fontSize: 14, color: "#999", marginTop: 12 }}>
                Controls: ← → (or A/D) to move, Space to shoot. Touch buttons for mobile.<br />
                Enemies: {spec.enemyTypes.join(", ")}
            </div>
        </div>
    );
}

const ctrlBtn: React.CSSProperties = {
    fontSize: 24,
    margin: "0 10px",
    padding: "10px 16px",
    borderRadius: 10,
    border: "none",
    background: "#eee",
    boxShadow: "0 2px 8px #0001",
    cursor: "pointer",
    touchAction: "none"
};
