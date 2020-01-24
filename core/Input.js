const CANVAS_WIDTH = 400 * 3
const CANVAS_HEIGHT = 300 * 3

export default class Input {
  constructor() {
    this.leftMouse = -2
    this.rightMouse = -2
    this.middleMouse = -2

    document.addEventListener('mousedown', evt => {
      if (evt.button == 0) {
        this.leftMouse = 1
      } else if (evt.button == 1) {
        this.middleMouse = 1
      } else if (evt.button == 2) {
        this.rightMouse = 1
      }
    })

    document.addEventListener('mouseup', evt => {
      if (evt.button == 0) {
        this.leftMouse = -1
      } else if (evt.button == 1) {
        this.middleMouse = -1
      } else if (evt.button == 2) {
        this.rightMouse = -1
      }
    })

    document.addEventListener('contextmenu', evt => evt.preventDefault())

    this.mousePos = this.mousePosDelta = { x: 0, y: 0 }

    document.addEventListener('mousemove', evt => {
      const ndc = {
        // (0, 0) is middle of canvas and (1, 1) is top right.
        x: (evt.clientX / CANVAS_WIDTH) * 2 - 1,
        y: -(evt.clientY / CANVAS_HEIGHT) * 2 + 1,
      }

      this.mousePosDelta = {
        x: this.mousePosDelta.x + ndc.x - this.mousePos.x,
        y: this.mousePosDelta.y + ndc.y - this.mousePos.y,
      }
      this.mousePos = ndc
    })
  }

  process(camera) {
    this.leftMouse += Math.sign(this.leftMouse)
    this.rightMouse += Math.sign(this.rightMouse)
    this.middleMouse += Math.sign(this.middleMouse)

    this.mousePosDelta = { x: 0, y: 0 }
  }

  isDown(key) {
    return this[key] > 0
  }

  justDown(key) {
    return this[key] == 1
  }

  isUp(key) {
    return this[key] < 0
  }

  justUp(key) {
    return this[key] == -1
  }
}
