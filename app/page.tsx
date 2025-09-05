'use client';

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * Animated torus mesh shown on the landing page.
 *
 * Why: Adds a playful visual element to reinforce the "live" nature of polls without
 * introducing heavy assets. Demonstrates useFrame for small, GPU-accelerated motion.
 *
 * Edge cases: None; component is purely presentational and isolated.
 * Connections: Rendered inside <Canvas> on the home page. (May be swapped out.)
 */
function SpinningTorus() {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.x = t * 0.5;
      meshRef.current.rotation.y = t * 0.8;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} castShadow receiveShadow>
      <torusKnotGeometry args={[1, 0.35, 256, 32]} />
      <meshStandardMaterial color="#6366f1" metalness={0.5} roughness={0.25} />
    </mesh>
  );
}

/**
 * Group of animated bar meshes conveying dynamic poll results.
 *
 * Why: Home page visual cue for poll activity. Simple sinusoidal animation simulates
 * fluctuating vote counts without querying data.
 *
 * Assumptions: Rendered within a Three.js Canvas context.
 * Edge cases: Bars array is static; animation stable for long runtimes.
 * Connections: Siblings with SpinningTorus, rendered on landing page Canvas.
 */
function PollBars() {
  const groupRef = useRef<THREE.Group>(null!);
  const bars = useMemo(
    () => [
      { x: -2, color: '#6366f1' }, // Indigo
      { x: -1, color: '#22c55e' }, // Emerald
      { x: 0, color: '#f59e0b' },  // Amber
      { x: 1, color: '#06b6d4' },  // Cyan
      { x: 2, color: '#a855f7' },  // Violet
    ],
    []
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child: THREE.Object3D, i: number) => {
      // Animate bar heights to simulate changing poll results
      const height = 0.6 + ((Math.sin(t * 1.2 + i * 0.7) + 1) / 2) * 1.8; // range ~0.6 -> 2.4
      child.scale.y = height;
      // Keep bars grounded by moving their center up by half the height
      child.position.y = height / 2;
    });
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {bars.map((b, i) => (
        <mesh key={i} position={[b.x, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 1, 0.7]} />
          <meshStandardMaterial color={b.color} metalness={0.25} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Marketing home page with CTA buttons and a lightweight 3D canvas backdrop.
 *
 * Why: Provides a welcoming entry point and quick navigation to core app flows (create/browse polls).
 * Keeps UI simple and fast-loading.
 *
 * Connections: Links to /create-poll and /polls pages; visual components PollBars/SpinningTorus.
 */
export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <div className="text-center md:text-left space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">Welcome to PollMaster</h1>
          <p className="text-xl text-muted-foreground">Create and participate in real-time polls with ease</p>
          <div className="flex gap-4 justify-center md:justify-start pt-2">
            <Link href="/create-poll">
              <Button size="lg">Create a Poll</Button>
            </Link>
            <Link href="/polls">
              <Button size="lg" variant="outline">Browse Polls</Button>
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-indigo-100 to-blue-50 dark:from-zinc-900 dark:to-zinc-800 rounded-2xl blur-0" />
          <div className="h-72 md:h-96 w-full rounded-2xl shadow-lg ring-1 ring-input overflow-hidden">
            <Canvas
              shadows
              dpr={[1, 2]}
              camera={{ position: [2.8, 2.2, 4.2], fov: 50 }}
            >
              <ambientLight intensity={0.6} />
              <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
              <directionalLight position={[-5, -5, -5]} intensity={0.2} />
              {/* Poll-themed animated bars */}
              <PollBars />
              {/* Ground plane for soft shadow */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]} receiveShadow>
                <planeGeometry args={[20, 20]} />
                <meshStandardMaterial color="#e5e7eb" />
              </mesh>
            </Canvas>
          </div>
        </div>
      </div>
    </div>
  );
}
