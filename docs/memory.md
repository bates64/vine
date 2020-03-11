<!--
# Memory

Addresses are 1 tryte long, giving 19683T of memory. The entire cartridge is copied into memory at
boot; you can modify any of it at runtime, but it will not be persisted.

### Header

The cartridge header is found at the very beginning of memory (address `---------`).

| Offset | Length | Description                                                                    |
|:------:|:------:| ------------------------------------------------------------------------------ |
| 0      | 1      | Name of cartridge (string pointer)                                             |
| 1      | 27     | Interrupt handler table (array of addresses)                                   |
| 29     |        | End                                                                            |
-->

https://en.wikibooks.org/wiki/NES_Programming/Memory_Map
https://en.wikibooks.org/wiki/Super_NES_Programming/Graphics_tutorial

# Memory

## Memory Map

|   Address | Size | Description         |
| --------: | ---- | ------------------- |
| --------- | 486  | Reserved            |
| ----+---- | 6561 | 27x9x27 3D map data |
| o---+---- | 2916 | 54x54 2D map data   |
| ooo-+---- | 18   | Palette data        |
| ooo-+-o-- | 184  | Reserved            |
| ooooooooo | 9841 | **User data**       |

#### Input

| Offset | Size | Description      |
| -----: | ---- | ---------------- |
|     0T | 1T   | Mouse X position |
|     1T | 1T   | Mouse Y position |

#### 3D map data

A contiguous array of 27x9x27 (6561T) **cells**:

#### 2D map data

A contiguous array of 54x54 **tiles**:

| Offset | Size | Description                                                         |
| -----: | ---- | ------------------------------------------------------------------- |
|     0t | 5t   | Sprite index                                                        |
|     5t | 2t   | Palette index                                                       |
|     7t | 1t   | Flipping flag (- = flip horizontal, o = no flip, + = flip vertical) |
|     8t | 1t   | Unused                                                              |

2D elements are always drawn on top of 3D elements.

#### Palette data

A contiguous array of 9x2 color trytes in `RRRGGGBBB` format (i.e. 0 is middle grey).
