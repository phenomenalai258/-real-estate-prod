const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { generateKeyPairSync, createSign } = require('node:crypto');
const { createTokenVerifier, authMiddleware, requireOwnProfile } = require('../src/middleware/authMiddleware');
const { prisma } = require('../src/lib/prisma');
const applications = require('../src/controllers/applicationControllers');
const leases = require('../src/controllers/leaseControllers');
const profiles = require('../src/controllers/tenantControllers');

function response() { return { statusCode: 200, status(n) { this.statusCode=n; return this; }, json(body) { this.body=body; return this; } }; }
const restores=[];
function stub(object, key, fn) { const original=object[key]; object[key]=fn; restores.push(()=>object[key]=original); }
afterEach(()=>{ while(restores.length) restores.pop()(); });
process.env.COGNITO_USER_POOL_ID='us-east-1_TestPool';
process.env.COGNITO_CLIENT_ID='test-client';
const issuer='https://cognito-idp.us-east-1.amazonaws.com/us-east-1_TestPool';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength:2048 });
const jwk={...publicKey.export({format:'jwk'}),kid:'test-key',use:'sig',alg:'RS256'};
function token(overrides={}, key=privateKey) {
 const claims={sub:'tenant-a',iss:issuer,aud:'test-client',token_use:'id',exp:Math.floor(Date.now()/1000)+60,'custom:role':'tenant',...overrides};
 const input=[{alg:'RS256',kid:'test-key'},claims].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');
 return input+'.'+createSign('RSA-SHA256').update(input).sign(key).toString('base64url');
}
test('Cognito verifies a real RSA signature and rejects forgery, expiry, issuer, audience and token use',async()=>{
 const verifier=createTokenVerifier(); verifier.cacheJwks({keys:[jwk]});
 assert.equal((await verifier.verify(token())).sub,'tenant-a');
 for(const claims of [{exp:1},{iss:issuer+'wrong'},{aud:'other-app'},{token_use:'access'}]) await assert.rejects(verifier.verify(token(claims)));
 const forged=generateKeyPairSync('rsa',{modulusLength:2048});
 await assert.rejects(verifier.verify(token({},forged.privateKey)));
 const unsigned=token().split('.').slice(0,2).join('.')+'.';
 await assert.rejects(verifier.verify(unsigned));
});
test('missing and malformed authorization headers are rejected before next',async()=>{
 for(const authorization of [undefined,'Basic abc','Bearer','Bearer a b']) {
  const res=response(); let next=false;
  await authMiddleware(['tenant'])({headers:{authorization}},res,()=>next=true);
  assert.equal(res.statusCode,401); assert.equal(next,false);
 }
});
test('profile routes reject a different user',()=>{
 const res=response(); let next=false;
 requireOwnProfile({user:{id:'a'},params:{cognitoId:'b'}},res,()=>next=true);
 assert.equal(res.statusCode,403); assert.equal(next,false);
});
test('application lists ignore forged userId and userType filters',async()=>{
 for(const role of ['tenant','manager']) {
  let query;
  stub(prisma.application,'findMany',async q=>(query=q,[]));
  const res=response();
  await applications.listApplications({user:{id:'me',role},query:{userId:'victim',userType:'manager'}},res);
  assert.deepEqual(query.where,role==='tenant'?{tenantCognitoId:'me'}:{property:{managerCognitoId:'me'}});
 }
});
const applicationBody={propertyId:4,name:'Ana',email:'ana@example.com',phoneNumber:'841234567',tenantCognitoId:'victim',status:'Approved',applicationDate:'2000-01-01',message:'Visita'};
test('new applications use the token identity, start Pending and never create a lease',async()=>{
 let created, options;
 stub(prisma,'$transaction',async(fn,opts)=>{options=opts;return fn({property:{findUnique:async()=>({id:4,isPublished:true})},application:{findFirst:async()=>null,create:async q=>(created=q.data,q.data)},lease:{create:()=>assert.fail('automatic lease')}})});
 const res=response(); await applications.createApplication({user:{id:'me'},body:applicationBody},res);
 assert.equal(res.statusCode,201); assert.equal(created.tenantCognitoId,'me'); assert.equal(created.status,'Pending');
 assert.equal(created.phoneNumber,'+258841234567'); assert.equal(created.leaseId,undefined); assert.equal(options.isolationLevel,'Serializable');
});
test('duplicate applications and transaction conflicts return 409',async()=>{
 stub(prisma,'$transaction',async fn=>fn({property:{findUnique:async()=>({id:4,isPublished:true})},application:{findFirst:async()=>({id:1})}}));
 let res=response(); await applications.createApplication({user:{id:'me'},body:applicationBody},res); assert.equal(res.statusCode,409);
 stub(prisma,'$transaction',async()=>{throw {code:'P2034'}});
 res=response(); await applications.createApplication({user:{id:'me'},body:applicationBody},res); assert.equal(res.statusCode,409);
});
test('approval is owner scoped, atomic and idempotent without a lease',async()=>{
 let state='Pending', writes=0;
 stub(prisma.application,'updateMany',async q=>{
  assert.deepEqual(q.where,{id:8,property:{managerCognitoId:'owner'},status:'Pending'});
  if(state!=='Pending') return {count:0}; state=q.data.status; writes++;return {count:1};
 });
 stub(prisma.application,'findFirst',async()=>({id:8,status:state,leaseId:null}));
 stub(prisma.lease,'create',()=>assert.fail('automatic lease'));
 for(let i=0;i<2;i++){const res=response();await applications.updateApplicationStatus({params:{id:'8'},body:{status:'Approved'},user:{id:'owner'}},res);assert.equal(res.statusCode,200);}
 assert.equal(writes,1);
 const res=response();await applications.updateApplicationStatus({params:{id:'8'},body:{status:'Denied'},user:{id:'owner'}},res);assert.equal(res.statusCode,409);
});
test('another owner cannot decide an application',async()=>{
 stub(prisma.application,'updateMany',async()=>({count:0}));stub(prisma.application,'findFirst',async()=>null);
 const res=response();await applications.updateApplicationStatus({params:{id:'8'},body:{status:'Approved'},user:{id:'other'}},res);assert.equal(res.statusCode,404);
});
test('invalid decision and invalid ID never reach database',async()=>{
 stub(prisma.application,'updateMany',()=>assert.fail('must not query'));
 for(const [id,status] of [['8','Pending'],['abc','Approved']]) {const res=response();await applications.updateApplicationStatus({params:{id},body:{status},user:{id:'owner'}},res);assert.equal(res.statusCode,400);}
});
test('lease queries are limited to the user and requested property',async()=>{
 let query;stub(prisma.lease,'findMany',async q=>(query=q,[]));
 await leases.getLeases({user:{id:'me',role:'tenant'},params:{propertyId:'4'},query:{}},response());
 assert.deepEqual(query.where,{tenantCognitoId:'me',propertyId:4});
});
test('payments for an inaccessible lease never reach payment lookup',async()=>{
 stub(prisma.lease,'findFirst',async q=>{assert.deepEqual(q.where,{id:9,property:{managerCognitoId:'me'}});return null;});
 stub(prisma.payment,'findMany',()=>assert.fail('private payments'));
 const res=response();await leases.getLeasePayments({user:{id:'me',role:'manager'},params:{id:'9'}},res);assert.equal(res.statusCode,404);
});
test('profile creation ignores a forged cognitoId',async()=>{
 let query;stub(prisma.tenant,'upsert',async q=>(query=q,q.create));
 const res=response();await profiles.createTenant({user:{id:'me'},body:{cognitoId:'victim',name:'Ana',email:'ana@example.com'}},res);
 assert.equal(res.statusCode,201);assert.equal(query.create.cognitoId,'me');assert.deepEqual(query.update,{});
});

test('middleware grants only the verified role and rejects invalid signatures',async()=>{
 const verifier=createTokenVerifier();verifier.cacheJwks({keys:[jwk]});
 const { CognitoJwtVerifier }=require('aws-jwt-verify');
 stub(CognitoJwtVerifier,'create',()=>verifier);
 const req={headers:{authorization:'Bearer '+token()}};
 let called=false;const ok=response();await authMiddleware(['tenant'])(req,ok,()=>called=true);
 assert.equal(called,true);assert.deepEqual(req.user,{id:'tenant-a',role:'tenant'});
 for(const [claims,roles,status] of [[{'custom:role':'admin'},['tenant'],403],[{},['manager'],403],[{exp:1},['tenant'],401]]) {
  const res=response();let next=false;await authMiddleware(roles)({headers:{authorization:'Bearer '+token(claims)}},res,()=>next=true);
  assert.equal(res.statusCode,status);assert.equal(next,false);
 }
 const forged=generateKeyPairSync('rsa',{modulusLength:2048});
 const bad=response();await authMiddleware(['tenant'])({headers:{authorization:'Bearer '+token({},forged.privateKey)}},bad,()=>assert.fail('forgery accepted'));
 assert.equal(bad.statusCode,401);
});

test('invalid application contact data is rejected before database writes',async()=>{
 stub(prisma,'$transaction',()=>assert.fail('must not write'));
 for(const invalid of [{phoneNumber:'123'},{email:'invalid'},{propertyId:-1},{message:'x'.repeat(5001)}]) {
  const res=response();await applications.createApplication({user:{id:'me'},body:{...applicationBody,...invalid}},res);assert.equal(res.statusCode,400);
 }
});

test('property not found returns 404 rather than hanging',async()=>{
 const {getProperty}=require('../src/controllers/propertyControllers');
 stub(prisma.property,'findFirst',async()=>null);
 const res=response();await getProperty({params:{id:'77'}},res);assert.equal(res.statusCode,404);
});

test('property publication rejects malformed values before upload',async()=>{
 const {createProperty}=require('../src/controllers/propertyControllers');
 const res=response();await createProperty({user:{id:'owner'},files:[],body:{managerCognitoId:'victim'}},res);assert.equal(res.statusCode,400);
});

test('database errors do not leak infrastructure or query details',async()=>{
 stub(prisma.application,'findMany',async()=>{throw new Error('password=secret SQL private data')});
 const res=response();await applications.listApplications({user:{id:'me',role:'tenant'}},res);
 assert.equal(res.statusCode,500);assert.ok(!JSON.stringify(res.body).includes('secret'));
});
