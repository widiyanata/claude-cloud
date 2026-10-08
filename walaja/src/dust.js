import * as THREE from 'three';

const VERT = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  uniform float uPx;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPx;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float r2 = dot(p, p);
    if (r2 > 1.0) discard;
    float a = pow(1.0 - r2, 1.6);
    gl_FragColor = vec4(uColor, a * vAlpha);
  }
`;

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export class DustSystem {
  constructor(max = 7000) {
    this.max = max;
    this.cursor = 0;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.age = new Float32Array(max).fill(1);
    this.life = new Float32Array(max).fill(1);
    this.s0 = new Float32Array(max);
    this.s1 = new Float32Array(max);
    this.a0 = new Float32Array(max);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: { uPx: { value: 6 }, uColor: { value: new THREE.Color('#eedcb2') } },
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }

  emit(x, y, z, vx, vy, vz, s0, s1, a, life) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.max;
    this.pos[i * 3] = x;
    this.pos[i * 3 + 1] = y;
    this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx;
    this.vel[i * 3 + 1] = vy;
    this.vel[i * 3 + 2] = vz;
    this.s0[i] = s0;
    this.s1[i] = s1;
    this.a0[i] = a;
    this.life[i] = life;
    this.age[i] = 0;
  }

  update(dt, pxPerUnit) {
    this.mat.uniforms.uPx.value = pxPerUnit;
    const damp = Math.exp(-0.7 * dt);
    for (let i = 0; i < this.max; i++) {
      const life = this.life[i];
      if (this.age[i] >= life) {
        this.size[i] = 0;
        this.alpha[i] = 0;
        continue;
      }
      this.age[i] += dt;
      const k = this.age[i] / life;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.vel[i * 3] *= damp;
      this.vel[i * 3 + 2] *= damp;
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * Math.pow(k, 0.6);
      this.alpha[i] = this.a0[i] * smooth(0, 0.12, k) * Math.pow(1 - k, 1.5);
    }
    const g = this.points.geometry.attributes;
    g.position.needsUpdate = true;
    g.aSize.needsUpdate = true;
    g.aAlpha.needsUpdate = true;
  }
}
