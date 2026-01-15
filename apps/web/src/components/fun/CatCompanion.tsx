// @ts-nocheck
import { useState, useEffect, useRef } from 'react';

interface Position {
    x: number;
    y: number;
}

export function CatCompanion() {
    const [pos, setPos] = useState<Position>({ x: 100, y: 100 });
    const [rotation, setRotation] = useState(0);
    const [isScared, setIsScared] = useState(false);
    const [isRunning, setIsRunning] = useState(false);

    const mousePos = useRef<Position>({ x: -1000, y: -1000 });
    const vel = useRef<Position>({ x: 0, y: 0 });
    const target = useRef<Position>({ x: 200, y: 200 });
    const lastUpdate = useRef<number>(Date.now());

    // Handle Mouse Move
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mousePos.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Animation Loop
    useEffect(() => {
        let frameId: number;

        const update = () => {
            const now = Date.now();
            const dt = Math.min((now - lastUpdate.current) / 1000, 0.1);
            lastUpdate.current = now;

            const speed = Math.sqrt(vel.current.x ** 2 + vel.current.y ** 2);
            setIsRunning(speed > 40);

            setPos((prev: Position) => {
                let { x, y } = prev;

                const dx = x - mousePos.current.x;
                const dy = y - mousePos.current.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                let acceleration = { x: 0, y: 0 };

                // STARTLED threshold reduced but force increased for "Urgency"
                if (dist < 160) {
                    setIsScared(true);
                    const force = (160 - dist) * 22;
                    acceleration.x = (dx / dist) * force;
                    acceleration.y = (dy / dist) * force;

                    if (Math.random() > 0.94) {
                        target.current = {
                            x: Math.random() * (window.innerWidth - 80) + 40,
                            y: Math.random() * (window.innerHeight - 80) + 40
                        };
                    }
                } else {
                    setIsScared(false);
                    const tx = target.current.x - x;
                    const ty = target.current.y - y;
                    const tDist = Math.sqrt(tx * tx + ty * ty);

                    if (tDist < 30) {
                        target.current = {
                            x: Math.random() * (window.innerWidth - 80) + 40,
                            y: Math.random() * (window.innerHeight - 80) + 40
                        };
                    } else {
                        acceleration.x = (tx / tDist) * 70;
                        acceleration.y = (ty / tDist) * 70;
                    }
                }

                vel.current.x *= 0.93;
                vel.current.y *= 0.93;

                vel.current.x += acceleration.x * dt;
                vel.current.y += acceleration.y * dt;

                const maxSpeed = isScared ? 800 : 140;
                if (speed > maxSpeed) {
                    vel.current.x = (vel.current.x / speed) * maxSpeed;
                    vel.current.y = (vel.current.y / speed) * maxSpeed;
                }

                x += vel.current.x * dt;
                y += vel.current.y * dt;

                if (x < 30) { x = 30; vel.current.x *= -1; }
                if (x > window.innerWidth - 90) { x = window.innerWidth - 90; vel.current.x *= -1; }
                if (y < 30) { y = 30; vel.current.y *= -1; }
                if (y > window.innerHeight - 90) { y = window.innerHeight - 90; vel.current.y *= -1; }

                return { x, y };
            });

            if (speed > 5) {
                // Side view cat doesn't rotate 360, but tilts slightly based on vertical velocity
                const tilt = Math.max(Math.min(vel.current.y * 0.1, 15), -15);
                setRotation(tilt);
            } else {
                setRotation(0);
            }

            frameId = requestAnimationFrame(update);
        };

        frameId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(frameId);
    }, [isScared]);

    return (
        <div
            className="fixed z-[9999] pointer-events-none select-none transition-transform duration-75"
            style={{
                left: 0,
                top: 0,
                transform: `translate3d(${pos.x}px, ${pos.y}px, 0) rotate(${rotation}deg)`,
            }}
        >
            <div className={`relative ${vel.current.x < 0 ? 'scale-x-[-1]' : ''}`}>
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes cat-gallop {
                        0%, 100% { transform: translateY(0) rotate(0); }
                        25% { transform: translateY(-4px) rotate(-5deg); }
                        50% { transform: translateY(0) rotate(0); }
                        75% { transform: translateY(-4px) rotate(5deg); }
                    }
                    @keyframes tail-wave {
                        0%, 100% { transform: rotate(0); }
                        50% { transform: rotate(15deg); }
                    }
                    @keyframes leg-move {
                        0%, 100% { transform: translateX(0); }
                        50% { transform: translateX(3px); }
                    }
                    .cat-running .cat-body-container { animation: cat-gallop 0.25s infinite ease-in-out; }
                    .cat-tail { animation: tail-wave 1s infinite ease-in-out; transform-origin: bottom left; }
                    .cat-running .leg { animation: leg-move 0.15s infinite ease-in-out; }
                    .leg-2, .leg-4 { animation-delay: 0.07s !important; }
                `}} />

                {/* Side-view Cat Silhouette */}
                <div className={`cat-body-container ${isRunning ? 'cat-running' : ''} ${isScared ? 'animate-bounce' : 'animate-pulse'} transition-colors duration-500`}>
                    <svg
                        width="80" height="60" viewBox="0 0 40 30" fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className={`text-zinc-900 dark:text-zinc-100`}
                    >
                        {/* Body */}
                        <path d="M10 20Q15 12 25 15Q30 18 30 22L10 22Z" fill="currentColor" />

                        {/* Head */}
                        <circle cx="28" cy="14" r="5" fill="currentColor" />

                        {/* Ears */}
                        <path d="M25 10L26 5L28 9" fill="currentColor" />
                        <path d="M31 10L32 5L30 9" fill="currentColor" />

                        {/* Tail */}
                        <path className="cat-tail" d="M10 20Q2 15 5 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />

                        {/* Legs */}
                        <path className="leg leg-1" d="M14 22V26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                        <path className="leg leg-2" d="M18 22V26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                        <path className="leg leg-3" d="M24 22V26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                        <path className="leg leg-4" d="M28 22V26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />

                        {/* Eyes */}
                        <circle cx="30" cy="13" r="1.2" fill={isScared ? "#ef4444" : "white"} />
                        <circle cx="30" cy="13" r="0.6" fill="black" />
                    </svg>
                </div>

                {/* Speech Bubble */}
                {isScared && (
                    <div className="absolute -top-10 right-0 bg-white dark:bg-zinc-800 text-[11px] font-bold px-3 py-1 rounded-full border border-primary/20 shadow-2xl animate-in fade-in zoom-in slide-in-from-bottom-2 duration-200">
                        냥!!!
                    </div>
                )}
            </div>
        </div>
    );
}
