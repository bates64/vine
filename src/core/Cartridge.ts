import fix from 'fix-whitespace'
import Memory from './vm/Memory'

export default interface Cartridge {
  name: string,
  sourceCode: string,
  tileset: string,
}

export const examples: Cartridge[] = [
  {
    name: 'Paint',
    sourceCode: fix`
    .loop
      mov r3, oo+oooooo ; red tile
      jal .get_mouse_tile_pos
      sto r3, r2, $TILEMAP
      jmp .loop

    .get_mouse_tile_pos ; returns (r0 = x, r1 = y, r2 = index)
      ; x (r0)
      lda r0, $MOUSE_X
      add r0, 121      ; adjust so origin is 0,0 rather than centre
      div r0, 9        ; to grid
      ; y (r1)
      lda r1, $MOUSE_Y
      add r1, 121      ; adjust origin
      div r1, 9        ; to grid
      ; index (r2)
      mov r2, r1
      mul r2, 27       ; row size
      add r2, r0
      jmp ra
    `,
    tileset: 'splash-tileset.png',
  }
]
