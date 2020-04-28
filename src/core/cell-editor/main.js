import * as THREE from 'three'

import Vobj from './Vobj.js'
import Input from './Input.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color('lightblue')

const renderer = new THREE.WebGLRenderer({ antialias: false })
renderer.setSize(243, 243)

const canvas = renderer.domElement
canvas.style.width = 243 * 3 + 'px'
canvas.style.height = 243 * 3 + 'px'
canvas.style.imageRendering = 'optimizespeed'
document.body.appendChild(canvas)

const world = new THREE.Group()
scene.add(world)

const light = new THREE.AmbientLight(0xffffff)
scene.add(light)

const cellSize = 9
const vobj = new Vobj(cellSize)
vobj.updateMesh()
world.add(vobj.mesh)

// Floor plane grid
const grid = new THREE.GridHelper(cellSize, cellSize)
grid.position.y = cellSize * -0.5
world.add(grid)

// Cube lines
const boundingBox = new THREE.BoxBufferGeometry(cellSize, cellSize, cellSize)
const edges = new THREE.EdgesGeometry(boundingBox)
const outline = new THREE.LineSegments(
  edges,
  new THREE.LineBasicMaterial({ color: 0xffffff }),
)
world.add(outline)

// Axis lines
{
  // X
  const geo = new THREE.Geometry()
  geo.vertices.push(new THREE.Vector3(-10000, cellSize * -0.5, 0))
  geo.vertices.push(new THREE.Vector3(10000, cellSize * -0.5, 0))
  world.add(
    new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xee0000 })),
  )
}
{
  // Y
  const geo = new THREE.Geometry()
  geo.vertices.push(new THREE.Vector3(0, -10000, 0))
  geo.vertices.push(new THREE.Vector3(0, 10000, 0))
  world.add(
    new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x00aa00 })),
  )
}
{
  // Z
  const geo = new THREE.Geometry()
  geo.vertices.push(new THREE.Vector3(0, cellSize * -0.5, -10000))
  geo.vertices.push(new THREE.Vector3(0, cellSize * -0.5, 10000))
  world.add(
    new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x0000aa })),
  )
}

const boundingBoxMesh = new THREE.Mesh(
  boundingBox,
  new THREE.MeshBasicMaterial({
    side: THREE.BackSide,
    visible: false,
  }),
)
world.add(boundingBoxMesh)

const selectionVobj = new Vobj(cellSize)
world.add(selectionVobj.mesh)

const input = new Input(canvas)

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000)

camera.position.set(0, 0, cellSize * 2)
camera.lookAt(world.position)

const cameraPivotX = new THREE.Group()
const cameraPivotY = new THREE.Group()

cameraPivotX.add(camera)
cameraPivotY.add(cameraPivotX)
scene.add(cameraPivotY)

const raycaster = new THREE.Raycaster()

const cv = { x: 0, y: 0 }
function process() {
  if (input.isDown('leftMouse')) {
    cv.x -= input.mousePosDelta.x
    cv.y += input.mousePosDelta.y
  }

  raycaster.setFromCamera(input.mousePos, camera)

  cameraPivotX.rotation.x += cv.y
  cameraPivotY.rotation.y += cv.x

  cv.x *= 0.8
  cv.y *= 0.8

  /*
  cameraPivotY.rotation.y -= joypad.axisRight.x / 10
  cameraPivotX.rotation.x += joypad.axisRight.y / 10
  */

  const intersects = raycaster.intersectObjects([vobj.mesh, boundingBoxMesh])

  const intersectMesh = intersects.find(({ object }) => object === vobj.mesh)
  const intersectBB = intersects.find(
    ({ object }) => object === boundingBoxMesh,
  )

  const isPlacing =
    input.justDown('leftMouse') &&
    input.mousePosDelta.x == 0 &&
    input.mousePosDelta.y == 0
  const isRemoving =
    input.justDown('rightMouse') &&
    input.mousePosDelta.x == 0 &&
    input.mousePosDelta.y == 0

  selectionVobj.clear()

  if (intersectMesh) {
    let { x, y, z, normal } = vobj.voxelPositionFromIntersection(intersectMesh)

    if (isRemoving) {
      vobj.setVoxel(x, y, z, 0)
      vobj.updateMesh()
    }

    x += normal[0]
    y += normal[1]
    z += normal[2]

    if (
      x < 0 ||
      x >= cellSize ||
      y < 0 ||
      y >= cellSize ||
      z < 0 ||
      z >= cellSize
    ) {
      // Out-of-bounds.
    } else {
      selectionVobj.setVoxel(x, y, z, 2)

      if (isPlacing) {
        vobj.setVoxel(x, y, z, 1)
        vobj.updateMesh()
      }
    }
  } else if (intersectBB) {
    let { x, y, z } = intersectBB.point // In scene coordinates!!

    // selectionVobj has a centre point of (0, 0, 0), so the voxel position
    // (0, 0, 0) is actually at (-cellSize/2, ", ").
    x += cellSize / 2
    y += cellSize / 2
    z += cellSize / 2

    x = Math.floor(x)
    y = Math.floor(y)
    z = Math.floor(z)

    if (
      x < 0 ||
      x >= cellSize ||
      y < 0 ||
      y >= cellSize ||
      z < 0 ||
      z >= cellSize
    ) {
      // Out-of-bounds.
    } else {
      selectionVobj.setVoxel(x, y, z, 2)

      if (isPlacing) {
        vobj.setVoxel(x, y, z, 1)
        vobj.updateMesh()
      }
    }
  }

  selectionVobj.updateMesh()

  input.process()
}

const physicsTimeStep = 1000 / 60 // FPS
let deltaTime = 0,
  lastFrameTime = 0

function loop(timestamp) {
  deltaTime += timestamp - lastFrameTime
  lastFrameTime = timestamp

  let canvasIsDirty = false

  // Frameskip
  while (deltaTime >= physicsTimeStep) {
    process()
    deltaTime -= physicsTimeStep

    canvasIsDirty = true
  }

  if (canvasIsDirty) {
    renderer.render(scene, camera)
  }

  requestAnimationFrame(loop)
}

requestAnimationFrame(loop)
