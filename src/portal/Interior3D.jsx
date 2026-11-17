import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { INTERNALS } from './internals';

function tag(
  text,
  { color = '#e4f4ff', bg = 'rgba(4,10,18,0.82)', border = '#19d3f5', width = 256, scale = 2.2 } = {},
) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, width, 64);
  g.strokeStyle = border;
  g.lineWidth = 2;
  g.strokeRect(1, 1, width - 2, 62);
  g.fillStyle = color;
  g.font = '600 24px sans-serif';
  g.textAlign = 'center';
  g.fillText(text, width / 2, 41);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }),
  );
  sprite.scale.set(scale, (scale * 64) / width, 1);
  return sprite;
}

function dispose(object) {
  object.traverse((o) => {
    o.geometry?.dispose();
    o.material?.map?.dispose();
    o.material?.dispose?.();
  });
}

// The inside of a piece of equipment. The door swings open, parts are boxes, and every wire is a labelled, clickable tube.
export default function Interior3D({ kind, mode, showLabels, selected, answers, onPick }) {
  const mount = useRef(null);
  const ctx = useRef({});
  const callback = useRef(onPick);
  callback.current = onPick;

  useEffect(() => {
    const el = mount.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 4.2, 9.5);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.6, 0);
    controls.enableDamping = true;
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(4, 9, 7);
    scene.add(sun);
    const dyn = new THREE.Group();
    scene.add(dyn);

    const resize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);

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
      if (hit) callback.current?.(hit.object.userData.pick);
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
    ctx.current = { dyn, anim: [], door: { kind: null, angle: 0 } };

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      dyn.children.slice().forEach(dispose);
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  const signature = JSON.stringify([kind, mode, showLabels, selected, answers]);
  useEffect(() => {
    const { dyn, door } = ctx.current;
    const def = INTERNALS[kind];
    if (!dyn || !def) return;
    dyn.children.slice().forEach((child) => {
      dyn.remove(child);
      dispose(child);
    });
    const anim = [];
    const [W, H, D] = def.shell;

    const frame = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)),
      new THREE.LineBasicMaterial({ color: 0x19d3f5 }),
    );
    frame.position.y = H / 2;
    dyn.add(frame);
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(W, H, D),
      new THREE.MeshBasicMaterial({
        color: 0x19d3f5,
        transparent: true,
        opacity: 0.05,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    );
    glass.position.y = H / 2;
    dyn.add(glass);
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(W, 0.06, D),
      new THREE.MeshStandardMaterial({ color: 0x1b2a3a }),
    );
    dyn.add(floor);

    // the front door swings open on its left hinge
    if (door.kind !== kind) {
      door.kind = kind;
      door.angle = 0;
    }
    const hinge = new THREE.Group();
    hinge.position.set(-W / 2, H / 2, D / 2);
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(W, H, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x3a566e, transparent: true, opacity: 0.6 }),
    );
    panel.position.x = W / 2;
    hinge.add(panel);
    dyn.add(hinge);
    anim.push(() => {
      door.angle += (-1.9 - door.angle) * 0.04;
      hinge.rotation.y = door.angle;
    });

    const spot = {};
    def.parts.forEach((p) => {
      const [w, h, d] = p.size;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({
          color: p.color,
          metalness: 0.2,
          roughness: 0.6,
          emissive: selected === p.id ? 0x19d3f5 : 0x000000,
          emissiveIntensity: 0.5,
        }),
      );
      mesh.position.set(...p.pos);
      mesh.userData = { pick: { type: 'part', id: p.id } };
      dyn.add(mesh);
      const name = tag(p.name, { width: 320, scale: 2.1 });
      name.position.set(p.pos[0], p.pos[1] + h / 2 + 0.38, p.pos[2]);
      dyn.add(name);
      spot[p.id] = new THREE.Vector3(p.pos[0], p.pos[1] + h / 2, p.pos[2]);
    });

    def.wires.forEach((w, i) => {
      const a = spot[w.from];
      const b = spot[w.to];
      if (!a || !b) return;
      const lift = 0.35 + a.distanceTo(b) * 0.1 + (i % 3) * 0.12;
      const top = Math.max(a.y, b.y) + lift;
      const curve = new THREE.CatmullRomCurve3([
        a,
        a.clone().lerp(b, 0.33).setY(top),
        a.clone().lerp(b, 0.67).setY(top),
        b,
      ]);
      const chosen = selected === w.id;
      const verdict = answers[w.id];
      const radius = (w.thick ? 0.075 : 0.04) * (chosen ? 1.9 : 1);
      const wire = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 40, radius, 8),
        new THREE.MeshStandardMaterial({
          color: w.color,
          emissive: chosen ? w.color : 0x000000,
          emissiveIntensity: 0.9,
        }),
      );
      dyn.add(wire);
      const hit = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 20, 0.2, 6),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
      );
      hit.userData = { pick: { type: 'wire', id: w.id } };
      dyn.add(hit);

      // labels: the wire name when learning, just a number (and a result) when taking the quiz
      const mid = curve.getPoint(0.5);
      let text = null;
      let style = { color: '#e4f4ff', border: w.color };
      if (mode === 'learn' && showLabels) text = w.label;
      if (mode === 'quiz') {
        text =
          verdict === 'right'
            ? `${i + 1}  ${w.label}`
            : verdict === 'wrong'
              ? `${i + 1}  not yet`
              : String(i + 1);
        if (verdict === 'right') style = { color: '#2df5a1', border: '#2df5a1' };
        if (verdict === 'wrong') style = { color: '#ff4a68', border: '#ff4a68' };
      }
      if (text) {
        const long = text.length > 4;
        const sprite = tag(text, { ...style, width: long ? 360 : 80, scale: long ? 2.5 : 0.55 });
        sprite.position.copy(mid).setY(mid.y + 0.2);
        dyn.add(sprite);
      }
      if (chosen) {
        const pulses = [0, 1, 2, 3].map(
          () =>
            new THREE.Mesh(
              new THREE.SphereGeometry(0.12, 10, 10),
              new THREE.MeshBasicMaterial({ color: 0xffffff }),
            ),
        );
        pulses.forEach((p) => dyn.add(p));
        anim.push((t) => pulses.forEach((p, n) => p.position.copy(curve.getPoint((t * 0.3 + n / 4) % 1))));
      }
    });
    ctx.current.anim = anim;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return <div ref={mount} className="pt-3dwrap inside" />;
}
