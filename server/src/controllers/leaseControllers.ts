import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { HttpError, positiveId, respondError } from "../lib/http";
function ownLease(req: Request) {
  return req.user!.role === "tenant" ? { tenantCognitoId: req.user!.id } : { property: { managerCognitoId: req.user!.id } };
}
export const getLeases = async (req: Request, res: Response): Promise<void> => {
  try {
    const propertyId = req.params.propertyId || req.query.propertyId;
    res.json(await prisma.lease.findMany({
      where: { ...ownLease(req), ...(propertyId ? { propertyId: positiveId(propertyId) } : {}) },
      include: { tenant: true, property: true },
    }));
  } catch (error) { respondError(res, error); }
};
export const getLeasePayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = positiveId(req.params.id);
    const lease = await prisma.lease.findFirst({ where: { id, ...ownLease(req) } });
    if (!lease) throw new HttpError(404, "Contrato não encontrado.");
    res.json(await prisma.payment.findMany({ where: { leaseId: id }, orderBy: { dueDate: "asc" } }));
  } catch (error) { respondError(res, error); }
};
