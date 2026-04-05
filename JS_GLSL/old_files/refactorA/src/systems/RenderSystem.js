import { vertexShader } from '../shaders/vertex.js';
import { fragmentShader } from '../shaders/fragment.js';
import { createProgram, createShader } from '../utils/webgl.js';
import { RENDER, HALF_PI } from '../config.js';

export class RenderSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2');
    
    if (!this.gl) {
      throw new Error('WebGL2 not supported');
    }
    
    this.program = null;
    this.vao = null;
    this.uniforms = {};
    this.aspectRatio = 1;
    this.pixelScale = 1;
    this.time = 0;
    
    this.init();
  }
  
  init() {
    const gl = this.gl;
    
    // Create shader program
    this.program = createProgram(
      gl,
      createShader(gl, gl.VERTEX_SHADER, vertexShader),
      createShader(gl, gl.FRAGMENT_SHADER, fragmentShader)
    );
    
    // Get uniform locations
    const uniformNames = [
      'iResolution', 'iMouse', 'iTime',
      'pos0', 'pos1', 'pos2', 'pos3', 'pos4', 'pos5',
      'pos6', 'pos7', 'pos8', 'pos9', 'pos10',
      'activerobs', 'player', 'hasball'
    ];
    
    for (const name of uniformNames) {
      this.uniforms[name] = gl.getUniformLocation(this.program, name);
    }
    
    // Create VAO for fullscreen quad
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,  1, -1,  -1, 1,
        -1,  1,  1, -1,   1, 1
      ]),
      gl.STATIC_DRAW
    );
    
    const positionLoc = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
  }
  
  resize() {
    const dpr = Math.floor(window.devicePixelRatio);
    const area = window.innerWidth * window.innerHeight;
    
    // Scale down for large screens
    if (area > RENDER.highPixelArea) {
      this.pixelScale = 4 * dpr;
    } else if (area > RENDER.medPixelArea) {
      this.pixelScale = 3 * dpr;
    } else if (area > RENDER.maxPixelArea) {
      this.pixelScale = 2 * dpr;
    } else {
      this.pixelScale = dpr;
    }
    
    this.canvas.width = window.innerWidth / this.pixelScale;
    this.canvas.height = window.innerHeight / this.pixelScale;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    
    this.aspectRatio = this.canvas.width / this.canvas.height;
  }
  
  // Transform world coordinates to shader coordinates
  transformX(x) {
    return (this.aspectRatio / 2) + (x / 10) * (this.aspectRatio / 2);
  }
  
  transformY(y) {
    return 0.5 + (y / 6) * 0.5;
  }
  
  render(world, input, deltaTime) {
    this.time += deltaTime * world.timeDelta;
    
    const gl = this.gl;
    
    this.resize();
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    
    // Set uniforms
    gl.uniform2f(this.uniforms.iResolution, gl.canvas.width, gl.canvas.height);
    gl.uniform2f(this.uniforms.iMouse, input.mouseX, input.mouseY);
    gl.uniform1f(this.uniforms.iTime, this.time);
    
    // Entity positions
    const entities = world.entities;
    
    // Ball (pos0 is vec2)
    gl.uniform2f(
      this.uniforms.pos0,
      this.transformX(entities[0].x),
      this.transformY(entities[0].y)
    );
    
    // Robots (pos1-10 are vec3 with rotation)
    for (let i = 1; i <= 10; i++) {
      const e = entities[i];
      gl.uniform3f(
        this.uniforms[`pos${i}`],
        this.transformX(e.x),
        this.transformY(e.y),
        e.rotation
      );
    }
    
    // Game state
    gl.uniform1i(this.uniforms.activerobs, world.robots.length + 1);
    gl.uniform1i(this.uniforms.hasball, world.ballCarrier?.id || 0);
    gl.uniform1i(this.uniforms.player, world.playerIndex);
    
    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}