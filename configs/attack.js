
export const ATTACKS = [
  {
    name: 'lightPunch',
    startup: 5,    // frames before hitbox appears
    active: 3,     // frames hitbox is active
    recovery: 10,  // frames after active before returning to idle
    hitFrame: 2,   // at which frame in active do we spawn hitbox (relative to start of active)
    damage: 5,
    knockbackX: 5,
    knockbackY: -3,
    animKey: 'lightPunch',
    offsetX: 135,    
    offsetY: 225,
    width: 30,
    height: 20,
    cooldownExtra: 5, // extra frames before next attack allowed
  },
  {
    name: 'airPunch',
    startup: 4,
    active: 2,
    recovery: 12,
    hitFrame: 1,
    damage: 4,
    knockbackX: 4,
    knockbackY: -2,
    animKey: 'airPunch',
    offsetX: 135,
    offsetY: 260,
    width: 30,
    height: 20,
    cooldownExtra: 5,
  },
  // more attack please....
];
