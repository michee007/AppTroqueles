-- ========================================================
-- ESQUEMA DE BASE DE DATOS NORMALIZADO: TroquelApp
-- Motor: PostgreSQL
-- Propósito: Reducir error humano e integridad de datos
-- ========================================================

-- 1. TABLAS MAESTRO (Catálogos)
-- Estas tablas evitan errores de escritura al estandarizar opciones.
DROP TABLE IF EXISTS imagenes_troquel CASCADE;
DROP TABLE IF EXISTS mantenimientos CASCADE;
DROP TABLE IF EXISTS troqueles CASCADE;
DROP TABLE IF EXISTS responsables CASCADE;
DROP TABLE IF EXISTS proveedores CASCADE;
DROP TABLE IF EXISTS ubicaciones CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;


CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE,
    contacto VARCHAR(255),
    telefono VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ubicaciones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE, -- Ej: "Estante A", "Bodega Principal"
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS proveedores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE,
    nit VARCHAR(50),
    telefono VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS responsables (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE,
    cargo VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLA PRINCIPAL: Troqueles
CREATE TABLE IF NOT EXISTS troqueles (
    id VARCHAR(50) PRIMARY KEY, -- Formato: TRQ-XXXXXXXX
    nombre VARCHAR(255) NOT NULL,
    referencia VARCHAR(100) UNIQUE NOT NULL,
    
    -- Relaciones Normalizadas
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    proveedor_id INTEGER REFERENCES proveedores(id) ON DELETE SET NULL,
    ubicacion VARCHAR(255),
    
    cantidad INTEGER DEFAULT 0,
    cavidades INTEGER DEFAULT 0,
    costo DECIMAL(15, 2) DEFAULT 0.00,
    ancho DECIMAL(10, 2) DEFAULT 0.00,
    profundo DECIMAL(10, 2) DEFAULT 0.00,
    alto DECIMAL(10, 2) DEFAULT 0.00,
    fecha_ingreso DATE DEFAULT CURRENT_DATE,
    estado VARCHAR(50) DEFAULT 'Activo', -- 'Activo', 'En Mantenimiento', 'Depurado'
    
    observaciones TEXT,
    fecha_depuracion DATE,
    razon_depuracion TEXT,
    fecha_restauracion DATE,
    razon_restauracion TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA: Mantenimientos
CREATE TABLE IF NOT EXISTS mantenimientos (
    id SERIAL PRIMARY KEY,
    troquel_id VARCHAR(50) NOT NULL REFERENCES troqueles(id) ON DELETE CASCADE,
    fecha DATE DEFAULT CURRENT_DATE,
    trabajo TEXT,
    costo DECIMAL(15, 2) DEFAULT 0.00,
    
    -- Relación Normalizada
    responsable_id INTEGER REFERENCES responsables(id) ON DELETE SET NULL,
    
    foto TEXT, -- Base64
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLA: Imágenes de Troquel
CREATE TABLE IF NOT EXISTS imagenes_troquel (
    id SERIAL PRIMARY KEY,
    troquel_id VARCHAR(50) NOT NULL REFERENCES troqueles(id) ON DELETE CASCADE,
    datos_base64 TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_troqueles_cliente ON troqueles(cliente_id);
CREATE INDEX IF NOT EXISTS idx_troqueles_proveedor ON troqueles(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_mantenimientos_responsable ON mantenimientos(responsable_id);

-- ========================================================
-- AUTOMATIZACIÓN DE TIMESTAMP (updated_at)
-- ========================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_troqueles_updated_at') THEN
        CREATE TRIGGER update_troqueles_updated_at
            BEFORE UPDATE ON troqueles
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
