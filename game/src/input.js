// Keyboard + mouse input. Keys are tracked as a held set plus an edge set
// (pressed this frame). G.press() in the debug hooks feeds the same sets,
// so automated playtests drive the exact code path a player does.
const Input = {
  keys: new Set(),
  pressed: new Set(),
  mouseDX: 0, mouseDY: 0, mouseDown: false, mousePressed: false,
  locked: false,

  bind(canvas) {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      Input.keys.add(e.code);
      Input.pressed.add(e.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { Input.keys.delete(e.code); });
    window.addEventListener('blur', () => { Input.keys.clear(); });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { Input.mouseDown = true; Input.mousePressed = true; }
      if (document.pointerLockElement !== canvas) canvas.requestPointerLock?.();
    });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) Input.mouseDown = false; });
    document.addEventListener('pointerlockchange', () => {
      Input.locked = document.pointerLockElement === canvas;
    });
    document.addEventListener('mousemove', (e) => {
      if (Input.locked) { Input.mouseDX += e.movementX; Input.mouseDY += e.movementY; }
    });
  },

  down(code) { return Input.keys.has(code); },
  hit(code) { return Input.pressed.has(code); },
  // WASD or arrows, as -1/0/1.
  moveAxis() {
    const f = (Input.down('KeyW') || Input.down('ArrowUp') ? 1 : 0) - (Input.down('KeyS') || Input.down('ArrowDown') ? 1 : 0);
    const s = (Input.down('KeyD') || Input.down('ArrowRight') ? 1 : 0) - (Input.down('KeyA') || Input.down('ArrowLeft') ? 1 : 0);
    return { f, s };
  },
  endFrame() {
    Input.pressed.clear();
    Input.mouseDX = 0; Input.mouseDY = 0; Input.mousePressed = false;
  },
};
