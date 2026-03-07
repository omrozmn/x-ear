"use client";

import { Canvas } from "@react-three/fiber";
import { FluidSoundwave } from "./FluidSoundwave";
import { AudiologyWave } from "./AudiologyWave";
import { Float } from "@react-three/drei";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function Scene() {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Ensure we only render theme-dependent canvas on client to avoid hydration mismatch
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    const isDark = resolvedTheme === "dark" || !mounted; // Default to dark before mount
    const fogColor = isDark ? "#030307" : "#f8fafc";
    const lightColor = isDark ? "#22d3ee" : "#0284c7";

    return (
        <div className="fixed inset-0 -z-10 bg-background overflow-hidden transition-colors duration-300">
            {mounted && (
                <Canvas camera={{ position: [0, 2, 8], fov: 50 }} dpr={[1, 2]}>
                    <ambientLight intensity={isDark ? 0.5 : 0.8} />
                    <directionalLight position={[10, 10, 5]} intensity={1} color={lightColor} />
                    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
                        <AudiologyWave isDark={isDark} />
                    </Float>
                    <fog attach="fog" args={[fogColor, 5, 15]} />
                </Canvas>
            )}
        </div>
    );
}
