// Exercise automatic rotation and lifecycle behavior without requiring a GPU in CI.
// The actual WebGL appearance and rotation are also checked in the browser.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script = fs.readFileSync(new URL('../assets/home-protein.js', import.meta.url), 'utf8');
const pdb = fs.readFileSync(new URL('../assets/home/1atp-kinase.pdb', import.meta.url), 'utf8');
const atoms = pdb.split('\n').filter(line => line.startsWith('ATOM'));
assert.equal(atoms.filter(line => line.slice(12, 16).trim() === 'CA').length, 356);
assert.deepEqual([...new Set(atoms.map(line => line[21]))].sort(), ['E','I']);
assert.equal(pdb.split('\n').filter(line => line.startsWith('HETATM') && line.slice(76,78).trim() === 'MN').length, 2);
assert.match(pdb, /^HELIX /m);
assert.match(pdb, /^SHEET /m);
assert.ok(pdb.includes("ATP"));
const points = pdb.split('\n').filter(line => /^(ATOM  |HETATM)/.test(line)).map(line => ({x:Number(line.slice(30,38)),y:Number(line.slice(38,46)),z:Number(line.slice(46,54)),atom:line.slice(12,16).trim()}));

async function setup({ networkFailure = false, gpuFailure = false } = {}) {
  const pending = new Map();
  let nextFrame = 0;
  let initialise;
  let intersection;
  const events = () => ({
    handlers: {},
    addEventListener(name, handler) { this.handlers[name] = handler; },
    setAttribute(name, value) { this[name] = value; }
  });
  const classes = new Set();
  const visual = { classList: { add: value => classes.add(value), remove: value => classes.delete(value) } };
  const canvas = events();
  const host = {
    clientWidth: 1000, clientHeight: 800,
    dataset: { modelSrc: '/assets/home/1atp-kinase.pdb' },
    closest: selector => selector === '.hero-visual' ? visual : {},
    querySelector: () => canvas
  };
  const document = {
    ...events(), hidden: false,
    querySelector: selector => selector === '#protein-view' ? host : null
  };
  const rotations = [];
  let view = [0,0,0,0,0,0,0,1];
  const viewer = {
    addModel: () => ({ selectedAtoms: sel => sel.atom ? points.filter(p => p.atom === sel.atom) : points }),
    getView: () => [...view], setView: value => { view = [...value]; }, setCameraParameters() {},
    setStyle() {}, zoomTo() { view[0] = -points.reduce((s,p)=>s+p.x,0)/points.length; view[1] = -points.reduce((s,p)=>s+p.y,0)/points.length; view[2] = -points.reduce((s,p)=>s+p.z,0)/points.length; }, resize() {},
    rotate: (degrees, axis) => rotations.push({ degrees, axis }),
    render() { if (gpuFailure) throw new Error('GPU unavailable'); }
  };
  class IntersectionObserver {
    constructor(callback) { intersection = callback; }
    observe() {}
  }
  const window = { ...events(), IntersectionObserver, requestIdleCallback() {}, $3Dmol: { createViewer: () => viewer } };
  vm.runInNewContext(script, {
    document, window, IntersectionObserver, AbortSignal,
    fetch: async () => ({ ok: !networkFailure, text: async () => pdb }),
    requestIdleCallback: callback => { initialise = callback; },
    requestAnimationFrame: callback => { pending.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: id => pending.delete(id)
  });
  await initialise();
  return {
    document, canvas, pending, classes, rotations, view: () => view,
    visible: value => intersection([{ isIntersecting: value }]),
    tick(time) { const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(callback => callback(time)); }
  };
}

const normal = await setup();
// Project every atom over a complete turn into the actual fitted orthographic view.
const fit = normal.view();
const halfWidth = (150 - fit[3]) * Math.tan(20 * Math.PI / 180);
const halfHeight = halfWidth / 1.25;
const n = normal.rotations[0].axis;
assert.ok(n.x > 0.9 && n.y > 0.3 && n.z > 0.15, 'Axis must be oblique');
assert.ok(Math.abs(Math.hypot(n.x,n.y,n.z)-1)<1e-9, 'Axis must be normalized');
for (let degrees = 0; degrees < 360; degrees++) {
  const angle = degrees * Math.PI / 180;
  for (const atom of points) {
    const x = atom.x + fit[0], y = atom.y + fit[1], z = atom.z + fit[2];
    const dot = x*n.x+y*n.y+z*n.z, c=Math.cos(angle), sin=Math.sin(angle);
    const rx = x*c+(n.y*z-n.z*y)*sin+n.x*dot*(1-c);
    const ry = y*c+(n.z*x-n.x*z)*sin+n.y*dot*(1-c);
    assert.ok(Math.abs(rx)+3 <= halfWidth*0.921, 'Oblique horizontal envelope must fit');
    assert.ok(Math.abs(ry)+3 <= halfHeight*0.921, 'Oblique vertical envelope must fit');
  }
}
const initialRotations = normal.rotations.length;
normal.tick(100);
for (let time = 140; time <= 60100; time += 40) normal.tick(time);
const turn = normal.rotations.slice(initialRotations).reduce((sum, item) => sum + item.degrees, 0);
assert.ok(Math.abs(turn - 360) < 0.001, 'One minute must produce one 360-degree turn');
normal.visible(false);
assert.equal(normal.pending.size, 0, 'Offscreen animation must stop');
normal.visible(true);
assert.equal(normal.pending.size, 1);
normal.document.hidden = true;
normal.document.handlers.visibilitychange();
assert.equal(normal.pending.size, 0, 'Background tabs must stop');
normal.document.hidden = false;
normal.document.handlers.visibilitychange();
assert.equal(normal.pending.size, 1);
normal.canvas.handlers.webglcontextlost();
assert.equal(normal.pending.size, 0);
assert.equal(normal.classes.has('protein-ready'), false);
for (const failure of [{ networkFailure: true }, { gpuFailure: true }]) {
  const failed = await setup(failure);
  assert.equal(failed.pending.size, 0);
  assert.equal(failed.classes.has('protein-ready'), false, 'A failed renderer must preserve the poster');
}
console.log('키나아제·알파나선·베타병풍·사선 360도 전체 경계·회전 시간·화면 밖/백그라운드·실패 시 정지 이미지 검사 통과');
