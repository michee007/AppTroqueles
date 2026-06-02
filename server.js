const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Aumentar límite para imágenes Base64
app.use(express.static('.')); // Servir archivos estáticos del frontend

// === RUTAS PARA CATÁLOGOS ===

// Clientes
app.get('/api/clientes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clientes ORDER BY nombre ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clientes', async (req, res) => {
  const { nombre, contacto, telefono } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO clientes (nombre, contacto, telefono) VALUES ($1, $2, $3) RETURNING *',
      [nombre, contacto, telefono]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/clientes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM clientes WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proveedores
app.get('/api/proveedores', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM proveedores ORDER BY nombre ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/proveedores', async (req, res) => {
  const { nombre, nit, telefono } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO proveedores (nombre, nit, telefono) VALUES ($1, $2, $3) RETURNING *',
      [nombre, nit, telefono]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/proveedores/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM proveedores WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Responsables
app.get('/api/responsables', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM responsables ORDER BY nombre ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/responsables', async (req, res) => {
  const { nombre, cargo } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO responsables (nombre, cargo) VALUES ($1, $2) RETURNING *',
      [nombre, cargo]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/responsables/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM responsables WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === RUTAS PARA TROQUELES ===

app.get('/api/troqueles', async (req, res) => {
  try {
    // Join con catálogos para obtener nombres en lugar de IDs
    const query = `
      SELECT t.*, 
             c.nombre as cliente_nombre, 
             p.nombre as proveedor_nombre
      FROM troqueles t
      LEFT JOIN clientes c ON t.cliente_id = c.id
      LEFT JOIN proveedores p ON t.proveedor_id = p.id
      ORDER BY t.created_at DESC
    `;
    const result = await pool.query(query);

    // Obtener imágenes para cada troquel (simplificado para este ejemplo)
    // En una app real, esto podría hacerse con un JOIN o peticiones separadas
    const troqueles = result.rows;
    for (let t of troqueles) {
      const imgRes = await pool.query('SELECT datos_base64 FROM imagenes_troquel WHERE troquel_id = $1', [t.id]);
      t.imagenes = imgRes.rows.map(r => r.datos_base64);

      const maintRes = await pool.query(`
        SELECT m.*, r.nombre as responsable_nombre 
        FROM mantenimientos m 
        LEFT JOIN responsables r ON m.responsable_id = r.id 
        WHERE m.troquel_id = $1 
        ORDER BY m.fecha DESC`, [t.id]);
      t.mantenimientos = maintRes.rows;
    }

    res.json(troqueles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/troqueles', async (req, res) => {
  const {
    id, nombre, referencia, cliente_id, ubicacion, proveedor_id,
    cantidad, cavidades, costo, ancho, profundo, alto, fecha_ingreso, estado, observaciones,
    imagenes, mantenimientos, fecha_depuracion, razon_depuracion
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO troqueles (
        id, nombre, referencia, cliente_id, ubicacion, proveedor_id, 
        cantidad, cavidades, costo, ancho, profundo, alto, fecha_ingreso, estado, observaciones,
        fecha_depuracion, razon_depuracion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (id) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        referencia = EXCLUDED.referencia,
        cliente_id = EXCLUDED.cliente_id,
        ubicacion = EXCLUDED.ubicacion,
        proveedor_id = EXCLUDED.proveedor_id,
        cantidad = EXCLUDED.cantidad,
        cavidades = EXCLUDED.cavidades,
        costo = EXCLUDED.costo,
        ancho = EXCLUDED.ancho,
        profundo = EXCLUDED.profundo,
        alto = EXCLUDED.alto,
        fecha_ingreso = EXCLUDED.fecha_ingreso,
        estado = EXCLUDED.estado,
        observaciones = EXCLUDED.observaciones,
        fecha_depuracion = EXCLUDED.fecha_depuracion,
        razon_depuracion = EXCLUDED.razon_depuracion,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const resTroquel = await client.query(insertQuery, [
      id, nombre, referencia, cliente_id, ubicacion, proveedor_id,
      cantidad, cavidades, costo, ancho, profundo, alto, fecha_ingreso, estado, observaciones,
      fecha_depuracion, razon_depuracion
    ]);

    // Manejar imágenes
    if (imagenes !== undefined) {
      await client.query('DELETE FROM imagenes_troquel WHERE troquel_id = $1', [id]);
      if (Array.isArray(imagenes)) {
        for (let img of imagenes) {
          await client.query('INSERT INTO imagenes_troquel (troquel_id, datos_base64) VALUES ($1, $2)', [id, img]);
        }
      }
    }

    // Manejar mantenimientos
    if (mantenimientos !== undefined) {
      await client.query('DELETE FROM mantenimientos WHERE troquel_id = $1', [id]);
      if (Array.isArray(mantenimientos)) {
        for (let m of mantenimientos) {
          // El responsable puede ser un ID o un nombre (tenemos que manejarlo)
          // Para simplificar, buscaremos el ID si viene como nombre o usaremos el ID directamente
          let respId = m.responsable_id || null;

          await client.query(
            'INSERT INTO mantenimientos (troquel_id, fecha, trabajo, costo, responsable_id, foto) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, m.fecha || new Date(), m.trabajo, m.costo || 0, respId, m.foto]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json(resTroquel.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Eliminar troquel permanentemente
app.delete('/api/troqueles/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM troqueles WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restaurar troquel (cambiar estado a Activo)
app.post('/api/troqueles/:id/restaurar', async (req, res) => {
  try {
    const { razon_restauracion } = req.body || {};
    await pool.query(
      "UPDATE troqueles SET estado = 'Activo', fecha_depuracion = NULL, razon_depuracion = NULL, fecha_restauracion = CURRENT_DATE, razon_restauracion = $1 WHERE id = $2",
      [razon_restauracion || null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Servidor de TroquelApp ejecutándose en http://192.168.2.245:${port}`);
});
