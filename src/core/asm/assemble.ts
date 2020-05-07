import ALU, { Tryte, s2t, t2n, n2t, t2s, clone } from '../vm/ALU.js'
import Memory from '../vm/Memory.js'
import {
  Instruction,
  InstructionLabeled,
  AddressingMode,
  assembleInstruction,
} from '../vm/Instruction.js'
import { symbols } from '../vm/VirtualMachine'

export interface DebugInfo {
  labels: Map<string, Tryte>,
  instructions: string[],
}

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

export default function assemble(input: string): {
  mem: Memory,
  debug: DebugInfo,
} {
  const lines = input
    .split('\n')
    .map(line => line.replace(/;.*$/, '').trim()) // Remove comments & indentation whitespace
    .filter(line => line.length > 0) // Ignore empty lines

  const cart = new Memory()
  const alu = new ALU()

  const labels = new Map()

  // First pass: determine label addresses
  {
    const address = s2t('ooooooooo')

    for (const line of lines) {
      if (line[0] != '.') {
        // Instruction.
        const [mnemonic, ...operands] = parseInstructionParts(line)
        const parsed = parseInstruction(mnemonic, operands)

        if (operands.length) {
          throw new Error(`${mnemonic}: too many operands`)
        }

        for (const instruction of parsed) {
          alu.add(address, n2t(1))
          if (instruction.z) alu.add(address, n2t(1))
        }
      } else {
        // Label.
        const labelName = line.substr(1)

        if (labels.has(labelName)) {
          console.warn('label redeclared:', labelName)
        }

        labels.set(labelName, clone(address))
      }
    }
  }

  // Second pass: assemble instructions
  const instructions = []
  {
    const address = s2t('ooooooooo')

    for (const line of lines) {
      if (line[0] != '.') {
        // Instruction.
        const [mnemonic, ...operands] = parseInstructionParts(line)
        const parsed = parseInstruction(mnemonic, operands)

        for (const instruction of parsed) {
          // FIXME: pseudoinstructions which produce more than one
          // instruction appear to be run twice when viewed in the
          // debugger as we just show the source line twice
          instructions[t2n(address)] = line

          const data = assembleInstruction(instruction, labels)

          console.log(`$${t2s(address)}: ${t2s(data[0])} ${line}`, instruction)
          cart.store(data[0], address)
          alu.add(address, n2t(1))

          if (data[1]) {
            console.log(`$${t2s(address)}: ${t2s(data[1])}`)
            cart.store(data[1], address)
            alu.add(address, n2t(1))
          }
        }
      }
    }
  }

  return { mem: cart, debug: { labels, instructions } }
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
function parseInstruction(mnemonic: string, operands: string[]): InstructionLabeled[] {
  switch (mnemonic.toUpperCase()) {
    // Pseudoinstructions
    case 'NOP': {
      // MOV r4, r4
      return [{
        opcode: n2t(0),
        addressingMode: AddressingMode.REGISTER_REGISTER,
        x: n2t(0),
        y: n2t(0),
        z: null,
      }]
    }
    case 'PSH': {
      const instrs: InstructionLabeled[] = []
      while (operands.length) {
        instrs.push(
          // STA rX, sp
          {
            opcode: n2t(2),
            addressingMode: AddressingMode.REGISTER_REGISTER,
            x: expect(
              parseRegisterOperand(operands.pop()),
              'PSH: all operands must be registers'
            ),
            y: n2t(4),
            z: null,
          },
          // ADD sp, -1
          {
            opcode: n2t(-39),
            addressingMode: AddressingMode.SHORT_IMMEDIATE,
            x: n2t(4),
            y: n2t(-1),
            z: null,
          },
        )
      }
      return instrs
    }
    case 'POP': {
      const instrs: InstructionLabeled[] = []
      while (operands.length) {
        instrs.push(
          // ADD sp, 1
          {
            opcode: n2t(-39),
            addressingMode: AddressingMode.SHORT_IMMEDIATE,
            x: n2t(4),
            y: n2t(1),
            z: null,
          },
          // LDA rX, sp
          {
            opcode: n2t(1),
            addressingMode: AddressingMode.REGISTER_REGISTER,
            x: expect(
              parseRegisterOperand(operands.shift()),
              'POP: all operands must be registers'
            ),
            y: n2t(4),
            z: null,
          },
        )
      }
      return instrs
    }

    // Instructions
    case 'ADD': {
      return [expect(
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
      )]
    }
    case 'ADC': {
      return [expect(
        unionParseYZ(
          {
            opcode: n2t(-38),
            x: expect(
              parseRegisterOperand(operands.shift()),
              'ADC: operand 1 must be a register',
            ),
          },
          operands.shift(),
        ),
        'ADC: operand 2 must be a register or immediate',
      )]
    }
    case 'MUL': {
      return [expect(
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
      )]
    }
    case 'DIV': {
      return [expect(
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
      )]
    }
    case 'MOD': {
      throw new Error('MOD is unimplemented')
    }
    case 'NEG': {
      return [expect(
        unionParseYZ(
          {
            opcode: n2t(-34),
            x: expect(
              parseRegisterOperand(operands.shift()),
              'NEG: operand 1 must be a register',
            ),
          },
          operands.shift(),
        ),
        'NEG: operand 2 must be a register or immediate',
      )]
    }
    case 'MIN': {
      return [expect(
        unionParseYZ(
          {
            opcode: n2t(-33),
            x: expect(
              parseRegisterOperand(operands.shift()),
              'MIN: operand 1 must be a register',
            ),
          },
          operands.shift(),
        ),
        'MIN: operand 2 must be a register or immediate',
      )]
    }
    case 'MAX': {
      return [expect(
        unionParseYZ(
          {
            opcode: n2t(-32),
            x: expect(
              parseRegisterOperand(operands.shift()),
              'MAX: operand 1 must be a register',
            ),
          },
          operands.shift(),
        ),
        'MAX: operand 2 must be a register or immediate',
      )]
    }
    case 'XOR': {
      return [expect(
        unionParseYZ(
          {
            opcode: n2t(-31),
            x: expect(
              parseRegisterOperand(operands.shift()),
              'XOR: operand 1 must be a register',
            ),
          },
          operands.shift(),
        ),
        'XOR: operand 2 must be a register or immediate',
      )]
    }
    case 'CON': {
      return [expect(
        unionParseYZ(
          {
            opcode: n2t(-30),
            x: expect(
              parseRegisterOperand(operands.shift()),
              'CON: operand 1 must be a register',
            ),
          },
          operands.shift(),
        ),
        'CON: operand 2 must be a register or immediate',
      )]
    }
    case 'ANY': {
      return [expect(
        unionParseYZ(
          {
            opcode: n2t(-29),
            x: expect(
              parseRegisterOperand(operands.shift()),
              'ANY: operand 1 must be a register',
            ),
          },
          operands.shift(),
        ),
        'ANY: operand 2 must be a register or immediate',
      )]
    }
    case 'SHR': {
      return [expect(
        unionParseYZ(
          {
            opcode: n2t(-28),
            x: expect(
              parseRegisterOperand(operands.shift()),
              'SHR: operand 1 must be a register',
            ),
          },
          operands.shift(),
        ),
        'SHR: operand 2 must be a register or immediate',
      )]
    }
    case 'SHU': {
      return [expect(
        unionParseYZ(
          {
            opcode: n2t(-27),
            x: expect(
              parseRegisterOperand(operands.shift()),
              'SHU: operand 1 must be a register',
            ),
          },
          operands.shift(),
        ),
        'SHU: operand 2 must be a register or immediate',
      )]
    }

    case 'MOV': {
      return [expect(
        unionParseYZ(
          {
            opcode: n2t(0),
            x: expect(
              parseRegisterOperand(operands.shift()),
              'MOV: operand 1 must be a register',
            ),
          },
          operands.shift(),
        ),
        'MOV: operand 2 must be a register or immediate',
      )]
    }
    case 'LDA': {
      return [expect(
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
      )]
    }
    case 'STA': {
      return [expect(
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
      )]
    }
    case 'LDO': {
      return [{
        opcode: n2t(3),
        addressingMode: AddressingMode.WORD_IMMEDIATE,
        x: expect(
          parseRegisterOperand(operands.shift()),
          'LDO: operand 1 must be a register',
        ),
        y: expect(
          parseRegisterOperand(operands.shift()),
          'LDO: operand 2 must be a register',
        ),
        z: expect(
          parseAddressOperand(operands.shift()),
          'LDO: operand 3 must be an address',
        ),
      }]
    }
    case 'STO': {
      return [{
        opcode: n2t(4),
        addressingMode: AddressingMode.WORD_IMMEDIATE,
        x: expect(
          parseRegisterOperand(operands.shift()),
          'STO: operand 1 must be a register',
        ),
        y: expect(
          parseRegisterOperand(operands.shift()),
          'STO: operand 2 must be a register',
        ),
        z: expect(
          parseAddressOperand(operands.shift()),
          'STO: operand 3 must be an address',
        ),
      }]
    }
    case 'JEQ': {
      return [{
        opcode: n2t(30),
        addressingMode: AddressingMode.WORD_IMMEDIATE,
        x: expect(
          parseRegisterOperand(operands.shift()),
          'JEQ: operand 1 must be a register',
        ),
        y: expect(
          parseRegisterOperand(operands.shift()),
          'JEQ: operand 2 must be a register',
        ),
        z: expect(
          parseAddressOperand(operands.shift()),
          'JEQ: operand 3 must be an address',
        ),
      }]
    }
    case 'JNE': {
      return [{
        opcode: n2t(31),
        addressingMode: AddressingMode.WORD_IMMEDIATE,
        x: expect(
          parseRegisterOperand(operands.shift()),
          'JNE: operand 1 must be a register',
        ),
        y: expect(
          parseRegisterOperand(operands.shift()),
          'JNE: operand 2 must be a register',
        ),
        z: expect(
          parseAddressOperand(operands.shift()),
          'JNE: operand 3 must be an address',
        ),
      }]
    }
    case 'JGT': {
      return [{
        opcode: n2t(32),
        addressingMode: AddressingMode.WORD_IMMEDIATE,
        x: expect(
          parseRegisterOperand(operands.shift()),
          'JGT: operand 1 must be a register',
        ),
        y: expect(
          parseRegisterOperand(operands.shift()),
          'JGT: operand 2 must be a register',
        ),
        z: expect(
          parseAddressOperand(operands.shift()),
          'JGT: operand 3 must be an address',
        ),
      }]
    }
    case 'JLT': {
      return [{
        opcode: n2t(33),
        addressingMode: AddressingMode.WORD_IMMEDIATE,
        x: expect(
          parseRegisterOperand(operands.shift()),
          'JLT: operand 1 must be a register',
        ),
        y: expect(
          parseRegisterOperand(operands.shift()),
          'JLT: operand 2 must be a register',
        ),
        z: expect(
          parseAddressOperand(operands.shift()),
          'JLT: operand 3 must be an address',
        ),
      }]
    }
    case 'JGE': {
      return [{
        opcode: n2t(34),
        addressingMode: AddressingMode.WORD_IMMEDIATE,
        x: expect(
          parseRegisterOperand(operands.shift()),
          'JGE: operand 1 must be a register',
        ),
        y: expect(
          parseRegisterOperand(operands.shift()),
          'JGE: operand 2 must be a register',
        ),
        z: expect(
          parseAddressOperand(operands.shift()),
          'JGE: operand 3 must be an address',
        ),
      }]
    }
    case 'JLE': {
      return [{
        opcode: n2t(35),
        addressingMode: AddressingMode.WORD_IMMEDIATE,
        x: expect(
          parseRegisterOperand(operands.shift()),
          'JLE: operand 1 must be a register',
        ),
        y: expect(
          parseRegisterOperand(operands.shift()),
          'JLE: operand 2 must be a register',
        ),
        z: expect(
          parseAddressOperand(operands.shift()),
          'JLE: operand 3 must be an address',
        ),
      }]
    }
    case 'JMP': {
      return [expect(
        unionParseYZ(
          {
            opcode: n2t(36),
            x: n2t(0),
          },
          operands.shift(),
          { allowLabel: true },
        ),
        'JMP: operand must be a register or immediate address',
      )]
    }
    case 'JAL': {
      return [expect(
        unionParseYZ(
          {
            opcode: n2t(37),
            x: n2t(0),
          },
          operands.shift(),
          { allowLabel: true },
        ),
        'JAL: operand must be a register or immediate address',
      )]
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
  options: { allowLabel: boolean } = { allowLabel: false },
): InstructionLabeled | null {
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

  if (options.allowLabel) {
    const asAddress = parseAddressOperand(operand)
    if (asAddress) {
      return {
        ...partial,
        addressingMode: AddressingMode.WORD_IMMEDIATE,
        y: n2t(0),
        z: asAddress,
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

const SYMBOL_REGEX = /^([^\[\(]+)(\[([+\-o0-9]+)\])?$/

function parseImmediateOperand(
  operand: string | null | undefined,
): Tryte | null {
  if (!operand) {
    return null
  }

  const trimmed = operand.trim()

  if (trimmed[0] == '$') {
    const match = trimmed.substr(1).toUpperCase().match(SYMBOL_REGEX)

    if (!match) {
      throw new Error(`Syntax error with symbol ${trimmed}`)
    }

    const [ , name, , offset ] = match
    const symbol = symbols.get(name)

    if (symbol && offset) {
      const address = s2t(offset)
      ;(new ALU()).add(address, symbol)
      return address
    } else if (symbol) {
      return symbol
    } else {
      throw new Error(`Unknown symbol ${trimmed}`)
    }
  }

  try {
    return s2t(trimmed)
  } catch {
    return null
  }
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
    return parseImmediateOperand(operand)
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
