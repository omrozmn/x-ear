"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function AudiologyWave({ isDark }: { isDark: boolean }) {
    const groupRef = useRef<THREE.Group>(null);

    // Setup wave geometry parameters
    const lineCount = 20; // Number of parallel frequency bands
    const pointsPerLine = 120; // Resolution of each wave
    const spacing = 0.35; // Z-spacing between waves

    // Pre-calculate line geometries
    const linesData = useMemo(() => {
        const data = [];
        for (let i = 0; i < lineCount; i++) {
            const positions = new Float32Array(pointsPerLine * 3);
            for (let j = 0; j < pointsPerLine; j++) {
                // X goes from -10 to 10
                const x = (j / (pointsPerLine - 1)) * 20 - 10;
                const z = (i - lineCount / 2) * spacing;

                positions[j * 3] = x;
                positions[j * 3 + 1] = 0; // will animate Y
                positions[j * 3 + 2] = z;
            }

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            data.push({ geometry });
        }
        return data;
    }, []);

    const baseColor = new THREE.Color(isDark ? "#3b82f6" : "#2563eb");
    const accentColor = new THREE.Color(isDark ? "#8b5cf6" : "#7c3aed");

    useFrame((state) => {
        if (!groupRef.current) return;
        const time = state.clock.getElapsedTime();
        const pointerX = state.pointer.x;

        groupRef.current.children.forEach((child, i) => {
            const line = child as THREE.Line;
            const positions = line.geometry.attributes.position.array as Float32Array;

            // Varying frequency and offset per line to create a complex voice/sound wave structure
            const depthFactor = i / lineCount;

            for (let j = 0; j < pointsPerLine; j++) {
                const x = positions[j * 3];

                // 1. Base Sine Wave (low freq, slow rolling)
                const wave1 = Math.sin(x * 0.3 + time * 0.4 + depthFactor * Math.PI * 2) * 0.6;

                // 2. Medium Frequency (adds the 'voice' modulation)
                const wave2 = Math.sin(x * 1.2 - time * 0.8 + i * 0.5) * 0.25;

                // 3. Spiky resonance (details, much slower now)
                const wave3 = Math.sin(x * 3.0 + time * 1.5) * 0.05;

                // Envelope: Taper the ends so it looks like a bounded voice spectrum
                const normalizedX = x / 10; // -1 to 1
                const envelope = Math.exp(-(normalizedX * normalizedX) * 4); // Bell curve

                // Combine with interactive mouse disruption (smooth bulge, not oscillating)
                const distX = Math.abs(x - pointerX * 10);
                const mouseRipple = Math.max(0, 4 - distX) * 0.15;

                // Final Y calculation. We apply envelope to the waves, and add the mouse ripple smoothly
                const finalY = (wave1 + wave2 + wave3) * envelope * (1 + depthFactor) + mouseRipple;

                positions[j * 3 + 1] = finalY;
            }
            line.geometry.attributes.position.needsUpdate = true;
        });

        // Gentle interactive tilt (slower)
        groupRef.current.rotation.y = THREE.MathUtils.lerp(
            groupRef.current.rotation.y,
            (state.pointer.x * Math.PI) / 16,
            0.02
        );
        groupRef.current.rotation.x = THREE.MathUtils.lerp(
            groupRef.current.rotation.x,
            -(state.pointer.y * Math.PI) / 16 + 0.1,
            0.02
        );
    });

    return (
        <group ref={groupRef} position={[0, -0.5, 0]}>
            {linesData.map((data, i) => {
                // Calculate color gradient purely based on depth
                const ratio = i / lineCount;
                const meshColor = baseColor.clone().lerp(accentColor, ratio);
                // Center lines are most opaque
                const opacity = 0.8 - Math.abs(ratio - 0.5) * 1.2;

                const material = new THREE.LineBasicMaterial({
                    color: meshColor,
                    transparent: true,
                    opacity: Math.max(0.1, opacity),
                    linewidth: isDark ? 3 : 2
                });

                return (
                    <primitive
                        key={i}
                        object={new THREE.Line(data.geometry, material)}
                    />
                );
            })}
        </group>
    );
}
