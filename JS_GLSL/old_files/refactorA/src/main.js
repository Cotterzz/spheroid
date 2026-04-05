import { World } from './world/World.js';
import { InputSystem } from './systems/InputSystem.js';
import { PhysicsSystem } from './systems/PhysicsSystem.js';
import { AISystem } from './systems/AISystem.js';
import { RenderSystem } from './systems/RenderSystem.js';
import { PHYSICS, TEAMS } from './config.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('canvas');
    
    // Core systems
    this.world = new World();
    this.input = new InputSystem(this.canvas);
    this.physics = new PhysicsSystem(this.world);
    this.ai = new AISystem(this.world, this.physics);
    this.renderer = new RenderSystem(this.canvas);
    
    // Timing
    this.lastTime = 0;
    this.running = false;
    this.animationId = null;
    
    // Bind methods
    this.loop = this.loop.bind(this);
    
    // Setup input callbacks
    this.input.onFocusGained = () => this.start();
    this.input.onFocusLost = () => this.stop();
    
    // Start initially
    this.start();
  }
  
  start() {
    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      this.animationId = requestAnimationFrame(this.loop);
    }
  }
  
  stop() {
    if (this.running) {
      this.running = false;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    }
  }
  
  loop(now) {
    if (!this.running) return;
    
    // Calculate delta time (capped at 100ms)
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    
    // Update input
    this.input.update();
    
    // Handle game state
    this.updateGameState();
    
    // Update player targeting from input
    this.updatePlayerInput();
    
    // Update AI
    this.ai.update(dt);
    
    // Update physics
    this.physics.update(dt);
    
    // Render
    this.renderer.render(this.world, this.input, dt);
    
    // Schedule next frame
    this.animationId = requestAnimationFrame(this.loop);
  }
  
  updateGameState() {
    const { world, input } = this;
    const player = world.player;
    const isPlayerCarrier = world.ballCarrier === player;
    
    // Handle action button
    if (input.actionPressed && isPlayerCarrier) {
      // Start aiming
      world.state = 'aiming';
    }
    
    if (world.state === 'aiming') {
      // Charge power
      if (world.timeDelta > 0.1) {
        world.timeDelta *= 0.98;
      }
      if (world.hookStrength > 0.9) {
        world.hookStrength *= 0.98;
      }
      if (world.shootPower < PHYSICS.powerMax) {
        world.shootPower *= PHYSICS.powerChargeRate;
      }
      
      // Release shot
      if (input.actionReleased) {
        this.physics.shoot(player, world.shootPower);
        world.state = 'playing';
        world.shootPower = PHYSICS.powerMin;
        world.timeDelta = PHYSICS.normalDelta;
        world.hookStrength = PHYSICS.hookStrength;
      }
    }
    
    // Reset state if player loses ball
    if (world.state === 'aiming' && !isPlayerCarrier) {
      world.state = 'playing';
      world.shootPower = PHYSICS.powerMin;
      world.timeDelta = PHYSICS.normalDelta;
      world.hookStrength = PHYSICS.hookStrength;
    }
  }
  
  updatePlayerInput() {
    const { world, input, physics } = this;
    const player = world.player;
    
    // Get target position from input
    const aimPos = input.getAimPosition(player.x, player.y);
    player.targetX = aimPos.x;
    player.targetY = aimPos.y;
    
    // Move player towards target
    physics.moveRobotTowardsTarget(player, 1/60);
  }
}

// Start the game
const game = new Game();

// Expose for debugging
window.game = game;