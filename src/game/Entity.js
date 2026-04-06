export class Entity {
  constructor({ x = 0, y = 0, angle = 0, mass = 1, radius = 0.2,
                maxVel = 0.13, team = 'ball', limits = {} }) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = angle;
    this.mass = mass;
    this.radius = radius;
    this.maxVel = maxVel;
    this.team = team;       // 'ball' | 'red' | 'green'
    this.limits = limits;   // {top, bottom, left, right}

    // Steering state
    this.targetX = 0;
    this.targetY = 0;
    this.targetDist = 0;
    this.targetAngle = 0;
    this.desiredSpeed = 0;
    this.ballDist = Infinity;

    // Tackle/catch state
    this.catchCooldown = 0;
  }

  get isBall()  { return this.team === 'ball';  }
  get isRed()   { return this.team === 'red';   }
  get isGreen() { return this.team === 'green'; }
}