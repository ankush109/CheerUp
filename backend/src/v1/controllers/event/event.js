import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { ZodError, z } from "zod";
import bcrypt from "bcrypt";
import { NextFunction, Request, Response } from "express";
import createError from "http-errors";
import ms from "ms";
import { customResponse } from "../../../utils/Response";

const prisma = new PrismaClient();
const eventController = {
  // Only NGO can create an event
  async createEvent(req, res, next) {
    try {
      const { name, description, location, funding, dates } = req.body;
      const userId = req.user.id;

      // Check if the user is an NGO
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          role: "NGO",
        },
      });

      if (!user) {
        return res.status(403).json({ error: "Only NGOs can create events" });
      }

      const event = await prisma.event.create({
        data: {
          name,
          description,
          location,
          funding,
          userId,
          ngoId: userId,
          date: {
            create: dates.map((date) => ({
              date,
            })),
          },
        },
      });

      res.json({ success: true, message: event });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async getAllEvents(req, res, next) {
    try {
      const events = await prisma.event.findMany({
        include: {
          date: true,
          ngo: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });
      res.json({ success: true, message: events });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async getMyEvents(req, res, next) {
    try {
      const userId = req.user.id;

      const events = await prisma.event.findMany({
        where: {
          ngoId: userId,
        },
        include: {
          date: true,
        },
      });

      res.json({ success: true, message: events });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async deleteEvent(req, res, next) {
    try {
      const eventId = req.params.id;
      const userId = req.user.id;

      const event = await prisma.event.findFirst({
        where: {
          id: eventId,
          ngoId: userId,
        },
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found or you are not authorized to delete it" });
      }

      await prisma.event.delete({
        where: {
          id: eventId,
        },
      });

      res.json({ success: true, message: "Event deleted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async updateEvent(req, res, next) {
    try {
      const eventId = req.params.id;
      const userId = req.user.id;
      const { name, description, location, funding, dates } = req.body;

      const event = await prisma.event.findFirst({
        where: {
          id: eventId,
          ngoId: userId,
        },
      });

      if (!event) {
        return res.status(404).json({ error: "Event not found or you are not authorized to update it" });
      }

      const updatedEvent = await prisma.event.update({
        where: {
          id: eventId,
        },
        data: {
          name,
          description,
          location,
          funding,
          date: {
            deleteMany: {}, // Delete existing dates
            create: dates.map((date) => ({
              date,
            })),
          },
        },
      });

      res.json({ success: true, message: updatedEvent });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

export default eventController;