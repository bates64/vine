## Registers

VINE has 10 registers:

- `pc` - Program counter
- `ra` - Return address
- `a`, `b`, `c` - Intended for function inputs
- `r`, `s` - Intended for function outputs
- `i`, `j`, `k`

The `push r` and `pop r` instructions manipulate the call stack. Pushed registers should be popped
in a LIFO fashion except to perform a swap:

```asm
; swap i and j
push i
push j
pop i
pop j
```

## Calling convention

Calling convention is very similar to MIPS.

- Provide function parameters in `abc`
- Return values from functions in `rs`
- `push` all registers (besides `abc`) used and `pop` before returning

```asm
.main
  put a 5
  jal .factorial

.factorial
  touch a            ; sets zero flag if applicable
  jz .zero
  .notzero           ; a != 0
    push i
    mov a i
    dec a
    jal .factorial
    mul r i
    pop i
    jpop ra
  .zero               ; a == 0
    put r 1
    jpop ra
```

## Instruction set

All instructions take up one tryte each, in the form:

```
xxxxrriii
|   | | immediate tribble, or register
|   |
|   | output register
|
| opcode
```

| Opcode | Bal3 | Syntax     | Description                                     |
| -----: | ---- | ---------- | ----------------------------------------------- |
|    -40 | ---- | nop        | No operation.                                   |
|    -39 | ---o | add x y    | Increments a by b, with overflow.               |
|    -38 | ---+ | addi x imm | Increments x by immediate value, with overflow. |
|    -37 | --o- | neg x      | Negates x, both logically and mathematically.   |
|    -36 | --oo | min x y    | Sets x to the lesser of x and y.                |
|    -35 | --o+ | max x y    | Sets x to the greater of x and y.               |
|    -34 | --+- | and x y    |                                                 |
|    -33 | --+o | or x y     |                                                 |
|    -32 | --++ | xor x y    |                                                 |
