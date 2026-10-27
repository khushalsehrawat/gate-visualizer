// Dedicated preview :4174 and Chrome :9338 with fake media device/permission flags.
import { writeFile } from 'node:fs/promises';
const targets = await (await fetch('http://127.0.0.1:9338/json/list')).json();
const target = targets.find((item) => item.type === 'page');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
let id = 0; const tasks = new Map();
socket.addEventListener('message', ({ data }) => { const message = JSON.parse(data), task = tasks.get(message.id); if (task) { tasks.delete(message.id); if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result); } });
function command(method, params) { return new Promise((resolve, reject) => { const key = ++id; tasks.set(key, { resolve, reject }); socket.send(JSON.stringify({ id: key, method, params })); }); }
async function evaluate(expression) { const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text); return result.result.value; }
async function until(expression, attempts = 100) { for (let i = 0; i < attempts; i++) { if (await evaluate(expression)) return; await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error(`Timed out: ${expression}`); }
async function shot(name) { const result = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(new URL(`../.browser-qa/${name}.png`, import.meta.url), Buffer.from(result.data, 'base64')); }
try {
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await command('Page.navigate', { url: `http://127.0.0.1:4174/?simpleQa=${Date.now()}#/home` });
  await until(`!!document.querySelector('.home-simple')`); await shot('simple-home');
  if (await evaluate(`document.documentElement.scrollWidth>innerWidth`)) throw new Error('Mobile horizontal overflow');
  await evaluate(`location.hash='/picture'`); await until(`!!document.querySelector('.picture-page')`);
  await evaluate(`document.querySelector('button[aria-label="Start picture camera"]').click()`);
  await until(`document.querySelector('.picture-camera video').readyState>=2 && !!document.querySelector('.camera-is-open')`);
  if (await evaluate(`document.querySelector('.site-header').getBoundingClientRect().height>0 || !!document.querySelector('.preview-mode-picker')`)) throw new Error('Camera view still shows site navigation');
  if (await evaluate(`document.querySelector('.picture-fitting').open`)) throw new Error('Advanced fitting expanded by default');
  await shot('simple-camera');
  await evaluate(`document.querySelector('button[aria-label="Freeze picture / select again"]').click()`);
  await until(`!!document.querySelector('.picture-review') && !document.querySelector('button[aria-label="Suggest points"]').disabled`, 450);
  await evaluate(`(()=>{const d=[...document.querySelectorAll('details')].find(d=>d.querySelector('summary')?.textContent==='Manual region');if(!d.open)d.querySelector('summary').click();})()`);
  await evaluate(`document.querySelector('button[aria-label="Select any region manually / clear points"]').click()`);
  const rect = await evaluate(`(()=>{const r=document.querySelector('.opening-editor').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()`);
  for (const [u,v] of [[.15,.2],[.85,.2],[.85,.8],[.15,.8]]) {
    const x=rect.x+u*rect.width,y=rect.y+v*rect.height;
    await command('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',buttons:1,clickCount:1});
    await command('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',buttons:0,clickCount:1});
  }
  await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent==='Auto-fit gate');if(b.disabled)throw Error('Manual area invalid');b.click();})()`);
  await until(`!!document.querySelector('.region-fit-preview canvas') && !document.querySelector('.region-fit-preview canvas').hidden`);
  if (!await evaluate(`document.querySelector('button[aria-label="Confirm points & track picture live"]').disabled`)) throw new Error('Live tracking bypassed four-point confirmation');
  if (await evaluate(`[...document.querySelectorAll('.corner-confirmation input')].some(i=>i.checked)`)) throw new Error('Corners auto-confirmed');
  await shot('auto-fit-before-tracking');
  await evaluate(`document.querySelector('button[aria-label="Stop picture camera"]').click()`);
  await until(`!!document.querySelector('.preview-mode-picker')`);
  if (await evaluate(`document.querySelector('.picture-camera video').srcObject!==null`)) throw new Error('Camera stream still attached');
  await evaluate(`location.hash='/live'`); await until(`!!document.querySelector('.live-workspace')`);
  if (!await evaluate(`document.querySelector('.preview-mode-picker').classList.contains('is-compact')`)) throw new Error('Camera mode selector not compact');
  if (await evaluate(`document.querySelector('.optional-photo-tools')?.open || document.querySelector('.xr-more').open`)) throw new Error('Optional tools expanded by default');
  if (await evaluate(`document.querySelector('.session-diagnostics')!==null`)) throw new Error('Production developer diagnostics visible');
  await shot('simple-live-setup');
  console.log('PASS: mobile navigation, camera start/stop, separate manual region, GPU auto-fit preview before live tracking, four-point confirmation retained, collapsed settings, no horizontal overflow. Physical Android XR remains unverified.');
} finally { socket.close(); }
