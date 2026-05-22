// scripts/migrate.js

const { execSync } = require('child_process');

console.log('Running database migrations...');

try {
  execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });
  console.log('✅ Migrations completed successfully');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
