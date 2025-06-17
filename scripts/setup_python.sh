#!/bin/bash

echo "Setting up Python environment for BACnet clustering..."

# -----------------------------------------------------------------------------
# Locate a suitable Python interpreter (prefer stable 3.12 / 3.11 with ensurepip)
# -----------------------------------------------------------------------------

# Helper that returns the first interpreter found in the provided list
find_python() {
  for candidate in "$@"; do
    if command -v "$candidate" &> /dev/null; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

# Ordered preference list
PYTHON_BIN=$(find_python python3.12 python3.11 python3)

if [ -z "$PYTHON_BIN" ]; then
  echo "❌ No suitable Python 3 interpreter found. Please install Python 3.11+ (with ensurepip)."
  exit 1
fi

# Verify that ensurepip works for the chosen interpreter
if ! "$PYTHON_BIN" -m ensurepip --version &> /dev/null; then
  echo "⚠️  $PYTHON_BIN does not have 'ensurepip'. Trying next candidate..."
  PYTHON_BIN=$(find_python python3 python3.11 python3.12)  # fallback order
  if [ -z "$PYTHON_BIN" ] || ! "$PYTHON_BIN" -m ensurepip --version &> /dev/null; then
    echo "❌ Could not find a Python interpreter with working 'ensurepip'."
    exit 1
  fi
fi

python_version=$("$PYTHON_BIN" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo "✅ Using $PYTHON_BIN (Python $python_version)"

# Remove existing venv if it exists but is broken
if [ -d "venv" ] && [ ! -f "venv/bin/activate" ]; then
    echo "🔧 Removing broken virtual environment..."
    rm -rf venv
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "🔧 Creating Python virtual environment..."
    "$PYTHON_BIN" -m venv venv
    
    # Check if creation was successful
    if [ ! -f "venv/bin/activate" ]; then
        echo "❌ Virtual environment creation failed. Please check your Python installation."
        exit 1
    fi
    
    echo "✅ Virtual environment created in ./venv"
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔥 Activating virtual environment..."
source venv/bin/activate

# Check if activation was successful
if [ -z "$VIRTUAL_ENV" ]; then
    echo "❌ Failed to activate virtual environment"
    exit 1
fi

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Verify installation
echo "🧪 Testing installation..."
python -c "import kmodes, numpy, sklearn; print('✅ All dependencies working!')" || {
    echo "❌ Dependency verification failed"
    exit 1
}

echo "✅ Python environment setup complete!"
echo "🐍 Virtual environment is ready in ./venv"
echo ""
echo "To activate the virtual environment manually:"
echo "  source venv/bin/activate"
echo ""
echo "To deactivate the virtual environment:"
echo "  deactivate"

# Verify ensurepip
echo "🧪 Verifying ensurepip..."
/opt/homebrew/bin/python3 -m ensurepip --version 

# 1. Make sure the edited script is executable
chmod +x scripts/setup_python.sh

# 2. Start fresh
rm -rf venv            # remove any half-built env
./scripts/setup_python.sh