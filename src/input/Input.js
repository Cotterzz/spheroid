import { WORLD } from '../config.js';

/**
 * Fires: 'pointerEnter', 'pointerLeave', 'actionDown', 'actionUp'
 * Exposes: pointerX, pointerY (canvas-space px), stickX, stickY, hasGamepad
 */
export class Input {
  constructor(element) {
    this.element = element;
    this.pointerX = 0;
    this.pointerY = 0;
    this.stickX = 0;
    this.stickY = 0;
    this.hasGamepad = false;
    this._gpActionHeld = false;
    this._listeners = {};
    this._attach();
  }

  on(event, cb) {
    (this._listeners[event] ||= []).push(cb);
    return this;
  }
  emit(event, ...args) {
    (this._listeners[event] || []).forEach(cb => cb(...args));
  }

  _attach() {
    const el = this.element;

    el.addEventListener('mouseover', () => this.emit('pointerEnter'));
    el.addEventListener('mouseout',  () => this.emit('pointerLeave'));
    el.addEventListener('mousedown', () => this.emit('actionDown'));
    el.addEventListener('mouseup',   () => this.emit('actionUp'));
    el.addEventListener('mousemove', e => this._setPointer(e));

    el.addEventListener('touchstart', e => {
      e.preventDefault();
      this._setPointer(e.touches[0]);
      this.emit('pointerEnter');
      this.emit('actionDown');
    }, { passive: false });

    el.addEventListener('touchmove', e => {
      e.preventDefault();
      this._setPointer(e.touches[0]);
    }, { passive: false });

    el.addEventListener('touchend', e => {
      e.preventDefault();
      this.emit('actionUp');
      this.emit('pointerLeave');
    }, { passive: false });

    window.addEventListener('gamepadconnected', e => {
      this.hasGamepad = true;
      const g = e.gamepad;
      console.log(`Gamepad ${g.index}: ${g.id} (${g.buttons.length} btns, ${g.axes.length} axes)`);
    });
    window.addEventListener('gamepaddisconnected', () => {
      this.hasGamepad = false;
    });
  }

  _setPointer(evt) {
    const rect = this.element.getBoundingClientRect();
    this.pointerX = evt.clientX - rect.left;
    this.pointerY = rect.height - (evt.clientY - rect.top) - 1; // bottom=0
  }

  /** Poll gamepad state. Called once per frame. */
  update() {
    if (!this.hasGamepad) return;
    for (const gp of navigator.getGamepads()) {
      if (!gp) continue;

      // Button 0 -> actionDown/Up edge events
      const down = gp.buttons[0]?.pressed;
      if (down && !this._gpActionHeld) { this.emit('actionDown'); this._gpActionHeld = true; }
      else if (!down && this._gpActionHeld) { this.emit('actionUp'); this._gpActionHeld = false; }

      // Left stick with deadzone
      let sx = gp.axes[0] || 0, sy = gp.axes[1] || 0;
      if (Math.abs(sx) < 0.1) sx = 0;
      if (Math.abs(sy) < 0.1) sy = 0;
      this.stickX = sx;
      this.stickY = sy;
      break;
    }
  }

  /** Compute the player's desired target position in world coordinates. */
  getAimWorld(world) {
    if (this.hasGamepad) {
      const h = world.entities[world.playerIndex];
      return { x: h.x + this.stickX * 2, y: h.y - this.stickY * 2 };
    }
    const W = WORLD.halfWidth  * 2;
    const H = WORLD.halfHeight * 2;
    return {
      x: (this.pointerX / window.innerWidth)  * W - WORLD.halfWidth,
      y: (this.pointerY / window.innerHeight) * H - WORLD.halfHeight,
    };
  }
}