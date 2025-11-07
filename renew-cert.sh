#!/bin/bash

# Script per rinnovare i certificati Let's Encrypt, fermare e riavviare il server
# Deve essere eseguito come root

# Ferma tutti i processi Node.js e npm (per sicurezza, ferma tutto avviato da start.sh)
pkill -f node
pkill -f npm

# Aspetta un momento per assicurarsi che si fermino
sleep 2

# Rinnova i certificati
certbot renew

# Riavvia il server usando start.sh
/workspaces/consegne/start.sh

echo "Certificati rinnovati e server riavviato."