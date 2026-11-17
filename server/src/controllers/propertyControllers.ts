import { respondError } from "../lib/http";
import { Request, Response } from "express";
import { Prisma, PropertyType, Amenity, Highlight } from "@prisma/client";
import { wktToGeoJSON } from "@terraformer/wkt";
import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { Location } from "@prisma/client";
import { Upload } from "@aws-sdk/lib-storage";


import { prisma } from "../lib/prisma";
import { HttpError, positiveId, textField } from "../lib/http";
import { randomUUID } from "crypto";
import { propertyUpdates } from "../lib/propertyUpdates";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
});

export const getProperties = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      favoriteIds,
      priceMin,
      priceMax,
      beds,
      baths,
      propertyType,
      squareFeetMin,
      squareFeetMax,
      amenities,
      availableFrom,
      latitude,
      longitude,
    } = req.query;

    for (const key of ["priceMin", "priceMax", "beds", "baths", "squareFeetMin", "squareFeetMax", "latitude", "longitude"]) {
      const value = req.query[key];
      if (value !== undefined && value !== "any" && (typeof value !== "string" || !value.trim() || !Number.isFinite(Number(value)))) throw new HttpError(400, "Filtro numérico inválido.");
    }
    if (propertyType && propertyType !== "any" && !Object.values(PropertyType).includes(propertyType as PropertyType)) throw new HttpError(400, "Tipo de imóvel inválido.");
    const whereConditions: Prisma.Sql[] = [Prisma.sql`p."isPublished" = true`];

    if (req.query.location !== undefined) {
      const location = textField(req.query.location, "Localização");
      const pattern = `%${location}%`;
      whereConditions.push(Prisma.sql`(l.city ILIKE ${pattern} OR l.address ILIKE ${pattern} OR l.state ILIKE ${pattern})`);
    }
    if (availableFrom && availableFrom !== "any" && (typeof availableFrom !== "string" || !Number.isFinite(Date.parse(availableFrom)))) throw new HttpError(400, "Data inválida.");
    if ((latitude && Math.abs(Number(latitude)) > 90) || (longitude && Math.abs(Number(longitude)) > 180)) throw new HttpError(400, "Coordenadas inválidas.");

    if (favoriteIds) {
      if (typeof favoriteIds !== "string") throw new HttpError(400, "Favoritos inválidos.");
      const favoriteIdsArray = favoriteIds.split(",").map(positiveId);
      whereConditions.push(
        Prisma.sql`p.id IN (${Prisma.join(favoriteIdsArray)})`
      );
    }

    if (priceMin) {
      whereConditions.push(
        Prisma.sql`p."pricePerMonth" >= ${Number(priceMin)}`
      );
    }

    if (priceMax) {
      whereConditions.push(
        Prisma.sql`p."pricePerMonth" <= ${Number(priceMax)}`
      );
    }

    if (beds && beds !== "any") {
      whereConditions.push(Prisma.sql`p.beds >= ${Number(beds)}`);
    }

    if (baths && baths !== "any") {
      whereConditions.push(Prisma.sql`p.baths >= ${Number(baths)}`);
    }

    if (squareFeetMin) {
      whereConditions.push(
        Prisma.sql`p."squareFeet" >= ${Number(squareFeetMin)}`
      );
    }

    if (squareFeetMax) {
      whereConditions.push(
        Prisma.sql`p."squareFeet" <= ${Number(squareFeetMax)}`
      );
    }

    if (propertyType && propertyType !== "any") {
      whereConditions.push(
        Prisma.sql`p."propertyType" = ${propertyType}::"PropertyType"`
      );
    }

    if (amenities && amenities !== "any") {
      if (typeof amenities !== "string") throw new HttpError(400, "Comodidades inválidas.");
      const amenitiesArray = amenities.split(",");
      if (amenitiesArray.some(value => !Object.values(Amenity).includes(value as Amenity))) throw new HttpError(400, "Comodidades inválidas.");
      whereConditions.push(Prisma.sql`p.amenities @> ${amenitiesArray}::"Amenity"[]`);
    }

    if (availableFrom && availableFrom !== "any") {
      const availableFromDate =
        typeof availableFrom === "string" ? availableFrom : null;
      if (availableFromDate) {
        const date = new Date(availableFromDate);
        if (!isNaN(date.getTime())) {
          whereConditions.push(
            Prisma.sql`NOT EXISTS (
              SELECT 1 FROM "Lease" l 
              WHERE l."propertyId" = p.id 
              AND l."startDate" <= ${date}
              AND l."endDate" > ${date}
            )`
          );
        }
      }
    }

    if (latitude && longitude) {
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const radiusInMeters = 50000;

      whereConditions.push(
        Prisma.sql`ST_DWithin(
          l.coordinates,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${radiusInMeters}
        )`
      );
    }

    const completeQuery = Prisma.sql`
      SELECT 
        p.*,
        json_build_object(
          'id', l.id,
          'address', l.address,
          'city', l.city,
          'state', l.state,
          'country', l.country,
          'postalCode', l."postalCode",
          'coordinates', json_build_object(
            'longitude', ST_X(l."coordinates"::geometry),
            'latitude', ST_Y(l."coordinates"::geometry)
          )
        ) as location
      FROM "Property" p
      JOIN "Location" l ON p."locationId" = l.id
      ${
        whereConditions.length > 0
          ? Prisma.sql`WHERE ${Prisma.join(whereConditions, " AND ")}`
          : Prisma.empty
      }
    `;

    const properties = await prisma.$queryRaw(completeQuery);

    res.json(properties);
  } catch (error: unknown) {
    respondError(res, error);
  }
};

export const getProperty = async (
  req: Request,
  res: Response
): Promise<void> => getPropertyDetails(req, res, false);

export const getManagedProperty = async (req: Request, res: Response): Promise<void> => getPropertyDetails(req, res, true);

const getPropertyDetails = async (req: Request, res: Response, managed: boolean): Promise<void> => {
  try {
    const { id } = req.params;
    const property = await prisma.property.findFirst({
      where: { id: positiveId(id), ...(managed ? { managerCognitoId: req.user!.id } : { isPublished: true }) },
      include: {
        location: true,
      },
    });

    if (property) {
      const coordinates: { coordinates: string }[] =
        await prisma.$queryRaw`SELECT ST_asText(coordinates) as coordinates from "Location" where id = ${property.location.id}`;

      const geoJSON: any = wktToGeoJSON(coordinates[0]?.coordinates || "");
      const longitude = geoJSON.coordinates[0];
      const latitude = geoJSON.coordinates[1];

      const propertyWithCoordinates = {
        ...property,
        location: {
          ...property.location,
          coordinates: {
            longitude,
            latitude,
          },
        },
      };
      res.json(propertyWithCoordinates);
    } else { res.status(404).json({ message: "Imóvel não encontrado." }); }
  } catch (error: unknown) {
    respondError(res, error);
  }
};

export const updateProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = positiveId(req.params.id);
    const data = propertyUpdates(req.body);
    // An atomic ownership predicate prevents editing another manager's listing.
    const result = await prisma.property.updateMany({ where: { id, managerCognitoId: req.user!.id }, data });
    if (!result.count) throw new HttpError(404, "Imóvel não encontrado.");
    res.json({ id, ...data });
  } catch (error) { respondError(res, error); }
};

export const createProperty = async (
  req: Request,
  res: Response
): Promise<void> => {
  const uploaded: string[] = [];
  try {
    const files = req.files as Express.Multer.File[];
    const {
      address,
      city,
      state,
      country,
      postalCode,
      managerCognitoId: _untrustedManagerId,
      latitude: rawLatitude,
      longitude: rawLongitude,
      ...propertyData
    } = req.body;

    const managerCognitoId = req.user!.id;
    const numeric = (key: string, min: number, max: number, integer = false) => {
      const value = Number(propertyData[key]);
      if (propertyData[key] === undefined || propertyData[key] === "" || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new HttpError(400, key + " inválido.");
    };
    for (const key of ["name", "description"]) textField(propertyData[key], key, key === "description" ? 10000 : 200);
    for (const [key, value] of Object.entries({ address, city, state, country })) textField(value, key);
    if (!["moçambique", "mozambique", "mz"].includes(country.toLowerCase())) throw new HttpError(400, "Indique um imóvel em Moçambique.");
    numeric("pricePerMonth", 1, 100000000);
    numeric("securityDeposit", 0, 100000000);
    numeric("applicationFee", 0, 100000000);
    numeric("beds", 0, 100, true);
    numeric("baths", 0, 100);
    numeric("squareFeet", 1, 10000000, true);
    if (!Object.values(PropertyType).includes(propertyData.propertyType)) throw new HttpError(400, "Tipo de imóvel inválido.");
    for (const [key, allowed] of [["amenities", Object.values(Amenity)], ["highlights", Object.values(Highlight)]] as const) {
      if (typeof propertyData[key] !== "string" || propertyData[key].split(",").filter(Boolean).some((v: string) => !(allowed as readonly string[]).includes(v))) throw new HttpError(400, "Características inválidas.");
    }
    for (const key of ["isPetsAllowed", "isParkingIncluded"]) if (!["true", "false"].includes(propertyData[key])) throw new HttpError(400, "Condição inválida.");
    const latitude = Number(rawLatitude), longitude = Number(rawLongitude);
    if (rawLatitude === undefined || rawLongitude === undefined || rawLatitude === "" || rawLongitude === "" || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new HttpError(400, "Indique coordenadas válidas.");
    if (!files?.length) throw new HttpError(400, "Adicione pelo menos uma fotografia.");
    for (const file of files) {
      const b = file.buffer;
      const valid = (file.mimetype === "image/jpeg" && b.subarray(0,3).equals(Buffer.from([255,216,255]))) ||
        (file.mimetype === "image/png" && b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) ||
        (file.mimetype === "image/webp" && b.toString("ascii",0,4) === "RIFF" && b.toString("ascii",8,12) === "WEBP");
      if (!valid) throw new HttpError(400, "Fotografia inválida.");
    }
    if (!process.env.S3_BUCKET_NAME || !process.env.AWS_REGION) throw new HttpError(503, "Armazenamento de fotografias ainda não configurado.");
    const photoUrls: string[] = [];
    for (const file of files) {
        const uploadParams = {
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: `properties/${randomUUID()}`,
          Body: file.buffer,
          ContentType: file.mimetype,
        };

        const uploadResult = await new Upload({
          client: s3Client,
          params: uploadParams,
        }).done();

        uploaded.push(uploadParams.Key);
        if (!uploadResult.Location) throw new Error("Missing image location");
        photoUrls.push(uploadResult.Location);
    }

    const newProperty = await prisma.$transaction(async tx => {
    // Location and property must be committed together.
    const [location] = await tx.$queryRaw<Location[]>`
      INSERT INTO "Location" (address, city, state, country, "postalCode", coordinates)
      VALUES (${address}, ${city}, ${state}, ${country}, ${postalCode}, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326))
      RETURNING id, address, city, state, country, "postalCode", ST_AsText(coordinates) as coordinates;
    `;

    // create property
    return tx.property.create({
      data: {
        name: propertyData.name,
        description: propertyData.description,
        propertyType: propertyData.propertyType,
        photoUrls,
        locationId: location.id,
        managerCognitoId,
        amenities:
          typeof propertyData.amenities === "string"
            ? propertyData.amenities.split(",").filter(Boolean)
            : [],
        highlights:
          typeof propertyData.highlights === "string"
            ? propertyData.highlights.split(",").filter(Boolean)
            : [],
        isPetsAllowed: propertyData.isPetsAllowed === "true",
        isParkingIncluded: propertyData.isParkingIncluded === "true",
        pricePerMonth: parseFloat(propertyData.pricePerMonth),
        securityDeposit: parseFloat(propertyData.securityDeposit),
        applicationFee: parseFloat(propertyData.applicationFee),
        beds: parseInt(propertyData.beds),
        baths: parseFloat(propertyData.baths),
        squareFeet: parseInt(propertyData.squareFeet),
      },
      include: {
        location: true,
        manager: true,
      },
    });

    });
    res.status(201).json(newProperty);
  } catch (error: unknown) {
    if (uploaded.length) {
      try { await s3Client.send(new DeleteObjectsCommand({ Bucket: process.env.S3_BUCKET_NAME, Delete: { Objects: uploaded.map(Key => ({ Key })) } })); }
      catch { console.error("Falha ao limpar fotografias de uma publicação interrompida."); }
    }
    respondError(res, error);
  }
};
