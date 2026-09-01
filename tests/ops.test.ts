import { env, SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { registerTestUser } from "./helpers";
import { initSql } from "./schema";

let authHeaders: Record<string, string>;

const MERCHANT = "https://merchant.example.com/pricing";

async function json<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

describe("phase 5 ops", () => {
  beforeAll(async () => {
    const statements = initSql
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean);
    for (const statement of statements) {
      await env.DB.prepare(statement).run();
    }
    await env.DB.exec(`
      DELETE FROM triggers;
      DELETE FROM entity_notes;
      DELETE FROM team_members;
      DELETE FROM visitor_assignments;
      DELETE FROM paths;
      DELETE FROM rotations;
      DELETE FROM conversions;
      DELETE FROM clicks;
      DELETE FROM affiliates;
      DELETE FROM programs;
      DELETE FROM auth_tokens;
      DELETE FROM users;
    `);
    ({ authHeaders } = await registerTestUser());
  });

  it("clones a campaign with paths", async () => {
    const { program, convert_secret: _s } = await json<{
      program: { id: string; name: string };
      convert_secret: string;
    }>(
      await SELF.fetch("http://localhost/api/programs", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ name: "Original", destination_url: MERCHANT }),
      }),
    );

    const lander = await json<{ lander: { id: string } }>(
      await SELF.fetch("http://localhost/api/entities/landers", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ name: "LP", url: "https://merchant.example.com/lp" }),
      }),
    );

    await SELF.fetch(`http://localhost/api/programs/${program.id}/paths`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ name: "Path 1", flow_type: "lander", lander_id: lander.lander.id }),
    });

    const cloneRes = await SELF.fetch(`http://localhost/api/ops/programs/${program.id}/clone`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ name: "Cloned" }),
    });
    expect(cloneRes.status).toBe(201);
    const { program: cloned } = await json<{ program: { id: string; name: string; status: string } }>(
      cloneRes,
    );
    expect(cloned.name).toBe("Cloned");
    expect(cloned.status).toBe("paused");
    expect(cloned.id).not.toBe(program.id);

    const rotation = await json<{ paths: Array<{ name: string }> }>(
      await SELF.fetch(`http://localhost/api/programs/${cloned.id}/rotation`, { headers: authHeaders }),
    );
    expect(rotation.paths).toHaveLength(1);
    expect(rotation.paths[0]?.name).toBe("Path 1");
  });

  it("bulk updates campaign status", async () => {
    const headers = authHeaders;
    const { program } = await json<{ program: { id: string } }>(
      await SELF.fetch("http://localhost/api/programs", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ name: "Bulk Target", destination_url: MERCHANT }),
      }),
    );

    const bulkRes = await SELF.fetch("http://localhost/api/ops/programs/bulk", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ program_ids: [program.id], status: "paused" }),
    });
    expect(bulkRes.status).toBe(200);
    const { updated } = await json<{ updated: number }>(bulkRes);
    expect(updated).toBe(1);

    const { program: refreshed } = await json<{ program: { status: string } }>(
      await SELF.fetch(`http://localhost/api/programs/${program.id}`, { headers }),
    );
    expect(refreshed.status).toBe("paused");
  });

  it("creates notes and team members", async () => {
    const headers = authHeaders;
    const { program } = await json<{ program: { id: string } }>(
      await SELF.fetch("http://localhost/api/programs", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ name: "Notes Campaign", destination_url: MERCHANT }),
      }),
    );

    const noteRes = await SELF.fetch("http://localhost/api/ops/notes", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        entity_type: "program",
        entity_id: program.id,
        body: "Test note content",
      }),
    });
    expect(noteRes.status).toBe(201);

    const notesList = await json<{ notes: Array<{ body: string }> }>(
      await SELF.fetch(
        `http://localhost/api/ops/notes?entity_type=program&entity_id=${program.id}`,
        { headers },
      ),
    );
    expect(notesList.notes[0]?.body).toBe("Test note content");

    const inviteRes = await SELF.fetch("http://localhost/api/ops/team", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ email: "viewer@example.com", role: "viewer" }),
    });
    expect(inviteRes.status).toBe(201);

    const team = await json<{ members: Array<{ email: string }> }>(
      await SELF.fetch("http://localhost/api/ops/team", { headers }),
    );
    expect(team.members.some((m) => m.email === "viewer@example.com")).toBe(true);
  });
});
