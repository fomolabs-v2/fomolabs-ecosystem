"use strict";
// The upstream 1.1.5 native converter has GHSA-3gc7-fjrx-p6mg.
// This small compatibility implementation never loads native code. All numeric
// output sizes and overflow are validated before allocating or writing bytes.
function fromBytes(bytes, little) {
  if (!Buffer.isBuffer(bytes)) throw new TypeError("Expected Buffer");
  let result = 0n;
  for (let i = 0; i < bytes.length; i++) {
    result = (result << 8n) | BigInt(bytes[little ? bytes.length - 1 - i : i]);
  }
  return result;
}
function toBytes(value, width, little) {
  if (typeof value !== "bigint" || value < 0n) throw new RangeError("Expected unsigned bigint");
  if (!Number.isSafeInteger(width) || width < 0 || width > 65536) throw new RangeError("Invalid buffer width");
  if (value >> BigInt(width * 8)) throw new RangeError("Integer does not fit buffer");
  const out = Buffer.alloc(width);
  for (let i = 0; i < width; i++) {
    out[little ? i : width - 1 - i] = Number(value & 255n);
    value >>= 8n;
  }
  return out;
}
exports.toBigIntLE = bytes => fromBytes(bytes, true);
exports.toBigIntBE = bytes => fromBytes(bytes, false);
exports.toBufferLE = (value, width) => toBytes(value, width, true);
exports.toBufferBE = (value, width) => toBytes(value, width, false);
