'use client';

import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Line, Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface PitchData {
  pitchType: string;
  avgHBreak: number;
  avgVBreak: number;
  velocity?: number;
  spinRate?: number;
}

interface PitchVisualization3DProps {
  userPitches: PitchData[];
  mlbPitches?: PitchData[];
  showTrajectories?: boolean;
}

const PITCH_COLORS: Record<string, string> = {
  'Fastball': '#ef4444',
  '4-Seam Fastball': '#ef4444',
  'FF': '#ef4444',
  'Slider': '#3b82f6',
  'SL': '#3b82f6',
  'Curveball': '#22c55e',
  'CU': '#22c55e',
  'Changeup': '#a855f7',
  'CH': '#a855f7',
  'Sinker': '#f97316',
  'SI': '#f97316',
  'Cutter': '#06b6d4',
  'FC': '#06b6d4',
  'Splitter': '#ec4899',
  'FS': '#ec4899',
};

const getPitchColor = (pitchType: string): string => {
  return PITCH_COLORS[pitchType] || '#f59e0b';
};

// Baseball mesh component
function Baseball({ position, color, scale = 1, isUser = false }: { 
  position: [number, number, number]; 
  color: string; 
  scale?: number;
  isUser?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  return (
    <Float
      speed={2}
      rotationIntensity={0.2}
      floatIntensity={0.3}
    >
      <mesh ref={meshRef} position={position} scale={scale}>
        <sphereGeometry args={[0.15, 32, 32]} />
        {isUser ? (
          <MeshDistortMaterial
            color={color}
            speed={2}
            distort={0.1}
            radius={1}
            roughness={0.2}
            metalness={0.8}
          />
        ) : (
          <meshStandardMaterial
            color={color}
            transparent
            opacity={0.4}
            roughness={0.3}
            metalness={0.6}
          />
        )}
      </mesh>
    </Float>
  );
}

// Pitch trajectory line
function PitchTrajectory({ 
  start, 
  end, 
  color 
}: { 
  start: [number, number, number]; 
  end: [number, number, number]; 
  color: string;
}) {
  const points = useMemo(() => {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...start),
      new THREE.Vector3(
        (start[0] + end[0]) / 2,
        (start[1] + end[1]) / 2 + 0.5,
        (start[2] + end[2]) / 2
      ),
      new THREE.Vector3(...end)
    );
    return curve.getPoints(50);
  }, [start, end]);

  return (
    <Line
      points={points.map(p => [p.x, p.y, p.z] as [number, number, number])}
      color={color}
      lineWidth={2}
      transparent
      opacity={0.6}
      dashed
      dashSize={0.05}
      gapSize={0.02}
    />
  );
}

// Strike zone visualization
function StrikeZone() {
  return (
    <group position={[0, 0, 0]}>
      {/* Strike zone outline */}
      <Line
        points={[
          [-0.7, -0.5, 0],
          [0.7, -0.5, 0],
          [0.7, 0.5, 0],
          [-0.7, 0.5, 0],
          [-0.7, -0.5, 0],
        ]}
        color="#f59e0b"
        lineWidth={2}
        transparent
        opacity={0.5}
      />
      
      {/* Grid lines */}
      <Line points={[[-0.7, 0, 0], [0.7, 0, 0]]} color="#f59e0b" lineWidth={1} transparent opacity={0.2} />
      <Line points={[[0, -0.5, 0], [0, 0.5, 0]]} color="#f59e0b" lineWidth={1} transparent opacity={0.2} />
      
      {/* Glass plate effect */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[1.5, 1.1]} />
        <meshStandardMaterial
          color="#f59e0b"
          transparent
          opacity={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// Axis labels
function AxisLabels() {
  return (
    <group>
      {/* X axis label */}
      <Text
        position={[1.2, -0.8, 0]}
        fontSize={0.08}
        color="#a8a29e"
        anchorX="center"
        anchorY="middle"
      >
        Horizontal Break (in)
      </Text>
      
      {/* Y axis label */}
      <Text
        position={[-1.2, 0, 0]}
        fontSize={0.08}
        color="#a8a29e"
        anchorX="center"
        anchorY="middle"
        rotation={[0, 0, Math.PI / 2]}
      >
        Vertical Break (in)
      </Text>
      
      {/* Grid markers */}
      {[-10, -5, 0, 5, 10, 15].map((val) => (
        <Text
          key={`x-${val}`}
          position={[val * 0.07, -0.65, 0]}
          fontSize={0.05}
          color="#78716c"
          anchorX="center"
          anchorY="top"
        >
          {val}
        </Text>
      ))}
      
      {[-10, -5, 0, 5, 10, 15, 20].map((val) => (
        <Text
          key={`y-${val}`}
          position={[-0.85, val * 0.04, 0]}
          fontSize={0.05}
          color="#78716c"
          anchorX="right"
          anchorY="middle"
        >
          {val}
        </Text>
      ))}
    </group>
  );
}

// Grid background
function GridBackground() {
  const gridLines = useMemo(() => {
    const lines: Array<{ points: [number, number, number][]; opacity: number }> = [];
    
    // Vertical lines
    for (let i = -15; i <= 20; i += 5) {
      lines.push({
        points: [[i * 0.07, -0.6, -0.1], [i * 0.07, 0.85, -0.1]],
        opacity: i === 0 ? 0.3 : 0.1,
      });
    }
    
    // Horizontal lines
    for (let i = -15; i <= 25; i += 5) {
      lines.push({
        points: [[-1.1, i * 0.04, -0.1], [1.5, i * 0.04, -0.1]],
        opacity: i === 0 ? 0.3 : 0.1,
      });
    }
    
    return lines;
  }, []);

  return (
    <group>
      {gridLines.map((line, i) => (
        <Line
          key={i}
          points={line.points}
          color="#78716c"
          lineWidth={1}
          transparent
          opacity={line.opacity}
        />
      ))}
    </group>
  );
}

// Main scene content
function SceneContent({ 
  userPitches, 
  mlbPitches = [],
  showTrajectories = false,
}: { 
  userPitches: PitchData[]; 
  mlbPitches?: PitchData[];
  showTrajectories?: boolean;
}) {
  // Scale function to map inches to scene coordinates
  const scaleX = (inches: number) => inches * 0.07;
  const scaleY = (inches: number) => inches * 0.04;

  return (
    <group>
      <GridBackground />
      <AxisLabels />
      <StrikeZone />
      
      {/* MLB average pitches (hollow/transparent) */}
      {mlbPitches.map((pitch, i) => (
        <group key={`mlb-${i}`}>
          <Baseball
            position={[scaleX(pitch.avgHBreak), scaleY(pitch.avgVBreak), 0.1]}
            color={getPitchColor(pitch.pitchType)}
            scale={0.8}
            isUser={false}
          />
          {showTrajectories && (
            <PitchTrajectory
              start={[0, 0.8, 1.5]}
              end={[scaleX(pitch.avgHBreak), scaleY(pitch.avgVBreak), 0]}
              color={getPitchColor(pitch.pitchType)}
            />
          )}
        </group>
      ))}
      
      {/* User pitches (solid/prominent) */}
      {userPitches.map((pitch, i) => (
        <group key={`user-${i}`}>
          <Baseball
            position={[scaleX(pitch.avgHBreak), scaleY(pitch.avgVBreak), 0.2]}
            color={getPitchColor(pitch.pitchType)}
            scale={1.2}
            isUser={true}
          />
          {showTrajectories && (
            <PitchTrajectory
              start={[0, 0.8, 1.5]}
              end={[scaleX(pitch.avgHBreak), scaleY(pitch.avgVBreak), 0]}
              color={getPitchColor(pitch.pitchType)}
            />
          )}
          <Text
            position={[scaleX(pitch.avgHBreak), scaleY(pitch.avgVBreak) + 0.22, 0.2]}
            fontSize={0.06}
            color="#ffffff"
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.01}
            outlineColor="#000000"
          >
            {pitch.pitchType}
          </Text>
        </group>
      ))}
    </group>
  );
}

// Legend component
function Legend({ pitches }: { pitches: PitchData[] }) {
  const uniquePitches = useMemo(() => {
    const seen = new Set<string>();
    return pitches.filter(p => {
      if (seen.has(p.pitchType)) return false;
      seen.add(p.pitchType);
      return true;
    });
  }, [pitches]);

  return (
    <div className="absolute bottom-4 left-4 flex flex-wrap gap-3">
      {uniquePitches.map((pitch) => (
        <div key={pitch.pitchType} className="flex items-center gap-2 glass-panel px-3 py-1.5">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: getPitchColor(pitch.pitchType) }}
          />
          <span className="text-xs font-medium text-neutral-300">{pitch.pitchType}</span>
        </div>
      ))}
    </div>
  );
}

// Default MLB data for reference
const DEFAULT_MLB_DATA: PitchData[] = [
  { pitchType: 'Fastball', avgHBreak: 6.5, avgVBreak: 15.5 },
  { pitchType: 'Slider', avgHBreak: -2.5, avgVBreak: 2.0 },
  { pitchType: 'Curveball', avgHBreak: 6.0, avgVBreak: -8.5 },
  { pitchType: 'Changeup', avgHBreak: 9.0, avgVBreak: 6.5 },
  { pitchType: 'Sinker', avgHBreak: 13.5, avgVBreak: 8.0 },
];

export default function PitchVisualization3D({ 
  userPitches, 
  mlbPitches = DEFAULT_MLB_DATA,
  showTrajectories = false,
}: PitchVisualization3DProps) {
  const [hoveredPitch, setHoveredPitch] = useState<string | null>(null);

  return (
    <div className="glass-panel p-6 relative">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-neutral-100">
          3D Movement Profile
        </h3>
        <div className="flex items-center gap-4 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500/40 border border-amber-500" />
            <span>MLB Avg</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span>Your Pitch</span>
          </div>
        </div>
      </div>
      
      <div className="h-[400px] rounded-xl overflow-hidden bg-neutral-950/50">
        <Canvas
          camera={{ position: [0, 0, 2.5], fov: 50 }}
          dpr={[1, 2]}
        >
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <pointLight position={[-10, -10, -10]} intensity={0.5} color="#f97316" />
          
          <SceneContent 
            userPitches={userPitches} 
            mlbPitches={mlbPitches}
            showTrajectories={showTrajectories}
          />
          
          <OrbitControls 
            enableZoom={true}
            enablePan={false}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 1.5}
            minDistance={1.5}
            maxDistance={4}
          />
        </Canvas>
      </div>
      
      <Legend pitches={[...userPitches, ...mlbPitches]} />
      
      {hoveredPitch && (
        <div className="absolute top-20 right-8 glass-panel px-4 py-3">
          <p className="text-sm font-medium text-neutral-100">{hoveredPitch}</p>
        </div>
      )}
    </div>
  );
}

