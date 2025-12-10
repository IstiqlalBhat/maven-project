'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Liquid glass shader with enhanced yellow gradient
const liquidGlassShader = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform vec3 uColorC;
    uniform vec3 uColorD;

    varying vec2 vUv;
    varying vec3 vPosition;

    // Simplex 3D noise
    vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

      vec3 i = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);

      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);

      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;

      i = mod(i, 289.0);
      vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));

      float n_ = 1.0/7.0;
      vec3 ns = n_ * D.wyz - D.xzx;

      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);

      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);

      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);

      vec4 s0 = floor(b0) * 2.0 + 1.0;
      vec4 s1 = floor(b1) * 2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));

      vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);

      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;

      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      vec2 uv = vUv;

      // Create flowing liquid effect with multiple layers
      float noise1 = snoise(vec3(uv * 1.5, uTime * 0.08));
      float noise2 = snoise(vec3(uv * 2.5 + 100.0, uTime * 0.06));
      float noise3 = snoise(vec3(uv * 0.8 + 200.0, uTime * 0.04));
      float noise4 = snoise(vec3(uv * 3.0 + 300.0, uTime * 0.1));

      // Combine noise layers for organic flow
      float combinedNoise = noise1 * 0.4 + noise2 * 0.3 + noise3 * 0.2 + noise4 * 0.1;

      // Create glass-like refraction with smoother distortion
      vec2 distortion = vec2(
        snoise(vec3(uv * 2.5, uTime * 0.12)),
        snoise(vec3(uv * 2.5 + 50.0, uTime * 0.12))
      ) * 0.04;

      vec2 distortedUv = uv + distortion;

      // Enhanced color blending for liquid glass effect
      float colorMix1 = smoothstep(-0.4, 0.9, combinedNoise + distortedUv.x * 0.6);
      float colorMix2 = smoothstep(-0.3, 1.0, combinedNoise + distortedUv.y * 0.5);
      float colorMix3 = smoothstep(-0.2, 0.8, noise4 + (distortedUv.x + distortedUv.y) * 0.3);

      // Multi-color gradient blending
      vec3 color = mix(uColorA, uColorB, colorMix1);
      color = mix(color, uColorC, colorMix2 * 0.6);
      color = mix(color, uColorD, colorMix3 * 0.3);

      // Add liquid glass highlights
      float highlight = pow(max(0.0, noise1 + 0.3), 4.0) * 0.2;
      float highlight2 = pow(max(0.0, noise2 + 0.2), 3.0) * 0.1;
      color += vec3(highlight + highlight2);

      // Subtle iridescent shimmer
      float shimmer = sin(uv.x * 10.0 + uTime * 0.5) * sin(uv.y * 10.0 + uTime * 0.3) * 0.02;
      color += vec3(shimmer * 0.5, shimmer * 0.3, shimmer * 0.1);

      // Very subtle vignette for depth
      float vignette = 1.0 - length(uv - 0.5) * 0.25;
      color *= vignette;

      // Clamp to prevent overbrightness
      color = clamp(color, 0.0, 1.0);

      gl_FragColor = vec4(color, 1.0);
    }
  `
};

interface ShaderPlaneProps {
  colorA?: string;
  colorB?: string;
  colorC?: string;
  colorD?: string;
}

function ShaderPlane({
  colorA = '#fef7ed',
  colorB = '#fde68a',
  colorC = '#fbbf24',
  colorD = '#f59e0b'
}: ShaderPlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uColorA: { value: new THREE.Color(colorA) },
    uColorB: { value: new THREE.Color(colorB) },
    uColorC: { value: new THREE.Color(colorC) },
    uColorD: { value: new THREE.Color(colorD) },
  }), [colorA, colorB, colorC, colorD]);

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} scale={[4, 4, 1]}>
      {/* Reduced geometry complexity from 64x64 to 32x32 for better performance */}
      <planeGeometry args={[2, 2, 32, 32]} />
      <shaderMaterial
        vertexShader={liquidGlassShader.vertexShader}
        fragmentShader={liquidGlassShader.fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

// Floating glass orbs for liquid depth effect (optimized)
function FloatingOrbs() {
  const groupRef = useRef<THREE.Group>(null);

  const orbs = useMemo(() => {
    const orbColors = ['#fbbf24', '#f59e0b', '#fcd34d', '#fde68a', '#d97706'];
    // Reduced from 12 to 8 orbs for better performance
    return Array.from({ length: 8 }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 3.5,
        (Math.random() - 0.5) * 3.5,
        Math.random() * 0.3 + 0.1
      ] as [number, number, number],
      scale: Math.random() * 0.2 + 0.08,
      speed: Math.random() * 0.4 + 0.15,
      offset: Math.random() * Math.PI * 2,
      color: orbColors[Math.floor(Math.random() * orbColors.length)],
      opacity: Math.random() * 0.12 + 0.08,
    }));
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const orb = orbs[i];
        const time = state.clock.elapsedTime;
        child.position.y = orb.position[1] + Math.sin(time * orb.speed + orb.offset) * 0.25;
        child.position.x = orb.position[0] + Math.cos(time * orb.speed * 0.6 + orb.offset) * 0.15;
        // Subtle scale pulsing
        const scale = orb.scale * (1 + Math.sin(time * orb.speed * 2 + orb.offset) * 0.1);
        child.scale.setScalar(scale);
      });
    }
  });

  return (
    <group ref={groupRef}>
      {orbs.map((orb, i) => (
        <mesh key={i} position={orb.position} scale={orb.scale}>
          {/* Reduced sphere segments from 32x32 to 16x16 for better performance */}
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial
            color={orb.color}
            transparent
            opacity={orb.opacity}
          />
        </mesh>
      ))}
    </group>
  );
}

// Glass bubble highlights (optimized)
function GlassBubbles() {
  const groupRef = useRef<THREE.Group>(null);

  const bubbles = useMemo(() => {
    // Reduced from 6 to 4 bubbles for better performance
    return Array.from({ length: 4 }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 2.5,
        (Math.random() - 0.5) * 2.5,
        0.4 + Math.random() * 0.2
      ] as [number, number, number],
      scale: Math.random() * 0.08 + 0.03,
      speed: Math.random() * 0.3 + 0.1,
      offset: Math.random() * Math.PI * 2,
    }));
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const bubble = bubbles[i];
        const time = state.clock.elapsedTime;
        child.position.y = bubble.position[1] + Math.sin(time * bubble.speed + bubble.offset) * 0.3;
        child.position.x = bubble.position[0] + Math.cos(time * bubble.speed * 0.4 + bubble.offset) * 0.2;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {bubbles.map((bubble, i) => (
        <mesh key={i} position={bubble.position} scale={bubble.scale}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.25}
          />
        </mesh>
      ))}
    </group>
  );
}

interface LiquidGlassBackgroundProps {
  variant?: 'yellow' | 'amber' | 'gold' | 'sunset';
  className?: string;
}

// Beautiful yellow/amber gradient color schemes
const colorSchemes = {
  yellow: {
    colorA: '#fefce8', // Very light yellow
    colorB: '#fef08a', // Bright yellow
    colorC: '#fde047', // Golden yellow
    colorD: '#facc15', // Amber yellow
  },
  amber: {
    colorA: '#fef7ed', // Warm cream
    colorB: '#fde68a', // Light amber
    colorC: '#fbbf24', // Bright amber
    colorD: '#f59e0b', // Deep amber
  },
  gold: {
    colorA: '#fffbeb', // Champagne
    colorB: '#fcd34d', // Gold
    colorC: '#f59e0b', // Rich amber
    colorD: '#d97706', // Deep gold
  },
  sunset: {
    colorA: '#fef3c7', // Peach cream
    colorB: '#fde68a', // Soft gold
    colorC: '#fbbf24', // Warm amber
    colorD: '#ea580c', // Sunset orange
  },
};

export default function LiquidGlassBackground({
  variant = 'amber',
  className = ''
}: LiquidGlassBackgroundProps) {
  const [mounted, setMounted] = useState(false);
  const [deviceDpr, setDeviceDpr] = useState(1);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const colors = colorSchemes[variant];

  useEffect(() => {
    setMounted(true);
    const maxDpr = Math.min(window.devicePixelRatio || 1, 1.5);
    setDeviceDpr(maxDpr);

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = () => setPrefersReducedMotion(media.matches);
    handleMotionChange();
    media.addEventListener('change', handleMotionChange);

    return () => {
      media.removeEventListener('change', handleMotionChange);
    };
  }, []);

  if (!mounted || prefersReducedMotion) {
    // Fallback gradient while Three.js loads
    return (
      <div
        className={`fixed inset-0 -z-10 ${className}`}
        style={{
          background: `linear-gradient(135deg, ${colors.colorA} 0%, ${colors.colorB} 35%, ${colors.colorC} 65%, ${colors.colorD} 100%)`,
        }}
      />
    );
  }

  return (
    <div className={`fixed inset-0 -z-10 ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 1], fov: 75 }}
        dpr={[1, deviceDpr]}
        gl={{ antialias: false, alpha: true, powerPreference: 'low-power', stencil: false }}
        style={{ background: 'transparent' }}
      >
        <ShaderPlane {...colors} />
        <FloatingOrbs />
        <GlassBubbles />
      </Canvas>
      {/* Overlay for enhanced glass effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.15) 0%, transparent 50%)',
        }}
      />
    </div>
  );
}


