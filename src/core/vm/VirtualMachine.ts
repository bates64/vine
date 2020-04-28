import ALU, { Trit, Tryte, clone, s2t, t2s, n2t, t2n, PLUS_ONE } from './ALU.js'
import { Instruction, shiftInstruction } from './Instruction.js'
import Memory from './Memory.js'

export enum Operation {
  INT = -40, // TODO; interrupts are no longer planned
  ADD,
  ADC,
  MUL,
  DIV,
  MOD,
  NEG,
  MIN,
  MAX,
  XOR,
  CON,
  ANY,
  SHR,
  SHU,

  MOV = 0,
  LDA,
  STA,
  LDO,
  STO,

  JMP = 36,
  JAL,
}

const A0 = 4,
  A1 = 5,
  A2 = 6,
  RA = 7,
  SP = 8

export default class VirtualMachine {
  alu = new ALU()
  ram: Memory

  registers = [
    n2t(0), // t0
    n2t(0), // t1
    n2t(0), // t2
    n2t(0), // t3
    n2t(0), // a0
    n2t(0), // a1
    n2t(0), // a2
    n2t(0), // ra
    n2t(0), // sp
  ]

  // Internal ALU.
  //
  // We can't use the normal ALU internally; we might end up modifying the
  // carry flag etc - they need to be kept untouched between instructions!
  private ialu = new ALU()

  // Program counter.
  protected nextInstruction = s2t('---------')

  constructor(cartridge: Memory) {
    this.ram = cartridge
  }

  pushRegisters(...indexes: number[]) {
    const sp = this.registers[SP]

    for (const index of indexes) {
      this.ialu.add(sp, PLUS_ONE)
      this.ram.store(clone(this.registers[index]), sp)
    }

    this.registers[SP]
  }

  // Fetches, decodes, and executes the next instruction. Moves the next
  // instruction pointer accordingly.
  next() {
    /*
    // Handle interrupts, if there are any.
    const interrupt = this.interruptQueue.pop()
    if (interrupt) {
      // Let's look up the interrupt's handler address from the cartridge header.
      const interruptT = n2t(interrupt)
      this.ialu.add(interruptT, PLUS_ONE)
      const handler = this.ram.load(interruptT)

      // JAL handler
      this.ialu.copy(this.registers[RA], this.nextInstruction)
      this.nextInstruction = handler
    }
    */

    // Fetch and decode the next instruction.
    const instruction = shiftInstruction(this)

    this.ialu.add(instruction.x, n2t(4))
    const x = this.registers[t2n(instruction.x)]
    const y = this.decodeOperandY(instruction)
    const z = instruction.z || null

    // Now excute it!
    switch (t2n(instruction.opcode) as Operation) {
      /*
      case Operation.INT: {
        const interrupt = t2n(y)
        if (interrupt in Interrupt) {
          this.interruptQueue.push(interrupt as Interrupt)
        } else {
          console.warn('Unknown interrupt: ' + interrupt)
        }
        break
      }
      */
      case Operation.ADD: {
        this.alu.add(x, z || y, false)
        break
      }
      case Operation.ADC: {
        this.alu.add(x, z || y, true)
        break
      }
      case Operation.MUL: {
        this.alu.multiply(x, z || y)
        break
      }
      case Operation.DIV: {
        this.alu.divide(x, z || y)
        break
      }
      case Operation.MOD: {
        throw new Error('Unimplemented')
      }
      case Operation.NEG: {
        this.alu.neg(x, z || y)
        break
      }
      case Operation.MIN: {
        this.alu.min(x, z || y)
        break
      }
      case Operation.MAX: {
        this.alu.max(x, z || y)
        break
      }
      case Operation.CON: {
        this.alu.consensus(x, z || y)
        break
      }
      case Operation.ANY: {
        this.alu.acceptAnything(x, z || y)
        break
      }
      case Operation.SHR: {
        this.alu.shiftRight(x, z || y)
        break
      }
      case Operation.SHU: {
        this.alu.shiftUp(x, z || y)
        break
      }

      case Operation.MOV: {
        this.alu.copy(x, z || y)
        break
      }
      case Operation.LDA: {
        if (z) {
          this.alu.copy(x, this.ram.load(z))
        } else {
          console.warn('LDA expects z operand')
        }
        break
      }
      case Operation.STA: {
        this.ram.store(x, z || y)
        break
      }
      case Operation.LDO: {
        if (z) {
          this.ialu.add(z, y)
          this.alu.copy(x, this.ram.load(z))
        } else {
          console.warn('LDO expects z operand')
        }
        break
      }
      case Operation.STO: {
        if (z) {
          this.ialu.add(z, y)
          this.ram.store(x, z)
        } else {
          console.warn('STO expects z operand')
        }
        break
      }
      // TODO conditional jumps
      case Operation.JMP: {
        this.nextInstruction = z || y
        break
      }
    }
  }

  decodeOperandY({ addressingMode, y }: Instruction): Tryte {
    switch (addressingMode) {
      case -1:
      case 1:
        this.ialu.add(y, n2t(4))
        return this.registers[t2n(y)]
      case 0:
        return y
      default:
        throw new Error('unreachable code')
    }
  }

  // Fetches the next tryte from memory and moves the next instruction pointer accordingly.
  shift(): Tryte {
    const tryte = this.ram.load(this.nextInstruction)

    this.ialu.add(this.nextInstruction, PLUS_ONE)

    return tryte
  }
}
