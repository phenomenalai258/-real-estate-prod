import { respondError } from "../lib/http";
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { textField } from "../lib/http";
import { wktToGeoJSON } from "@terraformer/wkt";



export const getManager = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { cognitoId } = req.params;
    const manager = await prisma.manager.findUnique({
      where: { cognitoId },
    });

    if (manager) {
      res.json(manager);
    } else {
      res.status(404).json({ message: "Manager not found" });
    }
  } catch (error: unknown) {
    respondError(res, error);
  }
};

export const createManager = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const cognitoId = req.user!.id;
    const name = textField(req.body.name, "Nome");
    const email = textField(req.body.email, "Email", 254);
    const phoneNumber = typeof req.body.phoneNumber === "string" ? req.body.phoneNumber.slice(0, 30) : "";

    const manager = await prisma.manager.upsert({
      where: { cognitoId },
      update: {},
      create: {
        cognitoId,
        name,
        email,
        phoneNumber,
      },
    });

    res.status(201).json(manager);
  } catch (error: unknown) {
    respondError(res, error);
  }
};

export const updateManager = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { cognitoId } = req.params;
    const { name, email, phoneNumber } = req.body;

    const updateManager = await prisma.manager.update({
      where: { cognitoId },
      data: {
        name,
        email,
        phoneNumber,
      },
    });

    res.json(updateManager);
  } catch (error: unknown) {
    respondError(res, error);
  }
};

export const getManagerProperties = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { cognitoId } = req.params;
    const properties = await prisma.property.findMany({
      where: { managerCognitoId: cognitoId },
      include: {
        location: true,
      },
    });

    const propertiesWithFormattedLocation = await Promise.all(
      properties.map(async (property) => {
        const coordinates: { coordinates: string }[] =
          await prisma.$queryRaw`SELECT ST_asText(coordinates) as coordinates from "Location" where id = ${property.location.id}`;

        const geoJSON: any = wktToGeoJSON(coordinates[0]?.coordinates || "");
        const longitude = geoJSON.coordinates[0];
        const latitude = geoJSON.coordinates[1];

        return {
          ...property,
          location: {
            ...property.location,
            coordinates: {
              longitude,
              latitude,
            },
          },
        };
      })
    );

    res.json(propertiesWithFormattedLocation);
  } catch (error: unknown) {
    respondError(res, error);
  }
};
