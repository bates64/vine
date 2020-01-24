export type tryte = number

const P = 0b10 // +
const O = 0b00 // o
const M = 0b01 // -

// Binary-coded balanced ternary conversion and arithmetic.
// Least significant digit (3^0) comes FIRST, not last!
export default {
  fromDecimal(decimal: number): tryte {
    if (decimal == 0) return 0

    const isNegative = decimal < 0
    let n = Math.abs(decimal)
    let tern: tryte = 0
    let digitsRemaining = 9

    while (n > 0) {
      const remainder = n % 3

      if (remainder == 0) {
        tern = (tern << 2) + O
        n /= 3
      } else if (remainder == 1) {
        tern = (tern << 2) + (isNegative ? M : P)
        n = Math.floor(n / 3)
      } else {
        tern = (tern << 2) + (isNegative ? P : M)
        n = (n + 1) / 3
      }

      digitsRemaining--
    }

    while (digitsRemaining--) {
      tern = (tern << 2) + O
    }

    return tern
  },

  toString(tern: tryte): string {
    let digit = 9 // Most significant digit (3^8).
    let str = ''

    while (digit--) {
      const digitValue = tern & 0b11

      if (digitValue == P) str += '+'
      else if (digitValue == M) str += '-'
      else str += 'o'

      tern >>= 2
    }

    return str
  },

  // TODO arithmetic/logic
}
