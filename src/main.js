import { createWorld } from './game/World.js';
import { Physics }    from './game/Physics.js';
import { AI }         from './game/AI.js';
import { Input }      from './input/Input.js';
import { Renderer }   from './render/Renderer.js';

const canvas    = document.querySelector('#canvas');
const container = document.querySelector('.divcanvas');

const world    = createWorld();
const physics  = new Physics(world);
const input    = new Input(container);
const ai       = new AI(world, input);
const renderer = new Renderer(canvas);

input.on('actionDown',   () => physics.slow());
input.on('actionUp',     () => physics.fast());
input.on('pointerEnter', () => startLoop());
input.on('pointerLeave', () => stopLoop());

let rafId = null;
let then  = 0;
let time  = 0;

function loop(now) {
  rafId = null;
  now *= 0.001;
  const dt = Math.min(now - then, 0.1);
  then = now;
  time += dt * world.delta;

  input.update();
  ai.update();
  physics.update();
  renderer.resize();
  renderer.draw(world, time);

  rafId = requestAnimationFrame(loop);
}

function startLoop() {
  if (rafId == null) {
    then = performance.now() * 0.001;
    rafId = requestAnimationFrame(loop);
  }
}

function stopLoop() {
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

// Render one frame, then pause until the user interacts
startLoop();
requestAnimationFrame(stopLoop);