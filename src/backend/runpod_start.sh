#!/bin/bash

# Upgrade pip
python -m pip install --upgrade pip

# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip again inside venv
python -m pip install --upgrade pip

# Clone the repo
git clone https://github.com/Jaseci-Labs/jac-vision.git

# Move into the backend directory
cd jac-vision/src/backend/

# List all branches
git branch -a

# Ask user which branch to checkout
read -p "Enter the branch you want to checkout (default 'dev'): " branch
branch=${branch:-dev}

# Checkout and update
git checkout $branch
git fetch
git pull

# Install dependencies
pip install -r requirements_with_versions.txt

echo "✅ Environment setup complete."
