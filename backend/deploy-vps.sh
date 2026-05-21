#!/bin/bash
set -e

VPS="ubuntu@n8n.qbest.id"
SSH_KEY="$HOME/.ssh/id_ed25519"
REPO="https://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@github.com/heri-myself/quran-kids.git"
REMOTE_DIR="/opt/quran-kids"
SSH="ssh -i $SSH_KEY"

echo "🚀 Deploy Quran Kids backend ke VPS..."

$SSH $VPS << REMOTE
  set -e

  # Clone atau update repo
  if [ -d "$REMOTE_DIR/repo" ]; then
    echo "📥 Pull latest code..."
    cd $REMOTE_DIR/repo
    sudo git fetch origin main
    sudo git reset --hard origin/main
  else
    echo "📥 Clone repo..."
    sudo mkdir -p $REMOTE_DIR/uploads $REMOTE_DIR/pgdata
    sudo git clone $REPO $REMOTE_DIR/repo
    cd $REMOTE_DIR/repo
  fi

  cd $REMOTE_DIR/repo

  # Build images
  echo "🔨 Build backend Docker image..."
  sudo docker build -f backend/Dockerfile -t quran-kids-backend backend/

  echo "🔨 Build sidecar Docker image..."
  sudo docker build -f backend/python/Dockerfile.sidecar -t quran-kids-sidecar backend/python/

  # Start postgres jika belum jalan
  echo "🗄️  Start postgres..."
  cd backend
  sudo docker compose --env-file $REMOTE_DIR/.env up -d postgres
  echo "Tunggu postgres siap..."
  sleep 15

  # Run database migration
  echo "🗄️  Run database migration..."
  sudo docker run --rm \
    --env-file $REMOTE_DIR/.env \
    --network quran-kids \
    quran-kids-backend \
    npx prisma migrate deploy

  # Restart containers
  echo "🔄 Restart containers..."
  sudo docker compose --env-file $REMOTE_DIR/.env up -d tilawah-sidecar backend

  sleep 5
  echo "📋 Container logs:"
  sudo docker logs --tail 30 quran-kids-backend

  echo ""
  sudo docker ps | grep quran-kids
REMOTE

echo "✅ Deploy selesai! Backend jalan di port 4001"
