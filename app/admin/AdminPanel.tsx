"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  AdminError,
  adminFetch,
  adminTokenServerSnapshot,
  adminTokenSnapshot,
  subscribeAdminToken,
  writeAdminToken,
} from "./adminClient";
import type {
  AdminConfigDto,
  CloseResultDto,
  OverviewDto,
  PayoutsDto,
} from "./types";

/**
 * Pump Farm ops.
 *
 * Deliberately plain next to the game: this is a tool, and the numbers on it
 * decide what real money goes where. Everything it shows is measured — a figure
 * the chain could not confirm renders as "—", never as a plausible stand-in.
 */

const REFRESH_MS = 15_000;

export function AdminPanel() {
  const token = useSyncExternalStore(
    subscribeAdminToken,
    adminTokenSnapshot,
    adminTokenServerSnapshot,
  );
  const [overview, setOverview] = useState<OverviewDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"live" | "config" | "payouts" | "season">("live");

  const load = useCallback(async () => {
    if (!adminTokenSnapshot()) return;
    try {
      const next = await adminFetch<OverviewDto>("/api/admin/overview");
      setOverview(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "load failed");
      // A rejected credential is a dead one — drop it and show the gate again.
      if (err instanceof AdminError && err.status === 401) writeAdminToken("");
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const poll = async () => {
      if (!cancelled) await load();
    };
    void poll();
    const timer = setInterval(() => void poll(), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [token, load]);

  if (!token) {
    return <Gate onSubmit={writeAdminToken} error={error} />;
  }

  return (
    <div className="min-h-dvh bg-[#0b0c0d] text-[#e9e6df]">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-white/10 bg-[#0b0c0d]/95 px-4 py-3 backdrop-blur">
        <h1 className="text-sm font-semibold tracking-wide">
          Pump Farm <span className="text-[#7bd88f]">ops</span>
        </h1>
        <nav className="flex gap-1">
          {(["live", "config", "payouts", "season"] as const).map((id) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              className={`rounded-full px-3 py-1 text-[11px] capitalize transition ${
                tab === id
                  ? "bg-[#7bd88f] text-[#0b0c0d]"
                  : "border border-white/10 text-[#9a978f] hover:border-[#7bd88f] hover:text-[#7bd88f]"
              }`}
            >
              {id}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4 font-mono text-[11px] text-[#9a978f]">
          {overview ? (
            <>
              <Stat label="online" value={String(overview.counts.online)} />
              <Stat
                label="pot"
                value={
                  overview.pot.potUsd != null
                    ? `$${fmt(overview.pot.potUsd, 2)}`
                    : "—"
                }
              />
              <Stat
                label="mcap"
                value={
                  overview.pot.marketCapUsd != null
                    ? `$${fmt(overview.pot.marketCapUsd, 0)}`
                    : "—"
                }
              />
            </>
          ) : null}
          <button
            onClick={() => writeAdminToken("")}
            className="rounded-full border border-white/10 px-3 py-1 hover:border-[#e07a5f] hover:text-[#e07a5f]"
          >
            sign out
          </button>
        </div>
      </header>

      {error ? (
        <p className="border-b border-[#e07a5f]/30 bg-[#e07a5f]/10 px-4 py-2 text-[12px] text-[#e07a5f]">
          {error}
        </p>
      ) : null}

      <main className="mx-auto grid max-w-[1500px] gap-4 p-4">
        {!overview ? (
          <p className="py-16 text-center text-[12px] text-[#9a978f]">loading…</p>
        ) : tab === "live" ? (
          <LiveTab overview={overview} />
        ) : tab === "config" ? (
          <ConfigTab config={overview.config} onSaved={load} />
        ) : tab === "payouts" ? (
          <PayoutsTab onChanged={load} />
        ) : (
          <SeasonTab overview={overview} onChanged={load} />
        )}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Gate({
  onSubmit,
  error,
}: {
  onSubmit: (token: string) => void;
  error: string | null;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="grid min-h-dvh place-items-center bg-[#0b0c0d] px-4 text-[#e9e6df]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onSubmit(value.trim());
        }}
        className="grid w-full max-w-sm gap-3 rounded-2xl border border-white/10 bg-[#131416] p-6"
      >
        <h2 className="text-base font-semibold">Pump Farm ops</h2>
        <p className="text-[12px] leading-relaxed text-[#9a978f]">
          Paste the ops token, or sign in on the site first with a wallet in the
          admin allowlist and reload this page.
        </p>
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ADMIN_TOKEN"
          className="rounded-lg border border-white/10 bg-[#0b0c0d] px-3 py-2 font-mono text-[12px] outline-none focus:border-[#7bd88f]"
        />
        {error ? <p className="text-[11px] text-[#e07a5f]">{error}</p> : null}
        <button
          type="submit"
          className="rounded-lg bg-[#7bd88f] px-3 py-2 text-[12px] font-semibold text-[#0b0c0d]"
        >
          Enter
        </button>
      </form>
    </div>
  );
}

function LiveTab({ overview }: { overview: OverviewDto }) {
  const { pot, counts, online, season, audit } = overview;

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          title="Fee pot"
          value={pot.potUsd != null ? `$${fmt(pot.potUsd, 2)}` : "—"}
          sub={`${fmt(pot.potEth, 6)} ETH${pot.stale ? " · stale" : ""}`}
          tone={pot.ok ? "good" : "warn"}
        />
        <Card
          title="Market cap"
          value={pot.marketCapUsd != null ? `$${fmt(pot.marketCapUsd, 0)}` : "—"}
          sub={
            pot.priceUsd != null
              ? `$${pot.priceUsd.toPrecision(4)} · ${pot.venue ?? "?"}`
              : "no price yet"
          }
        />
        <Card
          title={`Online (${counts.onlineWindowMinutes}m)`}
          value={String(counts.online)}
          sub={`${counts.wallets} wallets · ${counts.plantedToday} planted today`}
        />
        <Card
          title={`Season ${season.number}`}
          value={
            season.closedAt
              ? "closed"
              : `${Math.floor(season.msRemaining / 86400000)}d ${Math.floor(
                  (season.msRemaining % 86400000) / 3600000,
                )}h`
          }
          sub={new Date(season.endsAt).toLocaleString()}
        />
      </section>

      <Section title="Pot breakdown">
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          <Row
            label="Claimable in Pons escrow"
            value={`${fmt(pot.claimableEth, 6)} ETH`}
            sub={pot.claimableUsd != null ? `$${fmt(pot.claimableUsd, 2)}` : "—"}
          />
          <Row
            label="Pending in hook (unswept)"
            value={`${fmt(pot.pendingEth, 6)} ETH`}
            sub={pot.pendingUsd != null ? `$${fmt(pot.pendingUsd, 2)}` : "—"}
          />
          <Row
            label="Already in treasury"
            value={`${fmt(pot.treasuryEth, 6)} ETH`}
            sub={pot.treasuryUsd != null ? `$${fmt(pot.treasuryUsd, 2)}` : "—"}
          />
        </div>
        <dl className="grid gap-2 border-t border-white/10 p-4 font-mono text-[11px] text-[#9a978f] sm:grid-cols-2">
          <Detail label="token" value={pot.token} mono />
          <Detail label="creator (fee recipient)" value={pot.creator} mono />
          <Detail label="treasury" value={pot.treasury} mono />
          <Detail label="curve" value={pot.curve} mono />
          <Detail label="pool id" value={pot.poolId} mono />
          <Detail
            label="graduation"
            value={
              pot.graduationProgress != null
                ? `${(pot.graduationProgress * 100).toFixed(1)}%`
                : pot.venue === "v4"
                  ? "graduated"
                  : null
            }
          />
          <Detail label="eth/usd" value={pot.ethUsd ? `$${fmt(pot.ethUsd, 2)}` : null} />
          <Detail label="status" value={pot.reason ?? "ok"} />
        </dl>
      </Section>

      <Section title={`Online farmers · ${online.length}`}>
        {online.length === 0 ? (
          <Empty>Nobody has polled a farm in the last few minutes.</Empty>
        ) : (
          <Table
            head={["Farmer", "Wallet", "SP", "Hype", "Streak", "Last seen"]}
            rows={online.map((p) => [
              p.displayName ?? "—",
              <code key="a" className="text-[11px]">{short(p.address)}</code>,
              fmt(Number(p.seasonPoints), 0),
              fmt(Number(p.hypeBalance), 0),
              String(p.harvestStreak),
              p.lastSeenAt ? ago(p.lastSeenAt) : "—",
            ])}
          />
        )}
      </Section>

      {audit.length > 0 ? (
        <Section title="Recent ops actions">
          <Table
            head={["When", "Actor", "Action", "Detail"]}
            rows={audit.map((a) => [
              new Date(a.createdAt).toLocaleString(),
              short(a.actor),
              a.action,
              <span key="d" className="text-[#9a978f]">{a.detail ?? "—"}</span>,
            ])}
          />
        </Section>
      ) : null}
    </>
  );
}

const CONFIG_FIELDS: {
  key: keyof AdminConfigDto;
  label: string;
  hint: string;
  type?: "text" | "number" | "switch";
}[] = [
  {
    key: "tokenAddress",
    label: "Token contract",
    hint: "The Pons launch whose fees are the pot. Changing this repoints the whole game.",
  },
  { key: "tokenTicker", label: "Ticker", hint: "Shown in the UI, e.g. FARM." },
  {
    key: "creatorAddress",
    label: "Fee recipient override",
    hint: "Leave empty to use whoever Pons credits for the launch.",
  },
  {
    key: "treasuryAddress",
    label: "Treasury wallet",
    hint: "Where claimed fees land and payouts are sent from.",
  },
  {
    key: "stakeEscrowAddress",
    label: "Stake escrow",
    hint: "Staking is refused until this is set — transfers are verified against it.",
  },
  {
    key: "siloTargetEth",
    label: "Silo target (ETH)",
    hint: "Only drives the % full bar.",
    type: "number",
  },
  {
    key: "opsReservePct",
    label: "Ops reserve",
    hint: "0.05 = 5% held back before the tier split.",
    type: "number",
  },
  {
    key: "payoutsEnabled",
    label: "Payouts enabled",
    hint: "Off means every season close stays a preview. Turn on only when you mean it.",
    type: "switch",
  },
];

function ConfigTab({
  config,
  onSaved,
}: {
  config: AdminConfigDto;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      CONFIG_FIELDS.map((f) => [f.key, String(config[f.key] ?? "")]),
    ),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const dirty = useMemo(
    () =>
      CONFIG_FIELDS.filter(
        (f) => draft[f.key] !== String(config[f.key] ?? ""),
      ).map((f) => f.key),
    [draft, config],
  );

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const body = Object.fromEntries(dirty.map((k) => [k, draft[k]]));
      await adminFetch("/api/admin/config", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setMessage("Saved. The pot re-resolves on the next read.");
      onSaved();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Runtime configuration">
      <div className="grid gap-4 p-4">
        {CONFIG_FIELDS.map((field) => (
          <label key={field.key} className="grid gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#9a978f]">
              {field.label}
            </span>
            {field.type === "switch" ? (
              <select
                value={draft[field.key]}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [field.key]: e.target.value }))
                }
                className="w-40 rounded-lg border border-white/10 bg-[#0b0c0d] px-3 py-2 text-[12px] outline-none focus:border-[#7bd88f]"
              >
                <option value="false">off</option>
                <option value="true">on</option>
              </select>
            ) : (
              <input
                value={draft[field.key]}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [field.key]: e.target.value }))
                }
                placeholder="—"
                className="rounded-lg border border-white/10 bg-[#0b0c0d] px-3 py-2 font-mono text-[12px] outline-none focus:border-[#7bd88f]"
              />
            )}
            <span className="text-[11px] text-[#6f6c65]">{field.hint}</span>
          </label>
        ))}

        <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
          <button
            onClick={save}
            disabled={saving || dirty.length === 0}
            className="rounded-lg bg-[#7bd88f] px-4 py-2 text-[12px] font-semibold text-[#0b0c0d] disabled:opacity-40"
          >
            {saving ? "Saving…" : `Save ${dirty.length || ""}`.trim()}
          </button>
          {message ? (
            <span className="text-[11px] text-[#9a978f]">{message}</span>
          ) : null}
        </div>
      </div>
    </Section>
  );
}

function PayoutsTab({ onChanged }: { onChanged: () => void }) {
  const [data, setData] = useState<PayoutsDto | null>(null);
  const [status, setStatus] = useState("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await adminFetch<PayoutsDto>(
        `/api/admin/payouts?status=${status}`,
      );
      setData(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "load failed");
    }
  }, [status]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function act(id: string, action: string, extra: Record<string, unknown> = {}) {
    setBusy(id);
    setError(null);
    try {
      await adminFetch(`/api/admin/payouts/${id}`, {
        method: "POST",
        body: JSON.stringify({ action, ...extra }),
      });
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Section
      title="Payouts"
      action={
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-white/10 bg-[#0b0c0d] px-2 py-1 text-[11px]"
        >
          {["pending", "paid", "void", "all"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      }
    >
      {error ? (
        <p className="px-4 pt-3 text-[11px] text-[#e07a5f]">{error}</p>
      ) : null}

      <p className="border-b border-white/10 px-4 py-3 text-[11px] leading-relaxed text-[#9a978f]">
        Sending is done from a terminal — <code>npm run payout</code> — which
        signs each transfer and marks the row paid with its real hash. Marking
        paid here is for a transfer you sent by hand.
        {data?.treasury ? (
          <>
            {" "}
            Treasury holds{" "}
            <strong className="text-[#e9e6df]">
              {fmt(data.treasuryEth, 6)} ETH
            </strong>
            .
          </>
        ) : null}
      </p>

      {!data ? (
        <Empty>loading…</Empty>
      ) : data.payouts.length === 0 ? (
        <Empty>Nothing {status === "all" ? "recorded" : status}.</Empty>
      ) : (
        <Table
          head={["Season", "Wallet", "Amount", "Status", "Tx", ""]}
          rows={data.payouts.map((p) => [
            `#${p.seasonNumber}`,
            <code key="w" className="text-[11px]">{short(p.address)}</code>,
            <span key="a">
              {fmt(Number(p.amountEth), 6)} ETH
              {p.amountUsd ? (
                <span className="ml-1 text-[#6f6c65]">
                  ${fmt(Number(p.amountUsd), 2)}
                </span>
              ) : null}
            </span>,
            <Tag key="s" tone={p.status === "paid" ? "good" : p.status === "void" ? "bad" : "warn"}>
              {p.status}
            </Tag>,
            p.txHash ? (
              <code key="t" className="text-[11px]">{short(p.txHash)}</code>
            ) : (
              "—"
            ),
            p.status === "pending" ? (
              <span key="x" className="flex gap-1">
                <button
                  disabled={busy === p.id}
                  onClick={() => {
                    const hash = window.prompt(
                      `Transaction hash that paid ${p.address}:`,
                    );
                    if (hash) void act(p.id, "paid", { txHash: hash.trim() });
                  }}
                  className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] hover:border-[#7bd88f] hover:text-[#7bd88f]"
                >
                  mark paid
                </button>
                <button
                  disabled={busy === p.id}
                  onClick={() => {
                    const note = window.prompt("Reason for voiding:");
                    if (note !== null) void act(p.id, "void", { note });
                  }}
                  className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] hover:border-[#e07a5f] hover:text-[#e07a5f]"
                >
                  void
                </button>
              </span>
            ) : (
              ""
            ),
          ])}
        />
      )}
    </Section>
  );
}

function SeasonTab({
  overview,
  onChanged,
}: {
  overview: OverviewDto;
  onChanged: () => void;
}) {
  const [result, setResult] = useState<CloseResultDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function close(dryRun: boolean, force: boolean) {
    if (!dryRun && !window.confirm("Write real payout rows for this season?")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setResult(
        await adminFetch<CloseResultDto>("/api/admin/season", {
          method: "POST",
          body: JSON.stringify({ dryRun, force }),
        }),
      );
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "close failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title={`Season ${overview.season.number}`}>
      <div className="grid gap-3 p-4">
        <p className="text-[11px] leading-relaxed text-[#9a978f]">
          A close turns Season Points into a list of what each farmer is owed,
          measured against the on-chain pot. It never sends anything. Live mode
          needs <strong className="text-[#e9e6df]">payouts enabled</strong> in
          config — currently{" "}
          <Tag tone={overview.config.payoutsEnabled ? "good" : "warn"}>
            {overview.config.payoutsEnabled ? "on" : "off"}
          </Tag>
          .
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            disabled={busy}
            onClick={() => void close(true, true)}
            className="rounded-lg border border-white/10 px-4 py-2 text-[12px] hover:border-[#7bd88f] hover:text-[#7bd88f] disabled:opacity-40"
          >
            Preview split
          </button>
          <button
            disabled={busy || !overview.config.payoutsEnabled}
            onClick={() => void close(false, false)}
            className="rounded-lg bg-[#e0b15f] px-4 py-2 text-[12px] font-semibold text-[#0b0c0d] disabled:opacity-40"
          >
            Close season for real
          </button>
        </div>
        {error ? <p className="text-[11px] text-[#e07a5f]">{error}</p> : null}
      </div>

      {result ? (
        <div className="border-t border-white/10 p-4">
          <p className="mb-2 text-[12px]">
            {result.dryRun ? "Preview" : "Closed"} ·{" "}
            {result.reason ?? `${result.payoutCount ?? 0} payouts`} ·{" "}
            {result.poolEth ? `${fmt(Number(result.poolEth), 6)} ETH pool` : "no pool"}
            {result.note ? (
              <span className="ml-2 text-[#e0b15f]">{result.note}</span>
            ) : null}
          </p>
          {result.computation ? (
            <Table
              head={["Wallet", "Tier", "Amount"]}
              rows={result.computation.payouts.slice(0, 50).map((p) => [
                <code key="w" className="text-[11px]">{short(p.address)}</code>,
                String(p.tier),
                `${fmt(Number(p.amount), 6)} ETH`,
              ])}
            />
          ) : null}
        </div>
      ) : null}
    </Section>
  );
}

/* ---------------------------- small pieces ---------------------------- */

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/10 bg-[#131416]">
      <h2 className="flex items-center gap-3 border-b border-white/10 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9a978f]">
        {title}
        {action ? <span className="ml-auto">{action}</span> : null}
      </h2>
      {children}
    </section>
  );
}

function Card({
  title,
  value,
  sub,
  tone,
}: {
  title: string;
  value: string;
  sub: string;
  tone?: "good" | "warn";
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#131416] p-4">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[#9a978f]">
        {title}
      </p>
      <p
        className={`mt-1 font-mono text-2xl ${
          tone === "warn" ? "text-[#e0b15f]" : "text-[#e9e6df]"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] text-[#6f6c65]">{sub}</p>
    </div>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.1em] text-[#9a978f]">{label}</p>
      <p className="font-mono text-lg">{value}</p>
      <p className="text-[11px] text-[#6f6c65]">{sub}</p>
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-2 overflow-hidden">
      <dt className="shrink-0">{label}</dt>
      <dd
        className={`truncate text-[#e9e6df] ${mono ? "font-mono" : ""}`}
        title={value ?? undefined}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="grid">
      <b className="text-[14px] font-semibold text-[#7bd88f]">{value}</b>
      <i className="text-[9px] uppercase not-italic tracking-[0.1em]">{label}</i>
    </span>
  );
}

function Tag({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "good" | "warn" | "bad";
}) {
  const color =
    tone === "good" ? "#7bd88f" : tone === "bad" ? "#e07a5f" : "#e0b15f";
  return (
    <span
      className="rounded-full border px-2 py-0.5 font-mono text-[10px]"
      style={{ color, borderColor: `${color}55` }}
    >
      {children}
    </span>
  );
}

function Table({
  head,
  rows,
}: {
  head: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="max-h-[28rem] overflow-auto">
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr>
            {head.map((h) => (
              <th
                key={h}
                className="sticky top-0 z-[1] whitespace-nowrap bg-[#0b0c0d] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9a978f]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-white/[0.03]">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="whitespace-nowrap border-t border-white/10 px-3 py-1.5"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 py-8 text-center text-[12px] text-[#6f6c65]">{children}</p>
  );
}

function fmt(value: number, digits: number): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function short(value: string): string {
  return value.length > 14 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}

function ago(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}
