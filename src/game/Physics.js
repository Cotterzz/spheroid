import * as C from '../config.js';

const SUBSTEPS = 8;

export class Physics {
  constructor(world) {
    this.world = world;
    this._justScored = false;
    this._lastShooter  = null;
this._shotCooldown = 0;
  }

  // --- Public actions ---------------------------------------------

  slow() {
    const w = this.world;
    if (w.ballCarrierIndex === w.playerIndex && !w.slowing) {
      w.slowing = true;
    }
  }

  fast() {
    const w = this.world;
    const wasPlayerCarrier = w.ballCarrierIndex === w.playerIndex;
    w.delta = C.PHYSICS.defaultDelta;
    w.hook  = C.PHYSICS.postShootHook;
    w.slowing = false;
    if (wasPlayerCarrier) this.shoot(w.entities[w.playerIndex]);
  }

  shoot(carrier) {
    const w = this.world;
    const ball = w.ball;
    w.ballCarrier = null;
    w.ballCarrierIndex = 0;
    const a = carrier.angle - C.HALF_PI;
    ball.vx = carrier.vx + w.power * Math.cos(a);
    ball.vy = carrier.vy + w.power * Math.sin(a);
    // (No immediate nudge — substep loop advances the ball naturally.)
    w.power = C.PHYSICS.defaultPower;
    this._lastShooter  = carrier;
this._shotCooldown = SUBSTEPS * 2;
  }

  score(_side) {
    const w = this.world;
    w.ball.x = 0; w.ball.y = 0;
    w.ball.vx = 0; w.ball.vy = 0;
    w.ballCarrier = null;
    w.ballCarrierIndex = 0;
    this._justScored = true;
  }

  // --- Main update ------------------------------------------------

  update() {
    const w = this.world;

    // ---- Per-frame: slowing decay ----
    if (w.slowing) {
      if (w.delta > C.PHYSICS.minDelta) w.delta *= C.PHYSICS.slowDecay;
      if (w.hook  > C.PHYSICS.minHook ) w.hook  *= C.PHYSICS.slowDecay;
      if (w.power < C.PHYSICS.maxPower) w.power *= C.PHYSICS.powerGrowth;
    }

    // ---- Per-frame: AI thinking (steering, turning, auto-shoot) ----
    // Done once so AI doesn't "think" 8x faster than before.
    for (let i = 0; i < w.entities.length; i++) {
      const e = w.entities[i];
      if (!e.isBall) this._thinkRobot(i, e);
    }

    // ---- Substepped integration + collisions ----
    const N = SUBSTEPS;
    const subDelta = w.delta / N;
    // Damping is per-step; take the Nth root so total damping per frame is unchanged.
    const subDamp  = Math.pow(C.PHYSICS.damp, 1 / N);

    this._justScored = false;
    for (let s = 0; s < N; s++) {
      this._substep(subDelta, subDamp);
      if (this._justScored) break; // ball was reset — stop early
    }

    this._computeNearest();
  }

  _substep(subDelta, subDamp) {
    if (this._shotCooldown > 0) this._shotCooldown--;
    const w = this.world;
    const ents = w.entities;

    // 1. Snap ball to carrier (if any)
    if (w.ballCarrier) {
      const c = w.ballCarrier;
      const a = c.angle - C.HALF_PI;
      w.ball.x = c.x + C.PHYSICS.hookOffset * w.hook * Math.cos(a);
      w.ball.y = c.y + C.PHYSICS.hookOffset * w.hook * Math.sin(a);
    }

    // 2. Integrate positions + damp
    for (let i = 0; i < ents.length; i++) {
      const e = ents[i];
      e.x += e.vx * subDelta;
      e.y += e.vy * subDelta;
      e.vx *= subDamp;
      e.vy *= subDamp;
      if (Math.abs(e.vx) + Math.abs(e.vy) < C.PHYSICS.stopV) {
        e.vx = 0; e.vy = 0;
      }
    }

    // 3. Bounds (may trigger score, which sets _justScored)
    for (let i = 0; i < ents.length; i++) {
      this._applyBounds(ents[i]);
      if (this._justScored) return;
    }

    // 4. Pairwise collisions (all pairs, separate pass)
    for (let i = 0; i < ents.length; i++) {
      for (let j = i + 1; j < ents.length; j++) {
        this._collide(ents[i], ents[j]);
      }
    }

    // 5. Ball release check (collision may have knocked it out of the hook)
    this._updateBall();

    // 6. Pickup check
    if (!w.ballCarrier) {
      for (let i = 0; i < ents.length; i++) {
        const e = ents[i];
        if (e.isBall) continue;
        this._tryPickup(i, e);
      }
    }
  }

  // --- Helpers ----------------------------------------------------

  _applyBounds(e) {
    const L = e.limits;
    if (e.isBall) {
      const inGoal = e.y < C.WORLD.goalTop && e.y > C.WORLD.goalBottom;
      if (!inGoal) {
        if (e.x > L.right) { e.x = L.right; e.vx = -e.vx; }
        if (e.x < L.left ) { e.x = L.left;  e.vx = -e.vx; }
      }
      if (e.x > L.right + C.WORLD.scoreExtra) this.score('A');
      if (e.x < L.left  - C.WORLD.scoreExtra) this.score('B');
    } else {
      if (e.x > L.right) { e.x = L.right; e.vx = -e.vx; }
      if (e.x < L.left ) { e.x = L.left;  e.vx = -e.vx; }
    }
    if (e.y > L.top   ) { e.y = L.top;    e.vy = -e.vy; }
    if (e.y < L.bottom) { e.y = L.bottom; e.vy = -e.vy; }
  }

  _collide(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const rSum = a.radius + b.radius;
    if (dist >= rSum || dist === 0) return;

    const ang = Math.atan2(dy, dx);
    const cs = Math.cos(ang), sn = Math.sin(ang);

    // Rotate into collision frame
    const ax = cs * a.vx + sn * a.vy;
    const ay = cs * a.vy - sn * a.vx;
    const bx = cs * b.vx + sn * b.vy;
    const by = cs * b.vy - sn * b.vx;

    // 1D elastic collision along x
    const P = ax * a.mass + bx * b.mass;
    const V = ax - bx;
    const axp = (P - b.mass * V) / (a.mass + b.mass);
    const bxp = V + axp;

    // Rotate back
    a.vx = cs * axp - sn * ay;
    a.vy = cs * ay  + sn * axp;
    b.vx = cs * bxp - sn * by;
    b.vy = cs * by  + sn * bxp;

    // Resolve overlap
    const push = (rSum - dist) / 2;
    a.x -= cs * push; a.y -= sn * push;
    b.x += cs * push; b.y += sn * push;
  }

  _updateBall() {
    const w = this.world;
    if (!w.ballCarrier) return;
    const c = w.ballCarrier;
    const a = c.angle - C.HALF_PI;
    const hx = c.x + w.hook * Math.cos(a);
    const hy = c.y + w.hook * Math.sin(a);
    const dx = w.ball.x - hx, dy = w.ball.y - hy;
    if (Math.hypot(dx, dy) > C.PHYSICS.releaseDist) {
      w.ball.vx = c.vx;
      w.ball.vy = c.vy;
      w.ballCarrier = null;
      w.ballCarrierIndex = 0;
    }
  }

  _thinkRobot(i, e) {
    const w = this.world;
    const ball = w.ball;
    const isHuman = (i === w.playerIndex);

    e.ballDist = Math.hypot(ball.x - e.x, ball.y - e.y);

    // Target vector
    const dx = e.targetX - e.x;
    const dy = e.targetY - e.y;
    e.targetAngle = Math.atan2(dy, dx);
    e.angle = e.angle % C.TWO_PI;
    e.targetDist = Math.hypot(dx, dy);

    // Desired speed
    const isChaser  = (i === w.nearestRed || i === w.nearestGreen) && (w.ballCarrierIndex !== i);
    const isCarrier = (w.ballCarrierIndex === i && !isHuman);
    if (e.targetDist > C.PHYSICS.closeDist || isChaser || isCarrier) {
      e.desiredSpeed = e.maxVel;
    } else {
      e.desiredSpeed = e.maxVel * (e.targetDist / C.PHYSICS.closeDist);
    }

    // Steering toward target
    const wantVX = e.desiredSpeed * Math.cos(e.targetAngle);
    const wantVY = e.desiredSpeed * Math.sin(e.targetAngle);
    const facing = e.angle - C.HALF_PI;
    let diff = wrapAngle(e.targetAngle - facing);

    if (Math.abs(diff) < C.PHYSICS.angleLockThreshold) {
      e.vx += (wantVX - e.vx) / C.PHYSICS.agility;
      e.vy += (wantVY - e.vy) / C.PHYSICS.agility;
    }
    let angleInc = diff / 10;

    // Close to destination (AI): re-orient toward the ball
    if (e.targetDist < 1 && !isHuman) {
      const bAng = Math.atan2(ball.y - e.y, ball.x - e.x);
      angleInc = wrapAngle(bAng - facing) / 10;
    }

    e.angle += angleInc * w.delta;

    // AI carrier auto-shoot
    if (w.ballCarrierIndex === i && e.targetDist < C.PHYSICS.shootDist && !isHuman) {
      this.shoot(e);
    }
  }

  _tryPickup(i, e) {
    if (e === this._lastShooter && this._shotCooldown > 0) return;
    const w = this.world;
    const ball = w.ball;
    const facing = e.angle - C.HALF_PI;
    const hx = e.x + w.hook * Math.cos(facing);
    const hy = e.y + w.hook * Math.sin(facing);
    const pdx = ball.x - hx, pdy = ball.y - hy;
    if (Math.hypot(pdx, pdy) < C.PHYSICS.pickupDist) {
      w.ballCarrier = e;
      w.ballCarrierIndex = i;
      if (i < C.GREEN_RANGE[0]) w.playerIndex = i;
    }
  }

  _computeNearest() {
    const w = this.world;
    w.nearestRed   = nearestIn(w.entities, C.RED_RANGE);
    w.nearestGreen = nearestIn(w.entities, C.GREEN_RANGE);
  }
}

function nearestIn(entities, [start, end]) {
  let near = start;
  for (let i = start; i < end; i++) {
    if (entities[i].ballDist < entities[near].ballDist) near = i;
  }
  return near;
}

function wrapAngle(a) {
  if (a >  C.PI) a -= C.TWO_PI;
  if (a < -C.PI) a += C.TWO_PI;
  return a;
}


/*
import * as C from '../config.js';

export class Physics {
  constructor(world) {
    this.world = world;
    this._scored = false;
  }

  // --- Public actions ---------------------------------------------

  slow() {
    const w = this.world;
    if (w.ballCarrierIndex === w.playerIndex && !w.slowing) {
      w.slowing = true;
    }
  }

  fast() {
    const w = this.world;
    const wasPlayerCarrier = w.ballCarrierIndex === w.playerIndex;
    w.delta = C.PHYSICS.defaultDelta;
    w.hook  = C.PHYSICS.postShootHook;
    w.slowing = false;
    if (wasPlayerCarrier) this.shoot(w.entities[w.playerIndex]);
  }

  shoot(carrier) {
    const w = this.world;
    const ball = w.ball;
    w.ballCarrier = null;
    w.ballCarrierIndex = 0;
    const a = carrier.angle - C.HALF_PI;
    ball.vx = carrier.vx + w.power * Math.cos(a);
    ball.vy = carrier.vy + w.power * Math.sin(a);
    // immediate nudge removed — substep loop advances the ball
    w.power = C.PHYSICS.defaultPower;
  }

  score(_side) {
    const w = this.world;
    w.ball.x = 0; w.ball.y = 0;
    w.ball.vx = 0; w.ball.vy = 0;
    w.ballCarrier = null;
    w.ballCarrierIndex = 0;
    this._scored = true; // abort remaining substeps this frame
  }

  // --- Main update ------------------------------------------------

  update() {
    const w = this.world;

    // Per-frame: slow-mo / power modulation
    if (w.slowing) {
      if (w.delta > C.PHYSICS.minDelta) w.delta *= C.PHYSICS.slowDecay;
      if (w.hook  > C.PHYSICS.minHook ) w.hook  *= C.PHYSICS.slowDecay;
      if (w.power < C.PHYSICS.maxPower) w.power *= C.PHYSICS.powerGrowth;
    }

    // Per-frame: AI / steering (sets velocity & angle intent, may shoot)
    for (let i = 0; i < w.entities.length; i++) {
      const e = w.entities[i];
      if (!e.isBall) this._thinkRobot(i, e);
    }

    // Sub-stepped physics
    const N        = this._substepCount();
    const subDelta = w.delta / N;
    const subDamp  = Math.pow(C.PHYSICS.damp, 1 / N);
    this._scored   = false;

    for (let s = 0; s < N; s++) {
      this._integrateAll(subDelta, subDamp);
      this._collideAll();
      this._checkBallRelease();
      this._checkPickupAll();
      if (this._scored) break;
    }

    this._computeNearest();
  }

  _substepCount() {
    // Fixed for now. If tunneling still appears at max shot power,
    // raise this or make it adaptive: ceil(maxSpeed * delta / minRadius).
    return C.PHYSICS.substeps ?? 6;
  }

  // --- Per-frame: AI / steering ----------------------------------

  _thinkRobot(i, e) {
    const w = this.world;
    const ball = w.ball;
    const isHuman = (i === w.playerIndex);

    e.ballDist = Math.hypot(ball.x - e.x, ball.y - e.y);

    const dx = e.targetX - e.x;
    const dy = e.targetY - e.y;
    e.targetAngle = Math.atan2(dy, dx);
    e.angle = e.angle % C.TWO_PI;
    e.targetDist = Math.hypot(dx, dy);

    const isChaser  = (i === w.nearestRed || i === w.nearestGreen) && (w.ballCarrierIndex !== i);
    const isCarrier = (w.ballCarrierIndex === i && !isHuman);
    e.desiredSpeed = (e.targetDist > C.PHYSICS.closeDist || isChaser || isCarrier)
      ? e.maxVel
      : e.maxVel * (e.targetDist / C.PHYSICS.closeDist);

    const wantVX = e.desiredSpeed * Math.cos(e.targetAngle);
    const wantVY = e.desiredSpeed * Math.sin(e.targetAngle);
    const facing = e.angle - C.HALF_PI;
    let diff = wrapAngle(e.targetAngle - facing);

    if (Math.abs(diff) < C.PHYSICS.angleLockThreshold) {
      e.vx += (wantVX - e.vx) / C.PHYSICS.agility;
      e.vy += (wantVY - e.vy) / C.PHYSICS.agility;
    }
    let angleInc = diff / 10;

    if (e.targetDist < 1 && !isHuman) {
      const bAng = Math.atan2(ball.y - e.y, ball.x - e.x);
      angleInc = wrapAngle(bAng - facing) / 10;
    }

    e.angle += angleInc * w.delta;

    if (w.ballCarrierIndex === i && e.targetDist < C.PHYSICS.shootDist && !isHuman) {
      this.shoot(e);
    }
  }

  // --- Sub-step: integration & bounds ----------------------------

  _integrateAll(subDelta, subDamp) {
    const w = this.world;

    for (let i = 0; i < w.entities.length; i++) {
      const e = w.entities[i];
      if (e.isBall && w.ballCarrier) continue; // carried ball is snapped below

      e.x  += e.vx * subDelta;
      e.y  += e.vy * subDelta;
      e.vx *= subDamp;
      e.vy *= subDamp;

      if (Math.abs(e.vx) + Math.abs(e.vy) < C.PHYSICS.stopV) {
        e.vx = 0; e.vy = 0;
      }
      this._applyBounds(e);
    }

    // Snap carried ball *after* its carrier has moved this substep.
    if (w.ballCarrier) {
      const c = w.ballCarrier, b = w.ball;
      const a = c.angle - C.HALF_PI;
      b.x = c.x + C.PHYSICS.hookOffset * w.hook * Math.cos(a);
      b.y = c.y + C.PHYSICS.hookOffset * w.hook * Math.sin(a);
      this._applyBounds(b);
    }
  }

  _applyBounds(e) {
    const L = e.limits;
    if (e.isBall) {
      const inGoal = e.y < C.WORLD.goalTop && e.y > C.WORLD.goalBottom;
      if (!inGoal) {
        if (e.x > L.right) { e.x = L.right; e.vx = -e.vx; }
        if (e.x < L.left ) { e.x = L.left;  e.vx = -e.vx; }
      }
      if (e.x > L.right + C.WORLD.scoreExtra) this.score('A');
      if (e.x < L.left  - C.WORLD.scoreExtra) this.score('B');
    } else {
      if (e.x > L.right) { e.x = L.right; e.vx = -e.vx; }
      if (e.x < L.left ) { e.x = L.left;  e.vx = -e.vx; }
    }
    if (e.y > L.top   ) { e.y = L.top;    e.vy = -e.vy; }
    if (e.y < L.bottom) { e.y = L.bottom; e.vy = -e.vy; }
  }

  // --- Sub-step: collisions --------------------------------------

  _collideAll() {
    const ents = this.world.entities;
    for (let i = 0; i < ents.length; i++) {
      for (let j = i + 1; j < ents.length; j++) {
        this._collide(ents[i], ents[j]);
      }
    }
  }

  _collide(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const rSum = a.radius + b.radius;
    if (dist >= rSum || dist === 0) return;

    const ang = Math.atan2(dy, dx);
    const cs = Math.cos(ang), sn = Math.sin(ang);

    // Rotate into collision frame
    const ax = cs * a.vx + sn * a.vy;
    const ay = cs * a.vy - sn * a.vx;
    const bx = cs * b.vx + sn * b.vy;
    const by = cs * b.vy - sn * b.vx;

    // 1D elastic collision along x
    const P = ax * a.mass + bx * b.mass;
    const V = ax - bx;
    const axp = (P - b.mass * V) / (a.mass + b.mass);
    const bxp = V + axp;

    // Rotate back
    a.vx = cs * axp - sn * ay;
    a.vy = cs * ay  + sn * axp;
    b.vx = cs * bxp - sn * by;
    b.vy = cs * by  + sn * bxp;

    // Resolve overlap (mass-weighted: lighter body is pushed further)
    const overlap = rSum - dist;
    const mSum = a.mass + b.mass;
    const aPush = overlap * (b.mass / mSum);
    const bPush = overlap * (a.mass / mSum);
    a.x -= cs * aPush; a.y -= sn * aPush;
    b.x += cs * bPush; b.y += sn * bPush;
  }

  // --- Sub-step: carry / release / pickup ------------------------

  _checkBallRelease() {
    const w = this.world;
    if (!w.ballCarrier) return;
    const c = w.ballCarrier;
    const a = c.angle - C.HALF_PI;
    const hx = c.x + w.hook * Math.cos(a);
    const hy = c.y + w.hook * Math.sin(a);
    if (Math.hypot(w.ball.x - hx, w.ball.y - hy) > C.PHYSICS.releaseDist) {
      w.ball.vx = c.vx;
      w.ball.vy = c.vy;
      w.ballCarrier = null;
      w.ballCarrierIndex = 0;
    }
  }

  _checkPickupAll() {
    const w = this.world;
    if (w.ballCarrier) return;
    const ball = w.ball;
    for (let i = 0; i < w.entities.length; i++) {
      const e = w.entities[i];
      if (e.isBall) continue;
      const facing = e.angle - C.HALF_PI;
      const hx = e.x + w.hook * Math.cos(facing);
      const hy = e.y + w.hook * Math.sin(facing);
      if (Math.hypot(ball.x - hx, ball.y - hy) < C.PHYSICS.pickupDist) {
        w.ballCarrier = e;
        w.ballCarrierIndex = i;
        if (i < C.GREEN_RANGE[0]) w.playerIndex = i;
        return;
      }
    }
  }

  // --- Per-frame: nearest ----------------------------------------

  _computeNearest() {
    const w = this.world;
    w.nearestRed   = nearestIn(w.entities, C.RED_RANGE);
    w.nearestGreen = nearestIn(w.entities, C.GREEN_RANGE);
  }
}

function nearestIn(entities, [start, end]) {
  let near = start;
  for (let i = start; i < end; i++) {
    if (entities[i].ballDist < entities[near].ballDist) near = i;
  }
  return near;
}

function wrapAngle(a) {
  if (a >  C.PI) a -= C.TWO_PI;
  if (a < -C.PI) a += C.TWO_PI;
  return a;
}

/*



*/
/*
import * as C from '../config.js';

export class Physics {
  constructor(world) { this.world = world; }

  // --- Public actions ---------------------------------------------

  slow() {
    const w = this.world;
    if (w.ballCarrierIndex === w.playerIndex && !w.slowing) {
      w.slowing = true;
    }
  }

  fast() {
    const w = this.world;
    const wasPlayerCarrier = w.ballCarrierIndex === w.playerIndex;
    w.delta = C.PHYSICS.defaultDelta;
    w.hook  = C.PHYSICS.postShootHook;
    w.slowing = false;
    if (wasPlayerCarrier) this.shoot(w.entities[w.playerIndex]);
  }

  shoot(carrier) {
    const w = this.world;
    const ball = w.ball;
    w.ballCarrier = null;
    w.ballCarrierIndex = 0;
    const a = carrier.angle - C.HALF_PI;
    ball.vx = carrier.vx + w.power * Math.cos(a);
    ball.vy = carrier.vy + w.power * Math.sin(a);
    ball.x += ball.vx;
    ball.y += ball.vy;
    w.power = C.PHYSICS.defaultPower;
  }

  score(_side) {
    const w = this.world;
    w.ball.x = 0; w.ball.y = 0;
    w.ball.vx = 0; w.ball.vy = 0;
    w.ballCarrier = null;
    w.ballCarrierIndex = 0;
  }

  // --- Main update ------------------------------------------------

  update() {
    const w = this.world;

    if (w.slowing) {
      if (w.delta > C.PHYSICS.minDelta) w.delta *= C.PHYSICS.slowDecay;
      if (w.hook  > C.PHYSICS.minHook ) w.hook  *= C.PHYSICS.slowDecay;
      if (w.power < C.PHYSICS.maxPower) w.power *= C.PHYSICS.powerGrowth;
    }

    for (let i = 0; i < w.entities.length; i++) this._updateEntity(i);
    this._computeNearest();
  }

  _updateEntity(i) {
    const w = this.world;
    const e = w.entities[i];

    // Snap ball to carrier
    if (e.isBall && w.ballCarrier) {
      const c = w.ballCarrier;
      const a = c.angle - C.HALF_PI;
      e.x = c.x + C.PHYSICS.hookOffset * w.hook * Math.cos(a);
      e.y = c.y + C.PHYSICS.hookOffset * w.hook * Math.sin(a);
    }

    // Integrate
    e.x += e.vx * w.delta;
    e.y += e.vy * w.delta;
    e.vx *= C.PHYSICS.damp;
    e.vy *= C.PHYSICS.damp;

    this._applyBounds(e);

    if (Math.abs(e.vx) + Math.abs(e.vy) < C.PHYSICS.stopV) {
      e.vx = 0; e.vy = 0;
    }

    // Pairwise collisions (upper triangle)
    for (let j = i + 1; j < w.entities.length; j++) {
      this._collide(e, w.entities[j]);
    }

    if (e.isBall) this._updateBall();
    else          this._updateRobot(i, e);
  }

  _applyBounds(e) {
    const L = e.limits;
    if (e.isBall) {
      const inGoal = e.y < C.WORLD.goalTop && e.y > C.WORLD.goalBottom;
      if (!inGoal) {
        if (e.x > L.right) { e.x = L.right; e.vx = -e.vx; }
        if (e.x < L.left ) { e.x = L.left;  e.vx = -e.vx; }
      }
      if (e.x > L.right + C.WORLD.scoreExtra) this.score('A');
      if (e.x < L.left  - C.WORLD.scoreExtra) this.score('B');
    } else {
      if (e.x > L.right) { e.x = L.right; e.vx = -e.vx; }
      if (e.x < L.left ) { e.x = L.left;  e.vx = -e.vx; }
    }
    if (e.y > L.top   ) { e.y = L.top;    e.vy = -e.vy; }
    if (e.y < L.bottom) { e.y = L.bottom; e.vy = -e.vy; }
  }

  _collide(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const rSum = a.radius + b.radius;
    if (dist >= rSum || dist === 0) return;

    const ang = Math.atan2(dy, dx);
    const cs = Math.cos(ang), sn = Math.sin(ang);

    // Rotate into collision frame
    const ax = cs * a.vx + sn * a.vy;
    const ay = cs * a.vy - sn * a.vx;
    const bx = cs * b.vx + sn * b.vy;
    const by = cs * b.vy - sn * b.vx;

    // 1D elastic collision along x
    const P = ax * a.mass + bx * b.mass;
    const V = ax - bx;
    const axp = (P - b.mass * V) / (a.mass + b.mass);
    const bxp = V + axp;

    // Rotate back
    a.vx = cs * axp - sn * ay;
    a.vy = cs * ay  + sn * axp;
    b.vx = cs * bxp - sn * by;
    b.vy = cs * by  + sn * bxp;

    // Resolve overlap
    const push = (rSum - dist) / 2;
    a.x -= cs * push; a.y -= sn * push;
    b.x += cs * push; b.y += sn * push;
  }

  _updateBall() {
    const w = this.world;
    if (!w.ballCarrier) return;
    const c = w.ballCarrier;
    const a = c.angle - C.HALF_PI;
    const hx = c.x + w.hook * Math.cos(a);
    const hy = c.y + w.hook * Math.sin(a);
    const dx = w.ball.x - hx, dy = w.ball.y - hy;
    if (Math.hypot(dx, dy) > C.PHYSICS.releaseDist) {
      w.ball.vx = c.vx;
      w.ball.vy = c.vy;
      w.ballCarrier = null;
      w.ballCarrierIndex = 0;
    }
  }

  _updateRobot(i, e) {
    const w = this.world;
    const ball = w.ball;
    const isHuman = (i === w.playerIndex);

    e.ballDist = Math.hypot(ball.x - e.x, ball.y - e.y);

    // Target vector
    let dx = e.targetX - e.x;
    let dy = e.targetY - e.y;
    e.targetAngle = Math.atan2(dy, dx);
    e.angle = e.angle % C.TWO_PI;
    e.targetDist = Math.hypot(dx, dy);

    // Desired speed
    const isChaser  = (i === w.nearestRed || i === w.nearestGreen) && (w.ballCarrierIndex !== i);
    const isCarrier = (w.ballCarrierIndex === i && !isHuman);
    if (e.targetDist > C.PHYSICS.closeDist || isChaser || isCarrier) {
      e.desiredSpeed = e.maxVel;
    } else {
      e.desiredSpeed = e.maxVel * (e.targetDist / C.PHYSICS.closeDist);
    }

    // Steering toward target
    const wantVX = e.desiredSpeed * Math.cos(e.targetAngle);
    const wantVY = e.desiredSpeed * Math.sin(e.targetAngle);
    const facing = e.angle - C.HALF_PI;
    let diff = wrapAngle(e.targetAngle - facing);

    if (Math.abs(diff) < C.PHYSICS.angleLockThreshold) {
      e.vx += (wantVX - e.vx) / C.PHYSICS.agility;
      e.vy += (wantVY - e.vy) / C.PHYSICS.agility;
    }
    let angleInc = diff / 10;

    // Close to destination (and AI): re-orient toward the ball
    if (e.targetDist < 1 && !isHuman) {
      const bAng = Math.atan2(ball.y - e.y, ball.x - e.x);
      angleInc = wrapAngle(bAng - facing) / 10;
    }

    e.angle += angleInc * w.delta;

    // AI carrier: auto-shoot when target reached
    if (w.ballCarrierIndex === i && e.targetDist < C.PHYSICS.shootDist && !isHuman) {
      this.shoot(e);
    }

    // Pickup check
    if (!w.ballCarrier) {
      const hx = e.x + w.hook * Math.cos(facing);
      const hy = e.y + w.hook * Math.sin(facing);
      const pdx = ball.x - hx, pdy = ball.y - hy;
      if (Math.hypot(pdx, pdy) < C.PHYSICS.pickupDist) {
        w.ballCarrier = e;
        w.ballCarrierIndex = i;
        if (i < C.GREEN_RANGE[0]) w.playerIndex = i;
      }
    }
  }

  _computeNearest() {
    const w = this.world;
    w.nearestRed   = nearestIn(w.entities, C.RED_RANGE);
    w.nearestGreen = nearestIn(w.entities, C.GREEN_RANGE);
  }
}

function nearestIn(entities, [start, end]) {
  let near = start;
  for (let i = start; i < end; i++) {
    if (entities[i].ballDist < entities[near].ballDist) near = i;
  }
  return near;
}

function wrapAngle(a) {
  if (a >  C.PI) a -= C.TWO_PI;
  if (a < -C.PI) a += C.TWO_PI;
  return a;
}

*/