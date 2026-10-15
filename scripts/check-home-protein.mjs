// Exercise lifecycle and accessibility behavior without requiring a GPU in CI.
// The actual WebGL appearance and rotation are also checked in the browser.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script = fs.readFileSync(new URL('../assets/home-protein.js', import.meta.url), 'utf8');
const pdb = fs.readFileSync(new URL('../assets/home/1tim-chain-a.pdb', import.meta.url), 'utf8');
const atoms = pdb.split('\n').filter(line => line.startsWith('ATOM'));
assert.equal(atoms.filter(line => line.slice(12, 16).trim() === 'CA').length, 247);
assert.ok(atoms.every(line => line[21] === 'A'));
assert.match(pdb, /^HELIX /m);
assert.match(pdb, /^SHEET /m);

async function setup({ reduced = false, networkFailure = false, gpuFailure = false } = {}) {
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
  const button = { ...events(), hidden: true };
  const motion = { ...events(), matches: reduced };
  const host = {
    dataset: { modelSrc: '/assets/home/1tim-chain-a.pdb' },
    closest: selector => selector === '.hero-visual' ? visual : {},
    querySelector: () => canvas
  };
  const document = {
    ...events(), hidden: false,
    querySelector: selector => selector === '#protein-view' ? host : button
  };
  const rotations = [];
  const viewer = {
    addModel: () => ({ selectedAtoms: () => [{}] }),
    setStyle() {}, zoomTo() {}, zoom() {}, resize() {},
    rotate: (degrees, axis) => rotations.push({ degrees, axis }),
    render() { if (gpuFailure) throw new Error('GPU unavailable'); }
  };
  class IntersectionObserver {
    constructor(callback) { intersection = callback; }
    observe() {}
  }
  const window = { ...events(), IntersectionObserver, requestIdleCallback() {}, $3Dmol: { createViewer: () => viewer } };
  vm.runInNewContext(script, {
    document, window, matchMedia: () => motion, IntersectionObserver, AbortSignal,
    fetch: async () => ({ ok: !networkFailure, text: async () => pdb }),
    requestIdleCallback: callback => { initialise = callback; },
    requestAnimationFrame: callback => { pending.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: id => pending.delete(id)
  });
  await initialise();
  return {
    button, motion, document, canvas, pending, classes, rotations,
    visible: value => intersection([{ isIntersecting: value }]),
    tick(time) { const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(callback => callback(time)); }
  };
}

const normal = await setup();
assert.equal(normal.button.hidden, false);
const initialRotations = normal.rotations.length;
normal.tick(100);
for (let time = 140; time <= 60100; time += 40) normal.tick(time);
const turn = normal.rotations.slice(initialRotations).reduce((sum, item) => sum + item.degrees, 0);
assert.ok(Math.abs(turn - 360) < 0.001, 'One minute must produce one 360-degree turn');
normal.button.handlers.click();
assert.equal(normal.pending.size, 0, 'Pause must cancel the pending frame');
assert.equal(normal.button.textContent, '회전 시작');
normal.button.handlers.click();
assert.equal(normal.pending.size, 1);
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
normal.motion.matches = true;
normal.motion.handlers.change();
assert.equal(normal.pending.size, 0, 'A live reduced-motion change must stop rotation');
const reduced = await setup({ reduced: true });
assert.equal(reduced.pending.size, 0, 'Reduced motion must start still');
assert.equal(reduced.button.textContent, '회전 시작');
reduced.button.handlers.click();
assert.equal(reduced.pending.size, 1, 'Explicit user action can start rotation');
reduced.canvas.handlers.webglcontextlost();
assert.equal(reduced.pending.size, 0);
assert.equal(reduced.button.hidden, true);
assert.equal(reduced.classes.has('protein-ready'), false);
for (const failure of [{ networkFailure: true }, { gpuFailure: true }]) {
  const failed = await setup(failure);
  assert.equal(failed.pending.size, 0);
  assert.equal(failed.button.hidden, true);
  assert.equal(failed.classes.has('protein-ready'), false, 'A failed renderer must preserve the poster');
}
console.log('단백질 구조·360도 회전 시간·일시정지·화면 밖/백그라운드·움직임 감소·실패 시 정지 이미지 검사 통과');
