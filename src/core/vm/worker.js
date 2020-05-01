import VirtualMachine from './VirtualMachine'
import Memory from './Memory'
import { s2t } from './ALU'

const vm = new VirtualMachine()

console.log('worker says hello!')

self.addEventListener('message', e => {
	const { method, ...args } = e.data

	console.debug('worker recieved:', method, args)

  if (method === 'runCartridge') {
    vm.stop()
    vm.ram = new Memory()
    vm.ram.block.buffer = args.buffer
    vm.nextInstruction = s2t('---------')
    vm.start()
  } else if (method === 'requestChangedTiles') {
    const tiles = vm.unhandledTileChanges
    vm.unhandledTileChanges = []

    self.postMessage({ method: 'respondChangedTiles', tiles })
  } else if (method === 'setMousePos') {
		vm.setMousePos(args.x, args.y)
	} else if (method === 'setMouseButton') {
		vm.setMouseButton(args.button, args.down)
	} else {
    console.error('unknown message posted to worker', method, args)
  }
})
