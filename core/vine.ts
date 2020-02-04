import VirtualMachine from './vm/VirtualMachine.js'
import { s2t, t2s, n2t, t2n } from './vm/ALU.js'

import assemble from './asm/assemble.js'

const vm = new VirtualMachine()

document.querySelector('#reset').addEventListener('click', () => {
  vm.reset()

  console.clear()

  const asm = assemble(document.querySelector('#asm').value)

  // Copy the object code to ROM
  for (let i = 0; i < asm.length; i++) {
    vm.rom.store(n2t(i), asm[i])
  }

  // Reset registers
  for (let i = 0; i < 12; i++) {
    vm.registers[i].set(s2t('o'))
    document.querySelector('#r' + i).textContent = t2n(vm.registers[i].get())
  }
})

document.querySelector('#step').addEventListener('click', () => {
  console.log('step pc =', t2s(vm.nextInstruction))

  // Execute instruction
  vm.next()

  // Dump registers
  for (let i = 0; i < 12; i++) {
    document.querySelector('#r' + i).textContent = t2n(vm.registers[i].get())
  }
})
