# The third base

VINE's processor uses **balanced ternary** ('Bal3'). In balanced ternary, we have three digits with
which to write numbers: **+** (1), **o** (0), and **-** (-1). These symbols are specific to VINE;
they have been chosen so they are not confused with decimal numbers (hence the 'o' rather than '0').

> ⚠️ **Note**: different places may use different symbols to refer to the same concept, or the same
> names to refer to different things. For example, [Wikipedia uses 1, 0, and T](https://wikipedia.org/wiki/Balanced_ternary),
> instead of VINE's +, o, and -, to refer to the same values.

Balanced ternary is very useful when compared with more standard number systems such as binary or
decimal as it allows us to have the _sign_ of a number be part of its normal representation. To
illustrate this, consider the decimal number -3. We have to represent this using a minus sign to
show that it is negative. With balanced ternary, we can simply write it as **-o** (vs **+o** for 3).
This means that [there is only one possible representation for zero](https://en.wikipedia.org/wiki/Signed_zero)
and there is no need to separate processor instructions for 'signed' or 'unsigned' integers.

A _trit_ is a single ternary digit and a _tryte_ is a sequence of exactly nine trits. This means
that a single tryte may store values in the range **++++++++** (9841) to **---------** (-9841),
which is 19683 unique values.
