import ALU, { Tryte, s2t, n2t, t2n, PLUS_ONE } from './ALU.js'
import { Instruction, AddressingMode, shiftInstruction } from './Instruction.js'
import Memory from './Memory.js'

export const symbols: Map<string, Tryte> = new Map([
  [ 'MOUSE_X', s2t('---------') ],
  [ 'MOUSE_Y', s2t('--------o') ],
  [ 'MOUSE_BTNS', s2t('--------+') ],

  [ 'TILEMAP', s2t('o---+----') ],
  [ 'TILEMAP_SIZE', n2t(2916) ],
])

const TILEMAP = t2n(<Tryte>symbols.get('TILEMAP'))
const TILEMAP_SIZE = t2n(<Tryte>symbols.get('TILEMAP_SIZE'))

export enum Operation {
  ADD = -39,
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

  JEQ = 30,
  JNE,
  JGT,
  JLT,
  JGE,
  JLE,
  JMP,
  JAL,
}

const A0 = 4,
  A1 = 5,
  A2 = 6,
  RA = 7,
  SP = 8

export default class VirtualMachine {
  alu = new ALU()
  ram: Memory | null = null

  registers = [
    n2t(0), // r0
    n2t(0), // r1
    n2t(0), // r2
    n2t(0), // r3
    n2t(0), // r4
    n2t(0), // r5
    n2t(0), // r6
    n2t(0), // ra
    n2t(0), // sp
  ]

  // Internal ALU.
  //
  // We can't use the normal ALU internally; we might end up modifying the
  // carry flag etc - they need to be kept untouched between instructions!
  private ialu = new ALU()

  // Program counter.
  nextInstruction = s2t('ooooooooo')

  private clock: number | undefined

  reset() {
    for (const register of this.registers) {
      this.ialu.copy(register, n2t(0))
    }
  }

  // Fetches, decodes, and executes the next instruction. Moves the next
  // instruction pointer accordingly.
  next() {
    if (!this.ram) throw new Error('No cartridge loaded')

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
      case Operation.XOR: {
        this.alu.xor(x, z || y)
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
        this.alu.copy(x, this.ram.load(z || y))
        break
      }
      case Operation.STA: {
        this.ram.store(x, z || y)
        this.writeHooks(x, z || y)
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
          this.writeHooks(x, z)
        } else {
          console.warn('STO expects z operand')
        }
        break
      }
      case Operation.JEQ: {
        if (t2n(x) === t2n(y)) {
          if (z) {
            this.nextInstruction = z
          } else {
            console.warn('JEQ expects z operand')
          }
        }
        break
      }
      case Operation.JNE: {
        if (t2n(x) !== t2n(y)) {
          if (z) {
            this.nextInstruction = z
          } else {
            console.warn('JNE expects z operand')
          }
        }
        break
      }
      case Operation.JGT: {
        if (t2n(x) > t2n(y)) {
          if (z) {
            this.nextInstruction = z
          } else {
            console.warn('JGT expects z operand')
          }
        }
        break
      }
      case Operation.JLT: {
        if (t2n(x) < t2n(y)) {
          if (z) {
            this.nextInstruction = z
          } else {
            console.warn('JLT expects z operand')
          }
        }
        break
      }
      case Operation.JGE: {
        if (t2n(x) >= t2n(y)) {
          if (z) {
            this.nextInstruction = z
          } else {
            console.warn('JGE expects z operand')
          }
        }
        break
      }
      case Operation.JLE: {
        if (t2n(x) <= t2n(y)) {
          if (z) {
            this.nextInstruction = z
          } else {
            console.warn('JLE expects z operand')
          }
        }
        break
      }
      case Operation.JMP: {
        this.nextInstruction = z || y
        break
      }
      case Operation.JAL: {
        this.registers[7] = this.nextInstruction
        this.nextInstruction = z || y
        break
      }
      default: {
        console.error('Unknown intruction', instruction)
        this.stop()
      }
    }
  }

  decodeOperandY({ addressingMode, y }: Instruction): Tryte {
    switch (addressingMode) {
      case AddressingMode.WORD_IMMEDIATE:
      case AddressingMode.REGISTER_REGISTER:
        this.ialu.add(y, n2t(4))
        return this.registers[t2n(y)]
      case AddressingMode.SHORT_IMMEDIATE:
        return y
      default:
        throw new Error('Unknown addressing mode: ' + addressingMode)
    }
  }

  // Fetches the next tryte from memory and moves the next instruction pointer accordingly.
  shift(): Tryte {
    if (!this.ram) return n2t(0)

    const tryte = this.ram.load(this.nextInstruction)

    this.ialu.add(this.nextInstruction, PLUS_ONE)

    return tryte
  }

  start() {
    if (this.clock) this.stop()
    if (!this.ram) throw new Error('No cartridge loaded')

    console.info('cpu started')

    // CPU loop
    const clockIntervalSecs = 0.01
    const clockMegahertz = 5
    const instructionsPerClockCycle = clockMegahertz / clockIntervalSecs
    this.clock = <any>setInterval(() => {
      for (let i = 0; i < instructionsPerClockCycle; i++) {
        this.next()
      }
    }, clockIntervalSecs * 1000)
  }

  stop() {
    if (this.clock) {
      clearInterval(this.clock)
      this.clock = undefined

      console.info('cpu stopped')
    }
  }

  // Write hooks - usually for the UI to update something
  writeHooks(x: Tryte, z: Tryte) {
    const address = t2n(z)

    if (address >= TILEMAP && address < (TILEMAP + TILEMAP_SIZE)) {
      const u = s2t('---oooooo')
      this.ialu.xor(u, x)
      this.ialu.shiftRight(u, n2t(6))

      const v = s2t('ooo--oooo')
      this.ialu.xor(v, x)
      this.ialu.shiftRight(v, n2t(4))

      // @ts-ignore
      self.postMessage({
        method: 'tileChange',
        index: address - TILEMAP,
        u: t2n(u),
        v: t2n(v),
      })
    }
  }

  setMousePos(x: number, y: number) {
    this.ram?.store(x, <Tryte>symbols.get('MOUSE_X'))
    this.ram?.store(y, <Tryte>symbols.get('MOUSE_Y'))
  }

  setMouseButton(button: number, down: boolean) {
    if (!this.ram) return

    // The MOUSE_BTNS tryte is made up of three trybbles:
    //
    //     LLL MMM RRR
    //     |   |   |
    //     |   |   +---- Right mouse button
    //     |   |
    //     |   +-------- Middle mouse button
    //     |
    //     +------------ Left mouse button
    //
    // For each trybble, the value 0 means the button is not down, and a value of 1 means the
    // button is down. Other values are reserved for later use.
    const MOUSE_BTNS = <Tryte>symbols.get('MOUSE_BTNS')
    const btn = this.ram.load(MOUSE_BTNS)

    if (button === 0) {
      // Left
      btn[0] = 0
      btn[1] = 0
      btn[2] = down ? 1 : 0
    } else if (button === 1) {
      // Middle
      btn[3] = 0
      btn[4] = 0
      btn[5] = down ? 1 : 0
    } else if (button === 2) {
      // Right
      btn[6] = 0
      btn[7] = 0
      btn[8] = down ? 1 : 0
    }

    this.ram.store(btn, MOUSE_BTNS)
  }
}
