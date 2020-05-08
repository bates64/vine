import ALU, { Tryte, Trit, n2t } from '../vm/ALU.js'

export enum AddressingMode {
  REGISTER_REGISTER = -1,
  SHORT_IMMEDIATE = 0,
  WORD_IMMEDIATE = 1,
}

const ZERO = n2t(0)

type Register = Tryte // 2t

interface RegisterRegister {
  opcode: Tryte // 4t
  addressingMode: AddressingMode.REGISTER_REGISTER
  x: Register
  y: Register
  z: null
}

interface ShortImmediate {
  opcode: Tryte // 4t
  addressingMode: AddressingMode.SHORT_IMMEDIATE
  x: Register
  y: Tryte // 2t
  z: null
}

interface WordImmediate {
  opcode: Tryte // 4t
  addressingMode: AddressingMode.WORD_IMMEDIATE
  x: Register
  y: Register
  z: Tryte
}

interface UnresolvedWordImmediate {
  opcode: Tryte // 4t
  addressingMode: AddressingMode.WORD_IMMEDIATE
  x: Register
  y: Register
  z: string
}

export type UnresolvedInstruction = RegisterRegister | ShortImmediate | WordImmediate | UnresolvedWordImmediate
export type Instruction = RegisterRegister | ShortImmediate | WordImmediate

// Shifts out the first instruction contained in the data.
export function shiftInstruction(data: { shift: () => Tryte }): Instruction {
  const t = data.shift()

  const opcode: Tryte = [0, 0, 0, 0, 0, t[0], t[1], t[2], t[3]]
  const addressingMode: Trit = t[4]
  const x: Tryte = [0, 0, 0, 0, 0, 0, 0, t[5], t[6]]
  const y: Tryte = [0, 0, 0, 0, 0, 0, 0, t[7], t[8]]

  if (addressingMode == 1) {
    return { opcode, addressingMode, x, y, z: data.shift() }
  } else {
    return { opcode, addressingMode, x, y, z: null }
  }
}

export function assembleInstruction(
  instruction: UnresolvedInstruction,
  symbols: Map<string, { address: Tryte }>,
): [Tryte, Tryte | undefined] {
  const { opcode, addressingMode, x, y, z } = instruction

  let realZ
  if (Array.isArray(z)) {
    realZ = z
  } else if (typeof z === 'string') {
    realZ = symbols.get(z)
    if (realZ) {
      realZ = realZ.address
    } else {
      throw new Error(`Unknown symbol ${z}`)
    }
  }

  return [
    [
      opcode[5],
      opcode[6],
      opcode[7],
      opcode[8],
      addressingMode,
      x[7],
      x[8],
      y[7],
      y[8],
    ],
    realZ,
  ]
}
