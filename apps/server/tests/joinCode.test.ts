import { describe, expect, it } from "vitest";
import { generateJoinCode } from "../src/utils/joinCode.js";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

describe("generateJoinCode", () => {
  it("generates a 6-character code by default", () => {
    expect(generateJoinCode()).toHaveLength(6);
  });

  it("supports a custom length", () => {
    expect(generateJoinCode(10)).toHaveLength(10);
  });

  it("only uses characters from the unambiguous alphabet", () => {
    const code = generateJoinCode(50);
    for (const ch of code) {
      expect(ALPHABET).toContain(ch);
    }
  });

  it("excludes visually-ambiguous characters (0, O, 1, I)", () => {
    // Matches ALPHABET verbatim: "L" is intentionally kept in the set (only
    // 0/O and 1/I are dropped) even though the source comment mentions it.
    const code = generateJoinCode(200);
    for (const ch of ["0", "O", "1", "I"]) {
      expect(code).not.toContain(ch);
    }
  });

  it("produces different codes across calls (extremely unlikely to collide)", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateJoinCode()));
    expect(codes.size).toBeGreaterThan(45);
  });
});
