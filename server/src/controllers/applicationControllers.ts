import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { contactFields, HttpError, positiveId, respondError } from "../lib/http";
const details = { property: { include: { location: true, manager: true } }, tenant: true, lease: true } as const;

export const listApplications = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const applications = await prisma.application.findMany({
      // Identity comes exclusively from the verified token.
      where: user.role === "tenant" ? { tenantCognitoId: user.id } : { property: { managerCognitoId: user.id } },
      include: details, orderBy: { applicationDate: "desc" },
    });
    res.json(applications.map(app => ({ ...app, manager: app.property.manager })));
  } catch (error) { respondError(res, error); }
};
export const createApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const propertyId = positiveId(req.body.propertyId);
    const contact = contactFields(req.body);
    const message = req.body.message ?? "";
    if (typeof message !== "string" || message.length > 5000) throw new HttpError(400, "Mensagem inválida.");
    const tenantCognitoId = req.user!.id;
    const application = await prisma.$transaction(async tx => {
      const property = await tx.property.findUnique({ where: { id: propertyId } });
      if (!property || !property.isPublished) throw new HttpError(404, "Este anúncio já não está disponível para candidaturas.");
      const existing = await tx.application.findFirst({ where: { propertyId, tenantCognitoId, status: { in: ["Pending", "Approved"] } } });
      if (existing) throw new HttpError(409, "Já existe uma candidatura em curso para este imóvel.");
      return tx.application.create({
        data: { ...contact, message, propertyId, tenantCognitoId, status: "Pending", applicationDate: new Date() },
        include: details,
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    res.status(201).json(application);
  } catch (error) { respondError(res, error); }
};
export const updateApplicationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = positiveId(req.params.id);
    const { status } = req.body;
    if (status !== "Approved" && status !== "Denied") throw new HttpError(400, "Escolha aprovar ou recusar a candidatura.");
    const where = { id, property: { managerCognitoId: req.user!.id } };
    // Atomic compare-and-set; repeating the same decision is idempotent.
    const updated = await prisma.application.updateMany({ where: { ...where, status: "Pending" }, data: { status } });
    const application = await prisma.application.findFirst({ where, include: details });
    if (!application) throw new HttpError(404, "Candidatura não encontrada.");
    if (!updated.count && application.status !== status) throw new HttpError(409, "Esta candidatura já foi decidida.");
    // Approval never creates a lease, residence or payment.
    res.json(application);
  } catch (error) { respondError(res, error); }
};
