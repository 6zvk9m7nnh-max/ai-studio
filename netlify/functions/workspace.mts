import type { Context } from '@netlify/functions';
import { drizzle } from 'drizzle-orm/netlify-db';
import { eq } from 'drizzle-orm';
import { createHash, randomUUID } from 'node:crypto';
import { workspaces } from '../../db/schema.js';

export default async (req: Request, context: Context) => {
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  if (!['GET','PUT'].includes(req.method)) return reply({error:'Méthode non autorisée.'},405);
  if (req.method === 'PUT' && req.headers.get('origin') !== new URL(req.url).origin) return reply({error:'Origine refusée.'},403);
  let token = context.cookies.get('studio_session');
  if (!token || !/^[a-f0-9-]{36}$/.test(token)) {
    token = randomUUID();
    context.cookies.set({name:'studio_session',value:token,httpOnly:true,secure:new URL(req.url).protocol==='https:',sameSite:'Strict',path:'/',maxAge:2592000});
  }
  const id = createHash('sha256').update(token).digest('hex');
  try {
    const db = drizzle();
    if (req.method === 'GET') {
      const [row] = await db.select().from(workspaces).where(eq(workspaces.id,id));
      return reply({state:row?.state ?? null});
    }
    if (!req.headers.get('content-type')?.includes('application/json')) return reply({error:'JSON requis.'},415);
    const raw = await req.text();
    if (raw.length > 500000) return reply({error:'Espace trop volumineux. Exporte puis efface une partie des messages.'},413);
    let state;
    try { state = JSON.parse(raw); } catch { return reply({error:'JSON invalide.'},400); }
    if (!state || !Array.isArray(state.projects) || !Array.isArray(state.tasks) || !Array.isArray(state.messages) || state.projects.length>200 || state.tasks.length>1000 || state.messages.length>1000 || !state.projects.every((p:any)=>p && typeof p.name==='string' && typeof p.id==='number' && (p.desc===undefined || typeof p.desc==='string')) || !state.tasks.every((t:any)=>t && typeof t.text==='string' && typeof t.done==='boolean' && typeof t.id==='number') || !state.messages.every((m:any)=>m && ['user','system','assistant'].includes(m.role) && typeof m.text==='string')) return reply({error:'Données invalides.'},400);
    await db.insert(workspaces).values({id,state}).onConflictDoUpdate({target:workspaces.id,set:{state,updatedAt:new Date()}});
    return reply({saved:true});
  } catch { return reply({error:'Sauvegarde indisponible. Exporte tes données et réessaie.'},503); }
};
export const config = { path:'/api/workspace', rateLimit:{windowLimit:60,windowSize:60,aggregateBy:['ip','domain']} };
