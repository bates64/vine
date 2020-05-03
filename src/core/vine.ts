import * as PIXI from 'pixi.js'
import * as THREE from 'three'

import Cartridge from './Cartridge'
import Tile from './Tile'
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
        tile.tilePosition.x = x * -9
        tile.tilePosition.y = y * -9

        this.tiles.push(tile)
        this.pixi.stage.addChild(tile)
      }
    }

    this.vm.addEventListener('message', e => {
      const { method, ...args } = e.data

      console.debug('worker response:', method, args)

      if (method === 'respondChangedTiles') {
        this.updateTiles(args.tiles)
        this.renderer.render(this.scene, this.camera)

        if (!this.stopped)
          requestAnimationFrame(() => this.queueDraw())
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
    this.stopped == false
    this.queueDraw()
  }

  stop() {
    this.stopped = true
  }

  queueDraw() {
    this.vm.postMessage({ method: 'requestChangedTiles' })
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

  updateTiles(tiles: Tile[]) {
    for (const { index, u, v } of tiles) {
      console.log(index, u, v)
      this.tiles[index].tilePosition.x = u * -9
      this.tiles[index].tilePosition.y = v * -9
    }
    /*
    let tx = 0
    let ty = 0
    for (let addr = -3118; addr < -202; addr++) {
      const x = tx * 9
      const y = ty * 9

      const [s0, s1, s2, s3, s4, p0, p1, flip, _unused] = this.vm.ram.load(addr)
      const sprite = t2n([0, 0, 0, 0, s0, s1, s2, s3, s4])
      const palette = t2n([0, 0, 0, 0, 0, 0, 0, p0, p1])

      if (sprite == 0) {
        const paletteAddress = t2n(s2t('ooo-+----')) + palette
        const rgb = this.vm.ram.load(paletteAddress)

        const red = t2n([0, 0, 0, 0, 0, 0, rgb[0], rgb[1], rgb[2]])
        const green = t2n([0, 0, 0, 0, 0, 0, rgb[3], rgb[4], rgb[5]])
        const blue = t2n([0, 0, 0, 0, 0, 0, rgb[6], rgb[7], rgb[8]])

        if (red >= 0 && green >= 0 && blue >= 0) {
          const redHex = Math.floor(255 * (red / 13))
            .toString(16)
            .padStart(2, '0')
          const greenHex = Math.floor(255 * (green / 13))
            .toString(16)
            .padStart(2, '0')
          const blueHex = Math.floor(255 * (blue / 13))
            .toString(16)
            .padStart(2, '0')

          this.ctx.fillStyle = `#${redHex}${greenHex}${blueHex}`
          this.ctx.fillRect(x, y, 9, 9)
        } else {
          // Transparent
        }
      } else if (sprite == 1) {
        this.ctx.fillStyle = 'blue'
        this.ctx.fillRect(x, y, 9, 9)
      }

      tx++
      if (tx == 54) {
        tx = 0
        ty++
      }
    }
    */
  }
}
