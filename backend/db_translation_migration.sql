-- Migración para añadir campos de traducción al inglés en la base de datos

-- 1. Materias (Subjects)
ALTER TABLE public.subjects 
ADD COLUMN IF NOT EXISTS name_en TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT;

-- 2. Módulos de Curso (Course Modules)
ALTER TABLE public.modules 
ADD COLUMN IF NOT EXISTS title_en TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT;

-- 3. Elementos de Módulo (Module Items)
ALTER TABLE public.module_items 
ADD COLUMN IF NOT EXISTS title_en TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT;

-- 4. Tickets de Salida (Module Exit Tickets)
ALTER TABLE public.module_exit_tickets
ADD COLUMN IF NOT EXISTS title_en TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT;

-- Opcional: Para evitar que fallen, podemos copiar el contenido actual
UPDATE public.subjects SET name_en = name, description_en = description WHERE name_en IS NULL;
UPDATE public.modules SET title_en = title WHERE title_en IS NULL;
UPDATE public.module_items SET title_en = title, description_en = description WHERE title_en IS NULL;
UPDATE public.module_exit_tickets SET title_en = title, description_en = description WHERE title_en IS NULL;
