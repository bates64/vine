import fix from 'fix-whitespace'

export default interface Cartridge {
  name: string,
  sourceCode: string,
  tileset: string,
}

export const examples: Cartridge[] = [
  {
    name: 'Basic',
    tileset: 'splash-tileset.png',
    sourceCode: fix`
      ; Welcome to VINE!
      ;
      ; This example routine draws a green line to the screen.
      ; Hit "Assemble and run" above to see in it action!
      ; You can also see the assembled object code by opening
      ; the JavaScript console (Ctrl+Shift+J).
      ;
      ; Documentation: https://github.com/bates64/vine/blob/master/docs/README.md
      ;
      ; You're free to edit the code - your changes will be saved
      ; in the URL of your browser window. Bookmark the page if
      ; you want to save your program for later.

      mov r0, oo-o-oooo ; tile appearance (uuuvv____)
      mov r1, 0         ; tile index
      mov r2, 26        ; final tile index

      .draw_loop
        sto r0, r1, $TILEMAP
        add r1, 1

        ; If r1 > r2, we've finished drawing.
        jgt r1, r2, .done

        ; If here is reached, we've not finished drawing
        ; so go back to .draw_loop.
        jmp .draw_loop

      ; When we're finished, we need to 'spin' the CPU
      ; by continously jumping to a single address.
      ;
      ; Otherwise, it will start executing data past the
      ; end of the program which we definitely don't want!
      .done
        jmp .done
    `,
  },
  {
    name: 'Paint',
    tileset: 'splash-tileset.png',
    sourceCode: fix`
      ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
      ;;                                             ;;
      ;;   Hold left click or right click to paint.  ;;
      ;;                                             ;;
      ;; Clicking on the palette at the bottom will  ;;
      ;; change that mouse button's painting colour. ;;
      ;;                                             ;;
      ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

      mov sp, $stack

      mov r0, +o-oooooo ; grey tile
      sta r0, $lmb_color

      mov r0, ++-oooooo ; black tile
      sta r0, $rmb_color

      .main_loop
        jal .set_palette_tiles

        jal .handle_lmb
        jal .handle_rmb

        jmp .main_loop

      $stack[10]
      $lmb_color
      $rmb_color

      ; () -> ()
      .handle_lmb
        psh ra
          lda r0, $MOUSE_BTNS
          shr r0, 6
          mov r1, 0
          jeq r0, r1, .handle_lmb__done ; mouse not down
            jal .get_mouse_tile_pos

            ; is y!=26?
            mov r3, 26
            jeq r1, r3, .handle_lmb__change_palette
              lda r3, $lmb_color
              any r3, oooo-oooo
              sto r3, r2, $TILEMAP
              jmp .handle_lmb__done
            .handle_lmb__change_palette
              ldo r3, r2, $TILEMAP
              xor r3, ---oo-----
              sta r3, $lmb_color
        .handle_lmb__done
        pop ra
        jmp ra

      ; () -> ()
      .handle_rmb
        psh ra
          lda r0, $MOUSE_BTNS
          xor r0, oooooo---
          mov r1, 0
          jeq r0, r1, .handle_rmb__done
            jal .get_mouse_tile_pos

            ; is y!=26?
            mov r3, 26
            jeq r1, r3, .handle_rmb__change_palette
              lda r3, $rmb_color
              any r3, oooo-oooo
              sto r3, r2, $TILEMAP
              jmp .handle_rmb__done
            .handle_rmb__change_palette
              ldo r3, r2, $TILEMAP
              xor r3, ---oo-----
              sta r3, $rmb_color
        .handle_rmb__done
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

      ; Sets the tiles at the bottom to the palette.
      ; () -> ()
      .set_palette_tiles
        mov r0, 702 ; 27 * 26 (start of row y=26)
        mov r1, --- ; tile u

        lda r6, $rmb_color
        lda r5, $lmb_color

        .set_palette_tiles__loop
          shr r1, -6 ; u=0

          jeq r1, r5, .set_palette_tiles__is_active_lmb
          jeq r1, r6, .set_palette_tiles__is_active_rmb
            any r1, oooo+oooo
            sto r1, r0, $TILEMAP
            jmp .set_palette_tiles__continue
          .set_palette_tiles__is_active_lmb
          .set_palette_tiles__is_active_rmb
            sto r1, r0, $TILEMAP

          .set_palette_tiles__continue
          shr r1, 6

          add r0, 1
          add r1, 1

          mov r2, 729 ; 27 * 27 (last of row y=26)
          jlt r0, r2, .set_palette_tiles__loop

        jmp ra
    `,
  }
]
