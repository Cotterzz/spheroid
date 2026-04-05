import { INPUT } from '../config.js';

export class InputSystem {
  constructor(canvas) {
    this.canvas = canvas;
    
    // Mouse state
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    
    // Gamepad state
    this.gamepadConnected = false;
    this.leftStickX = 0;
    this.leftStickY = 0;
    this.buttonA = false;
    
    // Normalized world coordinates
    this.aimX = 0;
    this.aimY = 0;
    
    // Actions (consumed by game logic)
    this.actionPressed = false;
    this.actionReleased = false;
    
    // Callbacks
    this.onFocusGained = null;
    this.onFocusLost = null;
    
    this.init();
  }
  
  init() {
    // Mouse events
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseover', () => this.onFocus());
    this.canvas.addEventListener('mouseout', () => this.onBlur());
    
    // Touch events
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.onFocus();
      this.onMouseDown(e.touches[0]);
    }, { passive: false });
    
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.onMouseMove(e.touches[0]);
    }, { passive: false });
    
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.onMouseUp(e);
      this.onBlur();
    }, { passive: false });
    
    // Gamepad
    window.addEventListener('gamepadconnected', (e) => {
      this.gamepadConnected = true;
      console.log(`Gamepad connected: ${e.gamepad.id}`);
    });
    
    window.addEventListener('gamepaddisconnected', () => {
      this.gamepadConnected = false;
    });
  }
  
  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = rect.height - (e.clientY - rect.top) - 1;
    
    // Convert to world coordinates (-10 to 10 x, -6 to 6 y)
    this.aimX = ((this.mouseX / rect.width) * 20) - 10;
    this.aimY = ((this.mouseY / rect.height) * 12) - 6;
  }
  
  onMouseDown(e) {
    this.mouseDown = true;
    this.actionPressed = true;
  }
  
  onMouseUp(e) {
    this.mouseDown = false;
    this.actionReleased = true;
  }
  
  onFocus() {
    if (this.onFocusGained) this.onFocusGained();
  }
  
  onBlur() {
    if (this.onFocusLost) this.onFocusLost();
  }
  
  update() {
    // Reset single-frame actions
    this.actionPressed = false;
    this.actionReleased = false;
    
    // Poll gamepad
    if (this.gamepadConnected) {
      this.pollGamepad();
    }
  }
  
  pollGamepad() {
    const gamepads = navigator.getGamepads();
    
    for (const gamepad of gamepads) {
      if (!gamepad) continue;
      
      // Buttons
      const wasButtonA = this.buttonA;
      this.buttonA = gamepad.buttons[0]?.pressed || false;
      
      if (this.buttonA && !wasButtonA) {
        this.actionPressed = true;
      }
      if (!this.buttonA && wasButtonA) {
        this.actionReleased = true;
      }
      
      // Left stick
      let lsx = gamepad.axes[0] || 0;
      let lsy = gamepad.axes[1] || 0;
      
      // Apply deadzone
      if (Math.abs(lsx) < INPUT.deadzone) lsx = 0;
      if (Math.abs(lsy) < INPUT.deadzone) lsy = 0;
      
      this.leftStickX = lsx;
      this.leftStickY = lsy;
      
      // Only use first connected gamepad
      break;
    }
  }
  
  // Get aim position based on input method
  getAimPosition(currentX, currentY) {
    if (this.gamepadConnected && (this.leftStickX !== 0 || this.leftStickY !== 0)) {
      // Gamepad: relative to current position
      return {
        x: currentX + this.leftStickX * 2,
        y: currentY - this.leftStickY * 2
      };
    } else {
      // Mouse: absolute world position
      return {
        x: this.aimX,
        y: this.aimY
      };
    }
  }
}