// @ts-nocheck
import { useState, useEffect, useRef } from 'react';

interface Position {
    x: number;
    y: number;
}

type Accessory = 'none' | 'mask' | 'hat' | 'crown';

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
        const accessories: Accessory[] = ['none', 'mask', 'hat', 'crown'];
        const interval = setInterval(() => {
            setAccessory(prev => {
                const currentIndex = accessories.indexOf(prev);
                const nextIndex = (currentIndex + 1) % accessories.length;
                return accessories[nextIndex];
            });
        }, 15000); // Change every 15s
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

                const margin = 100;
                const isNearEdge = x < margin || x > window.innerWidth - margin || y < margin || y > window.innerHeight - margin;

                if (dist < 140) {
                    setIsScared(true);
                    let forceMultiplier = 20;

                    if (isNearEdge && dist < 120) {
                        setIsPanicking(true);
                        forceMultiplier = 55;
                        target.current = {
                            x: x < window.innerWidth / 2 ? window.innerWidth * 0.8 : window.innerWidth * 0.2,
                            y: y < window.innerHeight / 2 ? window.innerHeight * 0.8 : window.innerHeight * 0.2
                        };
                        // Change accessory on panic
                        if (Math.random() > 0.6) setAccessory(['mask', 'hat', 'crown', 'none'][Math.floor(Math.random() * 4)]);
                    } else {
                        setIsPanicking(false);
                    }

                    const force = (140 - dist) * forceMultiplier;
                    acceleration.x = (dx / dist) * force;
                    acceleration.y = (dy / dist) * force;

                    if (Math.random() > 0.98) {
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

                    if (tDist < 25) {
                        target.current = {
                            x: Math.random() * (window.innerWidth - 80) + 40,
                            y: Math.random() * (window.innerHeight - 80) + 40
                        };
                    } else {
                        acceleration.x = (tx / tDist) * 75;
                        acceleration.y = (ty / tDist) * 75;
                    }
                }

                vel.current.x *= 0.93;
                vel.current.y *= 0.93;

                vel.current.x += acceleration.x * dt;
                vel.current.y += acceleration.y * dt;

                const maxSpeed = isPanicking ? 1200 : (isScared ? 750 : 140);
                if (speed > maxSpeed) {
                    vel.current.x = (vel.current.x / speed) * maxSpeed;
                    vel.current.y = (vel.current.y / speed) * maxSpeed;
                }

                x += vel.current.x * dt;
                y += vel.current.y * dt;

                if (x < 10) { x = 10; vel.current.x *= -1.5; }
                if (x > window.innerWidth - 60) { x = window.innerWidth - 60; vel.current.x *= -1.5; }
                if (y < 10) { y = 10; vel.current.y *= -1.5; }
                if (y > window.innerHeight - 60) { y = window.innerHeight - 60; vel.current.y *= -1.5; }

                return { x, y };
            });

            if (speed > 5) {
                // Symmetrical front cat tilts slightly horizontally based on horizontal velocity
                const tilt = Math.max(Math.min(vel.current.x * 0.05, 12), -12);
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
            <div className={`relative transition-transform duration-300`}>
                <svg width="0" height="0" className="absolute">
                    <filter id="fuzzy">
                        <feTurbulence type="fractalNoise" baseFrequency="0.45" numOctaves="4" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                </svg>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes fuzzy-jitter {
                        0%, 100% { filter: url(#fuzzy) brightness(1); }
                        50% { filter: url(#fuzzy) brightness(1.02) translate(0.2px, 0.2px); }
                    }
                    @keyframes mini-scoot {
                        0%, 100% { transform: translateY(0) scale(1, 1); }
                        50% { transform: translateY(-3px) scale(0.96, 1.04); }
                    }
                    .cat-front-style { 
                        filter: url(#fuzzy); 
                        animation: fuzzy-jitter 0.2s infinite;
                    }
                    .cat-running .cat-inner { 
                        animation: mini-scoot 0.15s infinite ease-in-out; 
                    }
                    .cat-panicking .cat-inner { 
                        animation: mini-scoot 0.08s infinite linear; 
                    }
                `}} />

                <div className={`cat-inner ${isRunning ? 'cat-running' : ''} ${isPanicking ? 'cat-panicking' : ''}`}>
                    <svg
                        width="50" height="50" viewBox="0 0 40 40" fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="cat-front-style transition-colors duration-500 text-zinc-900 dark:text-zinc-100"
                    >
                        {/* Front Sitting Body */}
                        <path d="M12 35C12 25 10 15 20 15C30 15 28 25 28 35" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                        <rect x="14" y="20" width="12" height="15" rx="6" fill="currentColor" />

                        {/* Front Legs */}
                        <path d="M16 28V36" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                        <path d="M24 28V36" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />

                        {/* Large Rounded Head */}
                        <circle cx="20" cy="14" r="9" fill="currentColor" />

                        {/* Ears */}
                        <path d="M12 10L10 3L17 7" fill="currentColor" />
                        <path d="M28 10L30 3L23 7" fill="currentColor" />

                        {/* Whiskers */}
                        <line x1="10" y1="14" x2="3" y2="12" stroke="currentColor" strokeWidth="1.5" />
                        <line x1="10" y1="16" x2="2" y2="18" stroke="currentColor" strokeWidth="1.5" />
                        <line x1="30" y1="14" x2="37" y2="12" stroke="currentColor" strokeWidth="1.5" />
                        <line x1="30" y1="16" x2="38" y2="18" stroke="currentColor" strokeWidth="1.5" />

                        {/* Eyes */}
                        <circle cx="16.5" cy="14" r="2.5" fill="white" />
                        <circle cx="23.5" cy="14" r="2.5" fill="white" />

                        {/* Pupils */}
                        <circle cx="16.5" cy="14" r="1" fill={isScared ? "#ef4444" : "black"} />
                        <circle cx="23.5" cy="14" r="1" fill={isScared ? "#ef4444" : "black"} />

                        {/* Front-facing Accessories */}
                        {accessory === 'mask' && (
                            <g className="cat-accessory">
                                <rect x="13" y="15" width="14" height="7" rx="2" fill="white" stroke="currentColor" strokeWidth="0.5" opacity="0.95" />
                                <path d="M13 16L10 16" stroke="currentColor" strokeWidth="0.4" />
                                <path d="M27 16L30 16" stroke="currentColor" strokeWidth="0.4" />
                                <line x1="16" y1="17.5" x2="24" y2="17.5" stroke="#ccc" strokeWidth="0.3" />
                                <line x1="16" y1="19.5" x2="24" y2="19.5" stroke="#ccc" strokeWidth="0.3" />
                            </g>
                        )}
                        {accessory === 'hat' && (
                            <g className="cat-accessory" transform="translate(0, -2)">
                                <path d="M14 6L20 -4L26 6" fill="#3b82f6" opacity="0.9" />
                                <circle cx="20" cy="-4" r="1.5" fill="white" />
                                <rect x="13" y="5" width="14" height="2" rx="1" fill="white" />
                            </g>
                        )}
                        {accessory === 'crown' && (
                            <g className="cat-accessory" transform="translate(0, -2)">
                                <path d="M13 6L13 0L17 4L20 0L23 4L27 0L27 6Z" fill="#fbbf24" stroke="#d97706" strokeWidth="0.5" />
                            </g>
                        )}
                    </svg>
                </div>

                {/* Status Text */}
                {isPanicking && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[8px] font-black px-1 py-0.2 rounded-xs shadow-xl animate-bounce whitespace-nowrap">
                        탈출!!
                    </div>
                )}
            </div>
        </div>
    );
}
