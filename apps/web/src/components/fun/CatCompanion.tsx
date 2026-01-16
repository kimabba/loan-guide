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
    const [showNyang, setShowNyang] = useState(false); // controls NYANG bubble visibility

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
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    // NYANG bubble visibility (toggle every 10s)
    useEffect(() => {
        const interval = setInterval(() => setShowNyang(prev => !prev), 10000);
        return () => clearInterval(interval);
    }, []);

    // Animation Loop
    useEffect(() => {
        let frameId: number;
        const update = () => {
            // If NYANG bubble is visible, pause movement for readability (0.8s)
            if (showNyang) {
                setRotation(0);
                frameId = requestAnimationFrame(update);
                return;
            }

            const now = Date.now();
            const dt = Math.min((now - lastUpdate.current) / 1000, 0.1);
            lastUpdate.current = now;

            const speed = Math.sqrt(vel.current.x ** 2 + vel.current.y ** 2);
            setIsRunning(speed > 40);

            setPos(prev => {
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
                            y: y < window.innerHeight / 2 ? window.innerHeight * 0.8 : window.innerHeight * 0.2,
                        };
                        if (Math.random() > 0.6) {
                            setAccessory(['mask', 'hat', 'crown', 'none'][Math.floor(Math.random() * 4)]);
                        }
                    } else {
                        setIsPanicking(false);
                    }
                    const force = (140 - dist) * forceMultiplier;
                    acceleration.x = (dx / dist) * force;
                    acceleration.y = (dy / dist) * force;
                    if (Math.random() > 0.98) {
                        target.current = {
                            x: Math.random() * (window.innerWidth - 80) + 40,
                            y: Math.random() * (window.innerHeight - 80) + 40,
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
                            y: Math.random() * (window.innerHeight - 80) + 40,
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

                const maxSpeed = isPanicking ? 1200 : isScared ? 750 : 140;
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

            // Tilt based on horizontal velocity for a cute wobble
            if (speed > 5) {
                const tilt = Math.max(Math.min(vel.current.x * 0.05, 12), -12);
                setRotation(tilt);
            } else {
                setRotation(0);
            }

            frameId = requestAnimationFrame(update);
        };
        frameId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(frameId);
    }, [isScared, isPanicking, showNyang]);

    return (
        <div
            className="fixed z-[9999] pointer-events-none select-none transition-transform duration-75"
            style={{ left: 0, top: 0, transform: `translate3d(${pos.x}px, ${pos.y}px, 0) rotate(${rotation}deg)` }}
        >
            <div className="relative transition-transform duration-300">
                {/* SVG Filter for Fuzzy/Sketchy look */}
                <svg width="0" height="0" className="absolute">
                    <filter id="fuzzy">
                        <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="5" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="5.5" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                </svg>
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes fuzzy-jitter { 0%,100% { filter:url(#fuzzy) brightness(1);} 50% { filter:url(#fuzzy) brightness(1.02) translate(0.2px,0.2px);} }
                    @keyframes mini-scoot { 0%,100% { transform:translateY(0) scale(1,1);} 50% { transform:translateY(-3px) scale(0.96,1.04);} }
                    .cat-front-style { filter:url(#fuzzy); animation:fuzzy-jitter 0.2s infinite; }
                    .cat-running .cat-inner { animation:mini-scoot 0.15s infinite ease-in-out; }
                    .cat-panicking .cat-inner { animation:mini-scoot 0.08s infinite linear; }
                `}} />
                <div className={`cat-inner ${isRunning ? 'cat-running' : ''} ${isPanicking ? 'cat-panicking' : ''}`}>
                    <svg
                        width="40"
                        height="40"
                        viewBox="0 0 40 40"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="cat-front-style transition-colors duration-500 text-zinc-900 dark:text-zinc-100"
                    >
                        {/* Fluffy Body - slightly broader and softer */}
                        <path d="M10 35C10 22 8 13 20 13C32 13 30 22 30 35" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
                        <rect x="12" y="18" width="16" height="17" rx="8" fill="currentColor" />
                        {/* Legs */}
                        <path d="M15 28V36" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                        <path d="M25 28V36" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                        {/* Large Fluffy Head */}
                        <circle cx="20" cy="14" r="10" fill="currentColor" />
                        {/* Fluffy Ears with tufts */}
                        <path d="M11 11L8 1L18 8" fill="currentColor" />
                        <path d="M29 11L32 1L22 8" fill="currentColor" />
                        <path d="M8 1L7 -1L9 1" stroke="currentColor" strokeWidth="1" />
                        <path d="M32 1L33 -1L31 1" stroke="currentColor" strokeWidth="1" />
                        {/* Whiskers */}
                        <line x1="10" y1="14" x2="3" y2="12" stroke="currentColor" strokeWidth="1.5" />
                        <line x1="10" y1="16" x2="2" y2="18" stroke="currentColor" strokeWidth="1.5" />
                        <line x1="30" y1="14" x2="37" y2="12" stroke="currentColor" strokeWidth="1.5" />
                        <line x1="30" y1="16" x2="38" y2="18" stroke="currentColor" strokeWidth="1.5" />
                        {/* Eyes - ultra large */}
                        <circle cx="16.5" cy="14" r="3" fill="white" />
                        <circle cx="23.5" cy="14" r="3" fill="white" />
                        {/* Pupils */}
                        <circle cx="16.5" cy="14" r="1.2" fill={isScared ? "#ef4444" : "black"} />
                        <circle cx="23.5" cy="14" r="1.2" fill={isScared ? "#ef4444" : "black"} />
                        {/* Blush */}
                        <circle cx="14" cy="17" r="1.2" fill="#f9a8d4" opacity="0.8" />
                        <circle cx="26" cy="17" r="1.2" fill="#f9a8d4" opacity="0.8" />
                        {/* Nose - heart shape */}
                        <path d="M20 16 C19.5 15.5, 19 15.5, 18.5 16 C18 16.5, 18 17, 18.5 17.5 C19 18, 20 18.5, 20 19 C20 18.5, 21 18, 21.5 17.5 C22 17, 22 16.5, 21.5 16 C21 15.5, 20.5 15.5, 20 16 Z" fill="pink" />
                        {/* Tiny paws */}
                        <circle cx="16" cy="38" r="1.5" fill="currentColor" />
                        <circle cx="24" cy="38" r="1.5" fill="currentColor" />
                        {/* Accessories */}
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
                            <g className="cat-accessory" transform="translate(0,-2)">
                                <path d="M14 6L20 -4L26 6" fill="#3b82f6" opacity="0.9" />
                                <circle cx="20" cy="-4" r="1.5" fill="white" />
                                <rect x="13" y="5" width="14" height="2" rx="1" fill="white" />
                            </g>
                        )}
                        {accessory === 'crown' && (
                            <g className="cat-accessory" transform="translate(0,-2)">
                                <path d="M13 6L13 0L17 4L20 0L23 4L27 0L27 6Z" fill="#fbbf24" stroke="#d97706" strokeWidth="0.5" />
                            </g>
                        )}
                    </svg>
                </div>
                {/* NYANG bubble */}
                {showNyang && (
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white text-black text-sm font-bold px-2 py-0.5 rounded-full shadow-lg border-2 border-zinc-200" style={{ textShadow: '0 0 4px rgba(255,255,255,0.8)' }}>
                        냐옹
                    </div>
                )}
                {/* Panic text */}
                {isPanicking && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[8px] font-black px-1 py-0.2 rounded-xs shadow-xl animate-bounce whitespace-nowrap">
                        탈출!!
                    </div>
                )}
            </div>
        </div>
    );
}
