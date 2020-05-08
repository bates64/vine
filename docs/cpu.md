# CPU

Word size is 9 trits (one tryte). Instructions begin executing from address 0.

### Registers

| Register name | 2-trit representation | Purpose                             |
| ------------- | --------------------- | ----------------------------------- |
| r0            | --                    |                                     |
| r1            | -o                    |                                     |
| r2            | -+                    |                                     |
| r3            | o-                    |                                     |
| r4            | oo                    |                                     |
| r5            | o+                    |                                     |
| r6            | +-                    |                                     |
| ra            | +o                    | Return address                      |
| sp            | ++                    | [Stack pointer](#stack)             |

#### Stack

The `sp` register is the stack pointer. You should allocate a block of memory for
it at boot if you will be using it:

```
.main
  MOV sp, $stack
	; ...

$stack[30]
```

To push a register to the stack, store to `sp` then increment it.

```
STA r0, sp
ADD sp, +
```

To pop a register from the stack, decrement `sp` then load from it.

```
ADD sp, -
LDA r0, sp
```

The above patterns are common that [the assembler](assembler.md) provides PSH and POP
pseudoinstructions which expand to them:

```
PSH r0               ; push a single register
PSH r1, r2, r3       ; push multiple registers
  ; ...
POP r0, r1, r2, r3   ; pop registers; order should be same as PSH
```

If you decide to never use the stack, `sp` is not treated in any special way by the CPU
and can be used as a general register like `r0`-`r6`.

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
|   1    | `LDA x, yz`   | Loads the tryte at address `yz` into `x`.                         |
|   2    | `STA x, yz`   | Stores `x` at address `yz`.                                       |
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
