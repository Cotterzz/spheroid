export const HALF_PI = Math.PI / 2;
export const TWO_PI  = Math.PI * 2;
export const PI      = Math.PI;

export const NUM_ENTITIES = 11;
export const BALL_INDEX   = 0;
export const RED_RANGE    = [1, 6];
export const GREEN_RANGE  = [6, 11];

export const BALL_RADIUS  = 0.1;
export const ROB_RADIUS   = 0.35;
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
  maxVel: 0.10,
  stopV: 0.0001,
  agility: 2,
  closeDist: 1.5,
  defaultDelta: 0.7,
  defaultHook: 0.45,
  defaultPower: 0.1,
  postShootHook: 0.5,
  slowDecay: 0.98,
  powerGrowth: 1.02,
  minDelta: 0.1,
  minHook: 0.45,
  maxPower: 2.0,
  hookOffset: 1.3,
  pickupDist: 0.15,
  releaseDist: 0.5,
  shootDist: 1.5,
  angleLockThreshold: 1.9,
  tackleDist: 1.2,
  catchDist: 0.3,
  tackleImpulse: 0.15,
  catchCooldownTicks: 30,
  tacklePriorityTicks: 18,
  carryGraceTicks: 60,
};

export const ROLES = {
  gk:  { markBlend: 0.2, supportFwd: 0.5, chaseLeash: 2.0,  rushDist: 2.5 },
  def: { markBlend: 0.3, supportFwd: 1.5, chaseLeash: 5.0 },
  mid: { markBlend: 0.5, supportFwd: 2.5, chaseLeash: 8.0 },
  att: { markBlend: 0.7, supportFwd: 3.5, chaseLeash: 12.0 },
};

export const AI = {
  decisionInterval: 10,
  separationDist: 3.0,
  shootRange: 4.0,
  passLaneWidth: 0.8,
  avoidRadius: 1.5,
  avoidStrength: 0.5,
};

export const AI_FIELD = { halfX: 9.6, halfY: 5.4 };
