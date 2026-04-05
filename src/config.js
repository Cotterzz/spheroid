export const HALF_PI = Math.PI / 2;
export const TWO_PI  = Math.PI * 2;
export const PI      = Math.PI;

export const NUM_ENTITIES = 11;         // 1 ball + 10 robots
export const BALL_INDEX   = 0;
export const RED_RANGE    = [1, 6];     // [start, end)
export const GREEN_RANGE  = [6, 11];

export const BALL_RADIUS  = 0.2;
export const ROB_RADIUS   = 0.7;
export const BALL_MASS    = 1;
export const ROB_MASS     = 5;

export const WORLD = {
  halfWidth:  10, halfHeight: 6,
  robTop: 4.7,  robBottom: -4.7,  robLeft: -8.9, robRight: 8.9,
  ballTop: 5.1, ballBottom: -5.1, ballLeft: -9.3, ballRight: 9.3,
  goalTop: 1.5, goalBottom: -1.5,
  scoreExtra: 1,
};

export const PHYSICS = {
  damp: 0.98,
  maxVel: 0.13,
  stopV: 0.0001,
  agility: 2,
  closeDist: 3,
  defaultDelta: 0.7,
  defaultHook: 0.9,
  defaultPower: 0.1,
  postShootHook: 1.0,
  slowDecay: 0.98,
  powerGrowth: 1.02,
  minDelta: 0.1,
  minHook: 0.9,
  maxPower: 1.0,
  hookOffset: 1.3,
  pickupDist: 0.3,
  releaseDist: 0.4,
  shootDist: 1.0,
  angleLockThreshold: 1.9,
};

// Formation tables indexed by entity id (0 unused). Values 0..2, where
// 0 = own goal, 1 = ball position, 2 = opponent goal.
export const FORMATIONS = {
  attack:  {
    x: [0, 0.2, 0.4, 0.6, 0.8, 1.2, 1.5, 1.5, 1.8, 1.8, 1.9],
    y: [0, 1,   1.5, 0.5, 1.7, 0.3, 1.3, 0.7, 0.3, 1.7, 1],
  },
  defense: {
    x: [0, 0.1, 0.2, 0.2, 0.5, 0.5, 0.8, 1.2, 1.4, 1.6, 1.8],
    y: [0, 1,   1.7, 0.3, 0.7, 1.3, 0.3, 1.7, 0.5, 1.5, 1],
  },
};

// AI targets are placed in a rectangle slightly smaller than the world
export const AI_FIELD = { halfX: 9.6, halfY: 5.4 };