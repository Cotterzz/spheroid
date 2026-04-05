import { HALF_PI } from '../config.js';

export class Entity {
  constructor({
    id,
    x = 0,
    y = 0,
    rotation = 0,
    mass = 1,
    radius = 0.5,
    maxVel = 0.13,
    team = null,
    isball = false
  }) {
    this.id = id;
    
    // Position
    this.x = x;
    this.y = y;
    this.rotation = rotation;
    
    // Velocity
    this.vx = 0;
    this.vy = 0;
    
    // Properties
    this.mass = mass;
    this.radius = radius;
    this.maxVel = maxVel;
    this.team = team;
    this.isBall = isball;
    
    // Targeting (for AI/physics)
    this.targetX = x;
    this.targetY = y;
    this.targetAngle = rotation;
    
    // Limits (can be customized per entity)
    this.limits = {
      top: 4.7,
      bottom: -4.7,
      left: -8.9,
      right: 8.9
    };
    
    // State
    this.active = true;
  }
  
  get speed() {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  }
  
  get netRotation() {
    return this.rotation - HALF_PI;
  }
  
  distanceTo(other) {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  angleTo(other) {
    return Math.atan2(other.y - this.y, other.x - this.x);
  }
  
  distanceToPoint(x, y) {
    const dx = x - this.x;
    const dy = y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  angleToPoint(x, y) {
    return Math.atan2(y - this.y, x - this.x);
  }
  
  // Get position offset by rotation (for ball holding)
  getOffsetPosition(distance, angleOffset = 0) {
    const angle = this.rotation - HALF_PI + angleOffset;
    return {
      x: this.x + distance * Math.cos(angle),
      y: this.y + distance * Math.sin(angle)
    };
  }
  
  reset(x, y, rotation) {
    this.x = x;
    this.y = y;
    this.rotation = rotation;
    this.vx = 0;
    this.vy = 0;
    this.targetX = x;
    this.targetY = y;
  }
}