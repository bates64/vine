import * as THREE from 'three'

// Voxel objects are three-dimensional objects with uniform width, height,
// and depth.
//
// Originally based on this lovely tutorial:
// https://threejsfundamentals.org/threejs/lessons/threejs-voxel-geometry.html
export default class Vobj {
  constructor(cellSize) {
    this.cellSize = cellSize
    this.cell = new Uint8Array(cellSize * cellSize * cellSize)

    this.material = new THREE.MeshBasicMaterial({
      vertexColors: THREE.VertexColors,
    })
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.material)
    this.geometryNeedsUpdate = true

    this.palette = [null, [0.2, 0.2, 0.2], [1.0, 1.0, 1.0]]

    this._triPosMap = {}
  }

  clear() {
    this.cell = new Uint8Array(this.cellSize * this.cellSize * this.cellSize)
  }

  getVoxel(x, y, z) {
    if (
      x >= 0 &&
      x < this.cellSize &&
      y >= 0 &&
      y < this.cellSize &&
      z >= 0 &&
      z < this.cellSize
    ) {
      const index = this._cellIndexOfVoxel(x, y, z)

      return this.cell[index]
    } else {
      // Position is out-of-bounds!
      return 0
    }
  }

  setVoxel(x, y, z, voxel = 0) {
    const index = this._cellIndexOfVoxel(x, y, z)

    this.geometryNeedsUpdate = true
    this.cell[index] = voxel
  }

  updateMesh() {
    if (this.geometryNeedsUpdate) {
      this.geometryNeedsUpdate = false

      const { vertices, normals, indices, colors } = this.generateGeometryData()

      this.mesh.geometry = new THREE.BufferGeometry()
      this.mesh.geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(vertices), 3),
      )
      this.mesh.geometry.setAttribute(
        'normal',
        new THREE.BufferAttribute(new Float32Array(normals), 3),
      )
      this.mesh.geometry.setAttribute(
        'color',
        new THREE.BufferAttribute(new Float32Array(colors), 3),
      )
      this.mesh.geometry.setIndex(indices)

      return true
    }

    return false
  }

  generateGeometryData() {
    const vertices = []
    const normals = []
    const indices = []
    const colors = []

    this._triPosMap = {}

    for (let x = 0; x < this.cellSize; x++) {
      for (let y = 0; y < this.cellSize; y++) {
        for (let z = 0; z < this.cellSize; z++) {
          const voxel = this.getVoxel(x, y, z)

          if (this.palette[voxel] !== null) {
            const [r, g, b] = this.palette[voxel]

            // There is a voxel here - draw each face.
            for (const { normal, corners, modulate } of FACES) {
              // If the face has a voxel in its direction, we can
              // skip rendering it as it won't be seen.
              const neighbour = this.getVoxel(
                x + normal[0],
                y + normal[1],
                z + normal[2],
              )

              // TODO: combine neighbouring faces into a single 2-tri face

              if (this.palette[neighbour] === null) {
                // Draw this face.

                const tri = vertices.length / 3

                for (const [i, j, k] of corners) {
                  vertices.push(
                    this.cellSize * -0.5 + x + i,
                    this.cellSize * -0.5 + y + j,
                    this.cellSize * -0.5 + z + k,
                  )
                  colors.push(r * modulate, g * modulate, b * modulate)
                  normals.push(...normal)
                }

                const faceIndex = indices.length / 3

                indices.push(tri, tri + 1, tri + 2)
                indices.push(tri + 2, tri + 1, tri + 3)

                this._triPosMap[faceIndex] = { x, y, z, normal }
              }
            }
          }
        }
      }
    }

    return { vertices, normals, indices, colors }
  }

  voxelPositionFromIntersection({ faceIndex }) {
    if (faceIndex % 2 == 0) {
      return this._triPosMap[faceIndex]
    } else {
      return this._triPosMap[faceIndex - 1]
    }
  }

  _cellIndexOfVoxel(x, y, z) {
    const voxelX = THREE.Math.euclideanModulo(x, this.cellSize) | 0
    const voxelY = THREE.Math.euclideanModulo(y, this.cellSize) | 0
    const voxelZ = THREE.Math.euclideanModulo(z, this.cellSize) | 0

    return (
      voxelY * this.cellSize * this.cellSize + voxelZ * this.cellSize + voxelX
    )
  }
}

const FACES = [
  {
    // left
    normal: [-1, 0, 0],
    corners: [
      [0, 1, 0],
      [0, 0, 0],
      [0, 1, 1],
      [0, 0, 1],
    ],
    modulate: 0.8,
  },
  {
    // right
    normal: [1, 0, 0],
    corners: [
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 0],
      [1, 0, 0],
    ],
    modulate: 0.8,
  },
  {
    // bottom
    normal: [0, -1, 0],
    corners: [
      [1, 0, 1],
      [0, 0, 1],
      [1, 0, 0],
      [0, 0, 0],
    ],
    modulate: 0.6,
  },
  {
    // top
    normal: [0, 1, 0],
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [0, 1, 0],
      [1, 1, 0],
    ],
    modulate: 1.0,
  },
  {
    // back
    normal: [0, 0, -1],
    corners: [
      [1, 0, 0],
      [0, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
    ],
    modulate: 0.7,
  },
  {
    // front
    normal: [0, 0, 1],
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [0, 1, 1],
      [1, 1, 1],
    ],
    modulate: 0.9,
  },
]
