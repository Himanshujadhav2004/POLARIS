import { afterAll, beforeAll } from "vitest";
import { PUBLISH } from "../src/framework/rubric.js";

/**
 * Runs the enclosing tests with the verifier switched on. It is off by default since 2026-10-27
 * (PUBLISH.verifierChecks = 0), but its code is kept, so its rules stay tested for when it is
 * switched back on. PUBLISH is a plain object at runtime; only its type is readonly.
 */
export function withVerifier(checks = 2): void {
  const mutable = PUBLISH as { verifierChecks: number };
  let before = checks;
  beforeAll(() => {
    before = mutable.verifierChecks;
    mutable.verifierChecks = checks;
  });
  afterAll(() => {
    mutable.verifierChecks = before;
  });
}
