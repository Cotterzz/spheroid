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

    if (w.ballCarrier) {
      w.attacking = w.ballCarrierIndex < C.GREEN_RANGE[0];
    }
    const form = w.attacking ? C.FORMATIONS.attack : C.FORMATIONS.defense;

    // Formation positions for all non-human robots
    for (let i = 1; i < w.entities.length; i++) {
      if (i === w.playerIndex) continue;
      w.entities[i].targetX = this._formX(form.x[i], ball.x);
      w.entities[i].targetY = this._formY(form.y[i], ball.y);
    }

    // Human aim
    const human = w.entities[w.playerIndex];
    const aim = this.input.getAimWorld(w);
    human.targetX = aim.x;
    human.targetY = aim.y;

    // Nearest non-human red pursues ball
    if (w.nearestRed !== w.playerIndex) {
      w.entities[w.nearestRed].targetX = ball.x;
      w.entities[w.nearestRed].targetY = ball.y;
    }
    // Nearest green pursues ball
    w.entities[w.nearestGreen].targetX = ball.x;
    w.entities[w.nearestGreen].targetY = ball.y;

    // AI carrier heads for opposing goal
    if (w.ballCarrier && w.ballCarrierIndex !== w.playerIndex) {
      const c = w.entities[w.ballCarrierIndex];
      c.targetX = c.isGreen ? -5 : 5;
      c.targetY = 0;
    }

    this._aiActions();
  }

  _aiActions() {
    const w = this.world;
    const physics = this.physics;
    const human = w.entities[w.playerIndex];

    for (let i = 1; i < w.entities.length; i++) {
      if (i === w.playerIndex) continue;
      const e = w.entities[i];
      if (e.catchCooldown > 0) continue;

      if (w.ballCarrier && w.ballCarrierIndex !== i && w.ballCarrier.team !== e.team) {
        if (e.ballDist < C.PHYSICS.tackleDist * 1.2) {
          physics.tackle(i);
          continue;
        }
      }

      if (!w.ballCarrier) {
        if (e.team === human.team && human.ballDist < e.ballDist) continue;
        physics.catch(i);
      }
    }
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