import { useState, useEffect, useRef } from 'react';

interface Position {
    x: number;
    y: number;
}

export function CatCompanion() {
    const [pos, setPos] = useState<Position>({ x: 100, y: 100 });
    const [rotation, setRotation] = useState(0);
    const [isScared, setIsScared] = useState(false);

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
            const dt = Math.min((now - lastUpdate.current) / 1000, 0.1); // max 100ms delta
            lastUpdate.current = now;

            setPos((prev: Position) => {
                let { x, y } = prev;

                // 1. Calculate vector to cursor
                const dx = x - mousePos.current.x;
                const dy = y - mousePos.current.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                let acceleration = { x: 0, y: 0 };

                if (dist < 180) {
                    // Flee logic
                    setIsScared(true);
                    const force = (180 - dist) * 15;
                    acceleration.x = (dx / dist) * force;
                    acceleration.y = (dy / dist) * force;

                    // Randomly change target when scared to move to a safe spot
                    if (Math.random() > 0.98) {
                        target.current = {
                            x: Math.random() * (window.innerWidth - 60) + 30,
                            y: Math.random() * (window.innerHeight - 60) + 30
                        };
                    }
                } else {
                    setIsScared(false);
                    // Wander logic
                    const tx = target.current.x - x;
                    const ty = target.current.y - y;
                    const tDist = Math.sqrt(tx * tx + ty * ty);

                    if (tDist < 20) {
                        // New target
                        target.current = {
                            x: Math.random() * (window.innerWidth - 60) + 30,
                            y: Math.random() * (window.innerHeight - 60) + 30
                        };
                    } else {
                        acceleration.x = (tx / tDist) * 50;
                        acceleration.y = (ty / tDist) * 50;
                    }
                }

                // Apply friction
                vel.current.x *= 0.95;
                vel.current.y *= 0.95;

                // Apply acceleration
                vel.current.x += acceleration.x * dt;
                vel.current.y += acceleration.y * dt;

                // Limit speed
                const speed = Math.sqrt(vel.current.x ** 2 + vel.current.y ** 2);
                const maxSpeed = isScared ? 600 : 120;
                if (speed > maxSpeed) {
                    vel.current.x = (vel.current.x / speed) * maxSpeed;
                    vel.current.y = (vel.current.y / speed) * maxSpeed;
                }

                // Update position
                x += vel.current.x * dt;
                y += vel.current.y * dt;

                // Screen boundaries
                if (x < 20) { x = 20; vel.current.x *= -1; }
                if (x > window.innerWidth - 60) { x = window.innerWidth - 60; vel.current.x *= -1; }
                if (y < 20) { y = 20; vel.current.y *= -1; }
                if (y > window.innerHeight - 60) { y = window.innerHeight - 60; vel.current.y *= -1; }

                return { x, y };
            });

            // LIFTED ROTATION OUT OF STATE UPDATER
            const speed = Math.sqrt(vel.current.x ** 2 + vel.current.y ** 2);
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
                {/* Cute Minimalist Cat SVG */}
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${isScared ? 'animate-bounce' : 'animate-pulse'}`}>
                    <path d="M12 21C16.4183 21 20 17.4183 20 13C20 8.58172 16.4183 5 12 5C7.58172 5 4 8.58172 4 13C4 17.4183 7.58172 21 12 21Z" fill="currentColor" className="text-orange-400 dark:text-orange-500" />
                    {/* Ears */}
                    <path d="M7 6L4 2L3 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400 dark:text-orange-500" />
                    <path d="M17 6L20 2L21 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400 dark:text-orange-500" />
                    {/* Tail */}
                    <path d="M20 13C22 13 23 15 22 17C21 19 19 19 19 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-orange-400 dark:text-orange-500" />
                    {/* Eyes */}
                    <circle cx="9" cy="12" r="1.5" fill="white" />
                    <circle cx="15" cy="12" r="1.5" fill="white" />
                    <circle cx="9" cy="12" r="0.7" fill="black" />
                    <circle cx="15" cy="12" r="0.7" fill="black" />
                    {/* Nose & Whiskers */}
                    <path d="M11.5 14.5L12 15L12.5 14.5" stroke="white" strokeLinecap="round" />
                    <path d="M8 15H5" stroke="white" strokeWidth="0.5" opacity="0.6" />
                    <path d="M19 15H16" stroke="white" strokeWidth="0.5" opacity="0.6" />
                </svg>

                {/* Speech Bubble (Optional/Random) */}
                {isScared && (
                    <div className="absolute -top-6 -right-2 bg-white dark:bg-zinc-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full border shadow-sm animate-in fade-in zoom-in duration-300">
                        냥!
                    </div>
                )}
            </div>
        </div>
    );
}
