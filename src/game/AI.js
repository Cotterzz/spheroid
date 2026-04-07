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

    if (w.ballCarrier) {
      w.attacking = w.ballCarrier.isRed;
    }
    const form = w.attacking ? C.FORMATIONS.attack : C.FORMATIONS.defense;

    for (let i = 1; i < w.entities.length; i++) {
      if (hasHuman && i === w.playerIndex) continue;
      const e = w.entities[i];
      if (e.role === 'gk') {
        this._keeperTarget(e, ball);
        continue;
      }
      const fi = Math.min(i, form.x.length - 1);
      e.targetX = this._formX(form.x[fi], ball.x);
      e.targetY = this._formY(form.y[fi], ball.y);
    }

    if (hasHuman) {
      const human = w.entities[w.playerIndex];
      const aim = this.input.getAimWorld(w);
      human.targetX = aim.x;
      human.targetY = aim.y;
    }

    if (w.nearestRed >= 0 && (!hasHuman || w.nearestRed !== w.playerIndex)
        && w.entities[w.nearestRed].role !== 'gk') {
      const p = this._intercept(w.entities[w.nearestRed], ball);
      w.entities[w.nearestRed].targetX = p.x;
      w.entities[w.nearestRed].targetY = p.y;
    }
    if (w.nearestGreen >= 0 && w.entities[w.nearestGreen].role !== 'gk') {
      const p = this._intercept(w.entities[w.nearestGreen], ball);
      w.entities[w.nearestGreen].targetX = p.x;
      w.entities[w.nearestGreen].targetY = p.y;
    }

    if (w.ballCarrier && (!hasHuman || w.ballCarrierIndex !== w.playerIndex)) {
      const c = w.entities[w.ballCarrierIndex];
      c.targetX = c.isGreen ? -5 : 5;
      c.targetY = 0;
    }

    this._aiActions();
    this._applySeparation();
    this._unstick();
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
        if (e.ballDist < C.PHYSICS.tackleDist * 1.2) {
          physics.tackle(i);
          continue;
        }
      }

      if (!w.ballCarrier) {
        if (human && e.team === human.team && human.ballDist < e.ballDist) continue;
        physics.catch(i);
      }
    }
  }

  _keeperTarget(e, ball) {
    const goalX = e.isRed ? -C.AI_FIELD.halfX : C.AI_FIELD.halfX;
    const lineX = goalX + (e.isRed ? 1.0 : -1.0);
    const goalHalfW = C.WORLD.goalTop;
    const ballDist = Math.hypot(ball.x - e.x, ball.y - e.y);

    if (!this.world.ballCarrier && ballDist < 2.0) {
      e.targetX = ball.x;
      e.targetY = ball.y;
    } else {
      e.targetX = lineX;
      e.targetY = Math.max(-goalHalfW, Math.min(goalHalfW, ball.y));
    }
  }

  _applySeparation() {
    const w = this.world;
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
          if (d < C.MIN_SPACING) {
            const push = (C.MIN_SPACING - d) / 2;
            const nx = (dx / d) * push;
            const ny = (dy / d) * push;
            a.targetX += nx; a.targetY += ny;
            b.targetX -= nx; b.targetY -= ny;
          }
        }
      }
    }
  }

  _unstick() {
    const w = this.world;
    for (let i = 1; i < w.entities.length; i++) {
      const e = w.entities[i];
      if (e.isBall) continue;
      const moved = Math.hypot(e.x - e.staleX, e.y - e.staleY);
      if (moved < C.STALE_THRESHOLD) {
        e.staleTicks++;
      } else {
        e.staleTicks = 0;
        e.staleX = e.x;
        e.staleY = e.y;
      }
      if (e.staleTicks > C.STALE_TICKS) {
        e.targetX += (0 - e.x) * 0.3;
        e.targetY += (0 - e.y) * 0.3;
        e.staleTicks = 0;
        e.staleX = e.x;
        e.staleY = e.y;
      }
    }
  }

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

  _formX(n, ballX) {
    const H = C.AI_FIELD.halfX;
    const bx = ballX + H;
    return n < 1 ? (bx * n) - H : (bx + ((2*H - bx) * (n - 1))) - H;
  }
  _formY(n, ballY) {
    const H = C.AI_FIELD.halfY;
    const by = ballY + H;
    return n < 1 ? (by * n) - H : (by + ((2*H - by) * (n - 1))) - H;
  }
}
