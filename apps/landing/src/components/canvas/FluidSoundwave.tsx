"use client";

import { useRef, useMemo, useState } from "react";
import type { ElementType } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PointsMaterial = "pointsMaterial" as ElementType;

export function FluidSoundwave({ isDark = true }: { isDark?: boolean }) {
    const pointsRef = useRef<THREE.Points>(null);

    // Generate a grid of points
    const count = 15000;
    const [positions] = useState(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 35; // x
            pos[i * 3 + 1] = (Math.random() - 0.5) * 25; // y
            pos[i * 3 + 2] = (Math.random() - 0.5) * 15 - 10; // z
        }
        return pos;
    });

    // Store original Y values to prevent completely destroying the wave shape
    const originalY = useMemo(() => {
        const oy = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            oy[i] = positions[i * 3 + 1];
        }
        return oy;
    }, [count, positions]);


    useFrame((state) => {
        if (!pointsRef.current) return;

        const time = state.clock.getElapsedTime();
        const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;

        // Ensure pointer provides safe normalized coordinates (-1 to 1) 
        const mouseX = state.pointer.x * 20;
        const mouseY = state.pointer.y * 20;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            const x = positions[i3];
            const z = positions[i3 + 2];
            const origY = originalY[i];

            // 1. Base flowing wave effect (smooth rolling hills)
            const baseWave = Math.sin(time * 0.5 + x * 0.2) * Math.cos(time * 0.3 + z * 0.2) * 1.5;

            // 2. Interactive mouse distortion
            // Calculate distance on the XZ plane from the pointer's rough projection
            const distX = mouseX - x;
            const distZ = mouseY - z;
            const distance = Math.sqrt(distX * distX + distZ * distZ);

            // Create a localized upward bulge where the mouse pointer rests
            const mouseRipple = Math.max(0, 5 - distance) * 0.5;

            // Apply the new Y calculation
            positions[i3 + 1] = origY + baseWave + mouseRipple;
        }

        pointsRef.current.geometry.attributes.position.needsUpdate = true;

        // Gentle overall rotation tracking the mouse for a parallax effect
        pointsRef.current.rotation.y = THREE.MathUtils.lerp(
            pointsRef.current.rotation.y,
            (state.pointer.x * Math.PI) / 8 + time * 0.05,
            0.05
        );
        pointsRef.current.rotation.x = THREE.MathUtils.lerp(
            pointsRef.current.rotation.x,
            -(state.pointer.y * Math.PI) / 8,
            0.05
        );
    });

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[positions, 3]}
                    count={positions.length / 3}
                    itemSize={3}
                />
            </bufferGeometry>
            <PointsMaterial
                size={0.06}
                color={isDark ? "#22d3ee" : "#0284c7"}
                transparent
                opacity={isDark ? 0.4 : 0.3}
                sizeAttenuation
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </points>
    );
}
