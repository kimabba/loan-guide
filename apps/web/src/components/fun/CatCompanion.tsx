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
    const [isPanicking, setIsPanicking] = useState(false);

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

                // EDGE DETECTION for corner escape
                const margin = 140;
                const isNearEdge = x < margin || x > window.innerWidth - margin || y < margin || y > window.innerHeight - margin;

                if (dist < 180) {
                    setIsScared(true);
                    let forceMultiplier = 25;

                    // CORNER ESCAPE: If near edge and mouse is coming, PANIC and dash!
                    if (isNearEdge && dist < 150) {
                        setIsPanicking(true);
                        forceMultiplier = 65;
                        // Set target to far center area
                        target.current = {
                            x: x < window.innerWidth / 2 ? window.innerWidth * 0.7 : window.innerWidth * 0.3,
                            y: y < window.innerHeight / 2 ? window.innerHeight * 0.7 : window.innerHeight * 0.3
                        };
                    } else {
                        setIsPanicking(false);
                    }

                    const force = (180 - dist) * forceMultiplier;
                    acceleration.x = (dx / dist) * force;
                    acceleration.y = (dy / dist) * force;

                    if (Math.random() > 0.96) {
                        target.current = {
                            x: Math.random() * (window.innerWidth - 120) + 60,
                            y: Math.random() * (window.innerHeight - 120) + 60
                        };
                    }
                } else {
                    setIsScared(false);
                    setIsPanicking(false);
                    const tx = target.current.x - x;
                    const ty = target.current.y - y;
                    const tDist = Math.sqrt(tx * tx + ty * ty);

                    if (tDist < 40) {
                        target.current = {
                            x: Math.random() * (window.innerWidth - 120) + 60,
                            y: Math.random() * (window.innerHeight - 120) + 60
                        };
                    } else {
                        acceleration.x = (tx / tDist) * 85;
                        acceleration.y = (ty / tDist) * 85;
                    }
                }

                vel.current.x *= 0.91;
                vel.current.y *= 0.91;

                vel.current.x += acceleration.x * dt;
                vel.current.y += acceleration.y * dt;

                const maxSpeed = isPanicking ? 1400 : (isScared ? 900 : 160);
                if (speed > maxSpeed) {
                    vel.current.x = (vel.current.x / speed) * maxSpeed;
                    vel.current.y = (vel.current.y / speed) * maxSpeed;
                }

                x += vel.current.x * dt;
                y += vel.current.y * dt;

                if (x < 20) { x = 20; vel.current.x *= -1.2; }
                if (x > window.innerWidth - 120) { x = window.innerWidth - 120; vel.current.x *= -1.2; }
                if (y < 20) { y = 20; vel.current.y *= -1.2; }
                if (y > window.innerHeight - 120) { y = window.innerHeight - 120; vel.current.y *= -1.2; }

                return { x, y };
            });

            if (speed > 5) {
                const tilt = Math.max(Math.min(vel.current.y * 0.15, 25), -25);
                setRotation(tilt);
            } else {
                setRotation(0);
            }

            frameId = requestAnimationFrame(update);
        };

        frameId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(frameId);
    }, [isScared, isPanicking]);

    return (
        <div
            className="fixed z-[9999] pointer-events-none select-none transition-transform duration-75"
            style={{
                left: 0,
                top: 0,
                transform: `translate3d(${pos.x}px, ${pos.y}px, 0) rotate(${rotation}deg)`,
            }}
        >
            <div className={`relative ${vel.current.x < 0 ? 'scale-x-[-1]' : ''} transition-transform duration-300`}>
                {/* SVG Filter for Fuzzy/Sketchy look */}
                <svg width="0" height="0" className="absolute">
                    <filter id="fuzzy">
                        <feTurbulence type="fractalNoise" baseFrequency="0.4" numOctaves="4" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                </svg>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes fuzzy-jitter {
                        0%, 100% { filter: url(#fuzzy) brightness(1); }
                        50% { filter: url(#fuzzy) brightness(1.05) translate(0.5px, 0.5px); }
                    }
                    @keyframes fuzzy-run {
                        0%, 100% { transform: translateY(0) scale(1, 1); }
                        25% { transform: translateY(-8px) scale(0.92, 1.08); }
                        50% { transform: translateY(0) scale(1.08, 0.92); }
                        75% { transform: translateY(-8px) scale(0.92, 1.08); }
                    }
                    .cat-fuzzy-style { 
                        filter: url(#fuzzy); 
                        animation: fuzzy-jitter 0.15s infinite;
                    }
                    .cat-running .cat-graphic { 
                        animation: fuzzy-run 0.2s infinite ease-in-out; 
                    }
                    .cat-panicking .cat-graphic { 
                        animation: fuzzy-run 0.08s infinite linear; 
                    }
                `}} />

                <div className={`cat-graphic ${isRunning ? 'cat-running' : ''} ${isPanicking ? 'cat-panicking' : ''}`}>
                    <svg
                        width="110" height="90" viewBox="0 0 40 30" fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="cat-fuzzy-style transition-colors duration-500 text-zinc-900 dark:text-zinc-100"
                    >
                        {/* Fuzzy Torso */}
                        <path d="M8 22C8 22 10 12 20 12C30 12 34 18 34 22L8 22Z" fill="currentColor" />

                        {/* Fuzzy Head */}
                        <path d="M24 14C24 10 28 8 32 10C36 12 36 18 32 20C28 22 24 18 24 14Z" fill="currentColor" />

                        {/* Fuzzy Ears */}
                        <path d="M26 10L25 3L29 8" fill="currentColor" />
                        <path d="M33 10L34 3L31 8" fill="currentColor" />

                        {/* Fuzzy Tail */}
                        <path d="M10 22C6 22 3 18 5 12C7 6 12 8 10 12" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />

                        {/* Fuzzy Legs */}
                        <path d="M13 22V28" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
                        <path d="M19 22V28" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
                        <path d="M26 22V28" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
                        <path d="M31 22V28" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />

                        {/* Large Fuzzy Eyes from Reference */}
                        <circle cx="28.5" cy="14" r="3.2" fill="white" />
                        <circle cx="34.5" cy="14" r="3.2" fill="white" />

                        {/* Pupils */}
                        <circle cx="28.8" cy="14.2" r="1.2" fill={isScared ? "#ef4444" : "black"} />
                        <circle cx="34.8" cy="14.2" r="1.2" fill={isScared ? "#ef4444" : "black"} />
                    </svg>
                </div>

                {/* Panic Bubble */}
                {isPanicking && (
                    <div className="absolute -top-14 right-2 bg-red-600 text-white text-[11px] font-black px-2 py-0.5 rounded-sm shadow-2xl animate-bounce">
                        탈출!!
                    </div>
                )}
            </div>
        </div>
    );
}
