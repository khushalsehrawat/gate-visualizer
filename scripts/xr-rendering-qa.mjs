// Non-XR browser GPU regression: desktop Chrome :9337, Vite preview :4173.
// This does not exercise Android camera tracking or measure immersive latency.
import { readdir } from 'node:fs/promises';
const rendering = (await readdir(new URL('../dist/assets/', import.meta.url))).find((file) => file.startsWith('rendering-'));
const targets = await (await fetch('http://127.0.0.1:9337/json/list')).json();
const target = targets.find((item) => item.type === 'page');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
let id = 0; const tasks = new Map();
socket.addEventListener('message', ({ data }) => { const message = JSON.parse(data), task = tasks.get(message.id); if (task) { tasks.delete(message.id); if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result); } });
function command(method, params) { return new Promise((resolve, reject) => { const key = ++id; tasks.set(key, { resolve, reject }); socket.send(JSON.stringify({ id: key, method, params })); }); }
async function evaluate(expression) { const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text); return result.result.value; }
try {
  await command('Page.navigate', { url: `http://127.0.0.1:4173/?xrTextureQA=${Date.now()}#/live` });
  for (let i = 0; i < 50; i++) { if (await evaluate(`!!document.querySelector('.live-workspace')`)) break; await new Promise((resolve) => setTimeout(resolve, 100)); }
  if (await evaluate(`!!document.querySelector('input[aria-label="Size"]') || !!document.querySelector('.session-diagnostics')`)) throw new Error('Unexpected idle camera/developer controls');
  await evaluate(`document.querySelector('.xr-more summary').click()`);
  for (let i=0;i<50;i++) { if(await evaluate(`!!document.querySelector('select option[value="two-point"]')`)) break; await new Promise((resolve)=>setTimeout(resolve,50)); }
  if (await evaluate(`!!document.querySelector('.session-diagnostics')`)) throw new Error('Developer performance panel shipped in production UI');
  const result = await evaluate(`(async()=>{
    const {createTestScene,createXRRenderer}=await import('/assets/${rendering}');
    const source=document.createElement('canvas');source.width=4096;source.height=2048;const c=source.getContext('2d');c.fillStyle='red';c.fillRect(0,0,4096,1024);c.fillStyle='blue';c.fillRect(0,1024,4096,1024);c.clearRect(0,0,1024,2048);
    const image=new Image();image.src=source.toDataURL('image/png');await image.decode();
    const gate={image,asset:{id:'orientation',src:image.src,name:'QA only',widthPixels:4096,heightPixels:2048,placeholder:false}};
    const world=createTestScene(),renderer=createXRRenderer();renderer.setSize(128,128);renderer.setPixelRatio(1);renderer.setClearColor(0,0);document.body.append(renderer.domElement);
    try {
      await world.setGateImage(gate);world.configureGate({width:1,height:1,scale:1,x:0,z:0,elevation:0,yaw:0},true);world.marker.visible=true;world.marker.matrix.makeTranslation(0,-.25,-1.5);renderer.render(world.scene,world.camera);
      const gl=renderer.domElement.getContext('webgl2'),read=(x,y)=>{const p=new Uint8Array(4);gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);return [...p];};
      const top=read(64,80),bottom=read(64,48),transparent=read(28,80);
      if(top[0]<200||top[2]>50||bottom[2]<200||bottom[0]>50)throw Error('Resized texture orientation/color mismatch: '+JSON.stringify({top,bottom}));
      if(transparent[3]!==0)throw Error('Alpha transparency lost');
      for(let i=0;i<3;i++){await world.setGateImage({...gate,asset:{...gate.asset,id:'switch-'+i}});renderer.render(world.scene,world.camera);}
      if(renderer.info.memory.textures!==1)throw Error('Texture count grew after switching');
      const counts={textures:renderer.info.memory.textures,drawCalls:renderer.info.render.calls};world.dispose();
      if(renderer.info.memory.textures!==0)throw Error('Texture not released on dispose');
      return {orientation:true,alpha:true,afterSwitching:counts,texturesAfterDispose:renderer.info.memory.textures,physicalXR:'UNVERIFIED'};
    }finally{world.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}
  })()`);
  console.log(JSON.stringify(result));
} finally { socket.close(); }
