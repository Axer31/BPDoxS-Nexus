import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET: List all clients
router.get('/', async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { company_name: 'asc' }
    });
    res.json(clients); 
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch clients" });
  }
});

// GET: Single Client
router.get('/:id', async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: Number(req.params.id) }
    });
    if (!client) return res.status(404).json({ error: "Client not found" });
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch client" });
  }
});

// POST: Create a new client
router.post('/', async (req, res) => {
  try {
    const { 
      company_name, 
      tax_id, 
      cin, // <--- Added CIN
      state_code, 
      country, 
      email, 
      phone, 
      address_street, 
      address_city, 
      address_zip 
    } = req.body;

    const newClient = await prisma.client.create({
      data: {
        company_name,
        tax_id,
        cin, // <--- Mapped to DB
        state_code: Number(state_code),
        country: country || 'India',
        email,
        phone,
        addresses: {
          billing: { street: address_street, city: address_city, zip: address_zip }
        }
      }
    });

    res.status(201).json(newClient);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create client" });
  }
});

// PUT: Update Client
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { 
      company_name, 
      tax_id, 
      cin, // <--- Added CIN
      state_code, 
      country, 
      email, 
      phone, 
      address_street, 
      address_city, 
      address_zip 
    } = req.body;

    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
        company_name,
        tax_id,
        cin, // <--- Mapped to DB
        state_code: Number(state_code),
        country,
        email,
        phone,
        addresses: {
          billing: { street: address_street, city: address_city, zip: address_zip }
        }
      }
    });

    res.json(updatedClient);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update client" });
  }
});

// DELETE: Remove Client
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.client.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete client" });
  }
});

export default router;