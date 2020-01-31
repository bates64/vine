import VirtualMachine from './vm/VirtualMachine'
import { s2t, t2s, n2t, t2n } from './vm/ALU'

import assemble from './asm/assemble'

const vm = new VirtualMachine()

document.querySelector('#execute').addEventListener('click', () => {
  vm.reset()

  const asm = assemble(document.querySelector('#asm').value)

  // Copy the object code to ROM
  for (let i = 0; i < asm.length; i++) {
    vm.rom.store(n2t(i), asm[i])
  }

  // Execute instructions
  for (let i = 0; i < 1000; i++) {
    vm.next()
  }

  // Dump registers
  for (let i = 0; i < 12; i++) {
    document.querySelector('#r' + i).textContent = t2n(vm.registers[i].get())
  }
})
