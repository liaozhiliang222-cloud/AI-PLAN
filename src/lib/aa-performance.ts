/**
 * The existing speed column has no per-row metric version. Keep it hidden until
 * every displayed AA snapshot has been audited after the v3 synchronization.
 */
export function isAAPerformanceV3Ready(): boolean {
  return process.env.AA_PERFORMANCE_V3_READY === "true";
}
