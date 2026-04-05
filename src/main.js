import { createWorld } from './game/World.js';
import { Physics }    from './game/Physics.js';
import { AI }         from './game/AI.js';
import { Input }      from './input/Input.js';
import { Renderer }   from './render/Renderer.js';

const canvas    = document.querySelector('#canvas');
const container = document.querySelector('.divcanvas');
const scoreEls  = {
  red:   document.querySelector('#score-red'),
  green: document.querySelector('#score-green'),
};

const world    = createWorld();
const physics  = new Physics(world);
const input    = new Input(container);
const ai       = new AI(world, input);
const renderer = new Renderer(canvas);

input.on('actionDown',   () => physics.slow());
input.on('actionUp',     () => physics.fast());
input.on('pointerEnter', () => startLoop());
input.on('pointerLeave', () => stopLoop());
window.addEventListener('resize', () => renderer.resize());

const FIXED_DT = 1 / 60;

let rafId = null;
let then  = 0;
let time  = 0;
let accumulator = 0;

function loop(now) {
  rafId = null;
  now *= 0.001;
  const frameTime = Math.min(now - then, 0.1);
  then = now;
  accumulator += frameTime;

  while (accumulator >= FIXED_DT) {
    input.update();
    ai.update();
    physics.update();
    time += FIXED_DT * world.delta;
    accumulator -= FIXED_DT;
  }

  updateScoreboard();
  renderer.draw(world, time);

  rafId = requestAnimationFrame(loop);
}

function startLoop() {
  if (rafId == null) {
    then = performance.now() * 0.001;
    accumulator = 0;
    rafId = requestAnimationFrame(loop);
  }
}

function stopLoop() {
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

let prevRed = 0, prevGreen = 0;
function updateScoreboard() {
  if (world.scoreRed !== prevRed) {
    prevRed = world.scoreRed;
    scoreEls.red.textContent = prevRed;
  }
  if (world.scoreGreen !== prevGreen) {
    prevGreen = world.scoreGreen;
    scoreEls.green.textContent = prevGreen;
  }
}

// Render one frame, then pause until the user interacts
startLoop();
requestAnimationFrame(stopLoop);