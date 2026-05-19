#!/bin/bash
set -e

VPS="ubuntu@n8n.qbest.id"
SSH_KEY="$HOME/.ssh/id_ed25519"
REPO="https://github.com/heri-myself/quran-kids.git"
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

  # Build image dari subfolder backend
  echo "🔨 Build Docker image..."
  sudo docker build -f backend/Dockerfile -t quran-kids-backend backend/

  # Start postgres jika belum jalan
  echo "🗄️  Start postgres..."
  cd backend
  sudo docker compose up -d postgres
  sleep 5

  # Run database migration
  echo "🗄️  Run database migration..."
  sudo docker run --rm \
    --env-file $REMOTE_DIR/.env \
    --network quran-kids \
    quran-kids-backend \
    npx prisma migrate deploy

  # Restart backend container
  echo "🔄 Restart backend container..."
  sudo docker compose up -d backend

  sleep 5
  echo "📋 Container logs:"
  sudo docker logs --tail 30 quran-kids-backend

  echo ""
  sudo docker ps | grep quran-kids
REMOTE

echo "✅ Deploy selesai! Backend jalan di port 4001"
