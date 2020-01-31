import VirtualMachine from './vm/VirtualMachine'
import { s2t, t2s, n2t, t2n } from './vm/ALU'

const vm = new VirtualMachine()

vm.rom.store(n2t(0), s2t('---oo+---')) // ADD r0, imm
vm.rom.store(n2t(1), n2t(69))
vm.rom.store(n2t(2), s2t('oo+o+-oo+')) // MOV r1, r0

vm.next()
vm.next()

console.log('r1 =', t2n(vm.registers[1].get()))
