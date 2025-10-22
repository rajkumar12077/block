import path from 'path';
import fs from 'fs';
import { Plugin } from 'vite';

// A custom plugin to handle MUI v7 imports properly
export function muiResolver(): Plugin {
  return {
    name: 'mui-resolver',
    resolveId(id: string): string | null {
      // Handle @mui/material/utils and similar imports
      if (id.startsWith('@mui/')) {
        const parts = id.split('/');
        
        // Handle deep imports like @mui/material/Button
        if (parts.length === 3) {
          const modulePath = path.resolve(process.cwd(), 'node_modules', parts[0], parts[1], parts[2], 'index.js');
          if (fs.existsSync(modulePath)) {
            return modulePath;
          }
        }
        
        // Handle deeper imports like @mui/material/utils
        if (parts.length > 3) {
          const submodule = parts.slice(2).join('/');
          const modulePath = path.resolve(process.cwd(), 'node_modules', parts[0], parts[1], submodule, 'index.js');
          if (fs.existsSync(modulePath)) {
            return modulePath;
          }
          
          const jsPath = path.resolve(process.cwd(), 'node_modules', parts[0], parts[1], `${submodule}.js`);
          if (fs.existsSync(jsPath)) {
            return jsPath;
          }
        }
      }
      
      return null;
    }
  };
}