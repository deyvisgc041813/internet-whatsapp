npm install --production
npx prisma generate
npx prisma migrate deploy
pm2 start ecosystem.config.js -> para prod


#!/bin/bash
# ==============================
# 🚀 SCRIPT DE DESPLIEGUE PM2 + PRISMA
# ==============================

echo "📦 1. Instalando dependencias..."
npm install --production

echo "🧠 2. Generando cliente Prisma..."
npx prisma generate

echo "🗃️ 3. Aplicando migraciones a la base de datos..."
npx prisma migrate deploy

echo "🧹 4. Limpiando caché vieja de PM2..."
pm2 delete all || true

echo "🚀 5. Iniciando servidor con PM2..."
pm2 start ecosystem.config.js --env production

echo "💾 6. Guardando configuración PM2 para reinicio automático..."
pm2 save

echo "✅ Despliegue completado exitosamente."


------------------
npm install @whiskeysockets/baileys@latest
pm2 restart internet-whatsapp-actualizado

----------------------------
si falla
pm2 logs internet-whatsapp-actualizado
npm update @whiskeysockets/baileys
pm2 restart internet-whatsapp-actualizado