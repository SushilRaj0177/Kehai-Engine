import { randomInt } from "node:crypto";

// No 0/O, 1/I/L — avoids visual ambiguity when a teacher reads a join code
// aloud or writes it on a board.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Generates a cryptographically-random join code from ALPHABET. */
export function generateJoinCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}
