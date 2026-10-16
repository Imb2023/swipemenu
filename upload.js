const form = document.querySelector('#uploadForm');
const fileInput = document.querySelector('#mediaFile');
const password = document.querySelector('#staffPassword');
const status = document.querySelector('#uploadStatus');
const button = document.querySelector('#uploadButton');
const cancel = document.querySelector('#cancelUpload');
const progress = document.querySelector('#uploadProgress');
const preview = document.querySelector('#preview');
const photo = document.querySelector('#photoPreview');
const video = document.querySelector('#videoPreview');
const result = document.querySelector('#uploadResult');
const imageTypes = ['image/jpeg','image/png','image/webp','image/avif'];
const videoTypes = ['video/mp4','video/webm'];
let previewUrl;
let uploadRequest;
let controller;
let busy = false;
function message(text, error = false) {status.textContent = text; status.dataset.error = String(error);}
function clearPreview() {
  photo.removeAttribute('src'); video.pause(); video.removeAttribute('src'); video.load();
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = undefined; preview.hidden = true; photo.hidden = true; video.hidden = true;
}
function fileKind(file) {
  if (imageTypes.includes(file.type)) return 'image';
  if (videoTypes.includes(file.type)) return 'video';
  throw new Error('Choose a JPEG, PNG, WebP, AVIF photo, or an MP4/WebM video.');
}
function validateFile(file) {
  const kind = fileKind(file);
  if (file.size === 0) throw new Error('This file is empty. Choose a different file.');
  if (file.size > (kind === 'image' ? 5 : 10) * 1024 * 1024) throw new Error(kind === 'image' ? 'Choose a photo smaller than 5 MB.' : 'Choose a clip smaller than 10 MB.');
  return kind;
}
async function videoDuration(file) {
  const element = document.createElement('video');
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error('Couldn’t read this clip. Export it as MP4 and try again.')), 10000);
      const finish = error => {clearTimeout(timer); element.onloadedmetadata = null; element.onerror = null; error ? reject(error) : resolve(element.duration);};
      element.preload = 'metadata';
      element.onloadedmetadata = () => Number.isFinite(element.duration) ? finish() : finish(new Error('Couldn’t read the video length. Choose another clip.'));
      element.onerror = () => finish(new Error('This browser can’t read the clip. Try an MP4 video.'));
      element.src = url;
    });
  } finally {element.removeAttribute('src'); element.load(); URL.revokeObjectURL(url);}
}
async function optimizePhoto(file) {
  let image;
  try {image = await createImageBitmap(file);} catch {throw new Error('Couldn’t open this photo. Save it as JPEG or PNG and try again.');}
  try {
    const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .82));
    if (!blob) throw new Error('Couldn’t prepare this photo. Try another file.');
    return blob;
  } finally {image.close();}
}
fileInput.addEventListener('change', () => {
  clearPreview(); result.hidden = true; message('');
  const file = fileInput.files[0]; if (!file) return;
  try {
    const kind = validateFile(file); previewUrl = URL.createObjectURL(file);
    const element = kind === 'image' ? photo : video;
    element.src = previewUrl; element.hidden = false; preview.hidden = false;
    document.querySelector('#fileSummary').textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`;
  } catch (error) {message(error.message, true); fileInput.value = '';}
});
function setBusy(value) {
  busy = value; button.disabled = value; fileInput.disabled = value; password.disabled = value;
  cancel.hidden = !value; form.setAttribute('aria-busy', String(value));
}
function sendToCloudinary(endpoint, data) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest(); uploadRequest = request;
    request.open('POST', endpoint); request.timeout = 120000;
    request.upload.onprogress = event => {if (event.lengthComputable) progress.value = Math.round(event.loaded/event.total*100);};
    request.onload = () => {
      let body; try {body = JSON.parse(request.responseText);} catch {return reject(new Error('The upload service returned an invalid response.'));}
      if (request.status < 200 || request.status >= 300) return reject(new Error('The media service rejected this upload. Check the file limits or ask the menu owner to check the upload preset.'));
      resolve(body);
    };
    request.onerror = () => reject(new Error('The upload connection failed. Check your connection and try again.'));
    request.ontimeout = () => reject(new Error('The upload took too long. Try a smaller file.'));
    request.onabort = () => reject(new DOMException('Upload cancelled.', 'AbortError'));
    request.send(data);
  });
}
function mediaLinks(upload, signing, kind) {
  const url = new URL(upload.secure_url);
  const prefix = `/${signing.cloudName}/${kind}/upload/`;
  if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || !url.pathname.startsWith(prefix) || upload.public_id !== signing.params.public_id) throw new Error('The upload completed, but its link could not be verified. Ask the menu owner to check the media library before retrying.');
  const asset = url.pathname.slice(prefix.length);
  url.pathname = prefix + (kind === 'image' ? 'f_auto,q_auto,c_limit,w_1200/' : 'f_auto,q_auto,c_limit,w_960/') + asset;
  const poster = new URL(url);
  if (kind === 'video') poster.pathname = prefix + 'so_0,f_jpg,q_auto,c_limit,w_1200/' + asset.replace(/\.[^/.]+$/, '.jpg');
  return {url:url.href, poster:poster.href};
}
form.addEventListener('submit', async event => {
  event.preventDefault(); if (busy) return;
  const file = fileInput.files[0];
  if (!file) return message('Choose a photo or video first.', true);
  result.hidden = true;
  try {
    const kind = validateFile(file); setBusy(true);
    controller = new AbortController();
    message(kind === 'image' ? 'Preparing a smaller, faster-loading photo…' : 'Checking your clip…');
    if (kind === 'video' && await videoDuration(file) > 15) throw new Error('Keep clips to 15 seconds or less so the menu stays fast.');
    const prepared = kind === 'image' ? await optimizePhoto(file) : file;
    controller.signal.throwIfAborted();
    const response = await fetch('/api/upload-signature', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({password:password.value,kind}),signal:AbortSignal.any([controller.signal, AbortSignal.timeout(15000)])});
    password.value = '';
    const signing = await response.json();
    if (!response.ok) throw new Error(signing.error || 'Couldn’t authorize this upload. Please try again.');
    if (!/^[a-z0-9_-]+$/i.test(signing.cloudName) || signing.kind !== kind) throw new Error('Invalid upload account configuration.');
    const data = new FormData(); data.append('file', prepared, kind === 'image' ? 'special.webp' : file.name);
    for (const [key,value] of Object.entries(signing.params)) data.append(key, String(value));
    data.append('api_key', signing.apiKey); data.append('signature', signing.signature);
    progress.value = 0; progress.hidden = false; message('Uploading your media…');
    controller.signal.throwIfAborted();
    const upload = await sendToCloudinary(`https://api.cloudinary.com/v1_1/${signing.cloudName}/${kind}/upload`, data);
    const links = mediaLinks(upload, signing, kind);
    document.querySelector('#mediaUrl').value = links.url;
    document.querySelector('#urlLabel').textContent = `Paste this into the ${kind === 'image' ? 'image' : 'video'} column`;
    document.querySelector('#posterResult').hidden = kind !== 'video';
    document.querySelector('#posterUrl').value = links.poster;
    document.querySelector('#pasteHelp').textContent = kind === 'video' ? 'Add a column named video if your Sheet doesn’t have one. Paste the preview photo into image so the special is visible before the clip loads.' : 'Paste this link into the image cell for your special. Clear that row’s video cell if you want a photo only.';
    document.querySelector('#copyUrl').textContent = 'Copy link';
    document.querySelector('#copyPoster').textContent = 'Copy preview photo link';
    result.hidden = false; message('Uploaded. Copy the link below and paste it into your Sheet.');
    document.querySelector('#copyUrl').focus();
  } catch (error) {
    message(error.name === 'AbortError' ? 'Upload cancelled. No Sheet changes were made.' : error.message, error.name !== 'AbortError');
  } finally {password.value = ''; controller = undefined; uploadRequest = undefined; progress.hidden = true; setBusy(false);}
});
cancel.onclick = () => {controller?.abort(); uploadRequest?.abort();};
async function copy(input, button) {
  try {await navigator.clipboard.writeText(input.value); button.textContent = 'Copied';}
  catch {input.focus(); input.select(); message('Select and copy the highlighted link.');}
}
document.querySelector('#copyUrl').onclick = () => copy(document.querySelector('#mediaUrl'),document.querySelector('#copyUrl'));
document.querySelector('#copyPoster').onclick = () => copy(document.querySelector('#posterUrl'),document.querySelector('#copyPoster'));
window.addEventListener('pagehide', () => {controller?.abort(); uploadRequest?.abort(); clearPreview();});
