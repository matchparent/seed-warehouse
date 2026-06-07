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

      const hasOrderStatus = await db.schema.hasTable('tab_order_status');
      if (!hasOrderStatus) {
        await db.schema.createTable('tab_order_status', (table) => {
          table.increments('osid').primary();
          table.string('oscname').notNullable();
          table.string('osuname').notNullable();
          table.string('osename').notNullable();
        });
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
        });
      } else {
        // Migration check for oard, oarr
        const columns = await db('tab_orders').columnInfo();
        if (!columns.oard) {
           await db.schema.table('tab_orders', (table) => {
             table.string('oard');
             table.string('oarr');
           });
        }
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

      const orderStatusCount = await db('tab_order_status').count('osid as count').first();
      if ((orderStatusCount as any).count === 0) {
        await db('tab_order_status').insert([
          { osid: 1, oscname: '有意愿', osuname: 'Iroda', osename: 'Intentional' },
          { osid: 2, oscname: '已签约', osuname: 'Shartnoma imzolanadi', osename: 'Signed' },
          { osid: 3, oscname: '已付定金', osuname: 'Zakalat to\'langan', osename: 'Deposit Paid' },
          { osid: 4, oscname: '已付全款', osuname: 'To\'liq to\'langan', osename: 'Full Paid' },
          { osid: 5, oscname: '已完成', osuname: 'Tugatildi', osename: 'Completed' },
          { osid: 6, oscname: '已退款', osuname: 'Qaytarilgan', osename: 'Refunded' },
          { osid: 7, oscname: '已删除', osuname: 'O\'chirildi', osename: 'Deleted' }
        ]);
      }

      const orderCustomCount = await db('tab_order_custom').count('ocid as count').first();
      if ((orderCustomCount as any).count === 0) {
        await db('tab_order_custom').insert([
          { ocid: 1, occname: '政府', ocuname: 'Hukumat', ocename: 'Government' },
          { ocid: 2, occname: 'Cluster', ocuname: 'Klaster', ocename: 'Cluster' },
          { ocid: 3, occname: 'AKIS', ocuname: 'AKIS', ocename: 'AKIS' },
          { ocid: 4, occname: '散户', ocuname: 'Xususiy fermerlar', ocename: 'Private Farmer' }
        ]);
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
  setupTableRoutes('tab_op_record', 'orid');
  setupTableRoutes('tab_orders', 'oid');
  setupTableRoutes('tab_order_status', 'osid');
  setupTableRoutes('tab_order_custom', 'ocid');

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
