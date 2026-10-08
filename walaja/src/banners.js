import * as THREE from 'three';
import { heightAt } from './terrain.js';

function canvasTexture(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function plainTexture(fill, hem) {
  return canvasTexture(128, 96, (ctx, w, h) => {
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = hem;
    ctx.fillRect(0, 0, w, 6);
    ctx.fillRect(0, h - 6, w, 6);
  });
}

// Derafsh Kaviani: panji besar Sassanid dengan bingkai emas, bintang di tengah, dan rumbai.
export function derafshTexture() {
  return canvasTexture(256, 192, (ctx, w, h) => {
    ctx.fillStyle = '#7d1f33';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#4e2a78';
    ctx.fillRect(14, 14, w - 28, h - 28);
    ctx.strokeStyle = '#d6aa3c';
    ctx.lineWidth = 6;
    ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.fillStyle = '#d6aa3c';
    const cx = w / 2;
    const cy = h / 2 - 4;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 62 : 28;
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7d1f33';
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, Math.PI * 2);
    ctx.fill();
    const tassel = ['#d6aa3c', '#b8263a', '#4e2a78'];
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = tassel[i % 3];
      ctx.beginPath();
      ctx.moveTo(i * 28 + 4, h - 14);
      ctx.lineTo(i * 28 + 24, h - 14);
      ctx.lineTo(i * 28 + 14, h);
      ctx.fill();
    }
  });
}

export class Banner {
  constructor({ tex, width, height, pole, owner, lx, lz, phase = 0 }) {
    this.owner = owner;
    this.lx = lx;
    this.lz = lz;
    this.pole = pole;
    this.phase = phase;
    this.width = width;
    this.group = new THREE.Group();

    const stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, pole, 5),
      new THREE.MeshLambertMaterial({ color: '#6a4a2a', flatShading: true }),
    );
    stick.position.y = pole / 2;
    const finial = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.22, 0),
      new THREE.MeshLambertMaterial({ color: '#d6aa3c', flatShading: true }),
    );
    finial.position.y = pole + 0.15;

    const geo = new THREE.PlaneGeometry(width, height, 10, 5);
    geo.translate(width / 2, -height / 2, 0);
    this.base = geo.attributes.position.array.slice();
    this.cloth = new THREE.Mesh(
      geo,
      new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }),
    );
    this.cloth.position.set(0.06, pole - 0.2, 0);
    for (const m of [stick, finial, this.cloth]) {
      m.castShadow = true;
      this.group.add(m);
    }
  }

  update(now) {
    const o = this.owner.place(this.lx, this.lz);
    this.group.position.set(o.x, heightAt(o.x, o.z), o.z);
    this.group.rotation.y = this.owner.state.psi;
    const p = this.cloth.geometry.attributes.position;
    const a = this.base;
    for (let i = 0; i < p.count; i++) {
      const x = a[i * 3];
      const k = x / this.width;
      p.setZ(i, Math.sin(x * 1.7 - now * 5 + this.phase) * 0.3 * k);
      p.setY(i, a[i * 3 + 1] - Math.sin(x * 1.1 - now * 4 + this.phase) * 0.08 * k);
    }
    p.needsUpdate = true;
    this.cloth.geometry.computeVertexNormals();
  }
}
