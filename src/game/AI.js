import * as C from '../config.js';

export class AI {
  constructor(world, input, physics) {
    this.world = world;
    this.input = input;
    this.physics = physics;
  }

  update() {
    const w = this.world;
    const ball = w.ball;
    const hasHuman = w.playerIndex > 0;

    if (hasHuman) {
      const human = w.entities[w.playerIndex];
      const aim = this.input.getAimWorld(w);
      human.targetX = aim.x;
      human.targetY = aim.y;
      human.ballDist = Math.hypot(ball.x - human.x, ball.y - human.y);
    }

    for (let i = 1; i < w.entities.length; i++) {
      if (hasHuman && i === w.playerIndex) continue;
      const e = w.entities[i];
      e.ballDist = Math.hypot(ball.x - e.x, ball.y - e.y);
    }

    this._assignMarks();

    for (let i = 1; i < w.entities.length; i++) {
      if (hasHuman && i === w.playerIndex) continue;
      const e = w.entities[i];

      e.decisionTimer--;
      if (e.decisionTimer <= 0) {
        e.state = this._decide(i, e);
        e.decisionTimer = C.AI.decisionInterval + Math.floor(Math.random() * 4);
      }

      this._act(i, e);
    }

    this._applySeparation();
    this._aiActions();
  }

  // --- Decision ---

  _decide(i, e) {
    const w = this.world;
    const role = C.ROLES[e.role] || C.ROLES.mid;

    if (e.role === 'gk') {
      if (!w.ballCarrier && e.ballDist < (role.rushDist || 2.5)) return 'CHASE';
      return 'KEEP';
    }

    if (w.ballCarrierIndex === i) return 'CARRY';

    const looseBall = !w.ballCarrier;
    const myTeamHasBall = w.ballCarrier && w.ballCarrier.team === e.team;
    const oppHasBall = w.ballCarrier && w.ballCarrier.team !== e.team;

    if (looseBall) {
      const nearest = this._nearestOnTeam(e.team);
      if (nearest === i && e.ballDist < role.chaseLeash) return 'CHASE';
      return 'COVER';
    }

    if (myTeamHasBall) return 'SUPPORT';

    if (oppHasBall) {
      const nearest = this._nearestOnTeam(e.team);
      if (nearest === i) return 'PRESS';
      return 'MARK';
    }

    return 'COVER';
  }

  // --- Act dispatch ---

  _act(i, e) {
    switch (e.state) {
      case 'CARRY':   return this._actCarry(e);
      case 'SUPPORT': return this._actSupport(e);
      case 'PRESS':   return this._actPress(e);
      case 'MARK':    return this._actMark(e);
      case 'CHASE':   return this._actChase(e);
      case 'COVER':   return this._actCover(e);
      case 'KEEP':    return this._actKeep(e);
      case 'RESET':   return this._actReset(e);
      default:        return this._actReset(e);
    }
  }

  // --- State implementations ---

  _actCarry(e) {
    const w = this.world;
    const goalX = e.goalDir * C.AI_FIELD.halfX;
    const distToGoal = Math.abs(goalX - e.x);

    if (distToGoal < C.AI.shootRange) {
      const bestY = this._bestShotY(e, goalX);
      if (bestY !== null && this._clearLane(e, { x: goalX, y: bestY })) {
        e.targetX = goalX;
        e.targetY = bestY;
        if (distToGoal < C.AI.shootRange * 0.8) {
          this.physics.shoot(e);
        }
        return;
      }
    }

    const passTarget = this._bestPass(e);
    if (passTarget) {
      e.targetX = passTarget.x;
      e.targetY = passTarget.y;
      if (Math.hypot(passTarget.x - e.x, passTarget.y - e.y) < C.PHYSICS.shootDist * 1.5) {
        this.physics.shoot(e);
      }
      return;
    }

    let avoidX = 0, avoidY = 0;
    const opponents = this._opponents(e);
    for (const o of opponents) {
      const dx = e.x - o.x, dy = e.y - o.y;
      const d = Math.hypot(dx, dy);
      if (d < C.AI.avoidRadius && d > 0.01) {
        const f = C.AI.avoidStrength * (1 - d / C.AI.avoidRadius) / d;
        avoidX += dx * f;
        avoidY += dy * f;
      }
    }
    const avoidLen = Math.hypot(avoidX, avoidY);
    const maxAvoid = 3.0;
    if (avoidLen > maxAvoid) {
      avoidX = (avoidX / avoidLen) * maxAvoid;
      avoidY = (avoidY / avoidLen) * maxAvoid;
    }
    e.targetX = goalX + avoidX;
    e.targetY = e.y * 0.5 + avoidY;
  }

  _actSupport(e) {
    const w = this.world;
    if (!w.ballCarrier) return this._actCover(e);
    const carrier = w.ballCarrier;
    const fwd = e.goalDir;
    const role = C.ROLES[e.role] || C.ROLES.mid;
    const side = e.homeY > 0 ? 1 : -1;

    e.targetX = carrier.x + fwd * role.supportFwd;
    e.targetY = carrier.y + side * 2.5;

    const opponents = this._opponents(e);
    if (!this._clearLane(carrier, { x: e.targetX, y: e.targetY })) {
      e.targetY = carrier.y - side * 2.5;
    }
  }

  _actPress(e) {
    const w = this.world;
    if (!w.ballCarrier) return this._actChase(e);
    const carrier = w.ballCarrier;
    e.targetX = carrier.x - e.goalDir * 0.5;
    e.targetY = carrier.y;
  }

  _actMark(e) {
    if (!e.markTarget || e.markTarget.team === e.team || e.markTarget.isBall) {
      return this._actCover(e);
    }
    const role = C.ROLES[e.role] || C.ROLES.mid;
    const ownGoalX = -e.goalDir * C.AI_FIELD.halfX;
    e.targetX = e.markTarget.x + (ownGoalX - e.markTarget.x) * role.markBlend;
    e.targetY = e.markTarget.y * (1.0 - role.markBlend * 0.3);
  }

  _actChase(e) {
    const w = this.world;
    const p = this._intercept(e, w.ball);
    e.targetX = p.x;
    e.targetY = p.y;
  }

  _actCover(e) {
    const w = this.world;
    const ball = w.ball;
    const ownGoalX = -e.goalDir * C.AI_FIELD.halfX;
    e.targetX = (ball.x + ownGoalX) * 0.3 + e.homeX * 0.7;
    e.targetY = ball.y * 0.3 + e.homeY * 0.7;
  }

  _actKeep(e) {
    const w = this.world;
    const ball = w.ball;
    const ownGoalX = -e.goalDir * C.AI_FIELD.halfX;
    const lineX = ownGoalX + e.goalDir * 1.0;
    e.targetX = lineX;
    e.targetY = Math.max(-C.WORLD.goalTop, Math.min(C.WORLD.goalTop, ball.y));
  }

  _actReset(e) {
    e.targetX = e.homeX;
    e.targetY = e.homeY;
  }

  // --- Marking assignment (prevents double-marking) ---

  _assignMarks() {
    const w = this.world;
    const hasHuman = w.playerIndex > 0;
    const claimed = new Set();

    for (let i = 1; i < w.entities.length; i++) {
      if (hasHuman && i === w.playerIndex) continue;
      const e = w.entities[i];
      if (e.state !== 'MARK' && e.decisionTimer > 0) continue;
      if (e.role === 'gk') continue;

      let best = null, bestDist = Infinity;
      for (let j = 1; j < w.entities.length; j++) {
        const o = w.entities[j];
        if (o.isBall || o.team === e.team || o.role === 'gk') continue;
        if (claimed.has(j)) continue;
        const d = Math.hypot(o.x - e.x, o.y - e.y);
        if (d < bestDist) { bestDist = d; best = j; }
      }
      if (best !== null) {
        e.markTarget = w.entities[best];
        claimed.add(best);
      } else {
        e.markTarget = null;
      }
    }
  }

  // --- Carrier evaluation ---

  _bestShotY(carrier, goalX) {
    const targets = [-C.WORLD.goalTop * 0.8, 0, C.WORLD.goalTop * 0.8];
    let bestY = null, bestScore = -Infinity;
    for (const ty of targets) {
      if (!this._clearLane(carrier, { x: goalX, y: ty })) continue;
      const dist = Math.hypot(goalX - carrier.x, ty - carrier.y);
      const score = 1.0 / (dist + 0.1);
      if (score > bestScore) { bestScore = score; bestY = ty; }
    }
    return bestY;
  }

  _clearLane(from, to) {
    const w = this.world;
    const dx = to.x - from.x, dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.01) return true;

    for (let i = 1; i < w.entities.length; i++) {
      const o = w.entities[i];
      if (o.isBall || o.team === from.team) continue;
      const t = ((o.x - from.x) * dx + (o.y - from.y) * dy) / (len * len);
      if (t < 0.05 || t > 0.95) continue;
      const px = from.x + t * dx, py = from.y + t * dy;
      if (Math.hypot(o.x - px, o.y - py) < C.AI.passLaneWidth) return false;
    }
    return true;
  }

  _bestPass(carrier) {
    const w = this.world;
    const teammates = this._teammates(carrier);
    const goalX = carrier.goalDir * C.AI_FIELD.halfX;
    let best = null, bestScore = 0.3;

    for (const t of teammates) {
      if (t === carrier) continue;
      let score = 0;
      const fwdProgress = (t.x - carrier.x) * carrier.goalDir;
      score += Math.min(fwdProgress / (2 * C.AI_FIELD.halfX), 0.5);
      if (this._clearLane(carrier, t)) score += 0.4;
      else score -= 0.4;
      const distToGoal = Math.abs(t.x - goalX);
      score += 0.2 * (1 - distToGoal / (2 * C.AI_FIELD.halfX));
      const nearestOpp = this._nearestOpponentDist(t);
      if (nearestOpp < 1.5) score -= 0.3;
      const passDist = Math.hypot(t.x - carrier.x, t.y - carrier.y);
      score -= passDist * 0.01;
      if (score > bestScore) { bestScore = score; best = t; }
    }
    return best;
  }

  // --- Helpers ---

  _intercept(chaser, ball) {
    const ballSpeed = Math.hypot(ball.vx, ball.vy);
    if (ballSpeed < 0.001) return { x: ball.x, y: ball.y };
    const dist = Math.hypot(ball.x - chaser.x, ball.y - chaser.y);
    const lookahead = Math.min(dist / (chaser.maxVel + ballSpeed), 30);
    return {
      x: ball.x + ball.vx * lookahead,
      y: ball.y + ball.vy * lookahead,
    };
  }

  _nearestOnTeam(team) {
    const w = this.world;
    let best = -1, bestDist = Infinity;
    for (let i = 1; i < w.entities.length; i++) {
      const e = w.entities[i];
      if (e.team !== team || e.role === 'gk') continue;
      if (e.ballDist < bestDist) { bestDist = e.ballDist; best = i; }
    }
    return best;
  }

  _opponents(e) {
    const w = this.world;
    const out = [];
    for (let i = 1; i < w.entities.length; i++) {
      const o = w.entities[i];
      if (!o.isBall && o.team !== e.team) out.push(o);
    }
    return out;
  }

  _teammates(e) {
    const w = this.world;
    const out = [];
    for (let i = 1; i < w.entities.length; i++) {
      const o = w.entities[i];
      if (!o.isBall && o.team === e.team) out.push(o);
    }
    return out;
  }

  _nearestOpponentDist(e) {
    let min = Infinity;
    for (const o of this._opponents(e)) {
      const d = Math.hypot(o.x - e.x, o.y - e.y);
      if (d < min) min = d;
    }
    return min;
  }

  // --- Post-processing ---

  _applySeparation() {
    const w = this.world;
    const dist = C.AI.separationDist;
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 1; i < w.entities.length; i++) {
        const a = w.entities[i];
        if (a.isBall) continue;
        for (let j = i + 1; j < w.entities.length; j++) {
          const b = w.entities[j];
          if (b.isBall || b.team !== a.team) continue;
          const dx = a.targetX - b.targetX;
          const dy = a.targetY - b.targetY;
          const d = Math.hypot(dx, dy) || 0.001;
          if (d < dist) {
            const push = (dist - d) / 2;
            const nx = (dx / d) * push;
            const ny = (dy / d) * push;
            a.targetX += nx; a.targetY += ny;
            b.targetX -= nx; b.targetY -= ny;
          }
        }
      }
    }
  }

  _aiActions() {
    const w = this.world;
    const physics = this.physics;
    const hasHuman = w.playerIndex > 0;
    const human = hasHuman ? w.entities[w.playerIndex] : null;

    for (let i = 1; i < w.entities.length; i++) {
      if (hasHuman && i === w.playerIndex) continue;
      const e = w.entities[i];
      if (e.catchCooldown > 0) continue;

      if (w.ballCarrier && w.ballCarrierIndex !== i && w.ballCarrier.team !== e.team) {
        if (e.state === 'PRESS' && e.ballDist < C.PHYSICS.tackleDist * 1.2) {
          physics.tackle(i);
          continue;
        }
      }

      if (!w.ballCarrier && (e.state === 'CHASE' || e.ballDist < C.PHYSICS.catchDist * 2)) {
        if (human && e.team === human.team && human.ballDist < e.ballDist) continue;
        physics.catch(i);
      }
    }
  }
}
