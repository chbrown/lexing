import {Buffer} from './index';

/**
Returns true iff `haystack`, starting at fromIndex, matches `needle`.

To use Pythonic slice notation, returns the result of:

    haystack[fromIndex:haystack.length] == needle[:needle.length]
*/
export function compare(haystack: Buffer, needle: Buffer,
                        fromIndex: number = 0): boolean {
  if ((fromIndex + needle.length) > haystack.length) {
    // there's no way it could possibly fit, so don't even check.
    return false;
  }
  for (var i = 0; i < needle.length; i++) {
    if (needle[i] !== haystack[fromIndex + i]) {
      return false;
    }
  }
  return true;
}

/**
Returns the index (within `haystack`) of the first character of the first
occurrence of `needle` after fromIndex.

Returns undefined if haystack does not contain needle.
*/
export function indexOf(haystack: Buffer, needle: Buffer,
                        fromIndex: number = 0): number {
  for (var i = fromIndex; i < haystack.length; i++) {
    if (compare(haystack, needle, i)) {
      return i;
    }
  }
}

/**
Returns the index (within `haystack`) of the first character of the last
occurrence of `needle` before fromIndex.

Returns undefined if haystack does not contain needle.
*/
export function lastIndexOf(haystack: Buffer, needle: Buffer,
                            fromIndex: number = haystack.length): number {
  for (var i = fromIndex; i > -1; i--) {
    if (compare(haystack, needle, i)) {
      return i;
    }
  }
}

/**
Returns true iff the designated slices of left and right are equal.

Again, using Pythonic slice syntax, returns the result of:

    left[left_offset:left_length] == right[right_offset:right_length]
*/
export function equalTo(left: Buffer,
                        right: Buffer,
                        left_offset: number = 0,
                        left_end: number = left.length - left_offset,
                        right_offset: number = 0,
                        right_end: number = right.length - right_offset): boolean {
  var left_length = left_end - left_offset;
  // return false immediately if they are different lengths
  if (left_length !== right_end - right_offset) return false;
  // check each character
  for (var i = 0; i < left_length; i++) {
    if (left[left_offset + i] !== right[right_offset + i]) {
      return false;
    }
  }
  return true;
}
