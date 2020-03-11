export type Trit = 1 | 0 | -1
export type Tryte = [Trit, Trit, Trit, Trit, Trit, Trit, Trit, Trit, Trit]
export type Tribble = [0, 0, 0, 0, 0, 0, Trit, Trit, Trit]

// These tryte constants should be cloned before use - trytes are boxed, so they
// are not copied during assignment!
export const ZERO = trit2tryte(0)
export const PLUS_ONE = trit2tryte(1)
export const MINUS_ONE = trit2tryte(-1)
export const MAX_TRYTE: Tryte = [1, 1, 1, 1, 1, 1, 1, 1, 1]
export const MIN_TRYTE: Tryte = [-1, -1, -1, -1, -1, -1, -1, -1, -1]

export const TRYTE_NUM_VALUES = t2n(MAX_TRYTE) * 2 + 1

// The base-3 Arithmetic-Logic Unit.
//
// ALU operations typically take on an f(a, b) function, where a is mutated to
// the result of the operation, i.e. they operate in-place on a.
//
// We do not implement all logical operations, as there would be way too many.
// See http://homepage.divms.uiowa.edu/~jones/ternary/logic.shtml.
//
// TODO: multiplication & division (http://homepage.divms.uiowa.edu/~jones/ternary/multiply.shtml)
export default class ALU {
  carry: Trit = 0

  // a += b
  //
  // To perform subtraction, neg(b) beforehand.
  add(a: Tryte, b: Tryte, withCarry = false) {
    if (!withCarry) this.carry = 0

    for (let d = 8; d >= 0; d--) {
      const val = a[d] + b[d] + this.carry

      if (val == 3) {
        this.carry = 1
        a[d] = 0
      } else if (val == 2) {
        this.carry = 1
        a[d] = -1
      } else if (val == 1) {
        this.carry = 0
        a[d] = 1
      } else if (val == 0) {
        this.carry = 0
        a[d] = 0
      } else if (val == -1) {
        this.carry = 0
        a[d] = -1
      } else if (val == -2) {
        this.carry = -1
        a[d] = 1
      } else if (val == -3) {
        this.carry = -1
        a[d] = 0
      } else {
        throw new Error('Bad trit add result: ' + val)
      }
    }
  }

  // a *= b
  //
  // TODO: don't cheat
  multiply(a: Tryte, b: Tryte) {
    this.copy(a, n2t(Math.floor(t2n(a) * t2n(b))))
  }

  // a /= b
  //
  // TODO: don't cheat
  divide(a: Tryte, b: Tryte) {
    this.copy(a, n2t(Math.floor(t2n(a) / t2n(b))))
  }

  // Equality/greater-than/less-than comparison.
  //
  //  a > b  ->  +
  //  a < b  ->  -
  //  a = b  ->  o
  //
  // compare(a, 0) gives the sign of a.
  compare(a: Tryte, b: Tryte): Trit {
    for (let d = 0; d < 9; d++) {
      if (a[d] > b[d]) {
        return 1 // a > b
      } else if (a[d] < b[d]) {
        return -1 // a < b
      }
    }

    return 0 // a == b
  }

  // a = b * -1
  // a = ~b
  //
  // Tritwise NOT.
  neg(a: Tryte, b: Tryte) {
    for (let d = 0; d < 9; d++) {
      if (b[d] == 1) a[d] = -1
      else if (b[d] == -1) a[d] = 1
      else a[d] = 0
    }
  }

  // a &= b
  //
  // Logical AND.
  min(a: Tryte, b: Tryte) {
    for (let d = 0; d < 9; d++) {
      if (a[d] > b[d]) a[d] = b[d]
    }
  }

  // a |= b
  //
  // Logical OR.
  max(a: Tryte, b: Tryte) {
    for (let d = 0; d < 9; d++) {
      if (a[d] < b[d]) a[d] = b[d]
    }
  }

  // a ^= b
  //
  // Logical XOR. Opposite trits are +, like trits are -, and if either trit is
  // zero the result is zero.
  //
  // You can select specific trits out of a tryte using an XOR:
  //
  //   ooo---ooo
  // ^ +o-+o-+o-
  // = ooo+o-ooo
  //
  xor(a: Tryte, b: Tryte) {
    for (let d = 0; d < 9; d++) {
      if (a[d] == 0 || b[d] == 0) a[d] = 0
      // Zero
      else if (a[d] == b[d]) a[d] = -1
      // Like
      else a[d] = 1 // Unlike
    }
  }

  // a = a CON b
  //
  // Logical consensus. All trits in a which are unequal to their equivalent
  // in b are zeroed.
  consensus(a: Tryte, b: Tryte) {
    for (let d = 0; d < 9; d++) {
      if (a[d] != b[d]) a[d] = 0
    }
  }

  // a = a ANY b
  //
  // Logical accept anything. For each trit, the a trit takes on the non-unknown
  // trit of a and b. If the a and b trits disagree, the a trit is zeroed.
  //
  // You can combine trytes using an ANY:
  //
  //     oooooo---
  // ANY +++oooooo
  //   = +++ooo---
  //
  acceptAnything(a: Tryte, b: Tryte) {
    for (let d = 0; d < 9; d++) {
      if (a[d] == 0) a[d] = b[d]
      else if (a[d] == 1 && b[d] == -1) a[d] = 0
      else if (a[d] == -1 && b[d] == 1) a[d] = 0
    }
  }

  // a = b
  //
  // Copies b into a.
  copy(a: Tryte, b: Tryte) {
    for (let d = 0; d < 9; d++) {
      a[d] = b[d]
    }
  }

  // a >>= b
  //
  // Logical right shift (new trit = o).
  // To perform a leftward shift, shiftRight(a, -).
  shiftRight(a: Tryte, b: Tryte) {
    const shiftDirection = this.compare(b, ZERO)

    if (shiftDirection == 1) {
      // Loop until i == 0, decrementing `i` each iteration.
      for (
        let i = clone(b);
        this.compare(i, ZERO) != 0;
        this.add(i, MINUS_ONE)
      ) {
        // Right shift.
        this.carry = a.pop() || 0
        a.unshift(0)
      }
    } else if (shiftDirection == -1) {
      // Loop until i == 0, incrementing `i` each iteration.
      for (
        let i = clone(b);
        this.compare(i, ZERO) != 0;
        this.add(i, PLUS_ONE)
      ) {
        // Left shift.
        this.carry = a.shift() || 0
        a.push(0)
      }
    }
  }

  // a ^^= b
  //
  // A single upward shift translates each trit as such:
  //
  //  +  ->  -
  //  o  ->  +
  //  -  ->  o
  //
  // To perform a downward shift, shiftUp(a, 2) or shiftUp(a, -).
  shiftUp(a: Tryte, b: Tryte) {
    const shiftDirection = this.compare(b, ZERO)

    if (shiftDirection == 1) {
      // Loop until i == 0, decrementing `i` each iteration.
      for (
        let i = clone(b);
        this.compare(i, ZERO) > 0;
        this.add(i, MINUS_ONE)
      ) {
        // Shift up each trit.
        for (let d = 0; d < 9; d++) {
          if (a[d] == 1) a[d] = -1
          else if (a[d] == 0) a[d] = 1
          else a[d] = 0
        }
      }
    } else if (shiftDirection == -1) {
      // Loop until i == 0, incrementing `i` each iteration.
      for (let i = clone(b); this.compare(i, ZERO) < 0; this.add(i, PLUS_ONE)) {
        // Shift down each trit.
        for (let d = 0; d < 9; d++) {
          if (a[d] == 1) a[d] = 0
          else if (a[d] == 0) a[d] = -1
          else a[d] = 1
        }
      }
    }
  }
}

// Tryte to string.
export function t2s(t: Tryte): string {
  return t
    .map(trit => {
      switch (trit) {
        case 1:
          return '+'
        case 0:
          return 'o'
        case -1:
          return '-'
      }
    })
    .join('')
}

// String to tryte.
export function s2t(s: string): Tryte {
  const decimal = parseInt(s)
  if (!isNaN(decimal)) {
    return n2t(decimal)
  }

  const str = s.padStart(9, 'o')

  let out = clone(ZERO)

  for (let d = 0; d < 9; d++) {
    const ch = str[d]

    if (ch == '+') out[d] = 1
    else if (ch == 'o') out[d] = 0
    else if (ch == '-') out[d] = -1
    else throw new Error('Unknown trit string representation: ' + ch)
  }

  return out
}

// Tryte to number.
export function t2n(t: Tryte): number {
  let n = 0

  for (let pow = 0; pow < 9; pow++) {
    const trit = t[8 - pow]

    n += trit * 3 ** pow
  }

  return n
}

// Number to tryte.
//
// Based on:
// https://github.com/thirdcoder/balanced-ternary/blob/79be6619cc/bt.js#L38-64
export function n2t(nSigned: number): Tryte {
  var neg = nSigned < 0
  var n = Math.abs(nSigned)
  var s: Trit[] = []

  do {
    var digit = n % 3

    // Balance the trit.
    if (digit == 2) {
      digit = -1
      ++n
    }

    // If the number has a negative sign, flip all digits.
    if (neg) {
      digit = -digit
    }

    s.unshift(sign(digit))
    n = ~~(n / 3) // Truncate (not floor!!) negatives.
  } while (n)

  while (s.length < 9) {
    s.unshift(0)
  }

  return clone(s)
}

// Trit to tryte.
export function trit2tryte(t: Trit): Tryte {
  return [0, 0, 0, 0, 0, 0, 0, 0, t]
}

// Tryte to trit. Lossy.
export function tryte2trit(t: Tryte): Trit {
  return t[8]
}

// Returns a copy of its argument. Trytes are boxed values, so this is an
// explicit operation.
export function clone(a: Trit[]): Tryte {
  if (a.length != 9) {
    throw new Error(
      'Tryte clone expects an Trit[] of length 9, got ' + a.length,
    )
  }

  return [a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8]]
}

// Clamps a number to a trit.
function sign(a: number): Trit {
  if (a > 0) return 1
  if (a < 0) return -1
  return 0
}
