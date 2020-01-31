import ALU, { Tryte, s2t, t2s, n2t } from '../vm/ALU'

type LabelMap = Map<string, number>

export default function assemble(input: string): Tryte[] {
  const lines = input.split('\n')
    .map(line => line.replace(/;.*$/, '').trim()) // Remove comments & indentation whitespace
    .filter(line => line.length > 0) // Ignore empty lines

  const labels: LabelMap = new Map

  // First pass: find label declarations
  let pc = 0
  for (const line of lines) {
    if (line[0] == '.') {
      // Label declaration.
      labels.set(line.substr(1), pc)
    } else {
      // Instruction.
      const { operandStrA, operandStrB } = parseInstruction(line)

      pc++
      pc += sizeOfOperandStr(operandStrA)
      pc += sizeOfOperandStr(operandStrB)
    }
  }

  // Second pass: assemble
  const out: Tryte[] = []
  const alu = new ALU()
  for (const line of lines) {
    if (line[0] != '.') {
      // Instruction.
      const { opcodeStr, operandStrA, operandStrB } = parseInstruction(line)

      const opcode = assembleOpcodeStr(opcodeStr)
      alu.shiftRight(opcode, n2t(-6))

      const [ operandA, immediateA ] = assembleOperandStr(operandStrA.trim(), labels)
      alu.shiftRight(operandA, n2t(-3))

      const [ operandB, immediateB ] = assembleOperandStr(operandStrB.trim(), labels)

      alu.acceptAnything(opcode, operandA)
      alu.acceptAnything(opcode, operandB)
      out.push(opcode)

      if (immediateA) out.push(immediateA)
      if (immediateB) out.push(immediateB)
    }
  }

  return out
}

type ParsedInstruction = {
  opcodeStr: string
  operandStrA: string
  operandStrB: string
}

function parseInstruction(line: string): ParsedInstruction {
  let opcodeStr = ''
  let operandStrA = ''
  let operandStrB = ''

  let state: 0 | 1 | 2 = 0
  for (const char of line) {
    if (state == 0) {
      if (char == ' ') {
        state++
      } else {
        opcodeStr += char
      }
    } else if (state == 1) {
      if (char == ',') {
        state++
      } else {
        operandStrA += char
      }
    } else {
      if (char == ',') {
        throw new Error('Too many operands: ' + line)
      } else {
        operandStrB += char
      }
    }
  }

  return { opcodeStr, operandStrA, operandStrB }
}

// Returns the number of immediate trytes this operand will be followed by,
// if any.
function sizeOfOperandStr(operand: string): number {
  if (operand[0] == 'r') {
    // Register
    return 0
  } else if (operand[0] == '.') {
    // Immediate, labeled
    return 1
  } else if (operand[0] == '*') {
    if (operand[1] == 'r') {
      // Register-indirect pointer
      return 0
    } else if (operand[2] == '.') {
      throw new Error('ROM label not allowed here: ' + operand)
    } else {
      // Immediate-direct pointer
      return 1
    }
  } else {
    // Immediate
    return 1
  }
}

function assembleOperandStr(operand: string, labels: LabelMap): [ Tryte, Tryte | null ] {
  const parseRegister = (operand: string) => {
    const register = parseInt(operand.substr(1))

    if (isNaN(register) || register < 0 || register > 11) {
      throw new Error('Unknown register: ' + operand)
    }

    return register
  }

  if (operand[0] == 'r') {
    // Register
    return [ n2t(parseRegister(operand) + 1), null ]
  } else if (operand[0] == '.') {
    // Immediate, labeled
    const addr = labels.get(operand.substr(1))

    if (typeof addr == 'undefined') {
      throw new Error('Undeclared ROM label: ' + operand.substr(1))
    }

    return [ n2t(-13), n2t(addr) ]
  } else if (operand[0] == '*') {
    if (operand[1] == 'r') {
      // Register-indirect pointer
      return [ n2t(parseRegister(operand.substr(1)) - 11), null ]
    } else if (operand[2] == '.') {
      throw new Error('ROM label not allowed here: ' + operand)
    } else {
      // Immediate-direct pointer
      return [ n2t(-12), s2t(operand.substr(1)) ]
    }
  } else {
    // Immediate
    return [ n2t(-13), s2t(operand) ]
  }
}

function assembleOpcodeStr(str: string): Tryte {
  switch (str.toUpperCase()) {
    case 'ADD': return n2t(-13)
    case 'ADDC': return n2t(-11)
    case 'MUL': return n2t(-10)
    case 'DIV': return n2t(-9)
    case 'MOD': return n2t(-8)
    case 'NEG': return n2t(-7)
    case 'MIN': return n2t(-6)
    case 'MAX': return n2t(-5)
    case 'CON': return n2t(-4)
    case 'ANY': return n2t(-3)
    case 'RSH': return n2t(-2)
    case 'USH': return n2t(-1)
    case 'NOP': return n2t(0)
    case 'MOV': return n2t(1)
    case 'CMP': return n2t(2)
    case 'JMP': return n2t(3)
    case 'JEQ': return n2t(4)
    case 'JGT': return n2t(5)
    case 'JLT': return n2t(6)
    case 'JAL': return n2t(7)
    case 'LOD': return n2t(8)
    case 'XOR': return n2t(9)
    default: throw new Error('Unknown instruction: ' + str)
  }
}
