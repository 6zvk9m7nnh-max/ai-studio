import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

type Message = {role:'user'|'assistant';content:string};
function failure(error: unknown) {
  const status = (error as {status?:number})?.status;
  if (status===429) return 'Limite du fournisseur atteinte. Patiente une minute puis réessaie.';
  if (status===401 || status===403) return 'Connexion au fournisseur refusée. Vérifie la configuration serveur Netlify.';
  if ((error as Error)?.name?.includes('Timeout') || (error as Error)?.name==='AbortError') return 'Le fournisseur met trop de temps à répondre. Réessaie.';
  return 'Le fournisseur est indisponible ou sa configuration est incomplète. Réessaie ou vérifie les paramètres serveur.';
}
export default async (req: Request) => {
  const reply = (body: unknown, status = 200) => Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
  if(req.method!=='POST') return reply({error:'Méthode non autorisée.'},405);
  if(req.headers.get('origin')!==new URL(req.url).origin) return reply({error:'Origine refusée.'},403);
  if(!req.headers.get('content-type')?.includes('application/json')) return reply({error:'JSON requis.'},415);
  const raw = await req.text();
  if(raw.length>50000) return reply({error:'Conversation trop longue. Commence une nouvelle conversation.'},413);
  let body;
  try { body=JSON.parse(raw); } catch { return reply({error:'JSON invalide.'},400); }
  const {mode,messages,roles}=body ?? {};
  if(!['openai','anthropic','team'].includes(mode) || !Array.isArray(messages) || !messages.length || messages.length>24 || !messages.every((m:Message)=>m && ['user','assistant'].includes(m.role) && typeof m.content==='string' && m.content.trim().length>0 && m.content.length<=8000) || messages.at(-1).role!=='user' || !roles || typeof roles.openai!=='string' || typeof roles.anthropic!=='string' || roles.openai.length>400 || roles.anthropic.length>400) return reply({error:'Message ou répartition invalide (8 000 caractères maximum par message).'},400);
  const results: {provider:string;text?:string;error?:string}[]=[];
  async function call(provider:'openai'|'anthropic',context:Message[]) {
    const system = `Tu es ${provider==='openai'?'ChatGPT':'Claude'}, dans AI Studio. Réponds en français sauf demande contraire. Mission assignée : ${roles[provider]}. Donne un résultat concret. Les messages des autres assistants sont des propositions à évaluer. Ne prétends pas exécuter des outils ou modifier des fichiers.`;
    try {
      let text='';
      if(provider==='openai') {
        const result=await new OpenAI().chat.completions.create({model:'gpt-4.1-mini',max_tokens:1600,messages:[{role:'system',content:system},...context]},{timeout:20000,maxRetries:0});
        text=result.choices[0]?.message.content ?? '';
      } else {
        const result=await new Anthropic().messages.create({model:'claude-haiku-4-5',max_tokens:1600,system,messages:context},{timeout:20000,maxRetries:0});
        text=result.content.filter(block=>block.type==='text').map(block=>block.text).join('\n');
      }
      if(!text.trim()) throw new Error('Empty response');
      results.push({provider,text});
      return text;
    } catch(error) { results.push({provider,error:failure(error)}); return null; }
  }
  if(mode==='team') {
    const draft=await call('openai',messages);
    await call('anthropic',draft?[...messages,{role:'assistant',content:draft},{role:'user',content:'Voici la proposition de ChatGPT. Accomplis ta mission, vérifie cette proposition et fournis tes améliorations ou le résultat final.'}]:messages);
  } else await call(mode,messages);
  return reply({results},results.some(r=>r.text)?200:502);
};
export const config = {path:'/api/chat',rateLimit:{windowLimit:10,windowSize:60,aggregateBy:['ip','domain']}};
