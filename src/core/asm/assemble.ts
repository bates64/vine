import ALU, { Tryte, s2t, t2n, n2t, t2s } from '../vm/ALU.js'
import Memory from '../vm/Memory.js'
import {
  Instruction,
  AddressingMode,
  assembleInstruction,
} from '../vm/Instruction.js'

type LabelMap = Map<string, number>

// Unwraps a type unioned with null, throwing the given error if it is null.
function expect<T>(maybe: T | null | undefined, error: Error | string): T {
  if (maybe == null || typeof maybe == 'undefined') {
    if (typeof error == 'string') {
      throw new Error(error)
    } else {
      throw error
    }
  } else {
    return maybe
  }
}

export default function assemble(input: string): Memory {
  const lines = input
    .split('\n')
    .map(line => line.replace(/;.*$/, '').trim()) // Remove comments & indentation whitespace
    .filter(line => line.length > 0) // Ignore empty lines

  //const labels: LabelMap = new Map
  const instructions: Instruction[] = []

  /*
  // First pass: find label declarations
  let pc = 0
  for (const line of lines) {
    if (line[0] == '.') {
      // Label declaration.
      labels.set(line.substr(1), pc)
    } else {
      // Instruction.
      // TODO
  }
  */

  const cart = new Memory()
  const alu = new ALU()

  const address = s2t('---------')

  for (const line of lines) {
    if (line[0] != '.') {
      // Instruction.
      const [mnemonic, ...operands] = parseInstructionParts(line)
      const instruction = parseInstruction(mnemonic, operands)

      if (operands.length) {
        throw new Error(`${mnemonic}: too many operands`)
      }

      const data = assembleInstruction(instruction)

      console.debug(`$${t2s(address)}: ${t2s(data[0])} ${line}`, instruction)
      cart.store(data[0], address)
      alu.add(address, n2t(1))

      if (data[1]) {
        console.debug(`$${t2s(address)}: ${t2s(data[1])}`)
        cart.store(data[1], address)
        alu.add(address, n2t(1))
      }

    } else {
      // TODO
      console.warn(line)
    }
  }

  return cart
}

function parseInstructionParts(line: string): string[] {
  const operands = []
  let buffer = ''

  for (const char of line) {
    if (operands.length == 0) {
      if (char == ' ') {
        operands.push(buffer)
        buffer = ''
      } else {
        buffer += char
      }
    } else {
      if (char == ',') {
        operands.push(buffer)
        buffer = ''
      } else {
        buffer += char
      }
    }
  }

  if (buffer.length > 0) operands.push(buffer)

  return operands
}

// Mutates `operands`.
function parseInstruction(mnemonic: string, operands: string[]): Instruction {
  switch (mnemonic.toUpperCase()) {
    case 'NOP': {
      // MOV r4, r4
      return {
        opcode: n2t(0),
        addressingMode: AddressingMode.REGISTER_REGISTER,
        x: n2t(0),
        y: n2t(0),
        z: null,
      }
    }
    case 'MOV': {
      return expect(
        unionParseYZ(
          {
            opcode: n2t(0),
            x: expect(
              parseRegisterOperand(operands.shift()),
              'MOV: operand 1 (destination) must be a register',
            ),
          },
          operands.shift(),
        ),
        'MOV: operand 2 (source) must be a register or immediate',
      )
    }
    case 'ADD': {
      return expect(
        unionParseYZ(
          {
            opcode: n2t(-39),
            x: expect(
              parseRegisterOperand(operands.shift()),
              'ADD: operand 1 must be a register',
            ),
          },
          operands.shift(),
        ),
        'ADD: operand 2 must be a register or immediate',
      )
    }
    // ADC
    case 'MUL': {
      return expect(
        unionParseYZ(
          {
            opcode: n2t(-37),
            x: expect(
              parseRegisterOperand(operands.shift()),
              'MUL: operand 1 must be a register',
            ),
          },
          operands.shift(),
        ),
        'MUL: operand 2 must be a register or immediate',
      )
    }
    case 'DIV': {
      return expect(
        unionParseYZ(
          {
            opcode: n2t(-36),
            x: expect(
              parseRegisterOperand(operands.shift()),
              'DIV: operand 1 must be a register',
            ),
          },
          operands.shift(),
        ),
        'DIV: operand 2 must be a register or immediate',
      )
    }
    // MOD
    case 'STA': {
      return expect(
        unionParseYZ(
          {
            opcode: n2t(2),
            x: expect(
              parseRegisterOperand(operands.shift()),
              'STA: operand 1 must be a register',
            ),
          },
          operands.shift(),
        ),
        'STA: operand 2 must be a register or address',
      )
    }
    case 'LDA': {
      return expect(
        unionParseYZ(
          {
            opcode: n2t(1),
            x: expect(
              parseRegisterOperand(operands.shift()),
              'LDA: operand 1 must be a register',
            ),
          },
          operands.shift(),
        ),
        'LDA: operand 2 must be a register or address',
      )
    }
    case 'JMP': {
      return {
        opcode: n2t(36),
        addressingMode: AddressingMode.WORD_IMMEDIATE,
        x: n2t(0),
        y: n2t(0),
        z: expect(
          parseImmediateOperand(operands.shift()),
          'JMP: operand must be an address',
        ),
      }
    }
    default:
      throw new Error(`unknown operation '${mnemonic}'`)
  }
}

function isShort(value: Tryte): boolean {
  const n = t2n(value)
  return n > 4 && n < -4
}

function unionParseYZ(
  partial: { opcode: Tryte; x: Tryte },
  operand: string | null | undefined,
): Instruction | null {
  const asRegister = parseRegisterOperand(operand)
  if (asRegister) {
    return {
      ...partial,
      addressingMode: AddressingMode.REGISTER_REGISTER,
      y: asRegister,
      z: null,
    }
  }

  const asImmediate = parseImmediateOperand(operand)
  if (asImmediate) {
    if (isShort(asImmediate)) {
      return {
        ...partial,
        addressingMode: AddressingMode.SHORT_IMMEDIATE,
        y: asImmediate,
        z: null,
      }
    } else {
      return {
        ...partial,
        addressingMode: AddressingMode.WORD_IMMEDIATE,
        y: n2t(0),
        z: asImmediate,
      }
    }
  }

  return null
}

function parseRegisterOperand(
  operand: string | null | undefined,
): Tryte | null {
  if (!operand) {
    return null
  }

  const trimmed = operand.trim().toLowerCase()

  switch (trimmed) {
    case 'r0':
      return n2t(-4)
    case 'r1':
      return n2t(-3)
    case 'r2':
      return n2t(-2)
    case 'r3':
      return n2t(-1)
    case 'r4':
      return n2t(0)
    case 'r5':
      return n2t(1)
    case 'r6':
      return n2t(2)
    case 'ra':
      return n2t(3)
    case 'sp':
      return n2t(4)
    default:
      return null
  }
}

function parseImmediateOperand(
  operand: string | null | undefined,
): Tryte | null {
  if (!operand) {
    return null
  }

  const trimmed = operand.trim()

  try {
    return s2t(trimmed)
  } catch {
    return null
  }
}

// 'ImmReg' stands for 'immediate or register.' We need this tagged union as both registers and
// immediates are typically stored as trytes, but we need to discriminate between them.
type ImmReg =
  | { type: 'immediate'; data: Tryte }
  | { type: 'register'; data: Tryte }
function parseImmRegOperand(operand: string | null | undefined): ImmReg | null {
  const immediate = parseImmediateOperand(operand)
  if (immediate) {
    return { type: 'immediate', data: immediate }
  }

  const register = parseRegisterOperand(operand)
  if (register) {
    return { type: 'register', data: register }
  }

  return null
}

function parseAddressOperand(
  operand: string | null | undefined,
): Tryte | string | null {
  if (!operand) {
    return null
  }

  const trimmed = operand.trim()

  if (trimmed[0] == '.') {
    // Label
    return trimmed.substr(1)
  } else {
    // Raw address
    try {
      return s2t(trimmed)
    } catch {
      return null
    }
  }
}

function assembleOperandStr(
  operand: string,
  labels: LabelMap,
): [Tryte, Tryte | null] {
  const parseRegister = (operand: string) => {
    const register = parseInt(operand.substr(1))

    if (isNaN(register) || register < 0 || register > 11) {
      throw new Error('Unknown register: ' + operand)
    }

    return register
  }

  if (operand[0] == 'r') {
    // Register
    return [n2t(parseRegister(operand) + 1), null]
  } else if (operand[0] == '.') {
    // Immediate, labeled
    const addr = labels.get(operand.substr(1))

    if (typeof addr == 'undefined') {
      throw new Error('Undeclared ROM label: ' + operand.substr(1))
    }

    return [n2t(-13), n2t(addr)]
  } else if (operand[0] == '*') {
    if (operand[1] == 'r') {
      // Register-indirect pointer
      return [n2t(parseRegister(operand.substr(1)) - 11), null]
    } else if (operand[2] == '.') {
      throw new Error('ROM label not allowed here: ' + operand)
    } else {
      // Immediate-direct pointer
      return [n2t(-12), s2t(operand.substr(1))]
    }
  } else {
    // Immediate
    return [n2t(-13), s2t(operand)]
  }
}

function assembleOpcodeStr(str: string): Tryte {
  switch (str.toUpperCase()) {
    case 'ADD':
      return n2t(-13)
    // 12
    case 'ADDC':
      return n2t(-11)
    case 'MUL':
      return n2t(-10)
    case 'DIV':
      return n2t(-9)
    case 'MOD':
      return n2t(-8)
    case 'NEG':
      return n2t(-7)
    case 'MIN':
      return n2t(-6)
    case 'MAX':
      return n2t(-5)
    case 'CON':
      return n2t(-4)
    case 'ANY':
      return n2t(-3)
    case 'RSH':
      return n2t(-2)
    case 'USH':
      return n2t(-1)
    case 'NOP':
      return n2t(0)
    case 'MOV':
      return n2t(1)
    case 'CMP':
      return n2t(2)
    case 'JMP':
      return n2t(3)
    case 'BEQ':
      return n2t(4)
    case 'BGT':
      return n2t(5)
    case 'BLT':
      return n2t(6)
    case 'JAL':
      return n2t(7)
    case 'LOD':
      return n2t(8)
    case 'XOR':
      return n2t(9)
    default:
      throw new Error('Unknown instruction: ' + str)
  }
}
