import { writeFile } from 'node:fs/promises';
const targets = await (await fetch('http://127.0.0.1:9337/json/list')).json();
const target = targets.find((item) => item.type === 'page');
if (!target) throw new Error('Start the dedicated local QA Chrome profile first.');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
let id = 0; const pending = new Map(); const exceptions = [];
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
  const task = pending.get(message.id); if (task) { pending.delete(message.id); if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result); }
});
function command(method, params = {}) { return new Promise((resolve, reject) => { const key = ++id; pending.set(key, { resolve, reject }); socket.send(JSON.stringify({ id: key, method, params })); }); }
async function evaluate(expression) { const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text); return result.result.value; }
async function until(expression, timeout = 20000) { const start = Date.now(); while (Date.now() - start < timeout) { if (await evaluate(expression)) return; await new Promise((resolve) => setTimeout(resolve, 120)); } throw new Error(`Timed out: ${expression}`); }
async function route(page) { await evaluate(`location.hash='/${page}'`); await until(`location.hash==='#/${page}' && !!document.querySelector('main h1')`); await new Promise((resolve) => setTimeout(resolve, 200)); }
async function click(text) { await evaluate(`(() => {const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b||b.disabled)throw Error('Button unavailable: '+${JSON.stringify(text)});b.click();})()`); }
async function screenshot(name) { const result = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(new URL(`../.browser-qa/${name}.png`, import.meta.url), Buffer.from(result.data, 'base64')); }
try {
  await command('Page.enable'); await command('Runtime.enable');
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await command('Page.navigate', { url: `http://127.0.0.1:4173/?qa=${Date.now()}#/home` });
  await until(`document.querySelector('.hero-image img')?.complete && document.querySelector('.hero-image img')?.naturalWidth>0`);
  await new Promise((resolve) => setTimeout(resolve, 600)); await screenshot('home-desktop');
  if (await evaluate('document.documentElement.scrollWidth>innerWidth')) throw new Error('Desktop overflow');
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await screenshot('home-mobile');
  for (const page of ['catalogue', 'upload', 'photo', 'saved', 'help', 'live']) { await route(page); if (await evaluate('document.documentElement.scrollWidth>innerWidth')) throw new Error(`Mobile overflow: ${page}`); }
  const overlayBackground = await evaluate(`(()=>{const node=document.querySelector('.xr-controls');node.dataset.xrActive='true';const background=getComputedStyle(node).backgroundColor;delete node.dataset.xrActive;return background})()`);
  if (overlayBackground !== 'rgba(0, 0, 0, 0)') throw new Error('Customer theme obscures the XR overlay background');
  await route('photo');
  await evaluate(`(async()=>{const blob=await(await fetch('/images/architecture.jpg')).blob();const dt=new DataTransfer();dt.items.add(new File([blob],'qa-house.jpg',{type:'image/jpeg'}));const input=document.querySelector('section:not([hidden]) .photo-page input[type=file]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await until(`!!document.querySelector('.photo-page .opening-editor')`);
  await click('Suggest opening');
  await until(`!document.querySelector('.photo-page').textContent.includes('Finding geometric suggestions')`, 55000);
  console.log('OpenCV browser status:', await evaluate(`document.querySelector('.photo-page .form-notice')?.textContent ?? document.querySelector('.photo-page .form-error')?.textContent`));
  await click('Mark manually');
  await evaluate(`document.querySelector('.photo-page .opening-editor').scrollIntoView({block:'center'})`);
  for (const [u, v] of [[.18, .25], [.82, .2], [.9, .8], [.1, .9]]) {
    const rect = await evaluate(`(()=>{const r=document.querySelector('.photo-page .opening-editor').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()`);
    const x = rect.x + rect.w * u, y = rect.y + rect.h * v;
    await command('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  }
  await until(`[...document.querySelectorAll('.photo-page a[download]')].some(a=>a.textContent==='Export composited image')`, 30000);
  await evaluate(`(()=>{const select=[...document.querySelectorAll('.photo-page label')].find(l=>l.textContent.startsWith('Gate design')).querySelector('select');select.value='/gates/gate-02.png';select.dispatchEvent(new Event('change',{bubbles:true}));const label=[...document.querySelectorAll('.photo-page label')].find(l=>l.textContent.startsWith('Opacity'));const input=label.querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'0.75');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await until(`[...document.querySelectorAll('.photo-page a[download]')].some(a=>a.textContent==='Export composited image') && [...document.querySelectorAll('.photo-page label')].find(l=>l.textContent.startsWith('Gate design')).querySelector('select').value==='/gates/gate-02.png'`, 30000);
  await click('Hide guides');
  await click('Show before'); await click('Show after'); await screenshot('photo-mobile');
  await click('Save on this device'); await until(`document.querySelector('.photo-page').textContent.includes('Saved on this device.')`);
  await route('saved'); await until(`!!document.querySelector('.saved-card')`);
  await click('Rename');
  await evaluate(`(()=>{const i=document.querySelector('.saved-card input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'Courtyard QA');i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await click('Save name'); await until(`document.querySelector('.saved-card h2')?.textContent==='Courtyard QA'`);
  await command('Page.reload'); await until(`document.querySelector('.saved-card h2')?.textContent==='Courtyard QA'`);
  await click('Open preview →'); await until(`document.querySelector('.photo-page').textContent.includes('Saved photo and settings reopened.')`);
  await until(`[...document.querySelectorAll('.photo-page a[download]')].some(a=>a.textContent==='Export composited image')`, 30000);
  const restoredOpacity = await evaluate(`[...document.querySelectorAll('.photo-page label')].find(l=>l.textContent.startsWith('Opacity')).querySelector('input').value`);
  if (restoredOpacity !== '0.75') throw new Error('Saved opacity was not restored');
  const bytes = await evaluate(`(async()=>{const a=[...document.querySelectorAll('.photo-page a[download]')].find(a=>a.textContent==='Export composited image');const bytes=new Uint8Array(await(await fetch(a.href)).arrayBuffer());let text='';for(let i=0;i<bytes.length;i+=16384)text+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(text)})()`);
  await writeFile(new URL('../.browser-qa/composite.png', import.meta.url), Buffer.from(bytes, 'base64'));
  await route('saved'); await until(`!!document.querySelector('.saved-card')`); await click('Delete'); await click('Yes, delete preview');
  await until(`document.querySelector('main').textContent.includes('Your first saved preview will appear here.')`);
  if (exceptions.length) throw new Error(`Browser exceptions: ${exceptions.join('; ')}`);
  console.log('PASS: desktop/mobile layout, real OpenCV worker, manual corners, compositing, before/after, IndexedDB save/rename/reload/reopen/delete, exported composite.');
} finally { socket.close(); }
