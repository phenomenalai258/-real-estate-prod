const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
const {imageBaseUrl,imageUrl}=require('../src/lib/imageUrls');
const {prisma}=require('../src/lib/prisma');
const {createProperty}=require('../src/controllers/propertyControllers');
const {Upload}=require('@aws-sdk/lib-storage');
const {S3Client}=require('@aws-sdk/client-s3');
const originalEnv={...process.env}, restores=[];
function stub(obj,key,fn){const old=obj[key];obj[key]=fn;restores.push(()=>obj[key]=old)}
afterEach(()=>{while(restores.length)restores.pop()();for(const name of ['S3_PUBLIC_BASE_URL','S3_BUCKET_NAME','AWS_REGION']){if(originalEnv[name]===undefined)delete process.env[name];else process.env[name]=originalEnv[name]}});
function response(){return {statusCode:200,status(code){this.statusCode=code;return this},json(body){this.body=body;return this}}}
function request(){return {user:{id:'owner'},files:[{mimetype:'image/jpeg',buffer:Buffer.from([255,216,255])}],body:{name:'Casa',description:'Teste',address:'Rua de teste',city:'Maputo',state:'Maputo',country:'Moçambique',postalCode:'',latitude:'-25.96',longitude:'32.57',pricePerMonth:'15000',securityDeposit:'0',applicationFee:'0',beds:'2',baths:'1',squareFeet:'1000',propertyType:'Apartment',amenities:'',highlights:'',isPetsAllowed:'false',isParkingIncluded:'true'}}}
function configure(){process.env.S3_BUCKET_NAME='test-private-bucket';process.env.AWS_REGION='eu-west-1';process.env.S3_PUBLIC_BASE_URL='https://images.example.com'}

test('image origin accepts HTTPS and rejects secrets, paths and unsafe protocols',()=>{
 for(const origin of ['https://images.example.com','https://images.example.com/']){process.env.S3_PUBLIC_BASE_URL=origin;assert.equal(imageBaseUrl(),'https://images.example.com')}
 for(const origin of ['', 'http://images.example.com','https://user:secret@images.example.com','https://images.example.com/properties','https://images.example.com/?token=secret','https://images.example.com/#fragment']){process.env.S3_PUBLIC_BASE_URL=origin;assert.throws(imageBaseUrl,error=>error.status===503&&!error.message.includes('secret'))}
 assert.equal(imageUrl('https://images.example.com','properties/casa 1.jpg'),'https://images.example.com/properties/casa%201.jpg');
});

test('publication stores CloudFront URLs and does not require a public S3 Location',async()=>{
 configure();let saved;
 stub(Upload.prototype,'done',async()=>({}));
 stub(prisma,'$transaction',async fn=>fn({$queryRaw:async()=>[{id:1}],property:{create:async q=>(saved=q.data,q.data)}}));
 const res=response();await createProperty(request(),res);
 assert.equal(res.statusCode,201);assert.match(saved.photoUrls[0],/^https:\/\/images\.example\.com\/properties\/[a-f0-9-]+$/);
 assert.equal(saved.managerCognitoId,'owner');
});

test('missing image delivery configuration is rejected before upload or database write',async()=>{
 configure();delete process.env.S3_PUBLIC_BASE_URL;
 stub(Upload.prototype,'done',()=>assert.fail('must not upload'));
 stub(prisma,'$transaction',()=>assert.fail('must not write'));
 const res=response();await createProperty(request(),res);assert.equal(res.statusCode,503);
});

test('database failure cleans uploaded object keys, not CDN URLs',async()=>{
 configure();let cleanup;
 stub(Upload.prototype,'done',async()=>({}));
 stub(prisma,'$transaction',async()=>{throw new Error('database failure')});
 stub(S3Client.prototype,'send',async command=>{cleanup=command.input;return {}});
 const res=response();await createProperty(request(),res);assert.equal(res.statusCode,500);
 assert.equal(cleanup.Bucket,'test-private-bucket');assert.match(cleanup.Delete.Objects[0].Key,/^properties\/[a-f0-9-]+$/);
});
