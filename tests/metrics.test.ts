import { describe, expect, it } from "vitest";
import { computeMetrics, costForTraffic, toCsv } from "../worker/lib/metrics";

describe("metrics", () => {
  it("computes Binom-style derived metrics", () => {
    const metrics = computeMetrics({
      clicks: 100,
      lp_clicks: 40,
      leads: 5,
      revenue_cents: 50000,
      cost_cents: 10000,
    });

    expect(metrics.lp_ctr).toBe(40);
    expect(metrics.cr).toBe(5);
    expect(metrics.epc_cents).toBe(500);
    expect(metrics.cpc_cents).toBe(100);
    expect(metrics.profit_cents).toBe(40000);
    expect(metrics.roi).toBe(400);
  });

  it("calculates traffic source cost by model", () => {
    expect(costForTraffic("cpc", 25, 10, 2)).toBe(250);
    expect(costForTraffic("cpa", 500, 10, 2)).toBe(1000);
    expect(costForTraffic("cpm", 1000, 1000, 0)).toBe(1000);
  });

  it("builds CSV with escaping", () => {
    const csv = toCsv(["name", "note"], [["Campaign A", 'say "hi"']]);
    expect(csv).toBe('name,note\nCampaign A,"say ""hi"""\n');
  });
});
