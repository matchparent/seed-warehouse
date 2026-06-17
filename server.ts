import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import knex from "knex";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.disable('etag');

  app.use((req, res, next) => {
    res.setHeader('Connection', 'close');
    next();
  });

  app.use(express.json({ limit: '50mb' }));

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

  const dbHost = process.env.DB_HOST;
  const dbMode = (dbHost && dbHost !== 'undefined' && dbHost !== 'null' && dbHost.trim() !== '') ? 'mysql' : 'dexie';

  console.log('================================================');
  console.log(`[Server Startup] NODE_ENV: "${process.env.NODE_ENV}"`);
  console.log(`[Server Startup] DB_HOST: "${process.env.DB_HOST}"`);
  console.log(`[Server Startup] DB_PORT: "${process.env.DB_PORT}"`);
  console.log(`[Server Startup] DB_USER: "${process.env.DB_USER}"`);
  console.log(`[Server Startup] DB_NAME: "${process.env.DB_NAME}"`);
  console.log(`[Server Startup] Calculated dbMode: "${dbMode}"`);
  console.log('================================================');

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
          table.double('bowei').notNullable();
          table.double('bcwei').notNullable();
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
          table.integer('soid');
          table.string('sdrpn');
          table.string('sftime');
          table.text('spinfo');
          table.text('sainfo');
          table.text('smemo');
        });
      } else {
        const columnsRecord = await db('tab_sending_record').columnInfo();
        if (!columnsRecord.soid) {
          await db.schema.table('tab_sending_record', (table) => {
            table.integer('soid');
          });
        }
      }

      const hasRecordLog = await db.schema.hasTable('tab_op_record');
      if (!hasRecordLog) {
        await db.schema.createTable('tab_op_record', (table) => {
          table.increments('orid').primary();
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

      if (await db.schema.hasTable('tab_order_status')) {
        await db.schema.dropTable('tab_order_status');
      }

      const hasOrderCustom = await db.schema.hasTable('tab_order_custom');
      if (!hasOrderCustom) {
        await db.schema.createTable('tab_order_custom', (table) => {
          table.increments('ocid').primary();
          table.string('occname').notNullable();
          table.string('ocuname').notNullable();
          table.string('ocename').notNullable();
        });
      }

      const hasOrders = await db.schema.hasTable('tab_orders');
      if (!hasOrders) {
        await db.schema.createTable('tab_orders', (table) => {
          table.increments('oid').primary();
          table.string('ocdate');
          table.integer('status').notNullable();
          table.integer('odest').notNullable();
          table.integer('octype').notNullable();
          table.string('ocname');
          table.string('ocphone');
          table.string('otr');
          table.integer('otrc').defaultTo(1);
          table.text('ossgi');
          table.string('oconid');
          table.string('oconfn');
          table.string('oarp');
          table.string('oard'); // Deposit
          table.string('oarr'); // Balance
          table.integer('oarpc').defaultTo(1);
          table.text('ogsented');
          table.text('omemo');
          table.string('orf'); // Refund amount
          table.integer('orfc').defaultTo(1); // Refund currency
        });
      } else {
        // Migration check for oard, oarr, orf, orfc
        const columns = await db('tab_orders').columnInfo();
        if (!columns.oard) {
           await db.schema.table('tab_orders', (table) => {
             table.string('oard');
             table.string('oarr');
           });
        }
        if (!columns.orf) {
           await db.schema.table('tab_orders', (table) => {
             table.string('orf');
             table.integer('orfc').defaultTo(1);
           });
        }
      }

      // Warehouse schema migration
      const hasWarehouses = await db.schema.hasTable('tab_warehouses');
      if (!hasWarehouses) {
        await db.schema.createTable('tab_warehouses', (table) => {
          table.integer('wid').primary();
          table.string('wname').notNullable();
          table.integer('wlocation').notNullable();
        });
        await db('tab_warehouses').insert([
          { wid: -1, wname: 'Sino-Uzbek Logistic', wlocation: 1 },
          { wid: -2, wname: 'Anasoy', wlocation: 7 },
          { wid: -3, wname: 'Bagdad', wlocation: 5 }
        ]);
      }

      // Batch modified schema
      const hasBatchModify = await db.schema.hasTable('tab_batch_modify');
      if (!hasBatchModify) {
        await db.schema.createTable('tab_batch_modify', (table) => {
          table.increments('bmid').primary();
          table.integer('bid').notNullable();
          table.integer('bmop').notNullable();
          table.double('bmvolume').notNullable();
          table.text('bmmemo');
          table.string('bmdate').notNullable();
        });
      }

      // Bankcard schema
      const hasBankcards = await db.schema.hasTable('tab_bankcards');
      if (!hasBankcards) {
        await db.schema.createTable('tab_bankcards', (table) => {
          table.increments('bcid').primary();
          table.string('bcno').notNullable();
          table.integer('bcbalance').notNullable();
          table.string('bcbaname').notNullable();
          table.integer('bcdeleted').defaultTo(0).notNullable();
        });
      }

      // Consume record schema
      const hasConsumeRecord = await db.schema.hasTable('tab_consume_record');
      if (!hasConsumeRecord) {
        await db.schema.createTable('tab_consume_record', (table) => {
          table.increments('crid').primary();
          table.integer('crbcid').notNullable();
          table.string('croper').notNullable();
          table.integer('cramount').notNullable();
          table.string('crmemo').notNullable();
          table.string('crqrcode').notNullable();
          table.integer('crscaned').defaultTo(0).notNullable();
          table.timestamp('crtime').defaultTo(db.fn.now());
        });
      }

      // Ensure columns bowei and bcwei are DOUBLE instead of FLOAT to prevent rounding/double/float conversion issues
      try {
        await db.raw('ALTER TABLE tab_batch MODIFY COLUMN bowei DOUBLE NOT NULL');
        await db.raw('ALTER TABLE tab_batch MODIFY COLUMN bcwei DOUBLE NOT NULL');
      } catch (err) {
        console.warn('Could not alter tab_batch columns to DOUBLE:', err);
      }

      // Add default bware to tab_batch
      const columnsBatch = await db('tab_batch').columnInfo();
      if (!columnsBatch.bware) {
        await db.schema.table('tab_batch', (table) => {
          table.integer('bware').defaultTo(-1);
        });
      }
      // Migrate existing rows with null/1/undefined bware to -1
      await db('tab_batch').whereNull('bware').orWhere('bware', 1).update('bware', -1);

      // Add default sware to tab_sending_record
      const columnsSending = await db('tab_sending_record').columnInfo();
      if (!columnsSending.sware) {
        await db.schema.table('tab_sending_record', (table) => {
          table.integer('sware').defaultTo(-1);
        });
      }
      // Migrate existing rows with null/1/undefined sware to -1
      await db('tab_sending_record').whereNull('sware').orWhere('sware', 1).update('sware', -1);

      // Add default crtime to tab_consume_record if missing
      const columnsConsume = await db('tab_consume_record').columnInfo();
      if (!columnsConsume.crtime) {
        await db.schema.table('tab_consume_record', (table) => {
          table.timestamp('crtime').defaultTo(db.fn.now());
        });
        await db('tab_consume_record').whereNull('crtime').update('crtime', db.fn.now());
      }

      const variatyCount = await db('tab_variaty').count('vid as count').first();
      if ((variatyCount as any).count === 0) {
        await db('tab_variaty').insert([
          { vid: 1, vname: '新陆中73号' },
          { vid: 2, vname: 'T115' },
          { vid: 3, vname: '鸿泰6636' },
          { vid: 4, vname: '草甘膦' }
        ]);
      }
      const destinationCount = await db('tab_destination').count('did as count').first();
      if ((destinationCount as any).count === 0) {
        const uzbekStates = [
          '塔什干/Toshkent', '撒马尔罕/Samarqand', '布哈拉/Buxoro', '安集延/Andijon',
          '费尔干纳/Farg\'ona', '纳曼干/Namangan', '吉扎克/Jizzax', '卡什卡达里亚/Qashqadaryo',
          '苏尔汉河/Surxondaryo', '锡尔河/Sirdaryo', '纳沃伊/Navoiy', '花拉子模/Xorazm',
          '卡拉卡尔帕克斯坦/Qoraqalpog\'iston'
        ];
        await db('tab_destination').insert(
          uzbekStates.map((name, i) => ({ did: i + 1, dname: name }))
        );
      }

      const orderCustomCount = await db('tab_order_custom').count('ocid as count').first();
      if ((orderCustomCount as any).count === 0 || (orderCustomCount as any).count !== 6) {
        await db('tab_order_custom').truncate().catch(() => {});
        await db('tab_order_custom').insert([
          { ocid: 1, occname: '政府', ocuname: 'Hukumat', ocename: 'Government' },
          { ocid: 2, occname: 'Cluster', ocuname: 'Klaster', ocename: 'Cluster' },
          { ocid: 3, occname: 'AKIS', ocuname: 'AKIS', ocename: 'AKIS' },
          { ocid: 4, occname: '散户', ocuname: 'Xususiy fermerlar', ocename: 'Private Farmer' },
          { ocid: 5, occname: '机构', ocuname: 'Tashkilot', ocename: 'Institution' },
          { ocid: 6, occname: '经销商', ocuname: 'Diler', ocename: 'Distributor' }
        ]).catch(err => console.error("Could not update custom types in MySQL:", err));
      }
      console.log('MySQL schemas checked/initialized.');
    } catch (err) {
      console.error('MySQL initialization failed. Database might not be accessible or configuration is wrong.');
      console.error(err);
    }
  }

  // API Routes
  app.get("/api/config", (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
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
  setupTableRoutes('tab_op_record', 'orid');
  setupTableRoutes('tab_orders', 'oid');
  setupTableRoutes('tab_order_custom', 'ocid');
  setupTableRoutes('tab_warehouses', 'wid');
  setupTableRoutes('tab_batch_modify', 'bmid');
  setupTableRoutes('tab_bankcards', 'bcid');
  setupTableRoutes('tab_consume_record', 'crid');

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

  // Upload and Download contract files
  app.post("/api/contracts/upload", async (req, res) => {
    const { fileName, fileData } = req.body;
    if (!fileName || !fileData) {
      return res.status(400).json({ error: "Missing fileName or fileData" });
    }
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filePath = path.join(uploadsDir, fileName);
      const buffer = Buffer.from(fileData, 'base64');
      fs.writeFileSync(filePath, buffer);
      res.json({ success: true, filePath: `/uploads/${fileName}` });
    } catch (err) {
      console.error("Error writing uploaded file:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  app.get("/api/contracts/download/:fileName", async (req, res) => {
    const { fileName } = req.params;
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const filePath = path.join(uploadsDir, fileName);
      if (fs.existsSync(filePath)) {
        res.download(filePath, fileName);
      } else {
        res.status(404).json({ error: `File not found on server: ${fileName}` });
      }
    } catch (err) {
      console.error("Error downloading file:", err);
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

  const server = app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    await initMySQL();
  });

  server.keepAliveTimeout = 0;
  server.headersTimeout = 0;
}

startServer();
