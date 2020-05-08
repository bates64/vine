import ALU, { Tryte, s2t, t2n, n2t, t2s, clone } from '../vm/ALU.js'
import Memory from '../vm/Memory.js'
import {
  UnresolvedInstruction,
  AddressingMode,
  assembleInstruction,
} from '../vm/Instruction.js'
import { symbols } from '../vm/VirtualMachine'

const globalSymbols = new Map(
  // Convert Map<string, Tryte> to Map<string, { address: Tryte }>
  Array.from(symbols.entries())
  .map(([ k, v ]) => [ `$${k}`, { address: v } ])
)

export interface DebugInfo {
  labels: Map<string, { address: Tryte }>,
  datas: Map<string, { address: Tryte, size: Tryte }>,
  instructions: Map<number, { address: Tryte, instruction: UnresolvedInstruction, line: string }>,
}

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

  // First pass: parse & determine addresses
  const labels = new Map()
  const datas = new Map()
  const instructions = new Map()
  {
    const address = s2t('ooooooooo')

    for (const line of lines) {
      if (line[0] == '.') {
        // .label

        const matches = line.match(/^(\.[a-zA-Z0-9_]+)$/)

        if (!matches) {
          throw new Error(`Invalid label syntax: ${line}`)
        }

        const [ , name ] = matches

        if (labels.has(name)) {
          throw new Error(`Label ${name} declared multiple times`)
        }

        labels.set(name, { address: clone(address) })
      } else if (line[0] == '$') {
        // $name
        // $name[size]

        const matches = line.match(/^(\$[a-zA-Z0-9_]+)(\[([o+-]+|[-+]?[0-9]+)\])?$/)

        if (!matches) {
          throw new Error(`Invalid data syntax: ${line}`)
        }

        const [ , name, , sizeStr ] = matches
        const size = s2t(sizeStr ?? '1')

        if (datas.has(name)) {
          throw new Error(`Data ${name} declared multiple times`)
        }

        if (t2n(size) <= 0) {
          throw new Error(`Data ${name} has size <= 0`)
        }

        datas.set(name, { address: clone(address), size })
        alu.add(address, size)
      } else {
        // mnemonic
        // mnemonic operand1, operand2
        // mnemonic operand1, operand2, operand3

        const [mnemonic, ...operands] = parseInstructionParts(line)
        const parsed = parseInstruction(mnemonic, operands)

        if (operands.length) {
          throw new Error(`${mnemonic}: too many operands`)
        }

        let isFirst = true
        for (const instruction of parsed) {
          instructions.set(t2n(address), {
            address: clone(address),
            instruction,
            line: isFirst ? line : '...',
          })

          alu.add(address, n2t(1))
          if (instruction.z) alu.add(address, n2t(1))

          isFirst = false
        }
      }
    }
  }

  const symbols = new Map([
    ...globalSymbols,
    ...labels,
    ...datas,
  ])

  // Second pass: assemble instructions
  console.group('Assembled object code')
  for (const [ , { address, instruction, line } ] of instructions.entries()) {
    const data = assembleInstruction(instruction, symbols)

    console.log(`${t2s(address)}:   ${t2s(data[0])}   |   ${line}`)
    cart.store(data[0], address)
    alu.add(address, n2t(1))

    if (data[1]) {
      console.log(`${t2s(address)}:   ${t2s(data[1])}   | ...`)
      cart.store(data[1], address)
      alu.add(address, n2t(1))
    }
  }
  console.groupEnd()

  return {
    mem: cart,
    debug: { labels, datas, instructions },
  }
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
function parseInstruction(mnemonic: string, operands: string[]): UnresolvedInstruction[] {
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
      const instrs: UnresolvedInstruction[] = []
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
          // ADD sp, 1
          {
            opcode: n2t(-39),
            addressingMode: AddressingMode.SHORT_IMMEDIATE,
            x: n2t(4),
            y: n2t(1),
            z: null,
          },
        )
      }
      return instrs
    }
    case 'POP': {
      const instrs: UnresolvedInstruction[] = []
      while (operands.length) {
        instrs.push(
          // ADD sp, -1
          {
            opcode: n2t(-39),
            addressingMode: AddressingMode.SHORT_IMMEDIATE,
            x: n2t(4),
            y: n2t(-1),
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
      return [expect(
        unionParseYZ(
          {
            opcode: n2t(-35),
            x: expect(
              parseRegisterOperand(operands.shift()),
              'MOD: operand 1 must be a register',
            ),
          },
          operands.shift(),
        ),
        'MOD: operand 2 must be a register or immediate',
      )]
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
          { allowAddress: true },
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
          { allowAddress: true },
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
          { allowAddress: true },
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
          { allowAddress: true },
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
  options: { allowAddress: boolean } = { allowAddress: true },
): UnresolvedInstruction | null {
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

  if (options.allowAddress) {
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

function parseAddressOperand(
  operand: string | null | undefined,
): Tryte | string | null {
  if (!operand) {
    return null
  }

  const trimmed = operand.trim()

  if (trimmed[0] == '.' || trimmed[0] == '$') {
    // Label or data
    return trimmed
  } else {
    // Raw address
    return parseImmediateOperand(operand)
  }
}
