import type { Context } from "@netlify/functions";
import { drizzle } from "drizzle-orm/netlify-db";
import { and, eq, desc, sql } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import { missions, workspaces, aiQuotas } from "../../db/schema.js";
import { generate, failure, stepPrompt } from "../lib/providers.js";

export default async (req: Request, context: Context) => {
  const reply = (body: unknown, status = 200) =>
    Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  if (!["GET", "POST", "PUT"].includes(req.method))
    return reply({ error: "Méthode non autorisée." }, 405);
  if (
    req.method !== "GET" &&
    req.headers.get("origin") !== new URL(req.url).origin
  )
    return reply({ error: "Origine refusée." }, 403);
  const token = context.cookies.get("studio_session");
  if (!token || !/^[a-f0-9-]{36}$/.test(token))
    return reply({ error: "Recharge ton espace avant de continuer." }, 401);
  const workspaceId = createHash("sha256").update(token).digest("hex");
  try {
    const db = drizzle();
    if (req.method === "GET") {
      const rows = await db
        .select()
        .from(missions)
        .where(eq(missions.workspaceId, workspaceId))
        .orderBy(desc(missions.createdAt))
        .limit(100);
      return reply({ missions: rows });
    }
    if (!req.headers.get("content-type")?.includes("application/json"))
      return reply({ error: "JSON requis." }, 415);
    const raw = await req.text();
    if (raw.length > 12000)
      return reply({ error: "Demande trop volumineuse." }, 413);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return reply({ error: "JSON invalide." }, 400);
    }
    if (req.method === "POST") {
      if (
        !body ||
        typeof body.prompt !== "string" ||
        !body.prompt.trim() ||
        body.prompt.length > 8000 ||
        !Number.isSafeInteger(body.projectId) ||
        !body.roles ||
        !["openai", "anthropic"].every(
          (k) =>
            typeof body.roles[k] === "string" && body.roles[k].length <= 400,
        )
      )
        return reply({ error: "Projet, consigne ou missions invalides." }, 400);
      if (
        !Netlify.env.get("OPENAI_API_KEY") ||
        !Netlify.env.get("ANTHROPIC_API_KEY")
      )
        return reply(
          {
            error:
              "Configure OPENAI_API_KEY et ANTHROPIC_API_KEY dans Netlify (portée Functions), puis redéploie l’aperçu.",
          },
          503,
        );
      const [workspace] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId));
      if (
        !(workspace?.state as any)?.projects?.some(
          (p: any) => p.id === body.projectId,
        )
      )
        return reply(
          { error: "Ce projet n’existe plus. Recharge ton espace." },
          400,
        );
      const [mission] = await db
        .insert(missions)
        .values({
          id: randomUUID(),
          workspaceId,
          projectId: String(body.projectId),
          prompt: body.prompt.trim(),
          roles: body.roles,
        })
        .returning();
      return reply({ mission }, 201);
    }
    if (
      !body ||
      typeof body.id !== "string" ||
      !Number.isInteger(body.step) ||
      body.step < 0 ||
      body.step > 2
    )
      return reply({ error: "Étape invalide." }, 400);
    const owned = and(
      eq(missions.id, body.id),
      eq(missions.workspaceId, workspaceId),
    );
    let [mission] = await db.select().from(missions).where(owned);
    if (!mission) return reply({ error: "Mission introuvable." }, 404);
    if ((mission.results as any[]).length !== body.step)
      return reply(
        { mission, error: "Étape déjà traitée ou ordre incorrect." },
        409,
      );
    const [claimed] = await db
      .update(missions)
      .set({ status: "running", error: null, updatedAt: new Date() })
      .where(
        and(
          owned,
          sql`(${missions.status} <> 'running' OR ${missions.updatedAt} < now() - interval '55 seconds')`,
          sql`jsonb_array_length(${missions.results}) = ${body.step}`,
        ),
      )
      .returning();
    if (!claimed)
      return reply(
        {
          error:
            "Une étape est déjà en cours. Patiente une minute puis recharge les missions.",
        },
        409,
      );
    mission = claimed;
    try {
      // Atomic site-wide budget: no cookie reset or parallel request can bypass it.
      const day = new Date().toISOString().slice(0, 10);
      const quota = await db
        .insert(aiQuotas)
        .values({ id: day, state: { calls: 1 } })
        .onConflictDoUpdate({
          target: aiQuotas.id,
          set: {
            state: sql`jsonb_build_object('calls', (${aiQuotas.state}->>'calls')::int + 1)`,
          },
          setWhere: sql`(${aiQuotas.state}->>'calls')::int < 30`,
        })
        .returning();
      if (!quota.length)
        throw Object.assign(new Error("quota"), { quota: true });
      const [workspace] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId));
      const project = (workspace?.state as any)?.projects?.find(
        (p: any) => String(p.id) === mission.projectId,
      );
      if (!project) throw new Error("Project missing");
      const args = stepPrompt(mission as any, project);
      const result = await generate(args.provider, args.prompt, args.system);
      const results = [
        ...(mission.results as any[]),
        { ...result, step: body.step },
      ];
      [mission] = await db
        .update(missions)
        .set({
          results,
          status: results.length === 3 ? "completed" : "ready",
          error: null,
          updatedAt: new Date(),
        })
        .where(owned)
        .returning();
      return reply({ mission });
    } catch (error) {
      const message = (error as any)?.quota
        ? "Quota quotidien atteint : 30 appels maximum pour ce site (UTC). Reprends demain."
        : failure(error);
      [mission] = await db
        .update(missions)
        .set({ status: "failed", error: message, updatedAt: new Date() })
        .where(owned)
        .returning();
      return reply(
        { mission, error: message },
        (error as any)?.quota ? 429 : 502,
      );
    }
  } catch {
    return reply(
      {
        error:
          "Base de données indisponible. Recharge les missions avant de réessayer.",
      },
      503,
    );
  }
};
export const config = {
  path: "/api/missions",
  rateLimit: { windowLimit: 15, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
