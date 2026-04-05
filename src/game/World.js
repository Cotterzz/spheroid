import { Entity } from './Entity.js';
import * as C from '../config.js';

export function createWorld() {
  const ballLimits = {
    top: C.WORLD.ballTop, bottom: C.WORLD.ballBottom,
    left: C.WORLD.ballLeft, right: C.WORLD.ballRight,
  };
  const robLimits = {
    top: C.WORLD.robTop, bottom: C.WORLD.robBottom,
    left: C.WORLD.robLeft, right: C.WORLD.robRight,
  };
  const mkRob = (x, y, team) => new Entity({
    x, y,
    angle: team === 'red' ? C.HALF_PI : -C.HALF_PI,
    mass: C.ROB_MASS, radius: C.ROB_RADIUS, maxVel: C.PHYSICS.maxVel,
    team, limits: robLimits,
  });

  const entities = [
    new Entity({ x: 0, y: 0, mass: C.BALL_MASS, radius: C.BALL_RADIUS,
                 team: 'ball', limits: ballLimits }),
    mkRob(-2, 0,  'red'),
    mkRob(-4, 2,  'red'),
    mkRob(-4, -2, 'red'),
    mkRob(-6, 2,  'red'),
    mkRob(-6, -2, 'red'),
    mkRob( 2, 0,  'green'),
    mkRob( 4, 2,  'green'),
    mkRob( 4, -2, 'green'),
    mkRob( 6, 2,  'green'),
    mkRob( 6, -2, 'green'),
  ];

  return {
    entities,
    ball: entities[0],
    ballCarrier: null,        // Entity or null
    ballCarrierIndex: 0,      // 0 == "no carrier" for the shader
    playerIndex: 1,           // which red robot the human controls
    nearestRed: 1,
    nearestGreen: 6,
    attacking: false,
    // Tuning state (manipulated by slow/fast charge-shot system)
    hook:  C.PHYSICS.defaultHook,
    delta: C.PHYSICS.defaultDelta,
    power: C.PHYSICS.defaultPower,
    slowing: false,
  };
}