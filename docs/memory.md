# Memory

Addresses are 1 tryte long, giving 19683T of memory. Note that just like everything else,
memory addresses are _signed_.

|   Address | Size | Symbol     | Description                 |
| --------: | ---- | ---------- | --------------------------- |
| --------- | 486  |            | [Input](#input)             |
| ----+---- | 6561 |            | [3D map data](#3d-map-data) |
| o---+---- | 2916 | `$TILEMAP` | [2D map data](#2d-map-data) |
| ooo-+---- | 202  |            | Reserved                    |
| ooooooooo | 9841 |            | **User code and data**      |

#### Input

| Offset | Size | Symbol           | Description |
| -----: | ---- | ---------------- | ----------- |
|      0 | 1    | `$MOUSE_X`       | -243 - 243  |
|      1 | 1    | `$MOUSE_Y`       | -243 - 243  |
|      2 | 1    | `$MOUSE_BTNS`    | See below   |
|      3 | 483  | Reserved         |             |

##### `$MOUSE_BTNS`

The `$MOUSE_BTNS` tryte is made up of three trybbles:

    LLL MMM RRR
    |   |   |
    |   |   +---- Right mouse button
    |   |
    |   +-------- Middle mouse button
    |
    +------------ Left mouse button

For each trybble, the value 0 means the button is not down, and a value of 1 means the
button is down. Other values are reserved for later use.

#### 3D map data

A contiguous array of 27x9x27 (6561T) **cells**. Not yet implemented.

#### 2D map data

A contiguous array of 54x54 **tiles**:

| Offset | Size | Description                                                         |
| -----: | ---- | ------------------------------------------------------------------- |
|     0t | 3t   | Tileset U                                                           |
|     3t | 2t   | Tileset V                                                           |
|     5t | 4t   | Unused.                                                             |

2D elements are always drawn on top of 3D elements.
