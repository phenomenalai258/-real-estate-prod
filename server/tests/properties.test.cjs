const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
const {prisma}=require('../src/lib/prisma');
const {updateProperty,getProperty,getManagedProperty,getProperties}=require('../src/controllers/propertyControllers');
const {createApplication}=require('../src/controllers/applicationControllers');
const restores=[];
function stub(obj,key,fn){const old=obj[key];obj[key]=fn;restores.push(()=>obj[key]=old)}
afterEach(()=>{while(restores.length)restores.pop()()});
function response(){return {statusCode:200,status(n){this.statusCode=n;return this},json(body){this.body=body;return this}}}
function request(body,user='owner'){return {params:{id:'4'},user:{id:user},body}}

test('edits trim text and require ownership in the same database write',async()=>{
 stub(prisma.property,'updateMany',async q=>{
  assert.deepEqual(q.where,{id:4,managerCognitoId:'owner'});
  assert.deepEqual(q.data,{name:'Casa em Maputo',pricePerMonth:18000,securityDeposit:0});
  return {count:1};
 });
 const res=response();await updateProperty(request({name:' Casa em Maputo ',pricePerMonth:18000,securityDeposit:0}),res);assert.equal(res.statusCode,200);
});
test('another owner cannot edit, withdraw or republish',async()=>{
 stub(prisma.property,'updateMany',async q=>{assert.equal(q.where.managerCognitoId,'outsider');return {count:0}});
 for(const body of [{name:'Attack'},{isPublished:false},{isPublished:true}]){
  const res=response();await updateProperty(request(body,'outsider'),res);assert.equal(res.statusCode,404);
 }
});
test('mass assignment, empty bodies and malformed values never reach database',async()=>{
 stub(prisma.property,'updateMany',()=>assert.fail('invalid write'));
 for(const body of [{managerCognitoId:'attacker'},{locationId:1},{photoUrls:[]},{isPublished:'false'},{isParkingIncluded:1},{pricePerMonth:0},{pricePerMonth:'1000'},{pricePerMonth:Infinity},{securityDeposit:-1},{name:' '},{description:'x'.repeat(10001)},{},[],null]){
  const res=response();await updateProperty(request(body),res);assert.equal(res.statusCode,400);
 }
 const res=response();await updateProperty({...request({isPublished:false}),params:{id:'no'}},res);assert.equal(res.statusCode,400);
});
test('withdrawal and republication are repeatable and preserve related records',async()=>{
 stub(prisma.application,'deleteMany',()=>assert.fail('history deletion'));
 stub(prisma.lease,'deleteMany',()=>assert.fail('lease deletion'));
 for(const isPublished of [false,false,true,true]){
  stub(prisma.property,'updateMany',async q=>{assert.deepEqual(q.data,{isPublished});return {count:1}});
  const res=response();await updateProperty(request({isPublished}),res);assert.equal(res.statusCode,200);
 }
});
test('public detail requires publication and private detail requires ownership',async()=>{
 const queries=[];stub(prisma.property,'findFirst',async q=>{queries.push(q.where);return null});
 for(const handler of [getProperty,getManagedProperty]){
  const res=response();await handler(request({}),res);assert.equal(res.statusCode,404);
 }
 assert.deepEqual(queries,[{id:4,isPublished:true},{id:4,managerCognitoId:'owner'}]);
});
test('search including favorite filters always excludes withdrawn listings',async()=>{
 stub(prisma,'$queryRaw',async q=>{assert.match(q.sql,/p\."isPublished" = true/);return []});
 for(const query of [{},{favoriteIds:'4'}]){
  const res=response();await getProperties({query},res);assert.equal(res.statusCode,200);assert.deepEqual(res.body,[]);
 }
});
test('withdrawn and missing listings reject new applications',async()=>{
 for(const property of [null,{id:4,isPublished:false}]){
  stub(prisma,'$transaction',async fn=>fn({property:{findUnique:async()=>property},application:{findFirst:()=>assert.fail('must stop'),create:()=>assert.fail('must not create')}}));
  const res=response();await createApplication(request({propertyId:4,name:'Ana',email:'ana@example.com',phoneNumber:'841234567'}),res);assert.equal(res.statusCode,404);
 }
});
