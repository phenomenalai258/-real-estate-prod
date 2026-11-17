const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const enabled = Boolean(process.env.TEST_DATABASE_URL);
if (enabled) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
function res() { return { statusCode:200, status(n){this.statusCode=n;return this}, json(v){this.body=v;return this} }; }

test("PostGIS: concurrent applications and approvals never create automatic leases", { skip: !enabled }, async () => {
  const { prisma } = require("../src/lib/prisma");
  const { createApplication, updateApplicationStatus, listApplications } = require("../src/controllers/applicationControllers");
  const { updateProperty, getProperty, getManagedProperty, getProperties } = require("../src/controllers/propertyControllers");
  const prefix = "integration-" + randomUUID();
  let locationId, propertyId;
  try {
    await prisma.manager.create({data:{cognitoId:prefix+"-owner",name:"Teste",email:"owner@example.com",phoneNumber:""}});
    await prisma.tenant.create({data:{cognitoId:prefix+"-tenant",name:"Teste",email:"tenant@example.com",phoneNumber:""}});
    const [location] = await prisma.$queryRaw`INSERT INTO "Location" (address,city,state,country,"postalCode",coordinates) VALUES (${prefix},'Maputo','Maputo','Moçambique','',ST_SetSRID(ST_MakePoint(32.57,-25.96),4326)) RETURNING id`;
    locationId=location.id;
    const property=await prisma.property.create({data:{name:prefix,description:"Teste descartável",pricePerMonth:15000,securityDeposit:0,applicationFee:0,photoUrls:[],amenities:[],highlights:[],beds:1,baths:1,squareFeet:1000,propertyType:"Apartment",locationId,managerCognitoId:prefix+"-owner"}});
    propertyId=property.id;
    const request={user:{id:prefix+"-tenant",role:"tenant"},body:{propertyId,name:"Teste",email:"tenant@example.com",phoneNumber:"841234567",status:"Approved"}};
    const responses=[res(),res()];
    await Promise.all(responses.map(response=>createApplication(request,response)));
    assert.deepEqual(responses.map(r=>r.statusCode).sort(),[201,409]);
    const application=await prisma.application.findFirst({where:{propertyId}});
    assert.equal(application.status,"Pending");assert.equal(application.leaseId,null);
    const approvals=[res(),res()];
    await Promise.all(approvals.map(response=>updateApplicationStatus({user:{id:prefix+"-owner",role:"manager"},params:{id:String(application.id)},body:{status:"Approved"}},response)));
    assert.deepEqual(approvals.map(r=>r.statusCode),[200,200]);
    assert.equal(await prisma.lease.count({where:{propertyId}}),0);
    const outsider=res();
    await listApplications({user:{id:prefix+"-outsider",role:"manager"},query:{userId:prefix+"-owner",userType:"manager"}},outsider);
    assert.deepEqual(outsider.body,[]);
    const editRequest = {user:{id:prefix+"-owner",role:"manager"},params:{id:String(propertyId)},body:{pricePerMonth:20000}};
    const forbidden=res();
    await updateProperty({...editRequest,user:{id:prefix+"-outsider",role:"manager"}},forbidden);
    assert.equal(forbidden.statusCode,404);
    const edited=res();await updateProperty(editRequest,edited);assert.equal(edited.statusCode,200);
    assert.equal((await prisma.property.findUnique({where:{id:propertyId}})).pricePerMonth,20000);
    const withdrawn=res();await updateProperty({...editRequest,body:{isPublished:false}},withdrawn);assert.equal(withdrawn.statusCode,200);
    const publicDetail=res();await getProperty({params:editRequest.params},publicDetail);assert.equal(publicDetail.statusCode,404);
    const privateDetail=res();await getManagedProperty(editRequest,privateDetail);assert.equal(privateDetail.statusCode,200);assert.equal(privateDetail.body.isPublished,false);
    const search=res();await getProperties({query:{favoriteIds:String(propertyId)}},search);assert.deepEqual(search.body,[]);
    const blocked=res();await createApplication(request,blocked);assert.equal(blocked.statusCode,404);
    assert.equal(await prisma.application.count({where:{propertyId}}),1);
    assert.equal((await prisma.application.findUnique({where:{id:application.id}})).status,"Approved");
    const republished=res();await updateProperty({...editRequest,body:{isPublished:true}},republished);assert.equal(republished.statusCode,200);
    const visible=res();await getProperties({query:{favoriteIds:String(propertyId)}},visible);assert.equal(visible.body.length,1);
  } finally {
    if(propertyId) {
      await prisma.application.deleteMany({where:{propertyId}});
      await prisma.property.delete({where:{id:propertyId}});
    }
    if(locationId) await prisma.location.delete({where:{id:locationId}});
    await prisma.tenant.deleteMany({where:{cognitoId:prefix+"-tenant"}});
    await prisma.manager.deleteMany({where:{cognitoId:prefix+"-owner"}});
    await prisma.$disconnect();
  }
});
