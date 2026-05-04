import { Express, Request, Response } from "express";
import { makePointifyRequest } from "../config.js";

export function registerPackageRoutes(app: Express) {
  // Get packages with pagination
  app.get("/api/packages", async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 20, admin = 'true', userId } = req.query;
      const userIdParam = userId ? `&userId=${userId}` : '';
      
      const data = await makePointifyRequest(`/packages?page=${page}&limit=${limit}&admin=${admin}${userIdParam}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      res.json(data);
    } catch (error: any) {
      console.error("Error fetching packages:", error);
      const status = error.status || 500;
      res.status(status).json({ 
        error: "Failed to fetch packages", 
        message: error.message || "Unknown error",
        details: error.responseBody || null
      });
    }
  });

  // Get package by ID
  app.get("/api/packages/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const data = await makePointifyRequest(`/packages/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      res.json(data);
    } catch (error: any) {
      console.error("Error fetching package:", error);
      const status = error.status || 500;
      res.status(status).json({ 
        error: "Failed to fetch package", 
        message: error.message || "Unknown error",
        details: error.responseBody || null
      });
    }
  });
}