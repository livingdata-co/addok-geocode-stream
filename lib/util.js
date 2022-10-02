export function isFirstCharValid(firstChar) {
  return (firstChar.toLowerCase() !== firstChar.toUpperCase())
    || (firstChar.codePointAt(0) >= 48 && firstChar.codePointAt(0) <= 57)
}
