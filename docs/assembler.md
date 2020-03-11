# The Assembler

### Numeric literals

Both decimal and ternary are supported with no prefix.

### Comments

Use a semicolon `;` to ignore everything following it on that line. Multiline comments are not yet
supported.

### Labels

Use `label:` on its own line to define a label, which represents the address of the instruction or
value following the label.

As operands, labels may be used in [Type I instructions](cpu.md#instruction-encoding), as addresses
are a full word long: just write the label's name. You can also write `label[n]` to represent the
address of `label` plus an offset of `n` trytes.

e.g.

```
main:
  JAL load200
  ; ...

load200:
  LDI a0, 200
  JMP ra
```

To request that a label and its associated data/instructions be placed at a particular location in
memory, write `label @ address:` rather than `label:`. For example:

```
header @ ---------:
  ; rom header data here...
```

### Arbitrary data

Arbitrary data can be outputted by writing numeric literals rather than instructions:

```
xpos:
  0

routine:
  LDA t0, xpos
  ; ...
```

### Pseudoinstructions

| Syntax             | Description                                               |
| ------------------ | --------------------------------------------------------- |
| `NOP`              | Does nothing.                                             |
| `PSH x, y, z, ...` | Pushes the given registers to the stack.                  |
| `POP x, y, z, ...` | Pops the given registers from the stack in reverse order. |
| `SWP x, y`         | Swaps `x` and `y`.                                        |
