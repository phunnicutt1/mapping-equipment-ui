#!/bin/bash

echo "Setting up Python environment for BACnet clustering..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check Python version
python_version=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo "✅ Found Python $python_version"

# Remove existing venv if it exists but is broken
if [ -d "venv" ] && [ ! -f "venv/bin/activate" ]; then
    echo "🔧 Removing broken virtual environment..."
    rm -rf venv
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "🔧 Creating Python virtual environment..."
    python3 -m venv venv
    
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