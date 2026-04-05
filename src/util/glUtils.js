export function compileShader(gl, src, type) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:\n' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function createProgram(gl, vsSrc, fsSrc) {
  const vs = compileShader(gl, vsSrc, gl.VERTEX_SHADER);
  const fs = compileShader(gl, fsSrc, gl.FRAGMENT_SHADER);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:\n' + gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export function getUniformLocations(gl, program, names) {
  const out = {};
  for (const name of names) out[name] = gl.getUniformLocation(program, name);
  return out;
}