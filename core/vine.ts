import VirtualMachine from './vm/VirtualMachine'
import { s2t, t2s, n2t, t2n } from './vm/ALU'

import assemble from './asm/assemble'

const vm = new VirtualMachine()

const asm = assemble(`

ADD r0, -o ; r0 = 3

; Loop, incrementing r0 until r0 is non-negative
.loop
ADD r0, +
CMP r0, o
JLT .loop

`)

// Copy the object code to ROM
for (let i = 0; i < asm.length; i++) {
  vm.rom.store(n2t(i), asm[i])
}

// Execute 10 instructions
for (let i = 0; i < 10; i++) {
  vm.next()
  console.log('r0 =', t2n(vm.registers[0].get())) // display r1
}
