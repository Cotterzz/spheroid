// Mathematical constants
export const HALF_PI = Math.PI / 2;
export const TWO_PI = Math.PI * 2;
export const PI = Math.PI;

// Field dimensions (world coordinates)
export const FIELD = {
  width: 10,
  height: 6,
  border: 0.05,
  goalWidth: 0.2,
  goalTop: 1.5,
  goalBottom: -1.5
};

// Entity properties
export const BALL = {
  radius: 0.2,
  mass: 1,
  maxVel: 0.13,
  hookDistance: 1.3,
  captureDistance: 0.3,
  escapeDistance: 0.4
};

export const ROBOT = {
  radius: 0.7,
  mass: 5,
  maxVel: 0.13,
  agility: 2,
  turnSpeed: 10
};

// Physics
export const PHYSICS = {
  damping: 0.98,
  hookStrength: 0.9,
  slowHookStrength: 0.9,
  normalDelta: 0.7,
  slowDelta: 0.1,
  powerMin: 0.1,
  powerMax: 1.0,
  powerChargeRate: 1.02,
  collisionDistance: 3
};

// Limits (computed from field + entity sizes)
export const LIMITS = {
  ball: {
    top: FIELD.height * 0.85,
    bottom: -FIELD.height * 0.85,
    left: -FIELD.width * 0.93,
    right: FIELD.width * 0.93
  },
  robot: {
    top: FIELD.height * 0.78,
    bottom: -FIELD.height * 0.78,
    left: -FIELD.width * 0.89,
    right: FIELD.width * 0.89
  }
};

// Team configuration
export const TEAMS = {
  RED: 'red',
  GREEN: 'green'
};

// Starting positions [x, y, rotation]
export const STARTING_POSITIONS = {
  ball: [0, 0],
  red: [
    [-2, 0, HALF_PI],
    [-4, 2, HALF_PI],
    [-4, -2, HALF_PI],
    [-6, 2, HALF_PI],
    [-6, -2, HALF_PI]
  ],
  green: [
    [2, 0, -HALF_PI],
    [4, 2, -HALF_PI],
    [4, -2, -HALF_PI],
    [6, 2, -HALF_PI],
    [6, -2, -HALF_PI]
  ]
};

// AI formation positions (normalized 0-2 range)
export const FORMATIONS = {
  attack: {
    x: [0.2, 0.4, 0.6, 0.8, 1.2],
    y: [1.0, 1.5, 0.5, 1.7, 0.3]
  },
  neutral: {
    x: [0.25, 0.25, 0.7, 0.7, 0.8],
    y: [0.5, 1.5, 0.25, 1.75, 1.0]
  },
  defense: {
    x: [0.1, 0.2, 0.2, 0.5, 0.5],
    y: [1.0, 1.7, 0.3, 0.7, 1.3]
  }
};

// Input
export const INPUT = {
  deadzone: 0.1,
  smallDeadzone: 0.05
};

// Renderer
export const RENDER = {
  maxPixelArea: 2000000,
  medPixelArea: 4000000,
  highPixelArea: 8000000
};