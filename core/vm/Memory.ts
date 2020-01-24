// Tryte-oriented memory interface.
export default class Memory {
  // We need to store each tryte in a 32-bit integer in order to properly
  // fit all 39,365 unique values. 16-bit integers are 7,000 shy of this number.
  cell: Uint32Array

  constructor(size: number) {
    this.cell = new Uint32Array(size) // Initialized with zeroes.
  }

  // TODO
}
