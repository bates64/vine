import { Tryte, t2n, n2t, t2s, TRYTE_NUM_VALUES, MAX_TRYTE } from './ALU.js'

// Memory interface. Has TRYTE_NUM_VALUES (19683) 9-trit addresses by default,
// each holding a tryte. All addresses are initialized to zero.
//
// Rather than using binary-coded ternary[0], we just convert all trytes given
// to us into JS numbers with the same numerical value. This is probably less
// efficient than using BCT.
//
// [0]: http://homepage.divms.uiowa.edu/~jones/ternary/bct.shtml
export default class Memory {
  // Signed 32-bit integers fit our 9841 through -9841 tryte values.
  block: Int32Array

  writeWatchers: Map<Tryte, WriteWatcher[]>

  constructor(size = TRYTE_NUM_VALUES) {
    this.block = new Int32Array(TRYTE_NUM_VALUES)
    this.writeWatchers = new Map()
  }

  load(addr: Tryte | number): Tryte {
    return n2t(this.block[t2n(addr) + 9841])
  }

  store(value: Tryte | number, addr: Tryte | number) {
    this.block[t2n(addr) + 9841] = t2n(value)

    const watchers = this.writeWatchers.get(n2t(addr)) ?? []
    for (const watcher of watchers) {
      if (watcher instanceof HTMLElement) {
        watcher.textContent = t2s(n2t(value)) + ' ' + t2n(value)
      } else {
        watcher(n2t(value), n2t(addr))
      }
    }
  }

  watchWrite(addr: Tryte, callback: WriteWatcher) {
    const arr = this.writeWatchers.get(addr) ?? []
    arr.push(callback)
    this.writeWatchers.set(addr, arr)
  }
}

type WriteWatcher = HTMLElement | ((value: Tryte, addr: Tryte) => void)
