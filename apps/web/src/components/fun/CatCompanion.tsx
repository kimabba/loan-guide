// @ts-nocheck
import { useState, useEffect, useRef } from 'react';

interface Position {
    x: number;
    y: number;
}

type Accessory = 'none' | 'mask' | 'hat';

export function CatCompanion() {
    const [pos, setPos] = useState<Position>({ x: 100, y: 100 });
    const [rotation, setRotation] = useState(0);
    const [isScared, setIsScared] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [isPanicking, setIsPanicking] = useState(false);
    const [accessory, setAccessory] = useState<Accessory>('mask');

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

    // Accessory Rotation Logic
    useEffect(() => {
        const accessories: Accessory[] = ['none', 'mask', 'hat'];
        const interval = setInterval(() => {
            setAccessory(prev => {
                const currentIndex = accessories.indexOf(prev);
                const nextIndex = (currentIndex + 1) % accessories.length;
                return accessories[nextIndex];
            });
        }, 20000); // Change every 20s
        return () => clearInterval(interval);
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

                // EDGE DETECTION: Adjusted margins for smaller cat
                const margin = 100;
                const isNearEdge = x < margin || x > window.innerWidth - margin || y < margin || y > window.innerHeight - margin;

                if (dist < 150) {
                    setIsScared(true);
                    let forceMultiplier = 22;

                    if (isNearEdge && dist < 120) {
                        setIsPanicking(true);
                        forceMultiplier = 60;
                        target.current = {
                            x: x < window.innerWidth / 2 ? window.innerWidth * 0.75 : window.innerWidth * 0.25,
                            y: y < window.innerHeight / 2 ? window.innerHeight * 0.75 : window.innerHeight * 0.25
                        };
                        // Randomly change accessory on panic escape!
                        if (Math.random() > 0.7) setAccessory(['mask', 'hat', 'none'][Math.floor(Math.random() * 3)]);
                    } else {
                        setIsPanicking(false);
                    }

                    const force = (150 - dist) * forceMultiplier;
                    acceleration.x = (dx / dist) * force;
                    acceleration.y = (dy / dist) * force;

                    if (Math.random() > 0.97) {
                        target.current = {
                            x: Math.random() * (window.innerWidth - 80) + 40,
                            y: Math.random() * (window.innerHeight - 80) + 40
                        };
                    }
                } else {
                    setIsScared(false);
                    setIsPanicking(false);
                    const tx = target.current.x - x;
                    const ty = target.current.y - y;
                    const tDist = Math.sqrt(tx * tx + ty * ty);

                    if (tDist < 30) {
                        target.current = {
                            x: Math.random() * (window.innerWidth - 80) + 40,
                            y: Math.random() * (window.innerHeight - 80) + 40
                        };
                    } else {
                        acceleration.x = (tx / tDist) * 80;
                        acceleration.y = (ty / tDist) * 80;
                    }
                }

                vel.current.x *= 0.92;
                vel.current.y *= 0.92;

                vel.current.x += acceleration.x * dt;
                vel.current.y += acceleration.y * dt;

                const maxSpeed = isPanicking ? 1300 : (isScared ? 800 : 150);
                if (speed > maxSpeed) {
                    vel.current.x = (vel.current.x / speed) * maxSpeed;
                    vel.current.y = (vel.current.y / speed) * maxSpeed;
                }

                x += vel.current.x * dt;
                y += vel.current.y * dt;

                // Bounce with "Startle"
                if (x < 15) { x = 15; vel.current.x *= -1.3; }
                if (x > window.innerWidth - 80) { x = window.innerWidth - 80; vel.current.x *= -1.3; }
                if (y < 15) { y = 15; vel.current.y *= -1.3; }
                if (y > window.innerHeight - 80) { y = window.innerHeight - 80; vel.current.y *= -1.3; }

                return { x, y };
            });

            if (speed > 5) {
                const tilt = Math.max(Math.min(vel.current.y * 0.1, 18), -18);
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
                        <feTurbulence type="fractalNoise" baseFrequency="0.45" numOctaves="4" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                </svg>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes fuzzy-jitter {
                        0%, 100% { filter: url(#fuzzy) brightness(1); }
                        50% { filter: url(#fuzzy) brightness(1.03) translate(0.3px, 0.3px); }
                    }
                    @keyframes fuzzy-run {
                        0%, 100% { transform: translateY(0) scale(1, 1); }
                        25% { transform: translateY(-5px) scale(0.94, 1.06); }
                        50% { transform: translateY(0) scale(1.06, 0.94); }
                        75% { transform: translateY(-5px) scale(0.94, 1.06); }
                    }
                    .cat-fuzzy-style { 
                        filter: url(#fuzzy); 
                        animation: fuzzy-jitter 0.18s infinite;
                    }
                    .cat-running .cat-graphic { 
                        animation: fuzzy-run 0.22s infinite ease-in-out; 
                    }
                    .cat-panicking .cat-graphic { 
                        animation: fuzzy-run 0.1s infinite linear; 
                    }
                `}} />

                <div className={`cat-graphic ${isRunning ? 'cat-running' : ''} ${isPanicking ? 'cat-panicking' : ''}`}>
                    <svg
                        width="70" height="55" viewBox="0 0 40 30" fill="none"
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
                        <path d="M10 22C6 22 3 18 5 12C7 6 12 8 10 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />

                        {/* Fuzzy Legs */}
                        <path d="M13 22V28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                        <path d="M19 22V28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                        <path d="M26 22V28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                        <path d="M31 22V28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />

                        {/* Large Fuzzy Eyes from Reference */}
                        <circle cx="28.5" cy="14" r="3" fill="white" />
                        <circle cx="34.5" cy="14" r="3" fill="white" />

                        {/* Pupils */}
                        <circle cx="28.8" cy="14.2" r="1.1" fill={isScared ? "#ef4444" : "black"} />
                        <circle cx="34.8" cy="14.2" r="1.1" fill={isScared ? "#ef4444" : "black"} />

                        {/* Accessories */}
                        {accessory === 'mask' && (
                            <g className="cat-accessory">
                                <rect x="25" y="14" width="12" height="6" rx="1.5" fill="white" stroke="currentColor" strokeWidth="0.5" opacity="0.9" />
                                <path d="M25 15C22 15 22 12 24 12" stroke="currentColor" strokeWidth="0.3" fill="none" />
                                <path d="M37 15C40 15 40 12 38 12" stroke="currentColor" strokeWidth="0.3" fill="none" />
                                <line x1="27" y1="16" x2="35" y2="16" stroke="gray" strokeWidth="0.3" />
                                <line x1="27" y1="18" x2="35" y2="18" stroke="gray" strokeWidth="0.3" />
                            </g>
                        )}
                        {accessory === 'hat' && (
                            <g className="cat-accessory">
                                <path d="M26 8L31 0L36 8" fill="#3b82f6" opacity="0.9" />
                                <circle cx="31" cy="0" r="1.5" fill="white" />
                                <path d="M26 8Q31 6 36 8" stroke="white" strokeWidth="1" fill="none" />
                            </g>
                        )}
                    </svg>
                </div>

                {/* Status Text (Smaller) */}
                {isPanicking && (
                    <div className="absolute -top-10 right-0 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-sm shadow-xl animate-bounce">
                        탈출!!
                    </div>
                )}
            </div>
        </div>
    );
}
