# The Assembler

The CPU will begin execution at address `0`. There is no special 'main' label - the first thing
you write will be the first thing executed.

### Numeric literals

Both decimal and ternary are supported with no prefix.

### Comments

Use a semicolon `;` to ignore everything following it on that line.

### Labels

Use `.label` on its own line to define a label, which represents the address of the instruction or
value following the label.

To use a label's address as an operand, just write its name. You can also write `.label[offset]`.

```
.main
  JAL .load200
  ; ...

.load200
  MOV a0, 200
  JMP ra
```

### Data

You can declare a place for a single tryte of data by putting `$name` on its own line.
`$name[n]` declares `n` trytes of data and can be accessed with `$name[offset]`.

Data is placed at exactly the position it appears in the sourcecode.
**Make sure you JMP past any data declarations to avoid running data as code.**

```
$player_position[2]

.get_player_pos
  LDA r0, $player_position[0]   ; x
  LDA r1, $player_position[1]   ; y
  JMP ra
```

[Memory-mapped symbols](memory.md) are made available with this syntax also.

### Pseudoinstructions

| Syntax             | Description                                               |
| ------------------ | --------------------------------------------------------- |
| `NOP`              | Does nothing                                              |
| `PSH x, y, z, ...` | Pushes the given registers to the stack                   |
| `POP x, y, z, ...` | Pops the given registers from the stack in reverse order  |

### Calling convention

This is just a suggestion - there is no obligation to follow it in your code.

Unlike MIPS, subroutines have no obligation to PSH registers they mutate. If you
want a register's value saved, PSH it before calling and POP afterwards.
However, remember that if a subroutine is calling into another it must `PSH ra`
and `POP ra`.

Input and ouput should be done through the rX registers, sequentially. It is
useful to write a function signature like `a, b -> c, d` to represent the
inputs `r0` "a" / `r1` "b" and the outputs `r0` "c" / `r1` "d".

```
MOV r0, 1
MOV r1, 2
JAL .sum2

; a, b -> sum
.sum2
  ADD r0, r1
	MOV r0, r2
  JMP ra
```
