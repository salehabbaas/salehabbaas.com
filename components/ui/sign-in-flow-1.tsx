"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { cn } from "@/lib/utils";

type UniformValue = number | number[] | number[][];
type Uniforms = Record<string, { value: UniformValue; type: string }>;

interface ShaderProps {
  source: string;
  uniforms: Uniforms;
  maxFps?: number;
}

interface CanvasRevealEffectProps {
  animationSpeed?: number;
  opacities?: number[];
  colors?: number[][];
  containerClassName?: string;
  dotSize?: number;
  showGradient?: boolean;
  reverse?: boolean;
}

interface DotMatrixProps {
  animationSpeed?: number;
  colors?: number[][];
  opacities?: number[];
  totalSize?: number;
  dotSize?: number;
  reverse?: boolean;
  center?: ("x" | "y")[];
}

export function CanvasRevealEffect({
  animationSpeed = 10,
  opacities = [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1],
  colors = [[0, 255, 255]],
  containerClassName,
  dotSize,
  showGradient = true,
  reverse = false
}: CanvasRevealEffectProps) {
  return (
    <div className={cn("relative h-full w-full", containerClassName)}>
      <div className="h-full w-full">
        <DotMatrix
          colors={colors}
          animationSpeed={animationSpeed}
          dotSize={dotSize ?? 3}
          opacities={opacities}
          reverse={reverse}
          center={["x", "y"]}
        />
      </div>
      {showGradient ? <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" /> : null}
    </div>
  );
}

function DotMatrix({
  animationSpeed = 10,
  colors = [[0, 0, 0]],
  opacities = [0.04, 0.04, 0.04, 0.04, 0.04, 0.08, 0.08, 0.08, 0.08, 0.14],
  totalSize = 20,
  dotSize = 2,
  reverse = false,
  center = ["x", "y"]
}: DotMatrixProps) {
  const uniforms = useMemo(() => {
    let colorsArray = [colors[0], colors[0], colors[0], colors[0], colors[0], colors[0]];

    if (colors.length === 2) {
      colorsArray = [colors[0], colors[0], colors[0], colors[1], colors[1], colors[1]];
    } else if (colors.length === 3) {
      colorsArray = [colors[0], colors[0], colors[1], colors[1], colors[2], colors[2]];
    }

    return {
      u_colors: {
        value: colorsArray.map((color) => [color[0] / 255, color[1] / 255, color[2] / 255]),
        type: "uniform3fv"
      },
      u_opacities: {
        value: opacities,
        type: "uniform1fv"
      },
      u_total_size: {
        value: totalSize,
        type: "uniform1f"
      },
      u_dot_size: {
        value: dotSize,
        type: "uniform1f"
      },
      u_animation_speed: {
        value: animationSpeed,
        type: "uniform1f"
      },
      u_reverse: {
        value: reverse ? 1 : 0,
        type: "uniform1i"
      }
    } satisfies Uniforms;
  }, [animationSpeed, colors, dotSize, opacities, reverse, totalSize]);

  return (
    <Shader
      source={`
        precision mediump float;
        in vec2 fragCoord;

        uniform float u_time;
        uniform float u_opacities[10];
        uniform vec3 u_colors[6];
        uniform float u_total_size;
        uniform float u_dot_size;
        uniform float u_animation_speed;
        uniform vec2 u_resolution;
        uniform int u_reverse;

        out vec4 fragColor;

        float PHI = 1.61803398874989484820459;

        float random(vec2 xy) {
          return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x);
        }

        void main() {
          vec2 st = fragCoord.xy;
          ${center.includes("x") ? "st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));" : ""}
          ${center.includes("y") ? "st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));" : ""}

          float opacity = step(0.0, st.x);
          opacity *= step(0.0, st.y);

          vec2 st2 = vec2(int(st.x / u_total_size), int(st.y / u_total_size));
          float frequency = 5.0;
          float showOffset = random(st2);
          float rand = random(st2 * floor((u_time / frequency) + showOffset + frequency));

          opacity *= u_opacities[int(rand * 10.0)];
          opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.x / u_total_size));
          opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.y / u_total_size));

          vec3 color = u_colors[int(showOffset * 6.0)];

          vec2 centerGrid = u_resolution / 2.0 / u_total_size;
          float distFromCenter = distance(centerGrid, st2);
          float introOffset = distFromCenter * 0.01 + (random(st2) * 0.15);
          float maxGridDist = distance(centerGrid, vec2(0.0, 0.0));
          float outroOffset = (maxGridDist - distFromCenter) * 0.02 + (random(st2 + 42.0) * 0.2);
          float currentOffset;

          if (u_reverse == 1) {
            currentOffset = outroOffset;
            opacity *= 1.0 - step(currentOffset, u_time * u_animation_speed);
            opacity *= clamp((step(currentOffset + 0.1, u_time * u_animation_speed)) * 1.25, 1.0, 1.25);
          } else {
            currentOffset = introOffset;
            opacity *= step(currentOffset, u_time * u_animation_speed);
            opacity *= clamp((1.0 - step(currentOffset + 0.1, u_time * u_animation_speed)) * 1.25, 1.0, 1.25);
          }

          fragColor = vec4(color, opacity);
          fragColor.rgb *= fragColor.a;
        }
      `}
      uniforms={uniforms}
      maxFps={60}
    />
  );
}

function ShaderPlane({ source, uniforms, maxFps = 60 }: ShaderProps) {
  const { size } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const lastFrameTimeRef = useRef(0);

  const preparedUniforms = useMemo(() => {
    const nextUniforms: Record<string, { value: unknown; type?: string }> = {};

    Object.entries(uniforms).forEach(([uniformName, uniform]) => {
      switch (uniform.type) {
        case "uniform1f":
          nextUniforms[uniformName] = { value: uniform.value, type: "1f" };
          break;
        case "uniform1i":
          nextUniforms[uniformName] = { value: uniform.value, type: "1i" };
          break;
        case "uniform3f":
          nextUniforms[uniformName] = {
            value: new THREE.Vector3().fromArray(uniform.value as number[]),
            type: "3f"
          };
          break;
        case "uniform1fv":
          nextUniforms[uniformName] = { value: uniform.value, type: "1fv" };
          break;
        case "uniform3fv":
          nextUniforms[uniformName] = {
            value: (uniform.value as number[][]).map((value) => new THREE.Vector3().fromArray(value)),
            type: "3fv"
          };
          break;
        case "uniform2f":
          nextUniforms[uniformName] = {
            value: new THREE.Vector2().fromArray(uniform.value as number[]),
            type: "2f"
          };
          break;
        default:
          console.error(`Invalid uniform type for "${uniformName}".`);
      }
    });

    nextUniforms.u_time = { value: 0, type: "1f" };
    nextUniforms.u_resolution = { value: new THREE.Vector2(size.width * 2, size.height * 2) };

    return nextUniforms;
  }, [size.height, size.width, uniforms]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: `
          precision mediump float;
          uniform vec2 u_resolution;
          out vec2 fragCoord;

          void main() {
            float x = position.x;
            float y = position.y;
            gl_Position = vec4(x, y, 0.0, 1.0);
            fragCoord = (position.xy + vec2(1.0)) * 0.5 * u_resolution;
            fragCoord.y = u_resolution.y - fragCoord.y;
          }
        `,
        fragmentShader: source,
        uniforms: preparedUniforms,
        glslVersion: THREE.GLSL3,
        transparent: true,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendSrc: THREE.SrcAlphaFactor,
        blendDst: THREE.OneFactor
      }),
    [preparedUniforms, source]
  );

  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    const resolution = material.uniforms.u_resolution?.value as THREE.Vector2 | undefined;
    resolution?.set(size.width * 2, size.height * 2);
  }, [material, size.height, size.width]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    const timestamp = clock.getElapsedTime();
    const minDelta = maxFps > 0 ? 1 / maxFps : 0;

    if (minDelta && timestamp - lastFrameTimeRef.current < minDelta) {
      return;
    }

    lastFrameTimeRef.current = timestamp;

    const shaderMaterial = meshRef.current.material as THREE.ShaderMaterial;
    shaderMaterial.uniforms.u_time.value = timestamp;
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function Shader({ source, uniforms, maxFps = 60 }: ShaderProps) {
  return (
    <Canvas className="absolute inset-0 h-full w-full" dpr={[1, 1.5]} gl={{ alpha: true, antialias: false }}>
      <ShaderPlane source={source} uniforms={uniforms} maxFps={maxFps} />
    </Canvas>
  );
}
