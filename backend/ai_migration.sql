-- 1. Habilitar pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tabla para almacenar los embeddings del contenido del módulo
CREATE TABLE IF NOT EXISTS module_content_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    item_id UUID REFERENCES module_items(id) ON DELETE CASCADE, -- opcional, si pertenece a un item
    content_text TEXT NOT NULL,
    -- Gemini text-embedding-004 usa 768 dimensiones
    embedding vector(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index para busquedas mas rapidas (opcional pero recomendado para gran escala)
-- CREATE INDEX ON module_content_embeddings USING hnsw (embedding vector_cosine_ops);

-- 3. Funcion RPC para buscar contenido similar
CREATE OR REPLACE FUNCTION match_module_content (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_module_id UUID
)
RETURNS TABLE (
  id UUID,
  module_id UUID,
  item_id UUID,
  content_text TEXT,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    mce.id,
    mce.module_id,
    mce.item_id,
    mce.content_text,
    1 - (mce.embedding <=> query_embedding) AS similarity
  FROM module_content_embeddings mce
  WHERE mce.module_id = filter_module_id
    AND 1 - (mce.embedding <=> query_embedding) > match_threshold
  ORDER BY mce.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 4. Tabla para registrar el nivel cognitivo/progreso de la IA sobre un estudiante en un modulo
CREATE TABLE IF NOT EXISTS student_module_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    level_score INTEGER DEFAULT 0, -- ej. 0 a 100
    level_category VARCHAR(50) DEFAULT 'Principiante', -- Principiante, Intermedio, Avanzado
    ai_notes TEXT, -- Notas o justificacion de la IA para no repetir conceptos
    last_evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, module_id)
);

-- RLS (Row Level Security) - Habilitar politicas básicas
ALTER TABLE module_content_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_module_levels ENABLE ROW LEVEL SECURITY;

-- Permitir a todos leer los embeddings (temporal o ajustado según tu app)
CREATE POLICY "Permitir lectura de embeddings a todos los usuarios"
ON module_content_embeddings FOR SELECT USING (true);

-- Permitir lectura/escritura a usuarios sobre sus propios niveles
CREATE POLICY "Permitir ver nivel propio"
ON student_module_levels FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Permitir actualizar nivel propio"
ON student_module_levels FOR UPDATE USING (auth.uid() = student_id);
CREATE POLICY "Permitir insertar nivel propio"
ON student_module_levels FOR INSERT WITH CHECK (auth.uid() = student_id);
