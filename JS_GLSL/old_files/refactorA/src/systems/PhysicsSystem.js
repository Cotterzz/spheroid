import { 
  PHYSICS, BALL, HALF_PI, FIELD, TEAMS 
} from '../config.js';
import { normalizeAngle } from '../utils/math.js';

export class PhysicsSystem {
  constructor(world) {
    this.world = world;
  }
  
  update(dt) {
    const { entities, ball, ballCarrier, timeDelta } = this.world;
    const scaledDt = timeDelta;
    
    // Update ball position if carried
    if (ballCarrier) {
      this.updateCarriedBall(ball, ballCarrier);
    }
    
    // Update all entities
    for (const entity of entities) {
      if (!entity.active) continue;
      
      // Skip ball position update if carried (already handled)
      if (entity.isBall && ballCarrier) {
        continue;
      }
      
      // Apply velocity
      entity.x += entity.vx * scaledDt;
      entity.y += entity.vy * scaledDt;
      
      // Apply damping
      entity.vx *= PHYSICS.damping;
      entity.vy *= PHYSICS.damping;
      
      // Check boundaries
      this.checkBoundaries(entity);
    }
    
    // Check collisions between all pairs
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        this.checkCollision(entities[i], entities[j]);
      }
    }
    
    // Check ball capture/escape
    if (ballCarrier) {
      this.checkBallEscape();
    } else {
      this.checkBallCapture();
    }
    
    // Check goals
    this.checkGoals();
  }
  
  updateCarriedBall(ball, carrier) {
    const holdPos = carrier.getOffsetPosition(
      BALL.hookDistance * this.world.hookStrength
    );
    ball.x = holdPos.x;
    ball.y = holdPos.y;
  }
  
  checkBoundaries(entity) {
    const { limits } = entity;
    
    if (entity.isBall) {
      // Ball has special goal handling
      const inGoalZone = entity.y < FIELD.goalTop && entity.y > FIELD.goalBottom;
      
      if (!inGoalZone) {
        if (entity.x > limits.right) {
          entity.x = limits.right;
          entity.vx = -entity.vx;
        }
        if (entity.x < limits.left) {
          entity.x = limits.left;
          entity.vx = -entity.vx;
        }
      }
    } else {
      // Normal boundary checking
      if (entity.x > limits.right) {
        entity.x = limits.right;
        entity.vx = -entity.vx;
      }
      if (entity.x < limits.left) {
        entity.x = limits.left;
        entity.vx = -entity.vx;
      }
    }
    
    if (entity.y > limits.top) {
      entity.y = limits.top;
      entity.vy = -entity.vy;
    }
    if (entity.y < limits.bottom) {
      entity.y = limits.bottom;
      entity.vy = -entity.vy;
    }
  }
  
  checkCollision(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = a.radius + b.radius;
    
    if (dist >= minDist) return;
    
    // Collision response
    const angle = Math.atan2(dy, dx);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    // Rotate velocities
    const vx1 = cos * a.vx + sin * a.vy;
    const vy1 = cos * a.vy - sin * a.vx;
    const vx2 = cos * b.vx + sin * b.vy;
    const vy2 = cos * b.vy - sin * b.vx;
    
    // Conservation of momentum
    const P = vx1 * a.mass + vx2 * b.mass;
    const V = vx1 - vx2;
    const totalMass = a.mass + b.mass;
    
    const vx1Final = (P - b.mass * V) / totalMass;
    const vx2Final = V + vx1Final;
    
    // Rotate back
    a.vx = cos * vx1Final - sin * vy1;
    a.vy = cos * vy1 + sin * vx1Final;
    b.vx = cos * vx2Final - sin * vy2;
    b.vy = cos * vy2 + sin * vx2Final;
    
    // Separate entities
    const overlap = (minDist - dist) / 2;
    const sepX = cos * overlap;
    const sepY = sin * overlap;
    a.x -= sepX;
    a.y -= sepY;
    b.x += sepX;
    b.y += sepY;
  }
  
  checkBallCapture() {
    const { ball, robots } = this.world;
    
    for (const robot of robots) {
      const holdPos = robot.getOffsetPosition(PHYSICS.hookStrength);
      const dx = ball.x - holdPos.x;
      const dy = ball.y - holdPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < BALL.captureDistance) {
        this.world.ballCarrier = robot;
        
        // Auto-switch player to capturing robot if on red team
        if (robot.team === TEAMS.RED) {
          this.world.playerIndex = robot.id;
        }
        break;
      }
    }
  }
  
  checkBallEscape() {
    const { ball, ballCarrier, hookStrength } = this.world;
    
    const holdPos = ballCarrier.getOffsetPosition(hookStrength);
    const dx = ball.x - holdPos.x;
    const dy = ball.y - holdPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > BALL.escapeDistance) {
      // Ball escapes
      ball.vx = ballCarrier.vx;
      ball.vy = ballCarrier.vy;
      this.world.ballCarrier = null;
    }
  }
  
  checkGoals() {
    const { ball } = this.world;
    
    // Right goal (green scores on red)
    if (ball.x > FIELD.width * 0.93 + 1) {
      this.world.score.green++;
      this.world.resetPositions();
      return;
    }
    
    // Left goal (red scores on green)
    if (ball.x < -FIELD.width * 0.93 - 1) {
      this.world.score.red++;
      this.world.resetPositions();
      return;
    }
  }
  
  shoot(robot, power) {
    const { ball } = this.world;
    
    this.world.ballCarrier = null;
    
    ball.vx = robot.vx + power * Math.cos(robot.rotation - HALF_PI);
    ball.vy = robot.vy + power * Math.sin(robot.rotation - HALF_PI);
    
    // Give ball a small push away
    ball.x += ball.vx;
    ball.y += ball.vy;
  }
  
  moveRobotTowardsTarget(robot, dt) {
    const dx = robot.targetX - robot.x;
    const dy = robot.targetY - robot.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const targetAngle = Math.atan2(dy, dx);
    
    // Calculate velocity based on distance
    let speed = robot.maxVel;
    if (dist < PHYSICS.collisionDistance) {
      speed = robot.maxVel * (dist / PHYSICS.collisionDistance);
    }
    
    // Target velocity
    const targetVx = speed * Math.cos(targetAngle);
    const targetVy = speed * Math.sin(targetAngle);
    
    // Calculate angle difference
    const netRotation = robot.rotation - HALF_PI;
    let angleDiff = normalizeAngle(targetAngle - netRotation);
    
    // Only move if facing roughly the right direction
    if (Math.abs(angleDiff) < 1.9) {
      robot.vx += (targetVx - robot.vx) / ROBOT.agility;
      robot.vy += (targetVy - robot.vy) / ROBOT.agility;
    }
    
    // Rotate towards target
    robot.rotation += (angleDiff / ROBOT.turnSpeed) * this.world.timeDelta;
    robot.rotation = robot.rotation % (Math.PI * 2);
  }
}