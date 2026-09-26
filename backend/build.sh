#!/usr/bin/env bash
# Render build script for OMNICARE backend
set -o errexit

echo "==> Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "==> Collecting static files..."
python manage.py collectstatic --noinput

echo "==> Running database migrations..."
python manage.py migrate --noinput

echo "==> Seeding demo data..."
python manage.py seed_demo_data

echo "==> Build complete!"
