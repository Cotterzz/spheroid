import * as C from '../config.js';

const SUBSTEPS = 8;

export class Physics {
  constructor(world) {
    this.world = world;
    this._justScored = false;
    this._lastShooter  = null;
    this._shotCooldown = 0;
    this._tacklePriority = null;
    this._tacklePriorityTimer = 0;
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

  score(side) {
    const w = this.world;
    if (side === 'A') w.scoreRed++;
    else              w.scoreGreen++;
    w.ball.x = 0; w.ball.y = 0;
    w.ball.vx = 0; w.ball.vy = 0;
    w.ballCarrier = null;
    w.ballCarrierIndex = 0;
    this._justScored = true;
  }

  tackle(tacklerIndex) {
    const w = this.world;
    const e = w.entities[tacklerIndex];
    if (e.catchCooldown > 0) return false;
    if (w.ballCarrierIndex === tacklerIndex) return false;
    if (!w.ballCarrier) return false;

    const carrier = w.ballCarrier;
    if (carrier.team === e.team) return false;

    const dist = Math.hypot(carrier.x - e.x, carrier.y - e.y);
    if (dist > C.PHYSICS.tackleDist) return false;

    const impulse = Math.max(w.power, C.PHYSICS.tackleImpulse);
    const a = carrier.angle - C.HALF_PI;
    w.ball.vx = impulse * Math.cos(a) + carrier.vx;
    w.ball.vy = impulse * Math.sin(a) + carrier.vy;
    w.ballCarrier = null;
    w.ballCarrierIndex = 0;
    w.power = C.PHYSICS.defaultPower;

    e.catchCooldown = C.PHYSICS.catchCooldownTicks;
    this._tacklePriority = e;
    this._tacklePriorityTimer = C.PHYSICS.tacklePriorityTicks;
    return true;
  }

  catch(robotIndex) {
    const w = this.world;
    const e = w.entities[robotIndex];
    if (e.catchCooldown > 0) return false;
    if (w.ballCarrier) return false;
    if (e === this._lastShooter && this._shotCooldown > 0) return false;

    if (this._tacklePriority && this._tacklePriorityTimer > 0 && e !== this._tacklePriority) {
      return false;
    }

    const ball = w.ball;
    const ballSpeed = Math.hypot(ball.vx, ball.vy);
    const speedPenalty = Math.min(ballSpeed / C.PHYSICS.maxPower, 1.0);
    const effectiveCatchDist = C.PHYSICS.catchDist * (1.0 - speedPenalty * 0.7);

    const facing = e.angle - C.HALF_PI;
    const hx = e.x + w.hook * Math.cos(facing);
    const hy = e.y + w.hook * Math.sin(facing);
    if (Math.hypot(ball.x - hx, ball.y - hy) > effectiveCatchDist) return false;

    w.ballCarrier = e;
    w.ballCarrierIndex = robotIndex;
    if (robotIndex < C.GREEN_RANGE[0]) w.playerIndex = robotIndex;
    e.catchCooldown = C.PHYSICS.catchCooldownTicks;
    this._tacklePriority = null;
    this._tacklePriorityTimer = 0;
    return true;
  }

  // --- Main update ------------------------------------------------

  update() {
    const w = this.world;

    // ---- Per-frame: cooldown ticks ----
    if (this._tacklePriorityTimer > 0) this._tacklePriorityTimer--;
    for (let i = 1; i < w.entities.length; i++) {
      if (w.entities[i].catchCooldown > 0) w.entities[i].catchCooldown--;
    }

    // ---- Per-frame: ball visual scale ----
    if (w.ballCarrier) {
      const pn = (w.power - C.PHYSICS.defaultPower) / (C.PHYSICS.maxPower - C.PHYSICS.defaultPower);
      w.ballVisualScale = 1.0 + pn * 0.6;
    } else if (w.ballVisualScale > 1.001) {
      w.ballVisualScale += (1.0 - w.ballVisualScale) * 0.08;
    } else {
      w.ballVisualScale = 1.0;
    }

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

    // Resolve overlap (mass-weighted: lighter body is pushed further)
    const overlap = rSum - dist;
    const mSum = a.mass + b.mass;
    const aPush = overlap * (b.mass / mSum);
    const bPush = overlap * (a.mass / mSum);
    a.x -= cs * aPush; a.y -= sn * aPush;
    b.x += cs * bPush; b.y += sn * bPush;
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