// createUser.cjs
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3001;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Configuración de Supabase
const supabase = createClient(
  'https://ywmspibcnhfmqmnutpyg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3bXNwaWJjbmhmbXFtbnV0cHlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY4MTQ5MywiZXhwIjoyMDYzMjU3NDkzfQ.Pgu07EHCkkvnFvgZV262Etm5z-iCZ2D24s4KAnCZjOo'
);

// Obtener argumentos de la línea de comandos
const args = process.argv.slice(2);

// Función para mostrar ayuda
function showHelp() {
  console.log('Uso: node createUser.cjs --name "Nombre" --email "correo@ejemplo.com" --password "contraseña" [--role "admin"] [--storeId "id_tienda"]');
  process.exit(0);
}

// Procesar argumentos
const params = {};
for (let i = 0; i < args.length; i += 2) {
  if (args[i].startsWith('--')) {
    const key = args[i].substring(2);
    const value = args[i + 1];
    if (!value || value.startsWith('--')) {
      console.error(`Error: Falta el valor para el parámetro ${args[i]}`);
      showHelp();
    }
    params[key] = value;
  }
}

// Validar parámetros requeridos
if (!params.name || !params.email || !params.password) {
  console.error('Error: Faltan parámetros requeridos');
  showHelp();
}

// Función para crear un administrador
async function createAdmin({ name, email, password, role = 'admin', storeId = null }) {
  try {
    console.log('Creando usuario administrador...');
    
    // Crear el usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar el correo automáticamente
      user_metadata: {
        name,
        role: role,
        store_id: storeId
      }
    });

    if (authError) throw authError;

    // Insertar en la tabla de perfiles
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert([
        {
          id: authData.user.id,
          full_name: name,
          email,
          role: role,
          store_id: storeId,
          updated_at: new Date().toISOString()
        }
      ], { onConflict: 'id' });

    if (profileError) throw profileError;

    console.log('✅ Usuario administrador creado exitosamente:');
    console.log(`- ID: ${authData.user.id}`);
    console.log(`- Nombre: ${name}`);
    console.log(`- Email: ${email}`);
    console.log(`- Rol: ${role}`);
    if (storeId) console.log(`- ID de Tienda: ${storeId}`);
    
    return { success: true, user: authData.user };
    
  } catch (error) {
    console.error('❌ Error al crear el administrador:', error.message);
    return { success: false, error: error.message };
  }
}

// Ejecutar la creación del administrador
createAdmin(params);

// Ruta para crear un nuevo administrador
app.post('/api/create-admin', async (req, res) => {
  try {
    const { name, email, password, role, storeId } = req.body;
    
    // Validar datos requeridos
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nombre, correo y contraseña son requeridos' });
    }

    // Crear el usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar el correo automáticamente
      user_metadata: {
        name,
        role: role || 'admin',
        store_id: storeId || null
      }
    });

    if (authError) {
      console.error('Error al crear usuario en Auth:', authError);
      return res.status(400).json({ error: authError.message });
    }

    // Insertar en la tabla de perfiles
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert([
        {
          id: authData.user.id,
          full_name: name,
          email,
          role: role || 'admin',
          store_id: storeId || null,
          updated_at: new Date().toISOString()
        }
      ], { onConflict: 'id' });

    if (profileError) {
      console.error('Error al crear perfil:', profileError);
      return res.status(400).json({ error: profileError.message });
    }

    console.log('✅ Usuario administrador creado:', authData.user.email);
    res.json({ success: true, user: authData.user });
    
  } catch (error) {
    console.error('Error inesperado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor ejecutándose en http://localhost:${port}`);
});
