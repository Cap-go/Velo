import { FormEvent, useEffect, useState } from "react";
import { ErrorBox, Field } from "../components/ui";
import {
  api,
  formatMoney,
  type AffiliateNetwork,
  type Group,
  type Lander,
  type Offer,
  type TrafficSource,
} from "../lib/api";

type EntityKind = "sources" | "networks" | "offers" | "landers" | "groups";

export function EntityPanel({ kind }: { kind: EntityKind }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [costType, setCostType] = useState<"cpc" | "cpm" | "cpa">("cpc");
  const [costCents, setCostCents] = useState("0");
  const [sources, setSources] = useState<TrafficSource[]>([]);
  const [networks, setNetworks] = useState<AffiliateNetwork[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [landers, setLanders] = useState<Lander[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  async function reload() {
    if (kind === "sources") setSources((await api.trafficSources()).traffic_sources);
    if (kind === "networks") setNetworks((await api.networks()).networks);
    if (kind === "offers") setOffers((await api.offers()).offers);
    if (kind === "landers") setLanders((await api.landers()).landers);
    if (kind === "groups") setGroups((await api.groups()).groups);
  }

  useEffect(() => {
    reload().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load"),
    );
  }, [kind]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (kind === "sources") {
        await api.createTrafficSource({
          name,
          cost_type: costType,
          default_cost_cents: Math.round(Number(costCents) * 100) || 0,
        });
      } else if (kind === "networks") {
        await api.createNetwork({ name, postback_url_template: url || null });
      } else if (kind === "offers") {
        await api.createOffer({ name, url });
      } else if (kind === "landers") {
        await api.createLander({ name, url });
      } else {
        await api.createGroup(name);
      }
      setName("");
      setUrl("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create");
    } finally {
      setBusy(false);
    }
  }

  const titles: Record<EntityKind, string> = {
    sources: "Traffic sources",
    networks: "Affiliate networks",
    offers: "Offers",
    landers: "Landers",
    groups: "Groups",
  };

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h2 className="font-semibold">Create {titles[kind].slice(0, -1)}</h2>
        <ErrorBox message={error} />
        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          {kind === "sources" && (
            <>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[var(--velo-muted)]">Cost type</span>
                <select
                  className="input"
                  value={costType}
                  onChange={(e) => setCostType(e.target.value as "cpc" | "cpm" | "cpa")}
                >
                  <option value="cpc">CPC</option>
                  <option value="cpm">CPM</option>
                  <option value="cpa">CPA</option>
                </select>
              </label>
              <Field
                label="Default cost (USD)"
                type="number"
                min="0"
                step="0.01"
                value={costCents}
                onChange={(e) => setCostCents(e.target.value)}
              />
            </>
          )}
          {(kind === "offers" || kind === "landers") && (
            <Field
              label="URL"
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          )}
          {kind === "networks" && (
            <Field
              label="Postback URL template (optional)"
              placeholder="https://network.com/postback?click={click_id}"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          )}
          {kind === "offers" && (
            <p className="text-sm text-[var(--velo-muted)]">
              Use <span className="mono">{"{click_id}"}</span> in the offer URL for network macros.
            </p>
          )}
          <button className="btn btn-primary" disabled={busy} type="submit">
            Create
          </button>
        </form>
      </div>

      <div className="card overflow-hidden p-5">
        <h2 className="font-semibold">{titles[kind]}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                {kind === "sources" && (
                  <>
                    <th>Cost</th>
                    <th>Type</th>
                  </>
                )}
                {(kind === "offers" || kind === "landers") && <th>URL</th>}
                {kind === "offers" && <th>Payout</th>}
                {kind === "networks" && <th>Postback template</th>}
              </tr>
            </thead>
            <tbody>
              {kind === "sources" &&
                sources.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{formatMoney(row.default_cost_cents)}</td>
                    <td className="mono">{row.cost_type.toUpperCase()}</td>
                  </tr>
                ))}
              {kind === "networks" &&
                networks.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td className="mono text-xs">{row.postback_url_template ?? "—"}</td>
                  </tr>
                ))}
              {kind === "offers" &&
                offers.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td className="mono text-xs">{row.url}</td>
                    <td>{formatMoney(row.payout_cents)}</td>
                  </tr>
                ))}
              {kind === "landers" &&
                landers.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td className="mono text-xs">{row.url}</td>
                  </tr>
                ))}
              {kind === "groups" &&
                groups.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
