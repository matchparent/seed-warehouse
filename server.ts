import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import knex from "knex";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Database initialization
  const db = knex({
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'cotton_seed_db',
    },
    useNullAsDefault: true
  });

  const dbMode = process.env.DB_HOST ? 'mysql' : 'dexie';

  // Check and create tables if MySQL is accessible
  async function initMySQL() {
    if (dbMode !== 'mysql') return;
    try {
      const hasVariaty = await db.schema.hasTable('tab_variaty');
      if (!hasVariaty) {
        await db.schema.createTable('tab_variaty', (table) => {
          table.increments('vid').primary();
          table.string('vname').notNullable();
        });
      }

      const hasDestination = await db.schema.hasTable('tab_destination');
      if (!hasDestination) {
        await db.schema.createTable('tab_destination', (table) => {
          table.increments('did').primary();
          table.string('dname').notNullable();
        });
      }

      const hasBatch = await db.schema.hasTable('tab_batch');
      if (!hasBatch) {
        await db.schema.createTable('tab_batch', (table) => {
          table.increments('bid').primary();
          table.string('bname').notNullable();
          table.integer('bvid').notNullable();
          table.string('bstatus').notNullable();
          table.string('bdate').notNullable();
          table.float('bowei').notNullable();
          table.float('bcwei').notNullable();
          table.string('bcli');
          table.string('bmemo');
        });
      }

      const hasRecord = await db.schema.hasTable('tab_sending_record');
      if (!hasRecord) {
        await db.schema.createTable('tab_sending_record', (table) => {
          table.increments('sid').primary();
          table.string('sstate').notNullable();
          table.string('sdate').notNullable();
          table.string('splate').notNullable();
          table.integer('sdest').notNullable();
          table.string('sdrpn');
          table.string('sftime');
          table.text('spinfo');
          table.text('sainfo');
          table.text('smemo');
        });
      }

      const hasRecordLog = await db.schema.hasTable('tab_record');
      if (!hasRecordLog) {
        await db.schema.createTable('tab_record', (table) => {
          table.increments('rid').primary();
          table.string('spellname').notNullable();
          table.text('desc').notNullable();
          table.string('optime').notNullable();
        });
      }

      const hasUser = await db.schema.hasTable('tab_user');
      if (!hasUser) {
        await db.schema.createTable('tab_user', (table) => {
          table.increments('uid').primary();
          table.string('spellname').notNullable();
          table.string('key').notNullable();
        });
        // Seed default user for testing
        await db('tab_user').insert({
          spellname: 'BianJiang',
          key: 'U2FsdGVkX18mX9TVixXl9qnwMi9z2Mc6C1oaKzLc8Ow='
        });
      }
      console.log('MySQL schemas checked/initialized.');
    } catch (err) {
      console.error('MySQL initialization failed. Database might not be accessible or configuration is wrong.');
      console.error(err);
    }
  }

  // API Routes
  app.get("/api/config", (req, res) => {
    res.json({ dbMode });
  });

  app.get("/api/db/status", async (req, res) => {
    try {
      await db.raw('select 1+1 as result');
      res.json({ status: "connected" });
    } catch (err) {
      res.status(500).json({ status: "disconnected", error: String(err) });
    }
  });

  // Generic CRUD helper generator
  const setupTableRoutes = (tableName: string, idField: string) => {
    app.get(`/api/${tableName}`, async (req, res) => {
      try {
        const data = await db(tableName).select("*");
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    });

    app.post(`/api/${tableName}`, async (req, res) => {
      try {
        const [id] = await db(tableName).insert(req.body);
        res.json({ [idField]: id, ...req.body });
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    });

    app.put(`/api/${tableName}/:id`, async (req, res) => {
      try {
        await db(tableName)
          .where(idField, req.params.id)
          .update(req.body);
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    });

    app.delete(`/api/${tableName}/:id`, async (req, res) => {
      try {
        await db(tableName)
          .where(idField, req.params.id)
          .delete();
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    });
  };

  setupTableRoutes('tab_variaty', 'vid');
  setupTableRoutes('tab_destination', 'did');
  setupTableRoutes('tab_batch', 'bid');
  setupTableRoutes('tab_sending_record', 'sid');
  setupTableRoutes('tab_record', 'rid');

  app.post("/api/auth/login", async (req, res) => {
    const { spellname, key } = req.body;
    try {
      const user = await db('tab_user').where({ spellname, key }).first();
      if (user) {
        res.json({ success: true, user });
      } else {
        res.status(401).json({ success: false, message: "Invalid credentials" });
      }
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Specialized query for shipments (order by date)
  app.get("/api/tab_sending_record/ordered", async (req, res) => {
    try {
      const data = await db('tab_sending_record').orderBy('sdate', 'desc');
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Batch query with ordering
  app.get("/api/tab_batch/ordered", async (req, res) => {
    try {
      const data = await db('tab_batch').orderBy('bdate', 'desc');
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    await initMySQL();
  });
}

startServer();
