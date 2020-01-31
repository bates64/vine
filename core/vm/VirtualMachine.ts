import ALU, { Trit, Tryte, clone, s2t, t2s, n2t, t2n, PLUS_ONE } from './ALU'
import Memory from './Memory'

export default class VirtualMachine {
  alu = new ALU()
  ram = new Memory()
  rom = new Memory() // Read-only memory, i.e. the cartridge.

  registers = [
    new Register(), // r0
    new Register(), // r1
    new Register(), // r2
    new Register(), // r3
    new Register(), // r4
    new Register(), // r5
    new Register(), // r6
    new Register(), // r7
    new Register(), // r8
    new Register(), // r9
    new Register(), // r10
    new Register(), // r11
  ]

  // Internal ALU.
  //
  // We can't use the normal ALU internally; we might end up modifying the
  // carry flag etc - they need to be kept untouched between instructions!
  protected ialu = new ALU()

  // Program counter. Pointer to ROM.
  protected nextInstruction = n2t(0)

  // Stores the result of the last CMP instruction.
  protected compareResult: Trit = 0

  // Resets the program counter.
  reset() {
    this.nextInstruction = n2t(0)
  }

  // Fetches, decodes, and executes the next instruction. Moves the next
  // instruction pointer accordingly.
  next() {
    const xxxyyyzzz = this.fetchTryte()

    // Instructions are typically encoded as a single tryte:
    //
    //  XXXYYYZZZ
    //  |  |  |
    //  |  |  | Operand B
    //  |  |
    //  |  | Operand A
    //  |
    //  | Opcode

    const opcode = s2t('---oooooo')
    this.ialu.xor(opcode, xxxyyyzzz)
    this.ialu.shiftRight(opcode, n2t(6))

    const operandA = s2t('ooo---ooo')
    this.ialu.xor(operandA, xxxyyyzzz)
    this.ialu.shiftRight(operandA, n2t(3))

    const operandB = s2t('oooooo---')
    this.ialu.xor(operandB, xxxyyyzzz)

    /*
    console.debug('instruction:', t2s(xxxyyyzzz))
    console.debug('opcode:     ', t2s(opcode))
    console.debug('operand a:  ', t2s(operandA))
    console.debug('operand b:  ', t2s(operandB))
    */

    // The fun part!!
    //
    // The nature of 3-trit opcodes means *we only get 27 different opcodes* to
    // play with; there are some notable ommissions to the instruction set.
    switch (t2n(opcode)) {
      // ADD a, b
      case -13: {
        const cellA = this.decodeOperand(operandA)
        const cellB = this.decodeOperand(operandB)

        const out = cellA.get()
        this.alu.add(out, cellB.get())
        cellA.set(out)

        break
      }

      // Opcode -12 reserved.

      // ADDC a, b
      // Add with previous carry, if any.
      case -11: {
        const cellA = this.decodeOperand(operandA)
        const cellB = this.decodeOperand(operandB)

        const out = cellA.get()
        this.alu.add(out, cellB.get(), true)
        cellA.set(out)

        break
      }

      // Opcode -10 reserved for MUL.
      // Opcode -9 reserved for DIV.
      // Opcode -8 reserved for MOD.

      // NEG a, b
      case -7: {
        const cellA = this.decodeOperand(operandA)

        const out = cellA.get()
        this.alu.neg(out)
        cellA.set(out)

        break
      }

      // MIN a, b
      case -6: {
        const cellA = this.decodeOperand(operandA)
        const cellB = this.decodeOperand(operandB)

        const out = cellA.get()
        this.alu.min(out, cellB.get())
        cellA.set(out)

        break
      }

      // MAX a, b
      case -5: {
        const cellA = this.decodeOperand(operandA)
        const cellB = this.decodeOperand(operandB)

        const out = cellA.get()
        this.alu.max(out, cellB.get())
        cellA.set(out)

        break
      }

      // CON a, b
      case -4: {
        const cellA = this.decodeOperand(operandA)
        const cellB = this.decodeOperand(operandB)

        const out = cellA.get()
        this.alu.consensus(out, cellB.get())
        cellA.set(out)

        break
      }

      // ANY a, b
      case -3: {
        const cellA = this.decodeOperand(operandA)
        const cellB = this.decodeOperand(operandB)

        const out = cellA.get()
        this.alu.acceptAnything(out, cellB.get())
        cellA.set(out)

        break
      }

      // RSH a, b
      case -2: {
        const cellA = this.decodeOperand(operandA)
        const cellB = this.decodeOperand(operandB)

        const out = cellA.get()
        this.alu.shiftRight(out, cellB.get())
        cellA.set(out)

        break
      }

      // USH a, b
      case -1: {
        const cellA = this.decodeOperand(operandA)
        const cellB = this.decodeOperand(operandB)

        const out = cellA.get()
        this.alu.shiftUp(out, cellB.get())
        cellA.set(out)

        break
      }

      // NOP
      case 0:
        break

      // MOV a, b
      case 1: {
        const cellA = this.decodeOperand(operandA)
        const cellB = this.decodeOperand(operandB)

        const out = cellA.get()
        this.alu.copy(out, cellB.get())
        cellA.set(out)

        break
      }

      // CMP a, b
      case 2: {
        const cellA = this.decodeOperand(operandA)
        const cellB = this.decodeOperand(operandB)

        this.compareResult = this.alu.compare(cellA.get(), cellB.get())

        break
      }

      // JMP a
      case 3: {
        const cellA = this.decodeOperand(operandA)

        this.nextInstruction = clone(cellA.get())

        break
      }

      // JEQ a
      case 4: {
        if (this.compareResult == 0) {
          const cellA = this.decodeOperand(operandA)
          this.nextInstruction = clone(cellA.get())
        }

        break
      }

      // JGT a
      case 5: {
        if (this.compareResult == 1) {
          const cellA = this.decodeOperand(operandA)
          this.nextInstruction = clone(cellA.get())
        }

        break
      }

      // JLT a
      case 6: {
        if (this.compareResult == -1) {
          const cellA = this.decodeOperand(operandA)
          this.nextInstruction = clone(cellA.get())
        }

        break
      }

      // JAL a, b
      // Jumps to address b, setting a to the address of the instruction
      // following the JAL instruction (i.e. the return address).
      case 7: {
        const cellA = this.decodeOperand(operandA)
        const cellB = this.decodeOperand(operandB)

        cellA.set(clone(this.nextInstruction))
        this.nextInstruction = clone(cellB.get())

        break
      }

      // LOD a, b
      // Loads the data at cartridge ROM address b into a.
      case 8: {
        const cellA = this.decodeOperand(operandA)
        const cellB = this.decodeOperand(operandB)

        cellA.set(this.rom.load(cellB.get()))

        break
      }

      // XOR a, b
      case 9: {
        const cellA = this.decodeOperand(operandA)
        const cellB = this.decodeOperand(operandB)

        const out = cellA.get()
        this.alu.xor(out, cellB.get())
        cellA.set(out)

        break
      }

      // TODO: opcodes 10-13

      default:
        throw new Error('Unknown opcode: ' + t2s(opcode))
    }
  }

  // Addressing modes.
  // Operands can hold one of the following data storage types:
  //
  //  ---         ->  * Immediate
  //  --o         ->  * Immediate-direct pointer to RAM
  //  --+ to ooo  ->  Register-indirect pointer to RAM
  //  oo+ to ++o  ->  Register
  //  +++         ->  --Reserved for future use--
  //
  // Storage types indicated with an asterisk (*) read an extra tryte following
  // the instruction.
  decodeOperand(operand: Tryte): Cell {
    switch (t2n(operand)) {
      case -13:
        return new Immediate(this.fetchTryte())

      case -12:
        return new Pointer(this.fetchTryte(), this.ram)

      case -11:
        return new Pointer(this.registers[0].get(), this.ram)
      case -10:
        return new Pointer(this.registers[1].get(), this.ram)
      case -9:
        return new Pointer(this.registers[2].get(), this.ram)
      case -8:
        return new Pointer(this.registers[3].get(), this.ram)
      case -7:
        return new Pointer(this.registers[4].get(), this.ram)
      case -6:
        return new Pointer(this.registers[5].get(), this.ram)
      case -5:
        return new Pointer(this.registers[6].get(), this.ram)
      case -4:
        return new Pointer(this.registers[7].get(), this.ram)
      case -3:
        return new Pointer(this.registers[8].get(), this.ram)
      case -2:
        return new Pointer(this.registers[9].get(), this.ram)
      case -1:
        return new Pointer(this.registers[10].get(), this.ram)
      case 0:
        return new Pointer(this.registers[11].get(), this.ram)

      case 1:
        return this.registers[0]
      case 2:
        return this.registers[1]
      case 3:
        return this.registers[2]
      case 4:
        return this.registers[3]
      case 5:
        return this.registers[4]
      case 6:
        return this.registers[5]
      case 7:
        return this.registers[6]
      case 8:
        return this.registers[7]
      case 9:
        return this.registers[8]
      case 10:
        return this.registers[9]
      case 11:
        return this.registers[10]
      case 12:
        return this.registers[11]

      case 13:
        throw new Error('Opcode address mode 13 is reserved for future use')

      default:
        throw new Error('Unknown opcode address mode: ' + t2s(operand))
    }
  }

  // Fetches a tryte from ROM & moves the next instruction pointer accordingly.
  fetchTryte(): Tryte {
    const tryte = this.rom.load(this.nextInstruction)

    this.ialu.add(this.nextInstruction, PLUS_ONE)

    return tryte
  }
}

// A read/write-able tryte.
interface Cell {
  get(): Tryte
  set(value: Tryte): void
}

// A cell that holds its own value.
class Register implements Cell {
  private value = n2t(0)

  get(): Tryte {
    return this.value
  }

  set(value: Tryte) {
    this.value = value
  }
}

// A cell with a constant value.
class Immediate implements Cell {
  private value: Tryte

  constructor(value: Tryte) {
    this.value = value
  }

  get(): Tryte {
    return this.value
  }

  set(value: Tryte) {
    console.warn('Attempt to write to immediate')
  }
}

// A cell that reads and writes to a specific memory address.
class Pointer implements Cell {
  private address: Tryte
  private memory: Memory

  constructor(address: Tryte, memory: Memory) {
    this.address = address
    this.memory = memory
  }

  get(): Tryte {
    return this.memory.load(this.address)
  }

  set(value: Tryte) {
    this.memory.store(this.address, value)
  }
}
