import { FORMATIONS, TEAMS, FIELD, HALF_PI } from '../config.js';
import { normalizeAngle } from '../utils/math.js';

export class AISystem {
  constructor(world, physics) {
    this.world = world;
    this.physics = physics;
  }
  
  update(dt) {
    const { robots, ball, ballCarrier, player } = this.world;
    
    // Determine if attacking or defending
    const isAttacking = ballCarrier?.team === TEAMS.RED;
    const formation = isAttacking ? FORMATIONS.attack : FORMATIONS.defense;
    
    // Find nearest robots to ball
    const nearestRed = this.world.getNearestToBall(TEAMS.RED);
    const nearestGreen = this.world.getNearestToBall(TEAMS.GREEN);
    
    for (const robot of robots) {
      // Skip player-controlled robot (handled by input)
      if (robot === player) continue;
      
      // Get formation index (0-4 within team)
      const teamIndex = robot.team === TEAMS.RED 
        ? robot.id - 1 
        : robot.id - 6;
      
      // Set base target from formation
      robot.targetX = this.getFormationX(formation.x[teamIndex], robot.team);
      robot.targetY = this.getFormationY(formation.y[teamIndex]);
      
      // Override for nearest robots - chase ball
      if (robot === nearestRed || robot === nearestGreen) {
        if (ballCarrier !== robot) {
          robot.targetX = ball.x;
          robot.targetY = ball.y;
        }
      }
      
      // Override for ball carrier - head to goal
      if (ballCarrier === robot) {
        if (robot.team === TEAMS.RED) {
          robot.targetX = 5;  // Attack right
        } else {
          robot.targetX = -5; // Attack left
        }
        robot.targetY = 0;
      }
      
      // Move robot towards target
      this.physics.moveRobotTowardsTarget(robot, dt);
      
      // Rotate to face ball when near target
      const distToTarget = robot.distanceToPoint(robot.targetX, robot.targetY);
      if (distToTarget < 1 && ballCarrier !== robot) {
        this.faceTarget(robot, ball.x, ball.y);
      }
      
      // AI shooting logic
      if (ballCarrier === robot && distToTarget < 1) {
        this.physics.shoot(robot, 0.5);
      }
    }
  }
  
  // Convert formation position (0-2 range) to world X
  getFormationX(value, team) {
    const ballX = this.world.ball.x + FIELD.width * 0.96;
    const fieldWidth = FIELD.width * 1.92;
    
    let x;
    if (value < 1) {
      x = ballX * value;
    } else {
      x = ballX + (fieldWidth - ballX) * (value - 1);
    }
    
    // Mirror for green team
    if (team === TEAMS.GREEN) {
      x = fieldWidth - x;
    }
    
    return x - FIELD.width * 0.96;
  }
  
  // Convert formation position (0-2 range) to world Y
  getFormationY(value) {
    const ballY = this.world.ball.y + FIELD.height * 0.9;
    const fieldHeight = FIELD.height * 1.8;
    
    let y;
    if (value < 1) {
      y = ballY * value;
    } else {
      y = ballY + (fieldHeight - ballY) * (value - 1);
    }
    
    return y - FIELD.height * 0.9;
  }
  
  faceTarget(robot, targetX, targetY) {
    const targetAngle = Math.atan2(targetY - robot.y, targetX - robot.x);
    const netRotation = robot.rotation - HALF_PI;
    const angleDiff = normalizeAngle(targetAngle - netRotation);
    
    robot.rotation += (angleDiff / 10) * this.world.timeDelta;
  }
}