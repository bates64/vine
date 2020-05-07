# CPU

Word size is 9 trits (one tryte).

### Instruction encoding

Instructions are encoded as follows:

```
OOOOAXXXX
|   ||
|   |+--- depends on addressing mode, see below
|   |
|   +---- addressing mode
|
+-------- opcode
```

Instructions using addressing modes `-` and `o` take up one tryte. Addressing mode `+` requires an
auxillary word following it, so they take up 2T.

#### Addressing mode `-`

This is the 'register, register' addressing mode.

```
OOOO-RRTT
|    | |
|    | +- register 2
|    |
|    +--- register 1
|
+-------- opcode
```

#### Addressing mode `o`

This is the 'short immediate' addressing mode.

```
OOOOoRRII
|    | |
|    | +- 2t immediate value (-9 to 9)
|    |
|    +--- register
|
+-------- opcode
```

#### Addressing mode `+`

This is the 'word immediate' addressing mode.

```
OOOO+RRTT IIIIIIIII
|    | |  |
|    | |  +-------- 1T immediate value (-9841 to 9841)
|    | |
|    | +----------- register 2
|    |
|    +------------- register 1
|
+------------------ opcode
```

### Registers

| Register name | 2-trit representation | Purpose                             |
| ------------- | --------------------- | ----------------------------------- |
| t0            | --                    | Temporary (any use)                 |
| t1            | -o                    | Temporary (any use)                 |
| t2            | -+                    | Temporary (any use)                 |
| t3            | o-                    | Temporary (any use)                 |
| a0            | oo                    | Argument 0 / Return value 0         |
| a1            | o+                    | Argument 1 / Return value 1         |
| a2            | +-                    | Argument 2 / Return value 1         |
| ra            | +o                    | Return address                      |
| sp            | ++                    | Stack pointer (see [stack](#stack)) |

### Calling convention

- Use JAL to call
- Return by jumping to ra
- Never modify registers tN, ra, or sp (PSH/POP those you use - see [stack](#stack))
- Take arguments and return values through a0, a1, a2 (overflow to aN stack)

#### Stack

The sp register is the stack pointer. You should allocate a block of memory for
it at boot:

```
; You may need to allocate more size for the stack than this
STACK:
  0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0

main:
  MVI sp, STACK
  LDW sp, sp
  ; ...
```

To push a register to the stack, increment sp by one and store the register to \*sp:

```
ADD sp, 1
STW t0, sp
```

To pop a register from the stack, load the register from \*sp and decrement sp by one:

```
LDW t0, sp
ADD sp, 1
```

Always pop your most-recently-pushed registers, unless you're preforming some weird form of swap!

[The assembler](assembler.md) provides the PSH and POP pseudoinstructions to easily manipulate the
stack.

```
PSH t0, t1, t2, t3
; do stuff with t0-t3...
POP t0, t1, t2, t3  ; note: the order should be same as PSH, not reversed
```

As such, the standard layout of a procedure looks like:

```
procedure:
  PSH <registers used in body>  ; including ra if performing a JAL
  ; procedure body
  POP <registers used in body>
  JMP ra
```

### Instruction set

`x` represents the first operand, which is always a register.  
`y` represents the second operand, which may be an immediate or a register.  
`z` represents the third operand, which is an optional word. Where `z` is used, `y` must be a
register.  
`yz` represents the third operand in addressing mode 1, or the second in other addressing modes.  
(See [addressing modes](#instruction-encoding))

| Opcode | Syntax        | Description                                                       |
| :----: | ------------- | ----------------------------------------------------------------- |
|  -40   |               | Reserved                                                          |
|  -39   | `ADD x, yz`   | `x = x + yz`                                                      |
|  -38   | `ADC x, yz`   | `x = x + yz + carry` (intended for double-precision arithmetic)   |
|  -37   | `MUL x, yz`   | `x = x * yz`                                                      |
|  -36   | `DIV x, yz`   | `x = x / yz` (remainder is discarded).                            |
|  -35   | `MOD x, yz`   | `x = x % yz` (x = remainder of x / yz)                            |
|  -34   | `NEG x, yz`   | Sets `x` to the tritwise NOT / arithmetic negation of`yz`.        |
|  -33   | `MIN x, yz`   | Tritwise AND (minimum).                                           |
|  -32   | `MAX x, yz`   | Tritwise OR (maximum).                                            |
|  -31   | `XOR x, yz`   | Tritwise XOR (exclusive or).                                      |
|  -30   | `CON x, yz`   | Tritwise consensus.                                               |
|  -29   | `ANY x, yz`   | Tritwise accept-anything.                                         |
|  -28   | `SHR x, yz`   | Arithmetic shift x right yz times. Use negative yz to shift left. |
|  -27   | `SHU x, yz`   | Arithmetic shift x up yz times. Use negative yz to shift down.    |
|        |               |                                                                   |
|   0    | `MOV x, yz`   | Copies `yz` into `x`.                                             |
|   1    | `LDA x, yz`   | Loads the tryte at address `yz` into `x`.                          |
|   2    | `STA x, yz`   | Stores `x` at address `yz`.                                        |
|   3    | `LDO x, y, z` | Loads the tryte at address `y + z` into `x`.                      |
|   4    | `STO x, y, z` | Stores `x` at address `y + z`.                                    |
|        |               |                                                                   |
|   30   | `JEQ x, y, z` | Jumps to address `z` if `x == y`.                                 |
|   31   | `JNE x, y, z` | Jumps to address `z` if `x != y`.                                 |
|   32   | `JGT x, y, z` | Jumps to address `z` if `x > y`.                                  |
|   33   | `JLT x, y, z` | Jumps to address `z` if `x < y`.                                  |
|   34   | `JGE x, y, z` | Jumps to address `z` if `x >= y`.                                 |
|   35   | `JLE x, y, z` | Jumps to address `z` if `x <= y`.                                 |
|   36   | `JMP yz`      | Jumps to address `yz`.                                            |
|   37   | `JAL yz`      | Jumps to address `yz`, setting `ra` to the following instruction. |

See also the [assembler pseudoinstructions](assembler.md#pseudoinstructions).
