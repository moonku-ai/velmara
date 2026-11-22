/* input.js — keyboard + mouse state. Held keys steer; one-shot presses are queued once. */
VEL.Input = {
  keys: {}, pressed: {}, mouseX: 0, mouseY: 0, mouseDown: false, mouseClicked: false,
  init(canvas) {
    addEventListener('keydown', (e) => {
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
      if (!this.keys[e.code]) this.pressed[e.code] = true;
      this.keys[e.code] = true;
    });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; });
    canvas.addEventListener('mousemove', (e) => { this.mouseX = e.clientX; this.mouseY = e.clientY; });
    canvas.addEventListener('mousedown', (e) => { if (e.button === 0) { this.mouseDown = true; this.mouseClicked = true; } });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.mouseDown = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  },
  down(code) { return !!this.keys[code]; },
  hit(code) { const v = !!this.pressed[code]; if (v) this.pressed[code] = false; return v; },
  consumeClick() { const v = this.mouseClicked; this.mouseClicked = false; return v; },
  endFrame() { this.pressed = {}; this.mouseClicked = false; },
  axis() {
    let x = 0, y = 0;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    if (this.down('KeyW') || this.down('ArrowUp')) y -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) y += 1;
    return { x, y };
  },
};
