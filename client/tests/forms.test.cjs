const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const ts=require('typescript');
const localRequire=createRequire(path.join(__dirname,'../package.json'));
function load(relative) {
 const filename=path.join(__dirname,'../src',relative);
 const compiled=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}});
 const mod={exports:{}};
 // Schema tests need the real enums, but do not render their icon components.
 const scopedRequire=name=>name==='lucide-react'?{}:name==='@/lib/constants'?load('lib/constants.ts'):localRequire(name);
 new Function('require','module','exports',compiled.outputText)(scopedRequire,mod,mod.exports);
 return mod.exports;
}
const {propertySchema,applicationSchema}=load('lib/schemas.ts');
const {formatMoney,formatArea}=load('lib/locale.ts');
const property={name:'Apartamento em Maputo',description:'Arrendamento mensal',pricePerMonth:15000,securityDeposit:0,applicationFee:0,isPetsAllowed:false,isParkingIncluded:true,photoUrls:[new File(['photo'],'photo.jpg',{type:'image/jpeg'})],amenities:'',highlights:'',beds:2,baths:1,squareFeet:80,propertyType:'Apartment',address:'Rua de teste',city:'Maputo',state:'Maputo',country:'Moçambique',postalCode:'',latitude:-25.9692,longitude:32.5732};
test('monthly property accepts zero deposit/fee, optional postal code and decimal coordinates',()=>{
 assert.equal(propertySchema.parse(property).securityDeposit,0);
});
test('property form rejects missing photos, SVG and files above 5 MB',()=>{
 for(const photoUrls of [[],[new File(['<svg/>'],'image.svg',{type:'image/svg+xml'})],[new File([new Uint8Array(5*1024*1024+1)],'large.jpg',{type:'image/jpeg'})]]) assert.equal(propertySchema.safeParse({...property,photoUrls}).success,false);
});
test('application accepts Mozambique mobile numbers with or without country code',()=>{
 for(const phoneNumber of ['841234567','+258 84 123 4567','258841234567']) assert.equal(applicationSchema.safeParse({name:'Ana',email:'ana@example.com',phoneNumber}).success,true);
 for(const phoneNumber of ['123','+351912345678']) assert.equal(applicationSchema.safeParse({name:'Ana',email:'ana@example.com',phoneNumber}).success,false);
});
test('display formats meticais and converts historical square feet to square metres',()=>{
 assert.match(formatMoney(15000),/MT/);assert.ok(!formatMoney(15000).includes('$'));
 const area=formatArea(1000).replace(',','.');assert.equal(Number(area),92.9);
});
