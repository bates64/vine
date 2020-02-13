import VirtualMachine from './vm/VirtualMachine.js'
import { s2t, t2s, n2t, t2n } from './vm/ALU.js'

import assemble from './asm/assemble.js'

const vm = new VirtualMachine()

document.querySelector('#reset').addEventListener('click', () => {
  vm.reset()

  console.clear()

  const asm = assemble(document.querySelector('#asm').value)

  // Copy the object code to ROM
  for (let i = 0; i < asm.length; i++) {
    vm.rom.store(n2t(i), asm[i])
  }

  // Reset registers
  for (let i = 0; i < 12; i++) {
    let val = s2t('o')
    vm.registers[i].set(val)
    document.querySelector('#r' + i).textContent = t2s(val) + ' ' + t2n(val)
  }
})

document.querySelector('#step').addEventListener('click', () => {
  console.log('step pc =', t2s(vm.nextInstruction))

  // Execute instruction
  vm.next()

  // Dump registers
  for (let i = 0; i < 12; i++) {
    let val = vm.registers[i].get()
    document.querySelector('#r' + i).textContent = t2s(val) + ' ' + t2n(val)
  }
})

import * as THREE from '../web_modules/three.js'

class Vine {
  canvas2D: HTMLCanvasElement
  canvas3D: HTMLCanvasElement

  ctx: CanvasRenderingContext2D

  scene: THREE.Scene
  renderer: THREE.WebGLRenderer
  camera: THREE.Camera

  constructor(parent: HTMLElement) {
    this.canvas2D = document.createElement('canvas') as HTMLCanvasElement
    this.canvas2D.width = 360
    this.canvas2D.height = 360

    this.canvas3D = document.createElement('canvas') as HTMLCanvasElement

    this.ctx = this.canvas2D.getContext('2d') as CanvasRenderingContext2D

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('grey')

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas3D,
      antialias: false,
    })
    this.renderer.setSize(360, 360)

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000)

    this.canvas2D.style.position = this.canvas3D.style.position = 'absolute'
    this.canvas2D.style.top = this.canvas3D.style.top = '0'
    this.canvas2D.style.left = this.canvas3D.style.left = '0'
    this.canvas2D.style.width = this.canvas3D.style.width = '720px'
    this.canvas2D.style.height = this.canvas3D.style.height = '720px'
    this.canvas2D.style.imageRendering = this.canvas3D.style.imageRendering = 'optimizespeed'

    parent.style.position = 'relative'
    parent.style.width = '720px'
    parent.style.height = '720px'

    // 2D appears above 3D
    parent.appendChild(this.canvas3D)
    parent.appendChild(this.canvas2D)
  }

  draw() {
    // Draw 2D
    this.ctx.clearRect(0, 0, 360, 360)
    this.ctx.fillStyle = 'red'
    this.ctx.fillRect(0, 0, 1, 1)

    // Draw 3D
    this.renderer.render(this.scene, this.camera)
  }
}

const div = document.createElement('div')
const vine = new Vine(div)

vine.camera.position.y = 4
vine.camera.position.z = -10
vine.camera.lookAt(vine.scene.position)

const boundingBox = new THREE.BoxBufferGeometry(2, 2, 2)
const edges = new THREE.EdgesGeometry(boundingBox)
const outline = new THREE.LineSegments(
  edges,
  new THREE.LineBasicMaterial({ color: 0xffffff }),
)
vine.scene.add(outline)

function loop() {
  outline.rotation.y += 0.01

  vine.draw()
  requestAnimationFrame(loop)
}
loop()

document.body.prepend(div)
