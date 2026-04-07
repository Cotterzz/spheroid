import { Entity } from './Entity.js';
import * as C from '../config.js';

export function createWorld(mode = 4) {
  const ballLimits = {
    top: C.WORLD.ballTop, bottom: C.WORLD.ballBottom,
    left: C.WORLD.ballLeft, right: C.WORLD.ballRight,
  };
  const robLimits = {
    top: C.WORLD.robTop, bottom: C.WORLD.robBottom,
    left: C.WORLD.robLeft, right: C.WORLD.robRight,
  };
  const mkRob = (x, y, team, role = null) => new Entity({
    x, y,
    angle: team === 'red' ? C.HALF_PI : -C.HALF_PI,
    mass: C.ROB_MASS, radius: C.ROB_RADIUS, maxVel: C.PHYSICS.maxVel,
    team, role, limits: robLimits,
  });

  const ball = new Entity({ x: 0, y: 0, mass: C.BALL_MASS, radius: C.BALL_RADIUS,
                             team: 'ball', limits: ballLimits });

  let entities;
  let redRange, greenRange;

  if (mode === 1) {
    entities = [ball, mkRob(-2, 0, 'red', 'att')];
    redRange = [1, 2];
    greenRange = null;
  } else if (mode === 2) {
    entities = [ball, mkRob(-2, 0, 'red', 'att'), mkRob(-4, 2, 'red', 'def')];
    redRange = [1, 3];
    greenRange = null;
  } else if (mode === 3) {
    entities = [ball, mkRob(-2, 0, 'red', 'att'), mkRob(2, 0, 'green', 'att')];
    redRange = [1, 2];
    greenRange = [2, 3];
  } else {
    entities = [
      ball,
      mkRob(-2,  0, 'red',   'mid'),
      mkRob(-4,  2, 'red',   'att'),
      mkRob(-4, -2, 'red',   'att'),
      mkRob(-6,  2, 'red',   'def'),
      mkRob(-6, -2, 'red',   'gk'),
      mkRob( 2,  0, 'green', 'mid'),
      mkRob( 4,  2, 'green', 'att'),
      mkRob( 4, -2, 'green', 'att'),
      mkRob( 6,  2, 'green', 'def'),
      mkRob( 6, -2, 'green', 'gk'),
    ];
    redRange = C.RED_RANGE;
    greenRange = C.GREEN_RANGE;
  }

  const hasHuman = mode !== 5;

  return {
    mode,
    entities,
    ball,
    ballCarrier: null,
    ballCarrierIndex: 0,
    playerIndex: hasHuman ? 1 : 0,
    nearestRed: redRange ? redRange[0] : -1,
    nearestGreen: greenRange ? greenRange[0] : -1,
    redRange,
    greenRange,
    attacking: false,
    scoreRed: 0,
    scoreGreen: 0,
    hook:  C.PHYSICS.defaultHook,
    delta: C.PHYSICS.defaultDelta,
    power: C.PHYSICS.defaultPower,
    ballVisualScale: 1.0,
    slowing: false,
  };
}
