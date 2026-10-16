import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import handler from '../api/upload-signature.mjs';
const fixture = {
  SITE_URL:'https://swipemenu.vercel.app/',
  CLOUDINARY_CLOUD_NAME:'test-cloud', CLOUDINARY_API_KEY:'public-test-key',
  CLOUDINARY_API_SECRET:'test-only-signing-secret', CLOUDINARY_UPLOAD_PRESET:'signed-test-preset',
  STAFF_UPLOAD_PASSWORD:'test-only-staff-password-12345'
};
function request(overrides = {}, config = fixture) {
  const previous = Object.fromEntries(Object.keys(fixture).map(key => [key,process.env[key]]));
  for (const key of Object.keys(fixture)) {
    if (config[key] === undefined) delete process.env[key]; else process.env[key] = config[key];
  }
  const req = {method:'POST', headers:{origin:'https://swipemenu.vercel.app','content-type':'application/json','x-forwarded-for':'192.0.2.1'}, body:{password:fixture.STAFF_UPLOAD_PASSWORD,kind:'image'},...overrides};
  const response = {headers:{},setHeader(key,value){this.headers[key]=value;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
  try {handler(req,response); return response;} finally {
    for (const [key,value] of Object.entries(previous)) {if (value === undefined) delete process.env[key]; else process.env[key]=value;}
  }
}
test('uploads fail closed until credentials and a strong staff password are configured', () => {
  assert.equal(request({},{}).code,503);
  assert.equal(request({}, {...fixture,STAFF_UPLOAD_PASSWORD:'weak'}).code,503);
});
test('signature endpoint rejects wrong method, cross-origin requests and non-JSON bodies', () => {
  assert.equal(request({method:'GET'}).code,405);
  assert.equal(request({headers:{origin:'https://attacker.example','content-type':'application/json'}}).code,403);
  assert.equal(request({headers:{'content-type':'application/json'}}).code,403);
  assert.equal(request({headers:{origin:'https://swipemenu.vercel.app','content-type':'text/plain'}}).code,415);
});
test('wrong passwords and invalid media types never receive a signature', () => {
  const denied = request({body:{password:'wrong',kind:'image'}});
  assert.equal(denied.code,401);assert.equal(denied.body.signature,undefined);
  assert.equal(request({body:{password:fixture.STAFF_UPLOAD_PASSWORD,kind:'raw'}}).code,400);
  assert.equal(request({body:'not JSON'}).code,400);
});
test('authenticated staff receive a restricted Cloudinary signature without the API secret', () => {
  const r=request();assert.equal(r.code,200);assert.equal(r.headers['Cache-Control'],'no-store');
  assert.equal(r.body.apiKey,fixture.CLOUDINARY_API_KEY);
  const {params,signature}=r.body;
  assert.deepEqual(Object.keys(params).sort(),['overwrite','public_id','timestamp','upload_preset']);
  assert.match(params.public_id,/^specials\/[0-9a-f-]{36}$/);
  assert.equal(params.overwrite,false);assert.equal(params.upload_preset,fixture.CLOUDINARY_UPLOAD_PRESET);
  assert.ok(Math.abs(params.timestamp-Date.now()/1000)<2);
  const expected=createHash('sha256').update(`overwrite=false&public_id=${params.public_id}&timestamp=${params.timestamp}&upload_preset=signed-test-preset`+fixture.CLOUDINARY_API_SECRET).digest('hex');
  assert.equal(signature,expected);
  assert.ok(!JSON.stringify(r.body).includes(fixture.CLOUDINARY_API_SECRET));
  const second=request({body:{password:fixture.STAFF_UPLOAD_PASSWORD,kind:'video'}});
  assert.equal(second.body.kind,'video');assert.notEqual(second.body.params.public_id,params.public_id);
});
test('repeated attempts are throttled on a single function instance', () => {
  let r;
  for(let i=0;i<16;i++)r=request({headers:{origin:'https://swipemenu.vercel.app','content-type':'application/json','x-forwarded-for':'192.0.2.99'},body:{password:'wrong',kind:'image'}});
  assert.equal(r.code,429);assert.equal(r.headers['Retry-After'],'600');
});
