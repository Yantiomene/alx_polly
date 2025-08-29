'use client';

import React, { useRef } from 'react';
import * as THREE from 'three';
import '@types/three';
import { Canvas, useFrame } from '@react-three/fiber';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
              <SpinningTorus />
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
