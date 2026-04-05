import { Entity } from '../entities/Entity.js';
import { 
  BALL, ROBOT, TEAMS, STARTING_POSITIONS, LIMITS, FIELD 
} from '../config.js';

export class World {
  constructor() {
    this.entities = [];
    this.ball = null;
    this.robots = [];
    this.redTeam = [];
    this.greenTeam = [];
    
    // Game state
    this.ballCarrier = null;  // Reference to robot holding ball
    this.playerIndex = 1;     // Which robot the human controls
    this.score = { red: 0, green: 0 };
    
    // State machine
    this.state = 'playing'; // playing, aiming, scored, resetting
    this.shootPower = 0.1;
    this.timeDelta = 0.7;
    this.hookStrength = 1.0;
    
    this.init();
  }
  
  init() {
    // Create ball
    this.ball = new Entity({
      id: 0,
      x: STARTING_POSITIONS.ball[0],
      y: STARTING_POSITIONS.ball[1],
      mass: BALL.mass,
      radius: BALL.radius,
      maxVel: BALL.maxVel,
      isball: true
    });
    this.ball.limits = { ...LIMITS.ball };
    this.entities.push(this.ball);
    
    // Create red team robots
    STARTING_POSITIONS.red.forEach((pos, i) => {
      const robot = new Entity({
        id: i + 1,
        x: pos[0],
        y: pos[1],
        rotation: pos[2],
        mass: ROBOT.mass,
        radius: ROBOT.radius,
        maxVel: ROBOT.maxVel,
        team: TEAMS.RED
      });
      robot.limits = { ...LIMITS.robot };
      this.entities.push(robot);
      this.robots.push(robot);
      this.redTeam.push(robot);
    });
    
    // Create green team robots
    STARTING_POSITIONS.green.forEach((pos, i) => {
      const robot = new Entity({
        id: i + 6,
        x: pos[0],
        y: pos[1],
        rotation: pos[2],
        mass: ROBOT.mass,
        radius: ROBOT.radius,
        maxVel: ROBOT.maxVel,
        team: TEAMS.GREEN
      });
      robot.limits = { ...LIMITS.robot };
      this.entities.push(robot);
      this.robots.push(robot);
      this.greenTeam.push(robot);
    });
  }
  
  get player() {
    return this.entities[this.playerIndex];
  }
  
  get hasPossession() {
    return this.ballCarrier !== null;
  }
  
  get attackingTeam() {
    if (!this.ballCarrier) return null;
    return this.ballCarrier.team;
  }
  
  getEntityById(id) {
    return this.entities.find(e => e.id === id);
  }
  
  getNearestToBall(team) {
    const teamRobots = team === TEAMS.RED ? this.redTeam : this.greenTeam;
    let nearest = teamRobots[0];
    let nearestDist = nearest.distanceTo(this.ball);
    
    for (let i = 1; i < teamRobots.length; i++) {
      const dist = teamRobots[i].distanceTo(this.ball);
      if (dist < nearestDist) {
        nearest = teamRobots[i];
        nearestDist = dist;
      }
    }
    return nearest;
  }
  
  resetPositions() {
    this.ball.reset(
      STARTING_POSITIONS.ball[0],
      STARTING_POSITIONS.ball[1],
      0
    );
    
    STARTING_POSITIONS.red.forEach((pos, i) => {
      this.redTeam[i].reset(pos[0], pos[1], pos[2]);
    });
    
    STARTING_POSITIONS.green.forEach((pos, i) => {
      this.greenTeam[i].reset(pos[0], pos[1], pos[2]);
    });
    
    this.ballCarrier = null;
    this.state = 'playing';
    this.shootPower = 0.1;
    this.timeDelta = 0.7;
    this.hookStrength = 1.0;
  }
}