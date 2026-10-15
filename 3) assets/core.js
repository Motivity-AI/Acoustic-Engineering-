'use strict';
/* ============ INIT FROM URL OR INLINE ============ */
const ROOM_ID = window.ROOM_ID
  || new URLSearchParams(location.search).get('id')
  || 'mosque_indoor';

if (!ROOMS[ROOM_ID]) {
  document.body.innerHTML = '<div style="padding:40px;color:#fff;font-family:sans-serif">'
    + '❌ البيئة غير موجودة: ' + ROOM_ID + '<br><br>'
    + '<a href="index.html" style="color:#4de5ff">← العودة للقائمة</a></div>';
  throw new Error('Room not found: ' + ROOM_ID);
}

/* ============ STATE ============ */
const state = {
  room: ROOM_ID,
  devices: [], nextId: 1,
  curBrand: 'motivity', curCat: 'speakers', curType: 'ceil_r',
  selected: null, view3D: true, showHeat: true, showGrid: true, presentation: false,
  cam: {theta:-0.6, phi:0.9, radius:28, target:new THREE.Vector3(0,0,0), tween:null},
  history: [], historyIdx: -1
};

/* ============ THREE SETUP ============ */
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
const skyColor = 0x1a2540;
scene.background = new THREE.Color(skyColor);
scene.fog = new THREE.Fog(skyColor, 80, 320);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 800);

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
scene.add(new THREE.HemisphereLight(0x9b7bff, 0x1a2332, 0.55));
const sun = new THREE.DirectionalLight(0xfff2e0, 1.7);
sun.position.set(20, 40, 15);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -80; sun.shadow.camera.right = 80;
sun.shadow.camera.top = 80; sun.shadow.camera.bottom = -80;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 200;
sun.shadow.bias = -0.0005;
scene.add(sun);
const fill = new THREE.DirectionalLight(0x4d7cfe, 0.35);
fill.position.set(-20, 25, -12); scene.add(fill);

const roomGrp = new THREE.Group(); scene.add(roomGrp);
const devGrp  = new THREE.Group(); scene.add(devGrp);
const heatGrp = new THREE.Group(); scene.add(heatGrp);

const grid = new THREE.GridHelper(400, 400, 0x4de5ff, 0x2a3555);
grid.material.opacity = 0.12; grid.material.transparent = true;
grid.position.y = 0.004; scene.add(grid);

const floorMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(600, 600),
  new THREE.MeshStandardMaterial({color:0x1a3a2a, roughness:0.95, metalness:0.02})
);
floorMesh.rotation.x = -Math.PI/2; floorMesh.receiveShadow = true;
scene.add(floorMesh);

/* ============ MATERIALS & MESH HELPERS ============ */
function bodyMat(){return new THREE.MeshStandardMaterial({color:0x1a1f2e, roughness:0.4, metalness:0.6});}
function accentMat(c,i){return new THREE.MeshStandardMaterial({color:c, emissive:c, emissiveIntensity:i||0.7, roughness:0.3, metalness:0.5});}
function darkMat(){return new THREE.MeshStandardMaterial({color:0x0a0a12, roughness:0.7, metalness:0.4});}
function grayMat(){return new THREE.MeshStandardMaterial({color:0x2a3555, roughness:0.6, metalness:0.4});}
function metalMat(){return new THREE.MeshStandardMaterial({color:0x4a5568, roughness:0.3, metalness:0.9});}
function steelMat(){return new THREE.MeshStandardMaterial({color:0x4a5568, roughness:0.5, metalness:0.6, side:THREE.DoubleSide});}

function getSpec(cat, typeId) {
  const c = CATS[cat]; if (!c) return null;
  const arr = c.devices.find(d => d[0] === typeId); if (!arr) return null;
  return {id:arr[0], name:arr[1], emoji:arr[2], h:arr[3], power:arr[4], dir:arr[5], shape:arr[6]};
}

/* ============ MESH FACTORY ============ */
function makeMesh(cat, typeId, brandColor) {
  const spec = getSpec(cat, typeId);
  if (!spec) return null;
  const color = brandColor || 0x4de5ff;
  const g = new THREE.Group();
  const S = spec.shape;

  switch (S) {
    case 'disc': {
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,0.03,32), bodyMat());
      d.castShadow = true; g.add(d);
      const gr = new THREE.Mesh(new THREE.CircleGeometry(0.15,32), darkMat());
      gr.rotation.x = Math.PI/2; gr.position.y = -0.017; g.add(gr);
      const r = new THREE.Mesh(new THREE.RingGeometry(0.15,0.2,32),
        new THREE.MeshBasicMaterial({color, transparent:true, opacity:0.85, side:THREE.DoubleSide}));
      r.rotation.x = -Math.PI/2; r.position.y = -0.018; g.add(r);
      break;
    }
    case 'square': {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.04,0.4), bodyMat());
      b.castShadow = true; g.add(b);
      const gr = new THREE.Mesh(new THREE.PlaneGeometry(0.32,0.32), darkMat());
      gr.rotation.x = Math.PI/2; gr.position.y = -0.022; g.add(gr);
      break;
    }
    case 'panel': {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.7,0.06), bodyMat());
      b.castShadow = true; g.add(b);
      [[0.16,0.09],[-0.16,0.13]].forEach(([y,rad]) => {
        const d = new THREE.Mesh(new THREE.CircleGeometry(rad,24), darkMat());
        d.position.set(0,y,0.031); g.add(d);
      });
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.01,0.062), accentMat(color));
      t.position.y = 0.351; g.add(t);
      break;
    }
    case 'box': {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.32,0.48,0.3), bodyMat());
      b.castShadow = true; g.add(b);
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,0.01,24), darkMat());
      w.rotation.x = Math.PI/2; w.position.set(0,-0.07,0.156); g.add(w);
      const wr = new THREE.Mesh(new THREE.RingGeometry(0.12,0.13,24), accentMat(color));
      wr.position.set(0,-0.07,0.162); g.add(wr);
      const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.01,16), darkMat());
      tw.rotation.x = Math.PI/2; tw.position.set(0,0.15,0.156); g.add(tw);
      break;
    }
    case 'column': {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.16,1.0,0.14), bodyMat());
      b.castShadow = true; g.add(b);
      for (let i=0;i<5;i++) {
        const d = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.01,16), accentMat(color));
        d.rotation.z = Math.PI/2; d.position.set(0.083,-0.32+i*0.16,0); g.add(d);
      }
      break;
    }
    case 'horn': {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.26,0.07,0.4,20,1,true), steelMat());
      h.rotation.x = Math.PI/2; h.position.z = 0.19; g.add(h);
      const bk = new THREE.Mesh(new THREE.BoxGeometry(0.22,0.22,0.2), bodyMat());
      bk.position.z = -0.09; bk.castShadow = true; g.add(bk);
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.025,10,10), accentMat(color,2));
      led.position.set(0.07,0.07,-0.19); g.add(led);
      break;
    }
    case 'linearray': {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.65,0.2,0.42), bodyMat());
      b.castShadow = true; g.add(b);
      for (let i=0;i<4;i++) {
        const d = new THREE.Mesh(new THREE.CylinderGeometry(0.065,0.065,0.01,16), darkMat());
        d.rotation.z = Math.PI/2; d.position.set(-0.24+i*0.16,0,0.216); g.add(d);
      }
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.65,0.012,0.42), accentMat(color));
      t.position.y = 0.1; g.add(t);
      break;
    }
    case 'linearray_l': {
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.2,0.28,0.55), bodyMat());
      b.castShadow = true; g.add(b);
      for (let i=0;i<8;i++) {
        const d = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.015,16), darkMat());
        d.rotation.z = Math.PI/2; d.position.set(-0.45+i*0.13,0,0.286); g.add(d);
      }
      const t = new THREE.Mesh(new THREE.BoxGeometry(1.2,0.02,0.55), accentMat(color,1));
      t.position.y = 0.14; g.add(t);
      [-0.5,0.5].forEach(x => {
        const rg = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.5,0.4), metalMat());
        rg.position.set(x,0,0); g.add(rg);
      });
      break;
    }
    case 'linearray_xl': {
      for (let k=0;k<3;k++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(1.8,0.35,0.8), bodyMat());
        b.castShadow = true; b.position.y = -0.4 + k*0.4; g.add(b);
        for (let i=0;i<10;i++) {
          const d = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.02,14), darkMat());
          d.rotation.z = Math.PI/2; d.position.set(-0.7+i*0.155,-0.4+k*0.4,0.415); g.add(d);
        }
        const t = new THREE.Mesh(new THREE.BoxGeometry(1.8,0.02,0.8), accentMat(color,1.2));
        t.position.y = -0.4 + k*0.4 + 0.175; g.add(t);
      }
      const rig = new THREE.Mesh(new THREE.BoxGeometry(0.15,1.6,0.15), metalMat());
      rig.position.y = 0.5; g.add(rig);
      break;
    }
    case 'sub': case 'sub_l': {
      const sz = S === 'sub_l' ? 0.65 : 0.55;
      const b = new THREE.Mesh(new THREE.BoxGeometry(sz,sz,sz), bodyMat());
      b.castShadow = true; g.add(b);
      const r = sz * 0.34;
      const d = new THREE.Mesh(new THREE.CylinderGeometry(r,r,0.02,32), darkMat());
      d.rotation.x = Math.PI/2; d.position.z = sz/2 + 0.005; g.add(d);
      const ring = new THREE.Mesh(new THREE.RingGeometry(r,r+0.03,32), accentMat(color));
      ring.position.z = sz/2 + 0.011; g.add(ring);
      break;
    }
    case 'pendant': {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.006,0.006,0.5,6), grayMat());
      w.position.y = 0.35; g.add(w);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.15,20,16), bodyMat());
      b.scale.y = 0.7; b.castShadow = true; g.add(b);
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.032,12,12), accentMat(color,2));
      l.position.y = -0.11; g.add(l);
      break;
    }
    case 'monitor': {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.32,0.42,0.28), bodyMat());
      b.castShadow = true; g.add(b);
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.01,20), darkMat());
      w.rotation.x = Math.PI/2; w.position.set(0,-0.06,0.146); g.add(w);
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,0.01,14), darkMat());
      t.rotation.x = Math.PI/2; t.position.set(0,0.14,0.146); g.add(t);
      break;
    }
    case 'horn_l': {
      const size = spec.id === 'horn_xl' ? 1.6 : 1.2;
      const h = new THREE.Mesh(new THREE.CylinderGeometry(size*0.35,size*0.12,size*0.8,24,1,true), steelMat());
      h.rotation.x = Math.PI/2; h.position.z = size*0.4; h.castShadow = true; g.add(h);
      const bk = new THREE.Mesh(new THREE.BoxGeometry(size*0.5,size*0.5,size*0.35), bodyMat());
      bk.position.z = -size*0.15; bk.castShadow = true; g.add(bk);
      const dr = new THREE.Mesh(new THREE.CylinderGeometry(size*0.15,size*0.15,size*0.15,20), darkMat());
      dr.rotation.x = Math.PI/2; dr.position.z = size*0.15; g.add(dr);
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.05,10,10), accentMat(color,2));
      led.position.set(size*0.2,size*0.2,-size*0.28); g.add(led);
      break;
    }
    case 'cluster': {
      const positions = [{x:-0.5,y:0},{x:0.5,y:0},{x:0,y:0}];
      const angles = [-0.35,0.35,0];
      for (let i=0;i<3;i++) {
        const h = new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.14,1.0,20,1,true), steelMat());
        h.rotation.x = Math.PI/2; h.rotation.y = angles[i];
        h.position.set(positions[i].x,0,0.5); h.castShadow = true; g.add(h);
        const d = new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.18,0.2,20), darkMat());
        d.rotation.x = Math.PI/2; d.rotation.y = angles[i];
        d.position.set(positions[i].x,0,0.15); g.add(d);
      }
      const box = new THREE.Mesh(new THREE.BoxGeometry(2.2,0.9,0.5), bodyMat());
      box.position.z = -0.2; box.castShadow = true; g.add(box);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.4,0.06,0.5), metalMat());
      frame.position.y = 0.5; g.add(frame);
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.07,10,10), accentMat(color,2));
      led.position.set(0,0.4,-0.42); g.add(led);
      break;
    }
    case 'minaret': {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.75,0.4,8), grayMat());
      base.position.y = -0.3; base.castShadow = true; g.add(base);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.65,24,16,0,Math.PI*2,0,Math.PI/2), accentMat(color,0.4));
      dome.position.y = 0.15; dome.castShadow = true; g.add(dome);
      for (let i=0;i<4;i++) {
        const a = (i/4)*Math.PI*2;
        const h = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.08,0.5,16,1,true), steelMat());
        h.rotation.z = Math.PI/2; h.rotation.y = a;
        h.position.set(Math.cos(a)*0.55,0.15,Math.sin(a)*0.55); g.add(h);
        const spk = new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,0.1,12), darkMat());
        spk.rotation.z = Math.PI/2; spk.rotation.y = a;
        spk.position.set(Math.cos(a)*0.3,0.15,Math.sin(a)*0.3); g.add(spk);
      }
      const finial = new THREE.Mesh(new THREE.ConeGeometry(0.15,0.5,12), metalMat());
      finial.position.y = 1.0; g.add(finial);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.1,12,12), accentMat(color,1.5));
      orb.position.y = 0.85; g.add(orb);
      break;
    }
    case 'stadium_col': {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.15,6.0,12), metalMat());
      pole.position.y = -3.0; g.add(pole);
      const housing = new THREE.Mesh(new THREE.BoxGeometry(0.35,2.0,0.4), bodyMat());
      housing.position.y = 0.5; housing.castShadow = true; g.add(housing);
      for (let i=0;i<6;i++) {
        const d = new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,0.02,16), darkMat());
        d.rotation.z = Math.PI/2; d.position.set(0.19,-0.4+i*0.35,0); g.add(d);
      }
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.04,0.42), accentMat(color,1));
      trim.position.y = 1.5; g.add(trim);
      break;
    }
    case 'bollard': {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.22,0.95,16), bodyMat());
      post.position.y = 0.475; post.castShadow = true; g.add(post);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.19,0.19,0.05,16), grayMat());
      cap.position.y = 0.98; g.add(cap);
      for (let i=0;i<8;i++) {
        const a = (i/8)*Math.PI*2;
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.015,0.3,0.02), darkMat());
        s.position.set(Math.cos(a)*0.18,0.5,Math.sin(a)*0.18); s.rotation.y = a; g.add(s);
      }
      const led = new THREE.Mesh(new THREE.RingGeometry(0.18,0.2,24), accentMat(color,1.5));
      led.rotation.x = -Math.PI/2; led.position.y = 0.96; g.add(led);
      break;
    }
    case 'rock': {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32),
        new THREE.MeshStandardMaterial({color:0x5a5248, roughness:0.95, metalness:0.05}));
      rock.scale.set(1,0.75,1.1); rock.position.y = 0.2; rock.castShadow = true; g.add(rock);
      const gr = new THREE.Mesh(new THREE.CircleGeometry(0.16,16), darkMat());
      gr.rotation.x = -Math.PI/2; gr.position.y = 0.42; g.add(gr);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.16,0.19,24), accentMat(color,0.6));
      ring.rotation.x = -Math.PI/2; ring.position.y = 0.43; g.add(ring);
      break;
    }
    case 'garden': {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.3,0.7,20),
        new THREE.MeshStandardMaterial({color:0x3d5c3d, roughness:0.9, metalness:0.05}));
      cone.position.y = 0.35; cone.castShadow = true; g.add(cone);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.18,0.1,12), grayMat());
      base.position.y = 0.05; g.add(base);
      const gr = new THREE.Mesh(new THREE.CircleGeometry(0.12,16), darkMat());
      gr.rotation.x = -Math.PI/2; gr.position.y = 0.71; g.add(gr);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.12,0.15,20), accentMat(color,0.6));
      ring.rotation.x = -Math.PI/2; ring.position.y = 0.72; g.add(ring);
      break;
    }
    case 'siren': {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.4,0.5), bodyMat());
      base.castShadow = true; g.add(base);
      for (let i=0;i<4;i++) {
        const a = (i/4)*Math.PI*2;
        const h = new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.1,0.35,16,1,true),
          new THREE.MeshStandardMaterial({color:0x8b1a1a, roughness:0.6, metalness:0.5, side:THREE.DoubleSide}));
        h.rotation.z = Math.PI/2; h.rotation.y = a;
        h.position.set(Math.cos(a)*0.35,0,Math.sin(a)*0.35); g.add(h);
      }
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.15,12,12), accentMat(0xff2222,3));
      light.position.y = 0.35; g.add(light);
      break;
    }
    case 'pole_spk': {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.1,5.0,12), metalMat());
      pole.position.y = -2.5; g.add(pole);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.45,0.15,16), grayMat());
      base.position.y = -5.0; g.add(base);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.6,0.4), bodyMat());
      head.position.y = 0.3; head.castShadow = true; g.add(head);
      const gr = new THREE.Mesh(new THREE.PlaneGeometry(0.42,0.5), darkMat());
      gr.position.set(0,0.3,0.21); g.add(gr);
      const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.08,0.3,16,1,true), steelMat());
      horn.rotation.x = Math.PI/2; horn.position.set(0,0.7,0.15); g.add(horn);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.52,0.03,0.42), accentMat(color,1));
      trim.position.y = 0.6; g.add(trim);
      break;
    }
    case 'goose': {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.13,0.03,16), grayMat());
      base.position.y = 0.015; g.add(base);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,0.85,8), grayMat());
      pole.position.y = 0.45; g.add(pole);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.08,14,12), accentMat(color,1.2));
      head.position.y = 0.92; g.add(head);
      break;
    }
    case 'handheld': {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,0.24,16), bodyMat());
      b.rotation.z = Math.PI/2; b.position.y = 0.5; g.add(b);
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.06,16,12,0,Math.PI*2,0,Math.PI/2), accentMat(color));
      h.rotation.z = -Math.PI/2; h.position.set(0.14,0.5,0); g.add(h);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.06,0.5,8), grayMat());
      st.position.y = 0.25; g.add(st);
      break;
    }
    case 'lavalier': {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.07,16,12), accentMat(color,1));
      b.position.y = 0.7; g.add(b);
      const clip = new THREE.Mesh(new THREE.TorusGeometry(0.1,0.012,8,16), grayMat());
      clip.rotation.x = Math.PI/2; clip.position.y = 0.6; g.add(clip);
      break;
    }
    case 'shotgun': {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,0.7,16), bodyMat());
      t.rotation.z = Math.PI/2; t.position.y = 0.5; g.add(t);
      for (let i=0;i<6;i++) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.01,0.1,0.1), accentMat(color,0.6));
        s.position.set(-0.15+i*0.055,0.5,0); g.add(s);
      }
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.05,0.5,8), grayMat());
      st.position.y = 0.25; g.add(st);
      break;
    }
    case 'boundary': {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.02,24), accentMat(color,0.9));
      p.position.y = 0.7; g.add(p);
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.055,16,12), bodyMat());
      c.position.y = 0.74; g.add(c);
      break;
    }
    case 'm_array': {
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.4,0.045,32), bodyMat());
      d.castShadow = true; g.add(d);
      for (let i=0;i<6;i++) {
        const a = (i/6)*Math.PI*2;
        const dd = new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,0.025,12), accentMat(color,1.4));
        dd.position.set(Math.cos(a)*0.25,-0.035,Math.sin(a)*0.25); g.add(dd);
      }
      break;
    }
    case 'rack': {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.5,0.5), bodyMat());
      b.castShadow = true; g.add(b);
      for (let i=0;i<4;i++) {
        const l = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.025,0.01), accentMat(color,1));
        l.position.set(0,-0.15+i*0.1,0.256); g.add(l);
      }
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.03,10,10), accentMat(color,2.5));
      led.position.set(-0.28,0.2,0.26); g.add(led);
      const led2 = new THREE.Mesh(new THREE.SphereGeometry(0.025,10,10),
        new THREE.MeshStandardMaterial({color:0x4fe4b8, emissive:0x4fe4b8, emissiveIntensity:2}));
      led2.position.set(-0.22,0.2,0.26); g.add(led2);
      if (spec.id === 'dsp' || spec.id === 'matrix') {
        const s = new THREE.Mesh(new THREE.PlaneGeometry(0.3,0.18),
          new THREE.MeshBasicMaterial({color, transparent:true, opacity:0.85}));
        s.position.set(0.15,0.1,0.256); g.add(s);
      }
      break;
    }
    case 'pc': {
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.28,0.7,0.5), bodyMat());
      t.position.y = 0.35; t.castShadow = true; g.add(t);
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.025,10,10), accentMat(color,2.5));
      p.position.set(0,0.6,0.26); g.add(p);
      break;
    }
    case 'phone': {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.16,0.02,0.3), bodyMat());
      b.position.y = 0.6; g.add(b);
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.13,0.25),
        new THREE.MeshBasicMaterial({color, transparent:true, opacity:0.9}));
      s.rotation.x = -Math.PI/2; s.position.y = 0.611; g.add(s);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.06,0.55,8), grayMat());
      st.position.y = 0.28; g.add(st);
      break;
    }
    case 'player': {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.08,0.4), bodyMat());
      b.position.y = 0.5; b.castShadow = true; g.add(b);
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.028,10,10), accentMat(color,2.5));
      l.position.set(-0.18,0.545,0.13); g.add(l);
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.4,0.45), grayMat());
      st.position.y = 0.2; g.add(st);
      break;
    }
    case 'mixer': {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.9,0.1,0.55), bodyMat());
      b.position.y = 0.5; b.castShadow = true; g.add(b);
      for (let i=0;i<8;i++) {
        const f = new THREE.Mesh(new THREE.BoxGeometry(0.025,0.05,0.025), accentMat(color,1));
        f.position.set(-0.36+i*0.1,0.575,0.14); g.add(f);
      }
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.95,0.45,0.55), grayMat());
      st.position.y = 0.225; g.add(st);
      break;
    }
    case 'stream': {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.38,0.24,0.28), bodyMat());
      b.position.y = 0.65; g.add(b);
      for (let i=0;i<3;i++) {
        const t = new THREE.Mesh(new THREE.TorusGeometry(0.07+i*0.045,0.008,8,20,Math.PI), accentMat(color,1.6));
        t.rotation.x = -Math.PI/2; t.position.y = 0.78; g.add(t);
      }
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.55,0.3), grayMat());
      st.position.y = 0.275; g.add(st);
      break;
    }
    case 'ctrl_knob': {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.4,0.05), bodyMat());
      p.position.y = 0.6; g.add(p);
      const k = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.05,16), accentMat(color,1.2));
      k.rotation.x = Math.PI/2; k.position.set(0,0.6,0.05); g.add(k);
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.35,0.4,0.08), grayMat());
      st.position.y = 0.2; g.add(st);
      break;
    }
    case 'ctrl_touch': {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.7,0.5,0.06), bodyMat());
      p.position.y = 0.6; g.add(p);
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.6,0.4),
        new THREE.MeshBasicMaterial({color, transparent:true, opacity:0.9}));
      s.position.set(0,0.6,0.04); g.add(s);
      break;
    }
    case 'ctrl_paging': {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.5,0.05), bodyMat());
      p.position.y = 0.7; g.add(p);
      const gr = new THREE.Mesh(new THREE.CircleGeometry(0.12,20), darkMat());
      gr.position.set(0,0.8,0.04); g.add(gr);
      const b = new THREE.Mesh(new THREE.CircleGeometry(0.08,20), accentMat(color,1.5));
      b.position.set(0,0.55,0.04); g.add(b);
      break;
    }
    case 'ctrl_emg': {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.35,0.06), bodyMat());
      p.position.y = 0.6; g.add(p);
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.11,0.07,20),
        new THREE.MeshStandardMaterial({color:0xff2222, emissive:0xff2222, emissiveIntensity:1.5}));
      b.rotation.x = Math.PI/2; b.position.set(0,0.6,0.05); g.add(b);
      break;
    }
    case 'tv': {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.2,0.7,0.06), bodyMat());
      p.position.y = 1.2; g.add(p);
      const s = new THREE.Mesh(new THREE.PlaneGeometry(1.1,0.6),
        new THREE.MeshBasicMaterial({color:0x0a0a12, transparent:true, opacity:0.9}));
      s.position.set(0,1.2,0.04); g.add(s);
      const c = new THREE.Mesh(new THREE.PlaneGeometry(1.0,0.5),
        new THREE.MeshBasicMaterial({color, transparent:true, opacity:0.35}));
      c.position.set(0,1.2,0.041); g.add(c);
      break;
    }
    case 'projector': {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.2,0.35), bodyMat());
      b.position.y = 3.2; b.castShadow = true; g.add(b);
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.06,16), accentMat(color,1.5));
      l.rotation.x = Math.PI/2; l.position.set(0.14,3.2,0.2); g.add(l);
      break;
    }
    case 'led_wall': {
      const p = new THREE.Mesh(new THREE.BoxGeometry(3.5,2.0,0.15), bodyMat());
      p.position.y = 1.0; p.castShadow = true; g.add(p);
      const s = new THREE.Mesh(new THREE.PlaneGeometry(3.4,1.9),
        new THREE.MeshBasicMaterial({color, transparent:true, opacity:0.55}));
      s.position.set(0,1.0,0.08); g.add(s);
      break;
    }
    case 'rack_box': {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.6,1.2,0.5), bodyMat());
      b.position.y = 0.6; b.castShadow = true; g.add(b);
      for (let i=0;i<5;i++) {
        const l = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.015,0.01), grayMat());
        l.position.set(0,0.15+i*0.22,0.256); g.add(l);
      }
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.02,8,8), accentMat(color,2.5));
      led.position.set(-0.22,0.22,0.256); g.add(led);
      break;
    }
    case 'conn_box': {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.4,0.15), bodyMat());
      b.position.y = 1.5; g.add(b);
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.022,8,8),
        new THREE.MeshStandardMaterial({color:0x4fe4b8, emissive:0x4fe4b8, emissiveIntensity:2}));
      led.position.set(0.13,1.63,0.08); g.add(led);
      break;
    }
    case 'antenna': {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.15,12), bodyMat());
      base.position.y = 3.6; g.add(base);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.018,0.7,8), accentMat(color,1.1));
      rod.position.y = 4.0; g.add(rod);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.03,10,10), accentMat(color,2));
      tip.position.y = 4.4; g.add(tip);
      break;
    }
    case 'camera': {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.18,20,12,0,Math.PI*2,0,Math.PI/2), bodyMat());
      d.position.y = 3.5; g.add(d);
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.055,12,8), accentMat(color,2));
      l.position.y = 3.4; g.add(l);
      break;
    }
    default: {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,0.3), bodyMat());
      b.castShadow = true; g.add(b);
    }
  }

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.55,0.6,32),
    new THREE.MeshBasicMaterial({color:0xffc94d, transparent:true, opacity:0, side:THREE.DoubleSide, depthWrite:false})
  );
  ring.rotation.x = -Math.PI/2; ring.position.y = 0.02; ring.name = 'selRing';
  g.add(ring);
  return g;
}

/* ============ CLEAR GROUP ============ */
function clearGroup(g) {
  while (g.children.length) {
    const c = g.children[0]; g.remove(c);
    c.traverse?.(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
        else o.material.dispose();
      }
    });
  }
}

/* ============ BUILD ROOM ============ */
function buildRoom() {
  clearGroup(roomGrp);
  const room = ROOMS[state.room];
  if (!room) return;
  const H = room.size[0] > 40 ? 6 : 4.5;
  const T = 0.3;

  for (const wall of room.walls) {
    const [x1,z1,x2,z2] = wall;
    const dx = x2-x1, dz = z2-z1;
    const len = Math.hypot(dx,dz);
    const ang = Math.atan2(dz,dx);
    const wallMesh = new THREE.Mesh(
      new THREE.BoxGeometry(len,H,T),
      new THREE.MeshStandardMaterial({color:0xe8eaf2, roughness:0.85, metalness:0.02})
    );
    wallMesh.position.set((x1+x2)/2, H/2, (z1+z2)/2);
    wallMesh.rotation.y = -ang;
    wallMesh.castShadow = true; wallMesh.receiveShadow = true;
    roomGrp.add(wallMesh);
  }

  for (const f of room.features || []) {
    if (f.type === 'mihrab') {
      const n = new THREE.Mesh(new THREE.BoxGeometry(f.w,2.8,f.d),
        new THREE.MeshStandardMaterial({color:0x9b7bff, roughness:0.5, metalness:0.3, emissive:0x9b7bff, emissiveIntensity:0.1}));
      n.position.set(f.x,1.4,f.z+0.5); n.castShadow = true; roomGrp.add(n);
    }
    if (f.type === 'altar') {
      const a = new THREE.Mesh(new THREE.BoxGeometry(f.w,0.9,f.d),
        new THREE.MeshStandardMaterial({color:0x6b4423, roughness:0.6, metalness:0.2}));
      a.position.set(f.x,0.45,f.z+0.5); a.castShadow = true; roomGrp.add(a);
    }
    if (f.type === 'stage') {
      const s = new THREE.Mesh(new THREE.BoxGeometry(f.w,0.4,f.d),
        new THREE.MeshStandardMaterial({color:0x1a1f2e, roughness:0.8, metalness:0.1}));
      s.position.set(f.x,0.2,f.z); s.receiveShadow = true; s.castShadow = true; roomGrp.add(s);
    }
    if (f.type === 'screen') {
      const s = new THREE.Mesh(new THREE.BoxGeometry(f.w,2.4,f.d),
        new THREE.MeshStandardMaterial({color:0xf0f0f0, roughness:0.9, metalness:0.05, emissive:0xffffff, emissiveIntensity:0.15}));
      s.position.set(f.x,1.2,f.z); roomGrp.add(s);
    }
    if (f.type === 'board') {
      const s = new THREE.Mesh(new THREE.BoxGeometry(f.w,1.2,Math.max(f.d,0.1)),
        new THREE.MeshStandardMaterial({color:0x1f2a1f, roughness:0.95}));
      s.position.set(f.x,1.4,f.z); roomGrp.add(s);
    }
    if (f.type === 'tower') {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(f.w*0.5,f.w*0.6,14,8),
        new THREE.MeshStandardMaterial({color:0xE8E0D0, roughness:0.75, metalness:0.05}));
      tower.position.set(f.x,7,f.z); tower.castShadow = true; tower.receiveShadow = true; roomGrp.add(tower);
    }
    if (f.type === 'fountain') {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(f.w/2,f.w/2,0.4,24),
        new THREE.MeshStandardMaterial({color:0xE8EAF2, roughness:0.6, metalness:0.1}));
      base.position.set(f.x,0.2,f.z); base.receiveShadow = true; roomGrp.add(base);
    }
    if (f.type === 'pool') {
      const pool = new THREE.Mesh(new THREE.BoxGeometry(f.w,0.15,f.d),
        new THREE.MeshStandardMaterial({color:0x4DE5FF, roughness:0.1, metalness:0.4, transparent:true, opacity:0.65}));
      pool.position.set(f.x,0.05,f.z); pool.receiveShadow = true; roomGrp.add(pool);
    }
    if (f.type === 'field') {
      const field = new THREE.Mesh(new THREE.BoxGeometry(f.w,0.02,f.d),
        new THREE.MeshStandardMaterial({color:0x2D5A3D, roughness:0.95}));
      field.position.set(f.x,0.012,f.z); field.receiveShadow = true; roomGrp.add(field);
    }
    if (f.type === 'sand') {
      const sand = new THREE.Mesh(new THREE.BoxGeometry(f.w,0.02,f.d),
        new THREE.MeshStandardMaterial({color:0xC2A76B, roughness:1.0}));
      sand.position.set(f.x,0.014,f.z); sand.receiveShadow = true; roomGrp.add(sand);
    }
    if (f.type === 'water') {
      const w = new THREE.Mesh(new THREE.BoxGeometry(f.w,0.02,f.d),
        new THREE.MeshStandardMaterial({color:0x1E6FA8, roughness:0.15, metalness:0.5, transparent:true, opacity:0.8}));
      w.position.set(f.x,0.016,f.z); w.receiveShadow = true; roomGrp.add(w);
    }
    if (f.type === 'net') {
      const n = new THREE.Mesh(new THREE.BoxGeometry(f.w,0.9,Math.max(f.d,0.06)),
        new THREE.MeshStandardMaterial({color:0xDDDDDD, roughness:0.8}));
      n.position.set(f.x,0.45,f.z); roomGrp.add(n);
    }
    if (f.type === 'ring') {
      const r = new THREE.Mesh(new THREE.RingGeometry(f.w/2-0.5, f.w/2, 40),
        new THREE.MeshStandardMaterial({color:0x8a8a8a, roughness:0.8, side:THREE.DoubleSide}));
      r.rotation.x = -Math.PI/2; r.position.set(f.x,0.02,f.z); roomGrp.add(r);
    }
    if (f.type === 'platform') {
      const p = new THREE.Mesh(new THREE.BoxGeometry(f.w,0.25,f.d),
        new THREE.MeshStandardMaterial({color:0x9aa0b0, roughness:0.85}));
      p.position.set(f.x,0.125,f.z); p.receiveShadow = true; roomGrp.add(p);
    }
    if (f.type === 'track') {
      const t = new THREE.Mesh(new THREE.BoxGeometry(f.w,0.02,f.d),
        new THREE.MeshStandardMaterial({color:0x2b2b2b, roughness:0.9}));
      t.position.set(f.x,0.018,f.z); t.receiveShadow = true; roomGrp.add(t);
    }
    if (f.type === 'hole') {
      const h = new THREE.Mesh(new THREE.CircleGeometry(f.w/2,20),
        new THREE.MeshStandardMaterial({color:0x111111, roughness:1.0}));
      h.rotation.x = -Math.PI/2; h.position.set(f.x,0.03,f.z); roomGrp.add(h);
    }
    if (f.type === 'gate') {
      const g2 = new THREE.Mesh(new THREE.BoxGeometry(f.w,2.2,0.15),
        new THREE.MeshStandardMaterial({color:0x2a3555, roughness:0.7, metalness:0.3}));
      g2.position.set(f.x,1.1,f.z); roomGrp.add(g2);
    }
  }
}

/* ============ BUILD DEVICES ============ */
const meshById = new Map();

function buildDevices() {
  clearGroup(devGrp);
  meshById.clear();
  for (const d of state.devices) {
    const spec = getSpec(d.cat, d.typeId);
    if (!spec) continue;
    const color = BRANDS[d.brand] ? BRANDS[d.brand].color : 0x4de5ff;
    const mesh = makeMesh(d.cat, d.typeId, color);
    if (!mesh) continue;
    mesh.position.set(d.x, spec.h, d.z);
    mesh.rotation.y = d.rot || 0;
    mesh.userData.devId = d.id;
    mesh.userData.dev = d;
    mesh.userData.spec = spec;
    devGrp.add(mesh);
    meshById.set(d.id, mesh);
  }
  updateSelectionVisuals();
}

function updateSelectionVisuals() {
  devGrp.children.forEach(m => {
    const r = m.getObjectByName('selRing');
    if (r) r.material.opacity = (state.selected === m.userData.devId) ? 0.9 : 0;
  });
}

/* ============ HEATMAP ============ */
let heatMesh = null;
function disposeHeat() {
  if (heatMesh) {
    heatGrp.remove(heatMesh);
    heatMesh.geometry.dispose();
    heatMesh.material.dispose();
    heatMesh = null;
  }
}
function buildHeatmap() {
  disposeHeat();
  if (!state.showHeat) return;
  const speakers = state.devices.filter(d => d.cat === 'speakers' || d.cat === 'outdoor');
  if (!speakers.length) {
    document.getElementById('hudSpl').textContent = '—';
    document.getElementById('hudCoverage').textContent = '0%';
    return;
  }
  const room = ROOMS[state.room];
  const SIZE = Math.max(room.size[0], room.size[1]) * 1.2;
  const RES = 56;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, RES, RES);
  geo.rotateX(-Math.PI/2);
  const colors = new Float32Array(geo.attributes.position.count * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  heatMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.65,
    depthWrite: false, side: THREE.DoubleSide
  }));
  heatMesh.position.y = 0.03;
  heatMesh.renderOrder = 1;
  heatGrp.add(heatMesh);
  updateHeatColors();
}
function calcSPL(x, z) {
  let tot = 0;
  for (const spk of state.devices) {
    if (spk.cat !== 'speakers' && spk.cat !== 'outdoor') continue;
    const spec = getSpec(spk.cat, spk.typeId);
    if (!spec || !spec.power) continue;
    const power = spk.power || spec.power;
    const dx = x - spk.x, dz = z - spk.z;
    const dy = -spec.h;
    const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
    if (d < 0.3) continue;
    const s1m = 90 + 10 * Math.log10(Math.max(power,1));
    let dl = 0;
    if (spec.dir) {
      const facing = spk.rot || 0;
      const tl = Math.atan2(dx, dz);
      let a = Math.abs(facing - tl);
      if (a > Math.PI) a = 2*Math.PI - a;
      dl = -12 * (1 - Math.cos(a));
    }
    const dL = -20 * Math.log10(d);
    const v = s1m + dL + dl;
    if (v < -20) continue;
    tot += Math.pow(10, v/10);
  }
  return tot > 0 ? 10 * Math.log10(tot) : 0;
}
const SPL_STOPS = [
  [40,0.05,0.10,0.45],[52,0.00,0.30,0.80],[62,0.00,0.65,0.95],
  [70,0.00,0.90,0.90],[76,0.30,0.90,0.45],[82,0.85,0.90,0.25],
  [88,1.00,0.65,0.15],[94,1.00,0.25,0.10],[100,0.85,0.05,0.15]
];
function splRGB(v) {
  const S = SPL_STOPS, N = S.length;
  if (v <= S[0][0]) return [S[0][1], S[0][2], S[0][3]];
  if (v >= S[N-1][0]) return [S[N-1][1], S[N-1][2], S[N-1][3]];
  for (let i=0;i<N-1;i++) {
    const a=S[i], b=S[i+1];
    if (v>=a[0] && v<=b[0]) {
      const t = (v-a[0])/(b[0]-a[0]);
      return [a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t, a[3]+(b[3]-a[3])*t];
    }
  }
  return [1,1,1];
}
function updateHeatColors() {
  if (!heatMesh) return;
  const pos = heatMesh.geometry.attributes.position;
  const col = heatMesh.geometry.attributes.color;
  let mx = 0, coveredCount = 0;
  const totalPoints = pos.count;
  for (let i=0;i<totalPoints;i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const v = calcSPL(x, z);
    if (v > mx) mx = v;
    if (v >= 65) coveredCount++;
    const c = splRGB(v);
    col.setXYZ(i, c[0], c[1], c[2]);
  }
  col.needsUpdate = true;
  document.getElementById('hudSpl').textContent = mx > 0 ? mx.toFixed(0) + ' dB' : '—';
  const covPct = totalPoints > 0 ? Math.round((coveredCount/totalPoints)*100) : 0;
  document.getElementById('hudCoverage').textContent = covPct + '%';
}

/* ============ HISTORY ============ */
function serializeDevices() {
  return JSON.stringify(state.devices.map(d => ({
    id:d.id, brand:d.brand, cat:d.cat, typeId:d.typeId,
    x:d.x, z:d.z, rot:d.rot, power:d.power
  })));
}
function pushHistory() {
  state.history = state.history.slice(0, state.historyIdx + 1);
  state.history.push(serializeDevices());
  state.historyIdx = state.history.length - 1;
}
function applyHistoryData(json) {
  state.devices = JSON.parse(json);
  state.nextId = state.devices.length ? Math.max(...state.devices.map(d => d.id)) + 1 : 1;
  buildDevices(); buildHeatmap(); updateHUD(); deselect();
}
function undo() {
  if (state.historyIdx > 0) {
    state.historyIdx--;
    applyHistoryData(state.history[state.historyIdx]);
    toast('↩️ تراجع');
  }
}
function redo() {
  if (state.historyIdx < state.history.length - 1) {
    state.historyIdx++;
    applyHistoryData(state.history[state.historyIdx]);
    toast('🔁 تقدم');
  }
}

/* ============ CAMERA ============ */
function updateCamera() {
  const {theta, phi, radius, target} = state.cam;
  const x = target.x + radius * Math.sin(phi) * Math.sin(theta);
  const y = target.y + radius * Math.cos(phi);
  const z = target.z + radius * Math.sin(phi) * Math.cos(theta);
  camera.position.set(x, Math.max(y,0.5), z);
  camera.lookAt(target);
}
function tweenCamera(to, dur) {
  const from = {
    theta: state.cam.theta, phi: state.cam.phi,
    radius: state.cam.radius, target: state.cam.target.clone()
  };
  state.cam.tween = {from, to, dur, start: performance.now()};
}
function updateTween() {
  const t = state.cam.tween;
  if (!t) return;
  const p = Math.min(1, (performance.now() - t.start) / t.dur);
  const e = p < 0.5 ? 4*p*p*p : 1 - Math.pow(-2*p+2,3)/2;
  state.cam.theta = t.from.theta + (t.to.theta - t.from.theta) * e;
  state.cam.phi = t.from.phi + (t.to.phi - t.from.phi) * e;
  state.cam.radius = t.from.radius + (t.to.radius - t.from.radius) * e;
  state.cam.target.lerpVectors(t.from.target, t.to.target, e);
  updateCamera();
  if (p >= 1) state.cam.tween = null;
}
function setView3D(on) {
  state.view3D = on;
  const btn = document.getElementById('viewBtn');
  btn.textContent = on ? '✏️ 2D' : '🎬 3D';
  btn.classList.toggle('on', !on);
  const room = ROOMS[state.room];
  const r = Math.max(room.size[0], room.size[1]) * 1.4;
  if (on) tweenCamera({theta:-0.6, phi:0.9, radius:r, target:new THREE.Vector3(0,2,0)}, 900);
  else tweenCamera({theta:0, phi:0.02, radius:r, target:new THREE.Vector3(0,0,0)}, 900);
}
function fitView() {
  const room = ROOMS[state.room];
  const r = Math.max(room.size[0], room.size[1]) * 1.4;
  if (state.view3D) tweenCamera({theta:-0.6, phi:0.9, radius:r, target:new THREE.Vector3(0,2,0)}, 700);
  else tweenCamera({theta:0, phi:0.02, radius:r, target:new THREE.Vector3(0,0,0)}, 700);
}

/* ============ INTERACTION ============ */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const activePointers = new Map();
let isDown = false, moved = false, dragDev = null;
let dragOff = {x:0, z:0};
let startPt = {x:0, y:0};
let pinchStart = null;

function canvasPos(cx, cy) {
  const r = canvas.getBoundingClientRect();
  pointer.x = ((cx - r.left) / r.width) * 2 - 1;
  pointer.y = -((cy - r.top) / r.height) * 2 + 1;
}
function hitDevice(cx, cy) {
  canvasPos(cx, cy);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(devGrp.children, true);
  for (const h of hits) {
    let o = h.object;
    while (o && o.userData.devId === undefined) o = o.parent;
    if (o) return o;
  }
  return null;
}
const floorPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
function floorPoint(cx, cy) {
  canvasPos(cx, cy);
  raycaster.setFromCamera(pointer, camera);
  const p = new THREE.Vector3();
  return raycaster.ray.intersectPlane(floorPlane, p) ? p : null;
}

canvas.addEventListener('pointerdown', e => {
  activePointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
  if (activePointers.size === 1) {
    startPt = {x:e.clientX, y:e.clientY};
    isDown = true; moved = false; dragDev = null;
    const hit = hitDevice(e.clientX, e.clientY);
    if (hit) {
      dragDev = hit;
      const fp = floorPoint(e.clientX, e.clientY);
      if (fp) {
        dragOff.x = hit.userData.dev.x - fp.x;
        dragOff.z = hit.userData.dev.z - fp.z;
      }
    }
  } else if (activePointers.size === 2) {
    dragDev = null; isDown = false; moved = true;
    const pts = [...activePointers.values()];
    pinchStart = {
      dist: Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y) || 1,
      radius: state.cam.radius
    };
  }
}, {passive:true});

canvas.addEventListener('pointermove', e => {
  if (!activePointers.has(e.pointerId)) return;
  const prev = activePointers.get(e.pointerId);
  activePointers.set(e.pointerId, {x:e.clientX, y:e.clientY});

  if (activePointers.size === 2 && pinchStart) {
    const pts = [...activePointers.values()];
    const d = Math.hypot(pts[0].x-pts[1].x, pts[0].y-pts[1].y) || 1;
    state.cam.radius = Math.max(3, Math.min(260, pinchStart.radius * (pinchStart.dist/d)));
    state.cam.tween = null;
    updateCamera();
    return;
  }
  if (!isDown) return;
  const dx = e.clientX - prev.x;
  const dy = e.clientY - prev.y;
  if (Math.abs(e.clientX-startPt.x) + Math.abs(e.clientY-startPt.y) > 6) moved = true;

  if (dragDev && moved) {
    const fp = floorPoint(e.clientX, e.clientY);
    if (fp) {
      const d = dragDev.userData.dev;
      d.x = Math.round((fp.x + dragOff.x)*10)/10;
      d.z = Math.round((fp.z + dragOff.z)*10)/10;
      dragDev.position.set(d.x, dragDev.userData.spec.h, d.z);
      if (state.showHeat) updateHeatColors();
      updateInfo();
    }
  } else if (!dragDev && moved && !state.presentation) {
    if (state.view3D) {
      state.cam.tween = null;
      state.cam.theta -= dx * 0.008;
      state.cam.phi = Math.max(0.12, Math.min(1.52, state.cam.phi + dy * 0.008));
      updateCamera();
    } else {
      state.cam.tween = null;
      const ps = state.cam.radius * 0.0018;
      state.cam.target.x -= (dx*Math.cos(state.cam.theta) - dy*Math.sin(state.cam.theta)) * ps;
      state.cam.target.z -= (dx*Math.sin(state.cam.theta) + dy*Math.cos(state.cam.theta)) * ps;
      updateCamera();
    }
  }
}, {passive:true});

function endPointer(e) {
  activePointers.delete(e.pointerId);
  if (activePointers.size === 0) {
    if (isDown && !moved && !state.presentation) {
      const hit = hitDevice(e.clientX, e.clientY);
      if (hit) select(hit.userData.devId);
      else if (state.selected !== null) deselect();
      else {
        const fp = floorPoint(e.clientX, e.clientY);
        if (fp) { placeDevice(fp.x, fp.z); pushHistory(); }
      }
    }
    isDown = false; dragDev = null; moved = false; pinchStart = null;
  } else {
    pinchStart = null; isDown = false; dragDev = null; moved = true;
  }
}
canvas.addEventListener('pointerup', endPointer, {passive:true});
canvas.addEventListener('pointercancel', endPointer, {passive:true});

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  state.cam.tween = null;
  const factor = e.deltaY > 0 ? 1.1 : 0.9;
  state.cam.radius = Math.max(3, Math.min(260, state.cam.radius * factor));
  updateCamera();
}, {passive:false});

/* ============ ACTIONS ============ */
function placeDevice(x, z) {
  const spec = getSpec(state.curCat, state.curType);
  if (!spec) return;
  const d = {
    id: state.nextId++, brand: state.curBrand, cat: state.curCat, typeId: state.curType,
    x: Math.round(x*10)/10, z: Math.round(z*10)/10, rot: 0, power: spec.power
  };
  state.devices.push(d);
  buildDevices();
  if (state.showHeat) buildHeatmap();
  updateHUD();
  toast(spec.emoji + ' ' + spec.name);
}
function select(id) {
  state.selected = id;
  updateSelectionVisuals();
  updateInfo();
  document.getElementById('info').classList.add('on');
}
function deselect() {
  state.selected = null;
  updateSelectionVisuals();
  document.getElementById('info').classList.remove('on');
}
function deleteSelected() {
  if (state.selected === null) return;
  state.devices = state.devices.filter(d => d.id !== state.selected);
  state.selected = null;
  document.getElementById('info').classList.remove('on');
  buildDevices(); buildHeatmap(); updateHUD(); pushHistory();
  toast('🗑️ حُذف');
}
function updateInfo() {
  if (state.selected === null) return;
  const d = state.devices.find(x => x.id === state.selected);
  if (!d) return;
  const spec = getSpec(d.cat, d.typeId);
  if (!spec) return;
  const brand = BRANDS[d.brand];
  document.getElementById('infName').textContent = spec.emoji + ' ' + spec.name;
  document.getElementById('infBrand').textContent = brand ? brand.tag : '—';
  document.getElementById('infType').textContent = CATS[d.cat].name;
  document.getElementById('infPower').textContent = spec.power > 0 ? (d.power || spec.power) + ' W' : '—';
  document.getElementById('infH').textContent = spec.h.toFixed(1) + ' م';
  document.getElementById('infPos').textContent = d.x.toFixed(1) + ', ' + d.z.toFixed(1);
  const pw = document.getElementById('powerSlider');
  pw.value = d.power || spec.power;
  document.getElementById('powerVal').textContent = (d.power || spec.power) + 'W';
  document.getElementById('powerWrap').style.display = spec.power > 0 ? 'flex' : 'none';
  const rs = document.getElementById('rotSlider');
  const deg = Math.round((d.rot||0) * 180 / Math.PI);
  rs.value = deg;
  document.getElementById('rotVal').textContent = deg + '°';
  document.getElementById('rotWrap').style.display = spec.dir ? 'flex' : 'none';
  const room = ROOMS[state.room];
  document.getElementById('roomWInput').value = room.size[0];
  document.getElementById('roomDInput').value = room.size[1];
}

/* ============ UI BUILDERS ============ */
function buildCats() {
  const el = document.getElementById('cats'); el.innerHTML = '';
  for (const key in CATS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cat' + (key === state.curCat ? ' on' : '');
    b.dataset.cat = key;
    b.textContent = CATS[key].emoji + ' ' + CATS[key].name;
    b.onclick = () => selectCat(key);
    el.appendChild(b);
  }
}
function buildBrands() {
  const el = document.getElementById('brands'); el.innerHTML = '';
  for (const key in BRANDS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'brand' + (key === state.curBrand ? ' on' : '');
    b.dataset.brand = key;
    b.textContent = BRANDS[key].name;
    b.onclick = () => selectBrand(key);
    el.appendChild(b);
  }
}
function buildTypes() {
  const el = document.getElementById('types'); el.innerHTML = '';
  for (const d of CATS[state.curCat].devices) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'type' + (d[0] === state.curType ? ' on' : '');
    b.dataset.typeId = d[0];
    b.innerHTML = '<span class="em">' + d[2] + '</span><span class="nm">' + d[1] + '</span>';
    b.onclick = () => selectType(d[0]);
    el.appendChild(b);
  }
}
function selectCat(key) {
  state.curCat = key;
  state.curType = CATS[key].devices[0][0];
  document.querySelectorAll('.cat').forEach(b => b.classList.toggle('on', b.dataset.cat === key));
  document.getElementById('brands').style.display =
    (key === 'speakers' || key === 'outdoor') ? 'flex' : 'none';
  buildTypes();
}
function selectBrand(key) {
  state.curBrand = key;
  document.querySelectorAll('.brand').forEach(b => b.classList.toggle('on', b.dataset.brand === key));
}
function selectType(id) {
  state.curType = id;
  document.querySelectorAll('.type').forEach(b => b.classList.toggle('on', b.dataset.typeId === id));
}
function buildRooms() {
  const sel = document.getElementById('roomSel'); sel.innerHTML = '';
  for (const key in ROOMS) {
    const o = document.createElement('option');
    o.value = key; o.textContent = ROOMS[key].name;
    if (key === state.room) o.selected = true;
    sel.appendChild(o);
  }
}
function updateHUD() {
  document.getElementById('hudCount').textContent = state.devices.length;
}
let toastTO;
function toast(m) {
  const el = document.getElementById('toast');
  el.textContent = m; el.classList.add('on');
  clearTimeout(toastTO);
  toastTO = setTimeout(() => el.classList.remove('on'), 1500);
}
function loadRoom(key) {
  state.room = key;
  const room = ROOMS[key];
  if (!room) return;
  state.devices = []; state.nextId = 1; state.selected = null;
  document.getElementById('info').classList.remove('on');
  for (const item of room.devices) {
    const [brand, cat, typeId, x, z, rot] = item;
    const spec = getSpec(cat, typeId);
    if (!spec) continue;
    state.devices.push({
      id: state.nextId++, brand, cat, typeId,
      x, z, rot: rot || 0, power: spec.power
    });
  }
  buildRoom(); buildDevices(); buildHeatmap(); updateHUD(); deselect(); fitView();
  state.history = [serializeDevices()];
  state.historyIdx = 0;
}

/* ============ REPORT ============ */
function generateReport() {
  const room = ROOMS[state.room];
  const totalPower = state.devices.reduce((acc,d) => {
    const s = getSpec(d.cat, d.typeId);
    return acc + (s && s.power ? (d.power || s.power) : 0);
  }, 0);
  const counts = {};
  state.devices.forEach(d => {
    const spec = getSpec(d.cat, d.typeId);
    if (!spec) return;
    const key = (BRANDS[d.brand]?.name || '—') + ' — ' + spec.name;
    counts[key] = (counts[key] || 0) + 1;
  });
  let rows = '';
  const entries = Object.entries(counts);
  if (entries.length) {
    for (const [name, qty] of entries) rows += `<tr><td>${name}</td><td>${qty}</td></tr>`;
  } else {
    rows = `<tr><td colspan="2" style="text-align:center">لا توجد أجهزة</td></tr>`;
  }
  document.getElementById('reportModalBody').innerHTML = `
    <div class="report-section">
      <h4>📌 معلومات البيئة</h4>
      <div class="row"><span>النوع:</span><span>${room.name}</span></div>
      <div class="row"><span>الأبعاد:</span><span>${room.size[0]}م × ${room.size[1]}م</span></div>
      <div class="row"><span>عدد الأجهزة:</span><span>${state.devices.length}</span></div>
      <div class="row"><span>القدرة الإجمالية:</span><span>${totalPower} Watt</span></div>
      <div class="row"><span>التاريخ:</span><span>${new Date().toLocaleString('ar-EG')}</span></div>
    </div>
    <div class="report-section">
      <h4>🔊 جدول المعدات</h4>
      <table class="akersreport-table">
        <thead><',
tr><th>المعدة</th><th>       العدد</th></tr type></thead>
        <tbody>${rows}</tbodyId>
      </table>
    </div>
    <div class="report-section">
:      <h4>📊 التحليل الصوتي</h4>
      <div class="row"><span>أقصى SPL:</span><span>${document.getElementById('hudSpl').textContent}</span></div>
      <div class="row"><span>التغطية:</span><span>${document.getElementById('hudCoverage').textContent}</span></div>
      <div class="row"><span>الحالة:</span><span style="color:#4fe4b8">ممتاز</span></div>
    </div>`;
  document.getElementById('reportModal').classList.add('on');
}

/* ============ UI EVENTS ============ */
document.getElementById('reportBtn').onclick = generateReport;
document.getElementById('closeModalBtn').onclick = () => document.getElementById('reportModal').classList.remove('on');
document.getElementById('closeModalBtn2').onclick = () => document.getElementById('reportModal').classList.remove('on');
document.getElementById('printReportBtn').onclick = () => window.print();

document.getElementById('saveBtn').onclick = () => {
  const data = JSON.stringify({
    app:'AURALIS', version:1, room:state.room,
    devices: state.devices.map(d => ({
      id:d.id, brand:d.brand, cat:d.cat, typeId:d.typeId,
      x:d.x, z:d.z, rot:d.rot, power:d.power
    }))
  }, null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'auralis-' + state.room + '-' + Date.now() + '.json';
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast('💾 تم الحفظ');
};
document.getElementById('loadBtn').onclick = () => document.getElementById('fileInput').click();
document.getElementById('fileInput').onchange = e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.room && ROOMS[data.room]) {
        state.room = data.room;
        document.getElementById('roomSel').value = data.room;
        buildRoom();
      }
      state.devices = (data.devices||[]).map(d => ({
        id:d.id,
        brand: BRANDS[d.brand] ? d.brand : 'motivity',
        cat: CATS[d.cat] ? d.cat : 'spe d.typeId,
        x:+d.x||0, z:+d.z||0, rot:+d.rot||0, power:+d.power||0
      })).filter(d => getSpec(d.cat, d.typeId));
      state.nextId = state.devices.length ? Math.max(...state.devices.map(d=>d.id))+1 : 1;
      buildDevices(); buildHeatmap(); updateHUD(); fitView();
      state.history = [serializeDevices()]; state.historyIdx = 0;
      toast('📂 تم التحميل');
    } catch(err) { alert('ملف غير صالح'); }
  };
  reader.readAsText(file);
  e.target.value = '';
};

document.getElementById('roomSel').addEventListener('change', e => loadRoom(e.target.value));
document.getElementById('viewBtn').onclick = () => setView3D(!state.view3D);
document.getElementById('shotBtn').onclick = () => {
  renderer.render(scene, camera);
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'auralis-' + state.room + '-' + Date.now() + '.png';
  document.body.appendChild(a); a.click(); a.remove();
  toast('📸 تم الحفظ');
};
document.getElementById('presBtn').onclick = togglePres;
document.getElementById('presToggle').onclick = togglePres;
document.getElementById('exitPres').onclick = togglePres;
function togglePres() {
  state.presentation = !state.presentation;
  document.getElementById('hd').classList.toggle('hide', state.presentation);
  document.getElementById('tools').classList.toggle('hide', state.presentation);
  document.getElementById('picker').classList.toggle('hide', state.presentation);
  document.getElementById('hud').style.opacity = state.presentation ? '0' : '1';
  document.getElementById('info').classList.remove('on');
  document.getElementById('exitPres').classList.toggle('on', state.presentation);
  toast(state.presentation ? '🎥 وضع العرض' : '✏️ وضع التحرير');
}
document.getElementById('heatBtn').onclick = function() {
  state.showHeat = !state.showHeat;
  this.classList.toggle('on', state.showHeat);
  buildHeatmap();
  toast(state.showHeat ? '🌡️ التغطية مفعّلة' : '🌡️ مغلقة');
};
document.getElementById('fitBtn').onclick = fitView;
document.getElementById('gridBtn').onclick = function() {
  state.showGrid = !state.showGrid;
  this.classList.toggle('on', state.showGrid);
  grid.visible = state.showGrid;
};
document.getElementById('clearBtn').onclick = () => {
  if (!confirm('حذف كل الأجهزة؟')) return;
  state.devices = []; state.selected = null;
  document.getElementById('info').classList.remove('on');
  buildDevices(); buildHeatmap(); updateHUD(); pushHistory();
  toast('🧹 تم التنظيف');
};
document.getElementById('delBtn').onclick = deleteSelected;
document.getElementById('powerSlider').oninput = e => {
  if (state.selected === null) return;
  const d = state.devices.find(x => x.id === state.selected);
  if (!d) return;
  d.power = parseInt(e.target.value,10) || 0;
  document.getElementById('powerVal').textContent = d.power + 'W';
  document.getElementById('infPower').textContent = d.power + ' W';
  if (state.showHeat) updateHeatColors();
};
document.getElementById('powerSlider').onchange = () => pushHistory();
document.getElementById('rotSlider').oninput = e => {
  if (state.selected === null) return;
  const d = state.devices.find(x => x.id === state.selected);
  if (!d) return;
  d.rot = parseInt(e.target.value,10) * Math.PI / 180;
  const m = meshById.get(d.id);
  if (m) m.rotation.y = d.rot;
  document.getElementById('rotVal').textContent = e.target.value + '°';
  if (state.showHeat) updateHeatColors();
};
document.getElementById('rotSlider').onchange = () => pushHistory();
document.getElementById('roomWInput').onchange = e => {
  const v = Math.max(4, Math.min(200, parseFloat(e.target.value) || 20));
  ROOMS[state.room].size[0] = v; e.target.value = v;
  buildRoom(); buildHeatmap();
};
document.getElementById('roomDInput').onchange = e => {
  const v = Math.max(4, Math.min(200, parseFloat(e.target.value) || 16));
  ROOMS[state.room].size[1] = v; e.target.value = v;
  buildRoom(); buildHeatmap();
};

document.addEventListener('keydown', e => {
  const tag = (e.target.tagName || '').toUpperCase();
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
  else if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
  else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); }
  else if (e.key === 'Escape') { deselect(); document.getElementById('reportModal').classList.remove('on'); }
  else if (e.key === 'Tab') { e.preventDefault(); setView3D(!state.view3D); }
});

/* ============ RESIZE ============ */
function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h, false);
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 250));

/* ============ LOOP & INIT ============ */
function animate() {
  requestAnimationFrame(animate);
  updateTween();
  const t = performance.now() * 0.003;
  devGrp.children.forEach(m => {
    const r = m.getObjectByName('selRing');
    if (r && r.material.opacity > 0) r.scale.setScalar(1 + Math.sin(t) * 0.08);
  });
  renderer.render(scene, camera);
}

function init() {
  buildRooms(); buildCats(); buildBrands(); buildTypes();
  document.getElementById('brands').style.display = 'flex';
  state.cam.radius = 30;
  state.cam.theta = -0.6;
  state.cam.phi = 0.9;
  state.cam.target.set(0, 1.5, 0);
  updateCamera();
  loadRoom(ROOM_ID);
  onResize();
  animate();
  document.title = 'AURALIS · ' + ROOMS[ROOM_ID].name;
  console.log('✅ AURALIS ready — room:', ROOM_ID);
}

init();
