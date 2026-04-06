import { VS, FS } from './shaders.js';
import { createProgram, getUniformLocations } from '../util/glUtils.js';
import * as C from '../config.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2');
    if (!this.gl) throw new Error('WebGL2 not supported');
    this.ar = 1;
    this.pixScale = 1;
    this._entityBuf = new Float32Array(C.NUM_ENTITIES * 3);
    this._initGL();
    this.resize();
  }

  _initGL() {
    const gl = this.gl;
    this.program = createProgram(gl, VS, FS);
    this.uniforms = getUniformLocations(gl, this.program, [
      'iResolution', 'iTime', 'entities',
      'activerobs', 'player', 'hasball', 'power', 'ballScale',
    ]);

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]),
      gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  }

  resize() {
    const dpr = Math.floor(window.devicePixelRatio) || 1;
    let scale = dpr;
    const pix = window.innerWidth * window.innerHeight;
    if (pix > 2e6) scale = 2 * dpr;
    if (pix > 4e6) scale = 3 * dpr;
    if (pix > 8e6) scale = 4 * dpr;
    this.pixScale = scale;

    this.canvas.width  = window.innerWidth  / scale;
    this.canvas.height = window.innerHeight / scale;
    this.ar = this.canvas.width / this.canvas.height;
    this.canvas.style.imageRendering = 'pixelated';
    this.canvas.style.width  = window.innerWidth  + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
  }

  _worldToShaderX(x) { return this.ar * (x + C.WORLD.halfWidth)  / (2 * C.WORLD.halfWidth); }
  _worldToShaderY(y) { return         (y + C.WORLD.halfHeight) / (2 * C.WORLD.halfHeight); }

  draw(world, time) {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    const buf = this._entityBuf;
    for (let i = 0; i < world.entities.length; i++) {
      const e = world.entities[i];
      buf[i*3+0] = this._worldToShaderX(e.x);
      buf[i*3+1] = this._worldToShaderY(e.y);
      buf[i*3+2] = e.angle;
    }

    const u = this.uniforms;
    gl.uniform2f(u.iResolution, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.iTime, time);
    gl.uniform3fv(u.entities, buf);
    gl.uniform1i(u.activerobs, world.entities.length);
    gl.uniform1i(u.player, world.playerIndex);
    gl.uniform1i(u.hasball, world.ballCarrierIndex);
    gl.uniform1f(u.power, world.power);
    gl.uniform1f(u.ballScale, world.ballVisualScale);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}