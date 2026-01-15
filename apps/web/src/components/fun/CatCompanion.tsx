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
            setIsRunning(speed > 50);

            setPos((prev: Position) => {
                let { x, y } = prev;

                const dx = x - mousePos.current.x;
                const dy = y - mousePos.current.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                let acceleration = { x: 0, y: 0 };

                // STARTLED threshold reduced but force increased for "Urgency"
                if (dist < 150) {
                    setIsScared(true);
                    const force = (150 - dist) * 20;
                    acceleration.x = (dx / dist) * force;
                    acceleration.y = (dy / dist) * force;

                    if (Math.random() > 0.95) {
                        target.current = {
                            x: Math.random() * (window.innerWidth - 60) + 30,
                            y: Math.random() * (window.innerHeight - 60) + 30
                        };
                    }
                } else {
                    setIsScared(false);
                    const tx = target.current.x - x;
                    const ty = target.current.y - y;
                    const tDist = Math.sqrt(tx * tx + ty * ty);

                    if (tDist < 20) {
                        target.current = {
                            x: Math.random() * (window.innerWidth - 60) + 30,
                            y: Math.random() * (window.innerHeight - 60) + 30
                        };
                    } else {
                        acceleration.x = (tx / tDist) * 60;
                        acceleration.y = (ty / tDist) * 60;
                    }
                }

                vel.current.x *= 0.94;
                vel.current.y *= 0.94;

                vel.current.x += acceleration.x * dt;
                vel.current.y += acceleration.y * dt;

                const maxSpeed = isScared ? 750 : 130;
                if (speed > maxSpeed) {
                    vel.current.x = (vel.current.x / speed) * maxSpeed;
                    vel.current.y = (vel.current.y / speed) * maxSpeed;
                }

                x += vel.current.x * dt;
                y += vel.current.y * dt;

                if (x < 20) { x = 20; vel.current.x *= -1; }
                if (x > window.innerWidth - 60) { x = window.innerWidth - 60; vel.current.x *= -1; }
                if (y < 20) { y = 20; vel.current.y *= -1; }
                if (y > window.innerHeight - 60) { y = window.innerHeight - 60; vel.current.y *= -1; }

                return { x, y };
            });

            if (speed > 5) {
                const angle = Math.atan2(vel.current.y, vel.current.x) * (180 / Math.PI);
                setRotation(angle);
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
                transform: `translate3d(${pos.x}px, ${pos.y}px, 0) rotate(${rotation + (vel.current.x < 0 ? 180 : 0)}deg)`,
            }}
        >
            <div className={`relative ${vel.current.x < 0 ? 'scale-x-[-1]' : ''} transition-transform duration-300`}>
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes cat-leg-run {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-3px); }
                    }
                    .cat-running .leg-front { animation: cat-leg-run 0.12s infinite ease-in-out; }
                    .cat-running .leg-back { animation: cat-leg-run 0.12s infinite ease-in-out 0.06s; }
                `}} />

                {/* Cat SVG with running legs */}
                <svg
                    width="56" height="56" viewBox="0 0 24 24" fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={`${isRunning ? 'cat-running' : ''} ${isScared ? 'animate-bounce' : 'animate-pulse'} transition-colors duration-500 text-zinc-900 dark:text-zinc-100`}
                >
                    {/* Body */}
                    <path d="M12 21C16.4183 21 20 17.4183 20 13C20 8.58172 16.4183 5 12 5C7.58172 5 4 8.58172 4 13C4 17.4183 7.58172 21 12 21Z" fill="currentColor" />

                    {/* Ears */}
                    <path d="M7 6L4 2L3 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M17 6L20 2L21 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Tail */}
                    <path d="M20 13C22 13 23 15 22 17C21 19 19 19 19 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

                    {/* Legs (Animated when running) */}
                    <path className="leg-front" d="M8 20V22.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path className="leg-front" d="M11 20V22.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path className="leg-back" d="M13 20V22.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path className="leg-back" d="M16 20V22.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

                    {/* Eyes - Dynamic for visibility */}
                    <circle cx="9" cy="12" r="1.5" fill={isScared ? "#ef4444" : "white"} />
                    <circle cx="15" cy="12" r="1.5" fill={isScared ? "#ef4444" : "white"} />
                    <circle cx="9" cy="12" r="0.7" fill="black" />
                    <circle cx="15" cy="12" r="0.7" fill="black" />

                    {/* Nose & Whiskers */}
                    <path d="M11.5 14.5L12 15L12.5 14.5" stroke="white" strokeLinecap="round" opacity="0.8" />
                    <path d="M8 15H5" stroke="white" strokeWidth="0.5" opacity="0.6" />
                    <path d="M19 15H16" stroke="white" strokeWidth="0.5" opacity="0.6" />
                </svg>

                {/* Speech Bubble */}
                {isScared && (
                    <div className="absolute -top-7 -right-3 bg-white dark:bg-zinc-800 text-[11px] font-bold px-2 py-0.5 rounded-full border border-primary/20 shadow-xl animate-in fade-in zoom-in slide-in-from-bottom-2 duration-200">
                        냥!!
                    </div>
                )}
            </div>
        </div>
    );
}
