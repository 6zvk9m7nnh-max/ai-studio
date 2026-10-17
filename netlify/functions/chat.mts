// All paid calls now pass through persistent, quota-controlled missions.
export default async (req: Request) => {
  const reply = (body: unknown, status: number) =>
    Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  if (req.method !== "POST")
    return reply({ error: "Méthode non autorisée." }, 405);
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return reply({ error: "Origine refusée." }, 403);
  return reply(
    {
      error:
        "Utilise la collaboration associée à un projet dans /api/missions.",
    },
    410,
  );
};
export const config = { path: "/api/chat" };
