-- Ejecutar como SUPERUSUARIO o dueño de la base de datos (ej. postgres)

BEGIN;

-- 1. Agregar nuevas columnas de dimensiones
ALTER TABLE troqueles ADD COLUMN IF NOT EXISTS ancho DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE troqueles ADD COLUMN IF NOT EXISTS profundo DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE troqueles ADD COLUMN IF NOT EXISTS alto DECIMAL(10,2) DEFAULT 0.00;

-- 2. Agregar columna de texto para ubicación
ALTER TABLE troqueles ADD COLUMN IF NOT EXISTS ubicacion VARCHAR(255);

-- 3. Migrar los datos de la tabla ubicaciones al nuevo campo de texto
UPDATE troqueles t 
SET ubicacion = u.nombre 
FROM ubicaciones u 
WHERE t.ubicacion_id = u.id;

-- 4. Eliminar la restricción foránea y la columna antigua (Opcional, pero recomendado para completar el desacoplamiento)
ALTER TABLE troqueles DROP COLUMN IF EXISTS ubicacion_id;

-- 5. Agregar columna op y modificar referencia
ALTER TABLE troqueles ADD COLUMN IF NOT EXISTS op VARCHAR(100);
ALTER TABLE troqueles ALTER COLUMN referencia DROP NOT NULL;

COMMIT;
