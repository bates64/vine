import ALU, { Trit, Tryte, clone, s2t, t2s, n2t, t2n, PLUS_ONE } from './ALU.js'
import { Instruction, shiftInstruction } from './Instruction.js'
import Memory from './Memory.js'
import Tile from '../Tile'

import assemble from '../asm/assemble'

export const symbols = {
  MOUSE_X: s2t('---------'),
  MOUSE_Y: s2t('--------o'),
  MOUSE_BTN: s2t('--------+'),
  TILEMAP: t2n(s2t('o---+----')),
  TILEMAP_SIZE: 2916,
}

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
  ram: Memory | null = null

  unhandledTileChanges: Tile[] = []

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
  nextInstruction = s2t('---------')

  private clock: number | undefined

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

          // Write hooks - usually for the UI to update something
          const address = t2n(z)
          console.log(address)
          if (address >= symbols.TILEMAP && address < (symbols.TILEMAP + symbols.TILEMAP_SIZE)) {
            const u = s2t('---oooooo')
            this.ialu.xor(u, x)

            const v = s2t('ooo--oooo')
            this.ialu.xor(v, x)

            this.unhandledTileChanges.push({
              index: address - symbols.TILEMAP,
              u: t2n(u),
              v: t2n(v),
            })
          }
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
      default: {
        console.error('Unknown intruction', instruction)
        this.stop()
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
    if (!this.ram) return n2t(0)

    const tryte = this.ram.load(this.nextInstruction)

    this.ialu.add(this.nextInstruction, PLUS_ONE)

    return tryte
  }

  start() {
    if (this.clock) this.stop()
    if (!this.ram) throw new Error('No cartridge loaded')

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
    }
  }

  setMousePos(x: number, y: number) {
    this.ram?.store(x, symbols.MOUSE_X)
    this.ram?.store(y, symbols.MOUSE_Y)
  }

  setMouseButton(button: number, down: boolean) {
    if (!this.ram) return

    // The MOUSE_BTN tryte is made up of three trybbles:
    //
    //     LLL MMM RRR
    //     |   |   |
    //     |   |   +---- Right mouse button
    //     |   |
    //     |   +-------- Middle mouse button
    //     |
    //     +------------ Left mouse button
    //
    // For each trybble, the value -1 means the button is not down, and a value of 1 means the
    // button is down. Other values are reserved for later use.

    const btn = this.ram.load(symbols.MOUSE_BTN)
    const alu = new ALU()

    if (button === 0) {
      // Left
      alu.xor(btn, s2t('ooo------'))
      if (down) alu.max(btn, s2t('oo+------'))
      else alu.min(btn, s2t('oo-++++++'))
    } else if (button === 1) {
      // Middle
      alu.xor(btn, s2t('---ooo---'))
      if (down) alu.max(btn, s2t('---oo+---'))
      else alu.min(btn, s2t('+++oo-+++'))
    } else if (button === 2) {
      // Right
      alu.xor(btn, s2t('------ooo'))
      if (down) alu.max(btn, s2t('------oo+'))
      else alu.min(btn, s2t('++++++oo-'))
    }

    this.ram.store(btn, symbols.MOUSE_BTN)
  }
}
