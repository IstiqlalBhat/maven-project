'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Liquid glass shader
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
      
      // Create flowing liquid effect
      float noise1 = snoise(vec3(uv * 2.0, uTime * 0.15));
      float noise2 = snoise(vec3(uv * 3.0 + 100.0, uTime * 0.12));
      float noise3 = snoise(vec3(uv * 1.5 + 200.0, uTime * 0.1));
      
      // Combine noise layers
      float combinedNoise = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2;
      
      // Create glass-like refraction
      vec2 distortion = vec2(
        snoise(vec3(uv * 4.0, uTime * 0.2)),
        snoise(vec3(uv * 4.0 + 50.0, uTime * 0.2))
      ) * 0.05;
      
      vec2 distortedUv = uv + distortion;
      
      // Color blending with liquid movement
      float colorMix1 = smoothstep(-0.3, 0.8, combinedNoise + distortedUv.x * 0.5);
      float colorMix2 = smoothstep(-0.2, 0.9, combinedNoise + distortedUv.y * 0.5);
      
      vec3 color = mix(uColorA, uColorB, colorMix1);
      color = mix(color, uColorC, colorMix2 * 0.5);
      
      // Add glass highlight
      float highlight = pow(max(0.0, noise1), 3.0) * 0.15;
      color += vec3(highlight);
      
      // Subtle vignette
      float vignette = 1.0 - length(uv - 0.5) * 0.4;
      color *= vignette;
      
      gl_FragColor = vec4(color, 1.0);
    }
  `
};

interface ShaderPlaneProps {
  colorA?: string;
  colorB?: string;
  colorC?: string;
}

function ShaderPlane({ 
  colorA = '#0a0a0f',
  colorB = '#1a1a2e', 
  colorC = '#16213e'
}: ShaderPlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uColorA: { value: new THREE.Color(colorA) },
    uColorB: { value: new THREE.Color(colorB) },
    uColorC: { value: new THREE.Color(colorC) },
  }), [colorA, colorB, colorC]);

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} scale={[4, 4, 1]}>
      <planeGeometry args={[2, 2, 32, 32]} />
      <shaderMaterial
        vertexShader={liquidGlassShader.vertexShader}
        fragmentShader={liquidGlassShader.fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

// Floating orbs for added depth
function FloatingOrbs() {
  const groupRef = useRef<THREE.Group>(null);
  
  const orbs = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        Math.random() * 0.5 + 0.2
      ] as [number, number, number],
      scale: Math.random() * 0.15 + 0.05,
      speed: Math.random() * 0.5 + 0.2,
      offset: Math.random() * Math.PI * 2,
    }));
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const orb = orbs[i];
        child.position.y = orb.position[1] + Math.sin(state.clock.elapsedTime * orb.speed + orb.offset) * 0.2;
        child.position.x = orb.position[0] + Math.cos(state.clock.elapsedTime * orb.speed * 0.5 + orb.offset) * 0.1;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {orbs.map((orb, i) => (
        <mesh key={i} position={orb.position} scale={orb.scale}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial 
            color="#f97316" 
            transparent 
            opacity={0.15}
          />
        </mesh>
      ))}
    </group>
  );
}

interface LiquidGlassBackgroundProps {
  variant?: 'dark' | 'light' | 'warm';
  className?: string;
}

const colorSchemes = {
  dark: {
    colorA: '#0a0a0f',
    colorB: '#1a1a2e',
    colorC: '#16213e',
  },
  light: {
    colorA: '#fef7ed',
    colorB: '#fed7aa',
    colorC: '#fef3c7',
  },
  warm: {
    colorA: '#1c1917',
    colorB: '#292524',
    colorC: '#44403c',
  },
};

export default function LiquidGlassBackground({ 
  variant = 'dark',
  className = '' 
}: LiquidGlassBackgroundProps) {
  const colors = colorSchemes[variant];
  
  return (
    <div className={`fixed inset-0 -z-10 ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 1], fov: 75 }}
        dpr={[1, 2]}
        style={{ background: 'transparent' }}
      >
        <ShaderPlane {...colors} />
        <FloatingOrbs />
      </Canvas>
    </div>
  );
}

