import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { H, NH, NW, W } from './TopoCanvas';
import { linkKey, solvePower } from './power';

const SCALE = 60;
// width, height, depth, colour for each kind of equipment
const DIMS = {
  util: [2.2, 2, 1.6, 0x5b6b7d],
  mv: [1.4, 2.4, 1.2, 0x4d6a8a],
  ats: [1.6, 2.4, 1.2, 0x3f7a74],
  gen: [3.4, 1.8, 1.8, 0x6f7d3f],
  msb: [2.4, 2.6, 1.2, 0x66708a],
  ups: [1.5, 2.6, 1.4, 0x455268],
  pdu: [1.3, 2.2, 1, 0x7a6a4d],
  rack: [1.3, 2.8, 1.5, 0x2f3a4a],
  crah: [1.8, 2.4, 1.4, 0x3f6f8a],
  chiller: [2.6, 1.5, 1.5, 0x2f6f6a],
  network: [2, 1, 1.3, 0x4a4f7a],
  storage: [1.6, 2, 1.5, 0x55606e],
  server: [1.5, 2.4, 1.5, 0x2f3a4a],
  fire: [1.1, 1.6, 0.5, 0x9a3d3d],
  leak: [1, 1, 0.5, 0x3d6f9a],
  security: [1.3, 2.2, 0.7, 0x4d5560],
};
const FALLBACK = [1.6, 2.2, 1.3, 0x52627a];
const world = (n) => ({ x: (n.x + NW / 2 - W / 2) / SCALE, z: (n.y + NH / 2 - H / 2) / SCALE });

function label(text) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(4,10,18,0.78)';
  g.fillRect(0, 0, 256, 64);
  g.strokeStyle = '#19d3f5';
  g.strokeRect(1, 1, 254, 62);
  g.fillStyle = '#e4f4ff';
  g.font = '600 26px monospace';
  g.textAlign = 'center';
  g.fillText(text.slice(0, 16), 128, 41);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }),
  );
  sprite.scale.set(2.4, 0.6, 1);
  return sprite;
}

function dispose(object) {
  object.traverse((o) => {
    o.geometry?.dispose();
    o.material?.map?.dispose();
    o.material?.dispose?.();
  });
}

// The 3D room: equipment as boxes, cables as tubes. Live cables glow and carry moving pulses; cut cables break and spark.
export default function Scene3D({ topo, cuts, onWire, onNode }) {
  const mount = useRef(null);
  const ctx = useRef({});
  const callbacks = useRef({});
  callbacks.current = { onWire, onNode };

  useEffect(() => {
    const el = mount.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    camera.position.set(0, 10, 12);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.1;
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(6, 12, 8);
    scene.add(sun);
    scene.add(new THREE.GridHelper(40, 40, 0x19d3f5, 0x16344d));
    const dyn = new THREE.Group();
    scene.add(dyn);

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);

    // A click is a press and release that did not move; otherwise it was a drag to rotate the view.
    const ray = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let down = null;
    renderer.domElement.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY };
    });
    renderer.domElement.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
      const r = renderer.domElement.getBoundingClientRect();
      mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(mouse, camera);
      const hit = ray.intersectObjects(dyn.children, true).find((h) => h.object.userData.pick);
      if (!hit) return;
      const { link, node } = hit.object.userData;
      if (link) callbacks.current.onWire?.(link);
      else if (node) callbacks.current.onNode?.(node);
    });

    const clock = new THREE.Clock();
    let frame;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();
      (ctx.current.anim || []).forEach((fn) => fn(t));
      controls.update();
      renderer.render(scene, camera);
    };
    tick();
    ctx.current = { dyn, anim: [], camera, controls, fitted: false };

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      dyn.children.slice().forEach(dispose);
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  const signature = JSON.stringify([topo.id, topo.nodes, topo.links, cuts]);
  useEffect(() => {
    const { dyn, camera, controls } = ctx.current;
    if (!dyn) return;
    dyn.children.slice().forEach((child) => {
      dyn.remove(child);
      dispose(child);
    });
    const anim = [];
    const power = solvePower(topo, cuts);
    const cutSet = new Set(cuts);
    const top = {};

    topo.nodes.forEach((n) => {
      const [w, h, d, color] = DIMS[n.kind] || FALLBACK;
      const p = world(n);
      const on = power.powered.has(n.id);
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.55 }),
      );
      box.position.set(p.x, h / 2, p.z);
      box.userData = { pick: true, node: n };
      dyn.add(box);
      const led = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 16, 16),
        new THREE.MeshBasicMaterial({ color: on ? 0x2df5a1 : 0xff4a68 }),
      );
      led.position.set(p.x + w / 2 - 0.25, h + 0.12, p.z + d / 2 - 0.2);
      dyn.add(led);
      if (!on)
        anim.push((t) => {
          led.visible = Math.sin(t * 8) > 0;
        });
      const tag = label(n.name);
      tag.position.set(p.x, h + 0.75, p.z);
      dyn.add(tag);
      top[n.id] = new THREE.Vector3(p.x, h + 0.05, p.z);
    });

    topo.links.forEach((l) => {
      const a = top[l.from];
      const b = top[l.to];
      if (!a || !b) return;
      const key = linkKey(l);
      const lift = Math.max(1.1, a.distanceTo(b) * 0.18);
      const curve = new THREE.CatmullRomCurve3([
        a,
        a
          .clone()
          .lerp(b, 0.33)
          .setY(Math.max(a.y, b.y) + lift),
        a
          .clone()
          .lerp(b, 0.67)
          .setY(Math.max(a.y, b.y) + lift),
        b,
      ]);
      const hit = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 24, 0.3, 6),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      );
      hit.userData = { pick: true, link: key };
      dyn.add(hit);

      if (cutSet.has(key)) {
        const pts = curve.getPoints(40);
        [pts.slice(0, 17), pts.slice(24)].forEach((part) => {
          dyn.add(
            new THREE.Mesh(
              new THREE.TubeGeometry(new THREE.CatmullRomCurve3(part), 16, 0.07, 8),
              new THREE.MeshStandardMaterial({ color: 0x7a2a36, emissive: 0x3a0f16 }),
            ),
          );
        });
        const spark = new THREE.Mesh(
          new THREE.SphereGeometry(0.16, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0xffb020 }),
        );
        spark.position.copy(curve.getPoint(0.5));
        dyn.add(spark);
        anim.push((t) => {
          spark.visible = Math.sin(t * 25) > -0.2;
          spark.scale.setScalar(0.6 + Math.abs(Math.sin(t * 17)));
        });
        return;
      }
      const live = power.live.has(key);
      dyn.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(curve, 48, 0.07, 8),
          new THREE.MeshStandardMaterial({
            color: live ? 0x1a8f66 : 0x2a3340,
            emissive: live ? 0x2df5a1 : 0x000000,
            emissiveIntensity: live ? 0.9 : 0,
          }),
        ),
      );
      if (live) {
        const pulses = [0, 1, 2].map(
          () =>
            new THREE.Mesh(
              new THREE.SphereGeometry(0.13, 10, 10),
              new THREE.MeshBasicMaterial({ color: 0xc8ffe9 }),
            ),
        );
        pulses.forEach((p) => dyn.add(p));
        anim.push((t) => pulses.forEach((p, i) => p.position.copy(curve.getPoint((t * 0.25 + i / 3) % 1))));
      }
    });
    ctx.current.anim = anim;

    if (!ctx.current.fitted && topo.nodes.length) {
      const pts = topo.nodes.map(world);
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const cz = pts.reduce((s, p) => s + p.z, 0) / pts.length;
      controls.target.set(cx, 0.5, cz);
      camera.position.set(cx, 11, cz + 13);
      ctx.current.fitted = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return <div ref={mount} className="pt-3dwrap" />;
}
