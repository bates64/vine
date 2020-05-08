import * as PIXI from 'pixi.js'
import * as THREE from 'three'

import Cartridge from './Cartridge'
import assemble, { DebugInfo } from './asm/assemble'

export default class VineCanvas {
  stopped = true
  loaded = false

  // 3D
  canvas3D: HTMLCanvasElement
  scene: THREE.Scene
  renderer: THREE.WebGLRenderer
  camera: THREE.Camera

  // 2D
  pixi: PIXI.Application
  tiles: PIXI.TilingSprite[]
  tileset: PIXI.Texture
  tilesetCanvas: HTMLCanvasElement = document.createElement('canvas')

  vm: Worker
  cartridge: Cartridge | null = null

  constructor(vm: Worker, canvas2D: HTMLCanvasElement, canvas3D: HTMLCanvasElement) {
    this.vm = vm

    this.pixi = new PIXI.Application({
      width: 243,
      height: 243,
      transparent: true,
      view: canvas2D,
    })
    this.canvas3D = canvas3D

    this.scene = new THREE.Scene()

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas3D,
      alpha: true,
      antialias: false,
    })
    this.renderer.setViewport(0, 0, 243, 243)

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000)

    const TILES_ACROSS = 243 / 9
    const TILES_DOWN = 243 / 9

    this.tileset = PIXI.Texture.from(this.tilesetCanvas)
    this.tiles = []
    for (let y = 0; y < TILES_DOWN; y++) {
      for (let x = 0; x < TILES_ACROSS; x++) {
        const tile = new PIXI.TilingSprite(this.tileset, 9, 9)

        tile.x = x * 9
        tile.y = y * 9
        tile.tilePosition.x = 0 // ---
        tile.tilePosition.y = 0 //    --

        this.tiles.push(tile)
        this.pixi.stage.addChild(tile)
      }
    }

    this.vm.addEventListener('message', e => {
      const { method, ...args } = e.data

      if (method === 'tileChange') {
        const { index, u, v } = args

        this.tiles[index].tilePosition.x = (u + 13) * -9
        this.tiles[index].tilePosition.y = (v + 4) * -9
      }
    })
  }

  async load(cartridge: Cartridge): Promise<DebugInfo> {
    this.cartridge = cartridge

    const assembled = assemble(cartridge.sourceCode)

    const arrBuf = assembled.mem.block.buffer // Transferable
    this.vm.postMessage({ method: 'runCartridge', buffer: arrBuf }, [ arrBuf ])

    this.setTilesetImage(cartridge.tileset)

    this.loaded = true

    return assembled.debug
  }

  start() {
    this.stopped = false
  }

  stop() {
    this.stopped = true
  }

  setTilesetImage(imageSrc: string) {
    this.tilesetCanvas.width = 27 * 9
    this.tilesetCanvas.height = 27 * 9

    const ctx = this.tilesetCanvas.getContext('2d')
    if (!ctx) throw new Error('Unable to get 2D context of tileset canvas')

    const image = new Image()
    image.onload = () => {
      ctx.drawImage(image, 0, 0)
      this.tileset.update()
    }
    image.src = imageSrc
  }

  clear() {
    for (const tile of this.tiles) {
      tile.tilePosition.x = 0
      tile.tilePosition.y = 0
    }
  }
}
