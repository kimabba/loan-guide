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
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes cat-float { 
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-3px); }
                    }
                    @keyframes cat-scoot { 
                        0%, 100% { transform: translateY(0) scale(1, 1); }
                        50% { transform: translateY(-2px) scale(1.05, 0.95); }
                    }
                    @keyframes cat-panic {
                        0%, 100% { transform: translate(0, 0) rotate(0deg); }
                        25% { transform: translate(-2px, -2px) rotate(-3deg); }
                        75% { transform: translate(2px, 2px) rotate(3deg); }
                    }
                    .cat-container { 
                        filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
                        animation: cat-float 3s ease-in-out infinite;
                    }
                    .cat-running .cat-inner { animation: cat-scoot 0.15s infinite ease-in-out; }
                    .cat-panicking .cat-inner { animation: cat-panic 0.1s infinite linear; }
                `}} />
                <div className={`cat-inner ${isRunning ? 'cat-running' : ''} ${isPanicking ? 'cat-panicking' : ''} cat-container`}>
                    <svg
                        width="48"
                        height="48"
                        viewBox="0 0 48 48"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="transition-colors duration-500 text-zinc-800 dark:text-zinc-100"
                    >
                        {/* Body - Clean Pill Shape */}
                        <rect x="12" y="16" width="24" height="24" rx="12" fill="currentColor" />

                        {/* Feet - Simple Circles */}
                        <circle cx="18" cy="38" r="4" fill="currentColor" />
                        <circle cx="30" cy="38" r="4" fill="currentColor" />

                        {/* Ears - Sharp Points */}
                        <path d="M14 18L10 8L22 16" fill="currentColor" />
                        <path d="M34 18L38 8L26 16" fill="currentColor" />

                        {/* Face Group */}
                        <g transform="translate(0, 2)">
                            {/* Eyes - Crisp and Expressive */}
                            <circle cx="19" cy="20" r="3.5" fill="white" />
                            <circle cx="29" cy="20" r="3.5" fill="white" />

                            {/* Pupils */}
                            <circle
                                cx="19"
                                cy="20"
                                r={isScared ? 1.5 : 2}
                                fill={isScared ? "#ef4444" : "#18181b"}
                                className="transition-all duration-200"
                            />
                            <circle
                                cx="29"
                                cy="20"
                                r={isScared ? 1.5 : 2}
                                fill={isScared ? "#ef4444" : "#18181b"}
                                className="transition-all duration-200"
                            />

                            {/* Nose */}
                            <circle cx="24" cy="24" r="1.5" fill="#fda4af" />

                            {/* Whiskers - Thin and Subtle */}
                            <path d="M14 24H8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
                            <path d="M14 26H9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
                            <path d="M34 24H40" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
                            <path d="M34 26H39" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
                        </g>

                        {/* Accessories */}
                        {accessory === 'mask' && (
                            <g className="cat-accessory">
                                <rect x="15" y="21" width="18" height="8" rx="2" fill="white" fillOpacity="0.9" stroke="#e4e4e7" strokeWidth="0.5" />
                                <path d="M15 22L11 22.5" stroke="#e4e4e7" strokeWidth="0.5" />
                                <path d="M33 22L37 22.5" stroke="#e4e4e7" strokeWidth="0.5" />
                            </g>
                        )}
                        {accessory === 'hat' && (
                            <g className="cat-accessory" transform="translate(0,-1)">
                                <path d="M16 10L24 0L32 10H16Z" fill="#3b82f6" />
                                <rect x="15" y="9" width="18" height="2" rx="1" fill="#2563eb" />
                                <circle cx="24" cy="0" r="2" fill="white" />
                            </g>
                        )}
                        {accessory === 'crown' && (
                            <g className="cat-accessory" transform="translate(0,-1)">
                                <path d="M15 10V4L19.5 8L24 4L28.5 8L33 4V10H15Z" fill="#fbbf24" stroke="#d97706" strokeWidth="0.5" />
                            </g>
                        )}
                    </svg>
                </div>
                {/* Speech Bubbles - Refined Style */}
                {showNyang && (
                    <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm text-zinc-900 text-xs font-bold px-3 py-1.5 rounded-2xl shadow-xl border border-zinc-200/50 flex items-center gap-1 whitespace-nowrap animate-in fade-in zoom-in duration-300">
                        <span className="text-[10px]">✨</span> 냐옹
                    </div>
                )}
                {isPanicking && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-lg animate-bounce whitespace-nowrap flex items-center gap-1">
                        ⚠️ 탈출!!
                    </div>
                )}
            </div>
        </div>
    );
}
