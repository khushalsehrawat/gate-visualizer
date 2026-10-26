// Run against a dedicated Chrome CDP port 9338 and Vite preview on 4174.
import { readdir } from 'node:fs/promises';
const assets = await readdir(new URL('../dist/assets/', import.meta.url));
const tracker = assets.find((name) => name.startsWith('tracker.worker-'));
const overlay = assets.find((name) => name.startsWith('overlay-'));
const targets = await (await fetch('http://127.0.0.1:9338/json/list')).json();
const target = targets.find((item) => item.type === 'page');
if (!target || !tracker || !overlay) throw new Error('Build first, then start the dedicated browser and preview.');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
let id = 0; const tasks = new Map();
socket.addEventListener('message', ({ data }) => { const message = JSON.parse(data), task = tasks.get(message.id); if (task) { tasks.delete(message.id); if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result); } });
function command(method, params) { return new Promise((resolve, reject) => { const key = ++id; tasks.set(key, { resolve, reject }); socket.send(JSON.stringify({ id: key, method, params })); }); }
async function evaluate(expression) { const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text); return result.result.value; }
try {
  await command('Page.navigate', { url: 'http://127.0.0.1:4174/#/picture' });
  for (let i = 0; i < 50; i++) { if (await evaluate('!!document.querySelector(".picture-page")')) break; await new Promise((resolve) => setTimeout(resolve, 100)); }
  const result = await evaluate(`(async () => {
    const width=400,height=300,c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d');
    ctx.fillStyle='#ddd';ctx.fillRect(0,0,width,height);let seed=42;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<300;i++){ctx.fillStyle=random()>.5?'#181818':'#eee';ctx.fillRect(65+random()*270,45+random()*210,3+random()*16,3+random()*16);}
    ctx.font='bold 24px sans-serif';ctx.fillStyle='#333';ctx.fillText('ENTRANCE 2026',80,140);
    const corners=[{x:.15,y:.12},{x:.85,y:.12},{x:.85,y:.88},{x:.15,y:.88}];
    const worker=new Worker('/assets/${tracker}',{type:'module'});
    const request=(value)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Worker timeout')),45000);worker.onmessage=({data})=>{clearTimeout(timer);data.ok?resolve(data):reject(Error(data.message));};worker.onerror=()=>{clearTimeout(timer);reject(Error('Worker load failed'));};worker.postMessage(value);});
    try {
      await request({type:'reference',width,height,corners,pixels:ctx.getImageData(0,0,width,height).data});
      const moved=document.createElement('canvas');moved.width=width;moved.height=height;const m=moved.getContext('2d');m.fillStyle='#ddd';m.fillRect(0,0,width,height);m.drawImage(c,8,5);
      const matched=await request({type:'frame',width,height,pixels:m.getImageData(0,0,width,height).data});
      if(!matched.corners)throw Error('No synthetic translated target match');
      const error=Math.max(...matched.corners.map((p,i)=>Math.hypot(p.x*width-(corners[i].x*width+8),p.y*height-(corners[i].y*height+5))));
      if(error>5)throw Error('Projection error '+error);
      m.fillStyle='#aaa';m.fillRect(0,0,width,height);const blank=await request({type:'frame',width,height,pixels:m.getImageData(0,0,width,height).data});
      if(blank.corners)throw Error('Blank frame falsely tracked');
      const recovered=await request({type:'frame',width,height,pixels:ctx.getImageData(0,0,width,height).data});if(!recovered.corners)throw Error('Target not reacquired');
      const module=await import('/assets/${overlay}');const image=new Image();image.src='/gates/gate-01.png';await image.decode();
      const canvas=document.createElement('canvas');document.body.append(canvas);
      const output=module.createPictureOverlay(canvas,width,height,{image,asset:{widthPixels:image.naturalWidth,heightPixels:image.naturalHeight}});
      output.show(matched.corners,1);const gl=canvas.getContext('webgl2');const pixels=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      if(gl.getError()!==gl.NO_ERROR||!pixels.some((p,i)=>i%4===3&&p>0))throw Error('Projective overlay failed to render');
      output.hide();if(!canvas.hidden)throw Error('Overlay did not hide');output.dispose();canvas.remove();
      return {matched:matched.inliers,total:matched.matches,maxErrorPixels:error,blankHidden:true,reacquired:true,webglOverlay:true};
    } finally {worker.terminate();}
  })()`);
  console.log(JSON.stringify(result));
} finally { socket.close(); }
