import { createWorld } from './game/World.js';
import { Physics }    from './game/Physics.js';
import { AI }         from './game/AI.js';
import { Input }      from './input/Input.js';
import { Renderer }   from './render/Renderer.js';

const canvas      = document.querySelector('#canvas');
const container   = document.querySelector('.divcanvas');
const menuEl      = document.querySelector('#menu');
const scoreboardEl = document.querySelector('#scoreboard');
const scoreEls    = {
  red:   document.querySelector('#score-red'),
  green: document.querySelector('#score-green'),
};

const input    = new Input(container);
const renderer = new Renderer(canvas);
window.addEventListener('resize', () => renderer.resize());

let world, physics, ai;
let rafId = null, then = 0, time = 0, accumulator = 0;

const FIXED_DT = 1 / 60;

function startGame(mode) {
  stopLoop();

  world   = createWorld(mode);
  physics = new Physics(world);
  ai      = new AI(world, input, physics);

  input.clearListeners();

  const hasHuman = world.playerIndex > 0;

  if (hasHuman) {
    input.on('actionDown',  () => physics.slow());
    input.on('actionUp',    () => physics.fast());
    input.on('actionBDown', () => {
      const pi = world.playerIndex;
      if (world.ballCarrier && world.ballCarrierIndex !== pi) {
        physics.tackle(pi);
      } else if (!world.ballCarrier) {
        physics.catch(pi);
      }
    });
  }

  input.on('pointerEnter', () => startLoop());
  input.on('pointerLeave', () => stopLoop());

  menuEl.style.display = 'none';
  scoreboardEl.style.display = '';
  scoreEls.red.textContent = '0';
  scoreEls.green.textContent = '0';
  prevRed = 0;
  prevGreen = 0;
  time = 0;

  renderer.draw(world, time);
  startLoop();
}

function loop(now) {
  rafId = null;
  now *= 0.001;
  const frameTime = Math.min(now - then, 0.1);
  then = now;
  accumulator += frameTime;

  while (accumulator >= FIXED_DT) {
    input.update();
    if (input.triggerValue > 0.1 && world.playerIndex > 0
        && world.ballCarrierIndex === world.playerIndex) {
      world.power = input.triggerValue;
    }
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

menuEl.addEventListener('click', e => {
  const btn = e.target.closest('button[data-mode]');
  if (!btn) return;
  startGame(parseInt(btn.dataset.mode, 10));
});
