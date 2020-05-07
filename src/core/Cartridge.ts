import fix from 'fix-whitespace'

export default interface Cartridge {
  name: string,
  sourceCode: string,
  tileset: string,
}

export const examples: Cartridge[] = [
  {
    name: 'Paint',
    sourceCode: fix`
      ; A simple painting program!
      ;
      ; Hold left click to paint.
      ; Hold right click to erase.

      mov sp, -1 ; stack grows backwards with psh/pop

      .main_loop
        jal .handle_lmb
        jal .handle_rmb
        jmp .main_loop

      ; () -> ()
      .handle_lmb
        psh ra
          lda r0, $MOUSE_BTNS
          shr r0, 6
          mov r1, 0
          jeq r0, r1, .handle_lmb__not_down
            ; rmb is down - paint!
            jal .get_mouse_tile_pos ; r2 = index
            mov r3, oo+oooooo ; red
            sto r3, r2, $TILEMAP
          .handle_lmb__not_down
        pop ra
        jmp ra

      ; () -> ()
      .handle_rmb
        psh ra
          lda r0, $MOUSE_BTNS
          xor r0, oooooo---
          mov r1, 0
          jeq r0, r1, .handle_rmb__not_down
            ; rmb is down - paint!
            jal .get_mouse_tile_pos ; r2 = index
            mov r3, ooooooooo ; black
            sto r3, r2, $TILEMAP
          .handle_rmb__not_down
        pop ra
        jmp ra

      ; () -> x, y, index
      .get_mouse_tile_pos
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
