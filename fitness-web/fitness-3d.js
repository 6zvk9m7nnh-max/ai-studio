/* Original Fit Studio procedural 3D previews. Stylized, not clinical instruction. */
(()=>{'use strict';
const CDN='https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js';
let loading;
function load(){if(window.THREE)return Promise.resolve();if(!loading)loading=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=CDN;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});return loading}
const catalog={
'Pompes inclinées':'push','Pompes au mur':'push','Développé poitrine machine':'chest',
'Rowing avec sac':'row','Rowing assis':'row','Tirage vertical':'pulldown',
'Développé épaules':'press','Développé épaules machine':'press',
'Curl biceps':'curl','Curl à la poulie':'curl',
'Squats':'squat','Fentes arrière':'lunge','Presse à cuisses':'legpress','Leg curl':'legcurl','Leg extension':'legext','Mollets debout':'calf','Mollets machine':'calf',
'Pont fessier':'bridge','Planche':'plank','Crunch machine':'crunch'};
const active=new Map();
function build(el,name){
 const T=window.THREE,type=catalog[name]||'squat',scene=new T.Scene();scene.background=new T.Color(0x182330);
 const camera=new T.PerspectiveCamera(35,el.clientWidth/250,.1,100);camera.position.set(3.5,2.2,5.6);camera.lookAt(0,1.05,0);
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(el.clientWidth,250);el.appendChild(renderer.domElement);
 scene.add(new T.HemisphereLight(0xffffff,0x566579,2.2));const light=new T.DirectionalLight(0xffffff,2.4);light.position.set(3,7,4);scene.add(light);
 const skin=new T.MeshStandardMaterial({color:0xdba888,roughness:.8}),suit=new T.MeshStandardMaterial({color:0x57db9a,roughness:.6}),shorts=new T.MeshStandardMaterial({color:0x263e58}),metal=new T.MeshStandardMaterial({color:0x9fb2c9,metalness:.6,roughness:.35});
 function sphere(parent,x,y,z,sx,sy,sz,mat){const m=new T.Mesh(new T.SphereGeometry(1,14,10),mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m}
 function rod(parent,a,b,r,mat){const v1=new T.Vector3(...a),v2=new T.Vector3(...b),d=new T.Vector3().subVectors(v2,v1);const m=new T.Mesh(new T.CylinderGeometry(r,r,d.length(),12),mat);m.position.copy(v1).add(v2).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());parent.add(m);return m}
 const floor=new T.Mesh(new T.CylinderGeometry(2.3,2.3,.04,48),new T.MeshStandardMaterial({color:0x233548}));floor.position.y=-.03;scene.add(floor);
 const root=new T.Group();scene.add(root);
 sphere(root,0,1.43,0,.34,.48,.19,suit);sphere(root,0,1.04,0,.29,.2,.2,shorts);sphere(root,0,2.13,0,.17,.21,.16,skin);rod(root,[0,1.85,0],[0,1.99,0],.09,skin);
 const arms=[],legs=[];
 for(const side of [-1,1]){
  const arm=new T.Group();arm.position.set(side*.36,1.72,0);root.add(arm);sphere(arm,0,0,0,.13,.13,.13,suit);rod(arm,[0,0,0],[side*.07,-.42,0],.115,skin);
  const elbow=new T.Group();elbow.position.set(side*.07,-.42,0);arm.add(elbow);sphere(elbow,0,0,0,.11,.11,.11,skin);rod(elbow,[0,0,0],[0,-.39,.02],.085,skin);sphere(elbow,0,-.4,.02,.11,.12,.09,skin);arms.push({arm,elbow,side});
  const leg=new T.Group();leg.position.set(side*.18,.94,0);root.add(leg);rod(leg,[0,0,0],[0,-.43,0],.15,shorts);const knee=new T.Group();knee.position.y=-.43;leg.add(knee);sphere(knee,0,0,0,.13,.13,.13,skin);rod(knee,[0,0,0],[0,-.42,0],.11,skin);sphere(knee,0,-.44,.09,.13,.09,.23,metal);legs.push({leg,knee,side});
 }
 if(['curl','row','press','pulldown','chest'].includes(type)){rod(scene,[-.65,.1,-.8],[.65,.1,-.8],.025,metal)}
 if(['legpress','legext','legcurl','chest','pulldown','row'].includes(type)){rod(scene,[-.65,0,-.6],[-.65,2.3,-.6],.035,metal);rod(scene,[.65,0,-.6],[.65,2.3,-.6],.035,metal);rod(scene,[-.65,2.3,-.6],[.65,2.3,-.6],.035,metal)}
 if(type==='plank'||type==='push'||type==='bridge'){root.rotation.z=-Math.PI/2;root.position.set(-.35,.5,0)}
 let frame=0,disposed=false;
 function animate(){if(disposed)return;const t=performance.now()/1000,w=(Math.sin(t*2.2)+1)/2;
 root.position.y=(type==='squat'||type==='lunge')?-.36*w:(type==='calf'?.12*w:root.position.y);
 root.rotation.z=(type==='crunch'?.3*w:(type==='bridge'?-Math.PI/2+.15*w:(type==='plank'?-Math.PI/2:root.rotation.z)));
 arms.forEach(({arm,elbow,side})=>{arm.rotation.set(0,0,0);elbow.rotation.set(0,0,0);
 if(type==='curl'){elbow.rotation.x=-2*w;arm.rotation.z=side*.1}
 if(type==='press'){arm.rotation.z=side*(.5+2*w);elbow.rotation.z=side*(-.7+.6*w)}
 if(type==='pulldown'){arm.rotation.z=side*(2.6-1.5*w);elbow.rotation.z=side*(-.6*w)}
 if(type==='row'){arm.rotation.x=-.9;elbow.rotation.x=-1.7*w}
 if(type==='chest'||type==='push'){arm.rotation.x=-1.2;elbow.rotation.z=side*(.8-1.2*w)}
 });
 legs.forEach(({leg,knee,side})=>{leg.rotation.set(0,0,0);knee.rotation.set(0,0,0);
 if(type==='squat'){leg.rotation.x=-.8*w;knee.rotation.x=1.4*w}
 if(type==='lunge'){leg.rotation.x=(side===1?-.7:.5)*w;knee.rotation.x=(side===1?1.3:.8)*w}
 if(type==='legpress'){leg.rotation.x=-1.1+.5*w;knee.rotation.x=1.5-.9*w}
 if(type==='legext'){leg.rotation.x=-1;knee.rotation.x=1.2-1.2*w}
 if(type==='legcurl'){knee.rotation.x=1.7*w}
 });
 renderer.render(scene,camera);frame=requestAnimationFrame(animate)}
 animate();return ()=>{disposed=true;cancelAnimationFrame(frame);renderer.dispose();el.replaceChildren()}
}
function refresh(){document.querySelectorAll('[data-exercise-3d]').forEach(el=>{if(active.has(el))return;active.set(el,null);load().then(()=>{if(!el.isConnected)return;active.set(el,build(el,el.dataset.exercise3d))}).catch(()=>{el.textContent='Aperçu 3D indisponible hors connexion.'})});for(const [el,dispose] of active){if(!el.isConnected){if(dispose)dispose();active.delete(el)}}}
window.FitStudio3D={refresh};document.addEventListener('DOMContentLoaded',refresh);
})();